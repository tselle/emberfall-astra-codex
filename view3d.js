/* All scene art is drawn into a small pixel atlas and reused while walking. */
const View3D = (() => {
  "use strict";
  const TAU = Math.PI * 2;
  const WALL = "#ISTHGD?L";
  const atlas = new Map();
  const towns = new WeakMap();
  let buffer,
    depths = new Float32Array(1);

  function random(seed) {
    let n = seed >>> 0;
    return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
  }
  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  function bitmap(key, w, h, painter) {
    if (!atlas.has(key)) {
      const c = canvas(w, h);
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      painter(g, w, h);
      atlas.set(key, c);
    }
    return atlas.get(key);
  }
  function rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function poly(g, points, color) {
    g.fillStyle = color;
    g.beginPath();
    points.forEach(([x, y], i) =>
      i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y)),
    );
    g.closePath();
    g.fill();
  }
  function stroke(g, x, y, u, v, width, color) {
    const dx = u - x,
      dy = v - y;
    const count = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= count; i++) rect(g, x + (dx * i) / count, y + (dy * i) / count, width, width, color);
  }
  function disk(g, x, y, radius, color) {
    for (let j = -radius; j <= radius; j++) {
      const a = Math.round(Math.sqrt(radius ** 2 - j ** 2));
      rect(g, x - a, y + j, a * 2 + 1, 1, color);
    }
  }
  function quad(g, a, b, c, d) {
    return (x, y) => [
      (1 - y) * (a[0] + (b[0] - a[0]) * x) + y * (d[0] + (c[0] - d[0]) * x),
      (1 - y) * (a[1] + (b[1] - a[1]) * x) + y * (d[1] + (c[1] - d[1]) * x),
    ];
  }
  function tileRoof(g, points, dark, r) {
    const palette = dark
      ? ["#2d383d", "#3b474a", "#475555", "#59625b", "#818276", "#2f383a"]
      : ["#583b35", "#784737", "#905238", "#ab6a42", "#c58a56", "#5a3b31"];
    const p = quad(g, ...points);
    poly(g, points, palette[0]);
    for (let y = 0; y < 12; y++) {
      const y0 = y / 12,
        y1 = (y + 1) / 12;
      for (let col = -1; col < 18; col++) {
        const x0 = Math.max(0, (col + (y % 2) * 0.5) / 18),
          x1 = Math.min(1, (col + 1 + (y % 2) * 0.5) / 18);
        if (x1 <= x0) continue;
        const a = p(x0, y0),
          b = p(x1, y0),
          c = p(x1, y1),
          d = p(x0, y1);
        poly(g, [a, b, c, d], palette[1 + Math.floor(r() * 3)]);
        stroke(g, ...d, ...c, 1, palette[5]);
        stroke(g, ...a, ...d, 1, palette[0]);
        if (r() < 0.5) {
          const e = p(x0 + 0.006, y0 + 0.017),
            f = p(x1 - 0.006, y0 + 0.017);
          stroke(g, ...e, ...f, 1, palette[4]);
        }
      }
    }
  }
  const plaster = ["#b59a70", "#a58a63", "#c7af80", "#d5be88", "#947d5d"];
  function panel(g, p, darker, r) {
    poly(g, [p(0, 0), p(1, 0), p(1, 1), p(0, 1)], darker ? "#7e6d58" : "#d0b47f");
    for (let n = 0; n < 240; n++) {
      const x = r(),
        y = r(),
        v = p(x, y);
      rect(g, ...v, r() * 3 + 1, 1, darker ? ["#706552", "#897960", "#786a57"][n % 3] : plaster[n % 5]);
    }
    function timber(x, y, u, v, w = 2) {
      stroke(g, ...p(x, y), ...p(u, v), w, "#443a32");
      if (w > 2) stroke(g, ...p(x, y), ...p(u, v), 1, "#776143");
    }
    timber(0, 0, 1, 0, 4);
    timber(0, 0.47, 1, 0.47, 5);
    timber(0, 0.96, 1, 0.96, 4);
    [0, 0.33, 0.66, 0.98].forEach((x) => timber(x, 0, x, 1, 3));
    timber(0.02, 0.46, 0.31, 0.03, 2);
    timber(0.68, 0.04, 0.97, 0.45, 2);
    timber(0.02, 0.53, 0.31, 0.93, 2);
    timber(0.7, 0.95, 0.96, 0.54, 2);
    return timber;
  }
  function pane(g, p, x, y, w, h, r, lit = true) {
    function q(x0, y0, x1, y1, c) {
      poly(g, [p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)], c);
    }
    q(x - 0.025, y - 0.03, x + w + 0.025, y + h + 0.03, "#4e4031");
    q(x, y, x + w, y + h, "#2f3331");
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 3; j++) {
        const a = x + 0.013 + i * w * 0.48,
          b = y + 0.014 + (j * h) / 3;
        q(
          a,
          b,
          a + w * 0.37,
          b + h * 0.23,
          lit
            ? ["#f3bd66", "#ffe096", "#ce904f", "#e9aa5c"][Math.floor(r() * 4)]
            : ["#576467", "#73817d", "#474f50"][j],
        );
      }
    q(x - 0.04, y + h + 0.02, x + w + 0.05, y + h + 0.065, "#40362e");
  }
  function barrel(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    poly(
      g,
      [
        [0, 2],
        [2, 0],
        [9, 0],
        [11, 2],
        [12, 10],
        [10, 16],
        [2, 16],
        [0, 12],
      ],
      "#493c30",
    );
    rect(g, 2, 3, 8, 11, "#8e6944");
    rect(g, 3, 3, 1, 10, "#b08b58");
    rect(g, 7, 3, 1, 12, "#624c37");
    rect(g, 0, 4, 11, 2, "#51544d");
    rect(g, 1, 11, 10, 2, "#51544d");
    rect(g, 2, 0, 7, 1, "#b59a6f");
    g.restore();
  }
  function lantern(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    rect(g, -1, -6, 2, 5, "#40392e");
    poly(
      g,
      [
        [-5, -1],
        [-2, -4],
        [2, -4],
        [5, -1],
        [3, 5],
        [-3, 5],
      ],
      "#4b4030",
    );
    rect(g, -3, 0, 6, 4, "#d6974b");
    rect(g, -2, 0, 4, 4, "#f3c56b");
    rect(g, -1, 0, 2, 4, "#fff1b0");
    rect(g, -2, 5, 5, 2, "#524235");
    g.restore();
  }
  function house(type, variant) {
    return bitmap("house" + type + variant, 169, 151, (g) => {
      const r = random(41 + type.charCodeAt(0) * 17 + variant),
        dark = type === "T" || type === "H" || type === "S";
      const fg = quad(g, [7, 55], [80, 61], [80, 137], [7, 130]);
      const side = quad(g, [80, 61], [144, 43], [144, 108], [80, 137]);
      // A tall stone flue with a chipped cornice.
      const chimneyX = type === "G" ? 51 : 94;
      rect(g, chimneyX, 6, 11, 34, "#746b59");
      rect(g, chimneyX + 7, 6, 4, 34, "#534e45");
      rect(g, chimneyX - 2, 4, 15, 4, "#726656");
      rect(g, chimneyX - 2, 3, 15, 1, "#b09a78");
      for (let n = 0; n < 18; n++) rect(g, chimneyX + r() * 8, 9 + r() * 23, 3, 1, "#93826b");
      panel(g, fg, false, r);
      panel(g, side, true, r);
      // Front gable with whitewashed wattle between dark timber braces.
      poly(
        g,
        [
          [6, 57],
          [37, 5],
          [81, 62],
        ],
        "#c2a16f",
      );
      for (let j = 0; j < 60; j++) {
        let y = 22 + r() * 33,
          x = 37 + (r() - 0.5) * (y - 8);
        rect(g, x, y, 2, 1, plaster[j % 5]);
      }
      stroke(g, 36, 12, 36, 57, 3, "#4c3c30");
      stroke(g, 17, 46, 68, 50, 3, "#4c3c30");
      stroke(g, 23, 42, 36, 56, 2, "#594734");
      stroke(g, 50, 33, 50, 57, 2, "#594734");
      const roof = [
        [36, 6],
        [100, 0],
        [151, 44],
        [80, 66],
      ];
      tileRoof(g, roof, dark, r);
      stroke(g, 2, 58, 36, 4, 4, "#423a32");
      stroke(g, 4, 54, 36, 4, 1, "#ad8960");
      stroke(g, 36, 4, 80, 63, 5, "#43392f");
      stroke(g, 38, 4, 82, 61, 2, "#be966c");
      stroke(g, 80, 63, 151, 42, 4, "#443b33");
      stroke(g, 83, 62, 150, 42, 1, "#a47c51");
      stroke(g, 36, 4, 101, 0, 2, dark ? "#8c877b" : "#be855a");
      for (let i = 0; i < 9; i++) rect(g, 84 + i * 7.3, 66 - i * 2.2, 2, 4, "#514232");
      if (type === "I" || type === "G") {
        // Sunlit flue above the gable and a small onion-capped dormer.
        const cx = type === "I" ? 58 : 76;
        poly(
          g,
          [
            [cx, 4],
            [cx + 7, 3],
            [cx + 7, 24],
            [cx, 22],
          ],
          "#b6a281",
        );
        poly(
          g,
          [
            [cx + 7, 3],
            [cx + 11, 4],
            [cx + 11, 21],
            [cx + 7, 24],
          ],
          "#796d59",
        );
        for (let y = 7; y < 22; y += 4) rect(g, cx + 1, y, 5, 1, "#887b65");
        rect(g, cx - 1, 2, 12, 3, "#776a57");
        rect(g, cx - 1, 2, 9, 1, "#cebb96");
        poly(
          g,
          [
            [86, 27],
            [94, 12],
            [103, 22],
            [103, 36],
            [87, 42],
          ],
          "#b29b76",
        );
        poly(
          g,
          [
            [94, 12],
            [104, 11],
            [113, 26],
            [103, 29],
          ],
          "#514b42",
        );
        stroke(g, 84, 31, 94, 13, 2, "#493c32");
        stroke(g, 94, 12, 104, 27, 2, "#493c32");
        rect(g, 92, 26, 6, 10, "#483c30");
        rect(g, 93, 27, 2, 6, "#e0ad6b");
        rect(g, 96, 27, 1, 6, "#ffe0a0");
      }
      // Projecting brackets cast cool shadows under the upper storey.
      const beamPoints = [side(0, 0.47), side(1, 0.47), side(1, 0.56), side(0, 0.59)];
      poly(g, beamPoints, "rgba(52,46,41,.26)");
      for (let j = 0; j < 8; j++) {
        const [x, y] = side(0.03 + j / 8, 0.5);
        poly(
          g,
          [
            [x, y],
            [x + 3, y - 1],
            [x + 2, y + 4],
            [x, y + 6],
          ],
          "#534336",
        );
      }
      pane(g, fg, 0.1, 0.12, 0.15, 0.24, r);
      pane(g, fg, 0.44, 0.11, 0.15, 0.25, r);
      pane(g, fg, 0.77, 0.12, 0.13, 0.25, r);
      pane(g, side, 0.1, 0.14, 0.15, 0.22, r);
      pane(g, side, 0.44, 0.15, 0.16, 0.23, r);
      pane(g, side, 0.75, 0.54, 0.14, 0.22, r, type !== "S");
      // Recessed, round-topped plank door with hinges and a sill.
      const door = fg(0.39, 0.56);
      g.save();
      g.translate(Math.round(door[0]), Math.round(door[1]));
      poly(
        g,
        [
          [0, 31],
          [0, 7],
          [2, 4],
          [5, 1],
          [13, 1],
          [16, 4],
          [18, 8],
          [18, 32],
        ],
        "#39382f",
      );
      poly(
        g,
        [
          [3, 31],
          [3, 7],
          [5, 5],
          [8, 3],
          [12, 3],
          [15, 7],
          [15, 31],
        ],
        "#74563b",
      );
      for (let i = 5; i < 15; i += 3) rect(g, i, 7, 1, 23, "#544330");
      rect(g, 3, 11, 9, 2, "#393931");
      rect(g, 3, 24, 8, 2, "#393931");
      rect(g, 13, 18, 2, 2, "#d6b46b");
      rect(g, -3, 31, 24, 3, "#ab9673");
      rect(g, -6, 34, 28, 3, "#6c6959");
      g.restore();
      pane(g, fg, 0.085, 0.59, 0.15, 0.22, r);
      lantern(g, 64, 110, 0.8);
      // Plank sign on a projecting wrought bracket, each service with its own device.
      stroke(g, 96, 75, 119, 70, 2, "#3d3730");
      stroke(g, 96, 83, 111, 73, 1, "#413b32");
      rect(g, 106, 74, 1, 6, "#413b32");
      rect(g, 116, 72, 1, 7, "#413b32");
      poly(
        g,
        [
          [102, 80],
          [120, 77],
          [120, 94],
          [110, 99],
          [102, 95],
        ],
        "#483b32",
      );
      poly(
        g,
        [
          [104, 82],
          [118, 80],
          [118, 93],
          [110, 96],
          [104, 93],
        ],
        type === "H" ? "#40585d" : type === "T" ? "#55694f" : "#884e34",
      );
      if (type === "I") {
        rect(g, 107, 85, 6, 6, "#edc577");
        rect(g, 113, 86, 2, 4, "#d6a65f");
        rect(g, 107, 84, 6, 1, "#f4dfac");
      } else if (type === "T") {
        stroke(g, 110, 83, 110, 93, 2, "#e5c681");
        stroke(g, 106, 87, 114, 87, 1, "#e5c681");
      } else {
        poly(
          g,
          [
            [110, 82],
            [114, 87],
            [110, 93],
            [107, 88],
          ],
          "#dfb669",
        );
      }
      if (type === "I") {
        // A second, chip-carved sign swings over the street.
        stroke(g, 96, 68, 126, 61, 2, "#393b31");
        stroke(g, 97, 75, 116, 64, 1, "#484032");
        rect(g, 112, 65, 1, 6, "#514733");
        rect(g, 124, 63, 1, 7, "#514733");
        poly(
          g,
          [
            [108, 72],
            [127, 68],
            [129, 72],
            [128, 87],
            [118, 93],
            [108, 88],
          ],
          "#443a2c",
        );
        poly(
          g,
          [
            [110, 74],
            [125, 71],
            [126, 73],
            [125, 86],
            [118, 90],
            [111, 86],
          ],
          "#b38444",
        );
        poly(
          g,
          [
            [112, 75],
            [123, 73],
            [124, 85],
            [118, 88],
            [113, 85],
          ],
          "#4e615b",
        );
        poly(
          g,
          [
            [115, 77],
            [122, 76],
            [122, 80],
            [120, 82],
            [118, 82],
          ],
          "#e1be78",
        );
        rect(g, 118, 81, 2, 4, "#d5b777");
        rect(g, 116, 85, 6, 1, "#d5b777");
      }
      for (const [x, y] of [
        [15, 83],
        [40, 85],
        [64, 86],
      ]) {
        rect(g, x, y, 11, 4, "#775b3c");
        for (let j = 0; j < 12; j++) {
          const bx = x + r() * 11,
            by = y + r() * 5 - 3;
          rect(g, bx, by, 2, 2, ["#485a3e", "#5c6f44", "#789053", "#bb804e"][j % 4]);
        }
      }
      if (type === "S") {
        poly(
          g,
          [
            [83, 92],
            [143, 72],
            [153, 80],
            [91, 104],
          ],
          "#a89b74",
        );
        for (let j = 0; j < 6; j++)
          poly(
            g,
            [
              [84 + j * 10, 92 - j * 3.3],
              [88 + j * 10, 91 - j * 3.3],
              [97 + j * 10, 100 - j * 3.6],
              [92 + j * 10, 102 - j * 3.6],
            ],
            "#657b69",
          );
        stroke(g, 92, 102, 92, 130, 1, "#584731");
        stroke(g, 152, 80, 152, 107, 1, "#584731");
      }
      barrel(g, 7, 115, 0.92);
      barrel(g, 16, 121, 0.8);
      // Wall ivy forms irregular strands with two-toned leaf clusters.
      for (let k = 0; k < 6; k++) {
        let x = 69 + r() * 8,
          y = 66 + r() * 8;
        for (let n = 0; n < 8 + r() * 9; n++) {
          x += r() * 3 - 1.5;
          y += 1.3;
          rect(g, x, y, 2 + r() * 2, 2, ["#45543c", "#556144", "#758057"][n % 3]);
        }
      }
      for (let i = 0; i < 33; i++) {
        const x = 83 + r() * 59,
          y = 137 - (x - 83) * 0.44 + r() * 4;
        stroke(g, x, y, x + r() * 3 - 1.5, y - r() * 4, 1, ["#545a3e", "#71764a", "#969059"][i % 3]);
      }
    });
  }
  function pine(g, x, y, h, palette, r) {
    const w = h * (0.28 + r() * 0.13);
    rect(g, x - 1, y - h * 0.65, Math.max(1, h * 0.044), h * 0.66, palette[0]);
    for (let i = 0; i < 8; i++) {
      const f = (i + 1) / 8,
        b = y - h + h * (0.12 + 0.77 * f),
        t = b - h * (0.22 + 0.19 * f),
        a = w * f * 0.54;
      poly(
        g,
        [
          [x, t],
          [x + a * 0.45, b - h * 0.12],
          [x + a, b - 2],
          [x + a * 0.62, b - 3],
          [x + a * 0.72, b],
          [x, b - 2],
          [x - a * 0.55, b + 1],
          [x - a * 0.46, b - 2],
          [x - a, b],
        ],
        palette[0],
      );
      poly(
        g,
        [
          [x, t + 2],
          [x - a * 0.37, b - h * 0.1],
          [x - a * 0.83, b - 2],
          [x - a * 0.28, b - 3],
          [x + a * 0.08, b - 5],
        ],
        palette[1],
      );
      if (h > 24)
        for (let j = 0; j < 5; j++) {
          const k = r(),
            yy = t + (b - t) * (0.5 + k * 0.44),
            xx = x - a * (0.5 + k * 0.38) * r();
          rect(g, xx, yy, 1 + r() * a * 0.16, 1, palette[2]);
        }
    }
  }
  function tree(variant) {
    return bitmap("tree" + variant, 64, 120, (g) => {
      const r = random(variant + 81);
      pine(g, 32, 117, 103 + r() * 13, ["#273d39", "#3e5547", "#667558"], r);
      for (let i = 0; i < 55; i++) {
        const x = 19 + r() * 32,
          y = 114 + r() * 4;
        rect(g, x, y, 1 + r() * 4, 1 + r() * 2, ["#434d37", "#576242", "#70784c"][i % 3]);
      }
    });
  }
  function ridge(g, points, base, palette, r) {
    const path = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x, y] = points[i],
        [u, v] = points[i + 1];
      for (let a = x; a < u; a += 2) path.push([a, y + ((v - y) * (a - x)) / (u - x) + (r() - 0.5) * 3]);
    }
    poly(g, [...path, [points[points.length - 1][0], base], [points[0][0], base]], palette[0]);
    for (let i = 1; i < points.length - 1; i++) {
      const [x, y] = points[i];
      if (y > points[i - 1][1] || y > points[i + 1][1]) continue;
      const right = points[i + 1][0] - x,
        h = base - y;
      const spur = [
        [x, y],
        [x + right * 0.14, y + h * 0.19],
        [x + right * 0.08, y + h * 0.31],
        [x + right * 0.28, y + h * 0.48],
        [x + right * 0.17, y + h * 0.64],
        [x + right * 0.7, base],
      ];
      poly(g, [...spur, [points[i + 1][0], base], points[i + 1]], palette[1]);
      for (let j = 0; j < 13; j++) {
        const t = r() * 0.56,
          a = x + right * (t * 0.25 + r() * t),
          b = y + h * t;
        stroke(g, a, b, a + r() * 4 + 1, b + 2 + r() * 6, 1, palette[1]);
      }
      for (let j = 0; j < 17; j++) {
        const t = r() * 0.65,
          a = x - t * (x - points[i - 1][0]) * 0.6,
          b = y + h * t;
        stroke(g, a, b, a - 2 - r() * 5, b + 3 + r() * 7, 1, palette[2]);
      }
      // Stepped slips of scree break the large ridge into interlocking faces.
      const spread = x - points[i - 1][0];
      for (let k = 0; k < 15; k++) {
        const depth = 0.13 + r() * 0.65,
          px = x - spread * depth * 0.91 + r() * spread * depth * 0.72,
          py = y + h * depth;
        const width = 2 + r() * 9,
          length = 5 + r() * 15;
        poly(
          g,
          [
            [px, py],
            [px + width * 0.5, py + length * 0.27],
            [px + width * 0.15, py + length * 0.48],
            [px - width, py + length],
            [px + 1, py + length * 0.21],
          ],
          palette[k % 3 === 0 ? 1 : 2],
        );
      }
      if (y < 71) {
        poly(
          g,
          [
            [x, y],
            [x + right * 0.18, y + (points[i + 1][1] - y) * 0.18],
            [x + right * 0.12, y + 11],
            [x + 3, y + 6],
            [x - 2, y + 13],
            [x - 2, y + 6],
            [x - 9, y + 11],
          ],
          "#d5d0b0",
        );
      }
    }
  }
  function sky() {
    const W = 1536,
      H = 180;
    return bitmap("horizon", W, H, (g) => {
      const r = random(298123);
      const stops = [
        [0, [55, 105, 129]],
        [40, [102, 156, 170]],
        [86, [186, 195, 172]],
        [125, [244, 199, 139]],
        [178, [234, 174, 115]],
      ];
      for (let y = 0; y < H; y++) {
        const i = stops.findIndex((v) => v[0] >= y);
        const a = stops[Math.max(0, i - 1)],
          b = stops[i === -1 ? stops.length - 1 : i],
          t = (y - a[0]) / (b[0] - a[0] || 1);
        rect(g, 0, y, W, 1, "rgb(" + a[1].map((v, k) => Math.round(v + (b[1][k] - v) * t)).join(",") + ")");
      }
      // Thin cloud banks split into drifted, horizontal light and shadow.
      for (let i = 0; i < 65; i++) {
        const cx = r() * W,
          cy = 14 + r() * 92,
          w = 12 + r() * 85,
          h = 1 + r() * 9;
        let y = cy;
        for (let j = 0; j < 10; j++) {
          y += (r() - 0.49) * h * 0.55;
          const a = cx + (j * w) / 11,
            b = y - Math.sin((j / 10) * Math.PI) * h;
          rect(g, a, b, 4 + r() * w * 0.3, 1 + r() * h * 0.4, ["#c2c4b4", "#c7c7b0", "#d2d0b7"][i % 3]);
          if (j % 3 === 0) rect(g, a, b, 4 + r() * w * 0.2, 1, "#e0d8bd");
        }
      }
      const cloudRandom = random(7331);
      for (const [cx, cy, w, h] of [
        [623, 38, 71, 10],
        [731, 21, 49, 8],
        [879, 45, 53, 8],
        [960, 12, 84, 13],
        [320, 35, 60, 9],
        [1270, 20, 75, 12],
      ]) {
        const p = [];
        for (let i = 0; i <= w; i += 2) {
          const t = i / w;
          const lobe = Math.max(
            0.88 - Math.abs(t - 0.3) * 2.82,
            Math.max(1 - Math.abs(t - 0.59) * 7, 0.62 - Math.abs(t - 0.82) * 4),
          );
          p.push([cx + i, cy - h * Math.max(0, lobe) - (cloudRandom() - 0.5) * 2]);
        }
        poly(
          g,
          [
            ...p,
            [cx + w + 4, cy + 1],
            [cx + w * 0.79, cy + 3],
            [cx + w * 0.35, cy + 1],
            [cx + w * 0.2, cy + 2],
            [cx - 2, cy + 1],
          ],
          "#d4cfb7",
        );
        for (let i = 2; i < p.length * 0.79; i++) stroke(g, ...p[i - 1], ...p[i], 1, "#e8ddbe");
        rect(g, cx + w * 0.27, cy, w * 0.48, 1, "#b8bfaf");
        rect(g, cx + w * 0.45, cy + 3, w * 0.62, 1, "#d6cdb0");
      }
      disk(g, 823, 48, 13, "#e1cfa4");
      disk(g, 823, 48, 10, "#fff1be");
      for (let layer = 0; layer < 2; layer++) {
        const points = [[-20, 117]];
        let x = -20;
        while (x < W + 20) {
          x += 22 + r() * 50;
          points.push([x, layer ? 72 + r() * 38 : 40 + r() * 56]);
          x += 22 + r() * 45;
          points.push([x, layer ? 102 + r() * 25 : 82 + r() * 31]);
        }
        ridge(
          g,
          points,
          166,
          layer ? ["#72918a", "#5e7e7c", "#8fa59a"] : ["#9eafaa", "#7e9b9f", "#c4c7ae"],
          r,
        );
      }
      for (let layer = 0; layer < 3; layer++) {
        const palette = [
          ["#6a8581", "#78928a", "#78928a"],
          ["#56736d", "#638176", "#6a8679"],
          ["#435e55", "#536c5b", "#637a62"],
        ][layer];
        const bottom = (x) => 132 + layer * 8 - 5 * Math.sin(x / 76) - 6 * Math.cos(x / 119);
        const p = [];
        for (let x = -8; x <= W + 8; x += 3) p.push([x, bottom(x) + r() * 3]);
        poly(g, [...p, [W, H], [0, H]], palette[0]);
        for (let x = -3; x < W + 4; x += 2 + r() * 4)
          pine(g, x, bottom(x) + 3, 5 + r() * (9 + 2 * layer), palette, r);
      }
      // Small dark birds above the mountain pass.
      for (const [x, y] of [
        [770, 54],
        [763, 57],
        [783, 53],
        [792, 46],
        [752, 61],
      ]) {
        rect(g, x - 2, y, 2, 1, "#617976");
        rect(g, x, y + 1, 1, 1, "#617976");
        rect(g, x + 1, y - 1, 2, 2, "#617976");
      }
    });
  }
  function gate() {
    return bitmap("gate", 164, 128, (g) => {
      const r = random(4001);
      function stone(x, y, w, h, lit) {
        rect(g, x, y, w, h, lit ? "#93917f" : "#757e74");
        for (let row = 0; row < h / 4; row++) {
          for (let col = -1; col < w / 9; col++) {
            const a = x + Math.max(0, col * 9 + (row % 2) * 4),
              b = Math.min(x + w, x + (col + 1) * 9 + (row % 2) * 4);
            if (b <= a) continue;
            rect(
              g,
              a,
              y + row * 4,
              b - a - 1,
              3,
              (lit
                ? ["#9e9c85", "#a4a187", "#999682", "#aba68a"]
                : ["#828977", "#798375", "#8b8d7b", "#8a907d"])[Math.floor(r() * 4)],
            );
          }
        }
      }
      function tower(x, y, w, h, roof) {
        stone(x, y, w, h, true);
        stone(x + w * 0.71, y, w * 0.29, h, false);
        rect(g, x - 2, y - 2, w + 4, 3, "#666f65");
        if (roof) {
          poly(
            g,
            [
              [x - 4, y - 1],
              [x + w * 0.45, y - 28],
              [x + w + 4, y - 1],
            ],
            "#526664",
          );
          poly(
            g,
            [
              [x + w * 0.45, y - 28],
              [x + w * 0.78, y - 1],
              [x + w + 4, y - 1],
            ],
            "#435b5b",
          );
          stroke(g, x - 3, y - 2, x + w * 0.45, y - 28, 1, "#8b9983");
          const fx = x + w * 0.46;
          rect(g, fx, y - 39, 1, 14, "#57675e");
          poly(
            g,
            [
              [fx + 1, y - 39],
              [fx + 13, y - 37],
              [fx + 9, y - 34],
              [fx + 1, y - 34],
            ],
            "#a66b46",
          );
        } else for (let k = 0; k < w; k += 6) rect(g, x + k, y - 6, 4, 5, "#9c9b86");
        for (let i = 0; i < (h - 7) / 14; i++) {
          rect(g, x + w * 0.32, y + 7 + i * 14, 2, 6, "#4b615b");
          rect(g, x + w * 0.32 + 2, y + 7 + i * 14, 1, 6, "#b1ab8e");
        }
      }
      tower(61, 39, 23, 62, true);
      tower(95, 50, 15, 50, true);
      tower(43, 68, 13, 35, false);
      stone(37, 87, 88, 40, true);
      stone(70, 73, 29, 42, false);
      for (let x = 36; x < 128; x += 8) rect(g, x, 82, 5, 6, "#9b9b82");
      tower(30, 78, 23, 50, true);
      tower(113, 75, 22, 53, true);
      poly(
        g,
        [
          [64, 128],
          [64, 109],
          [67, 102],
          [73, 97],
          [81, 94],
          [89, 97],
          [96, 103],
          [99, 111],
          [99, 128],
        ],
        "#52635a",
      );
      poly(
        g,
        [
          [69, 128],
          [69, 110],
          [72, 104],
          [81, 100],
          [89, 104],
          [94, 112],
          [94, 128],
        ],
        "#374b44",
      );
      for (let i = 0; i < 6; i++) rect(g, 70 + i * 4, 107, 1, 6 + r() * 3, "#747e6b");
      for (let x of [55, 104]) {
        rect(g, x, 89, 5, 19, "#a36a48");
        poly(
          g,
          [
            [x, 107],
            [x + 5, 107],
            [x + 2, 112],
          ],
          "#a36a48",
        );
        rect(g, x + 2, 92, 1, 9, "#daba79");
      }
    });
  }
  function lamp() {
    return bitmap("lamp", 36, 70, (g) => {
      stroke(g, 9, 13, 9, 65, 3, "#494638");
      stroke(g, 10, 13, 10, 64, 1, "#9e855a");
      rect(g, 7, 62, 7, 5, "#605c48");
      rect(g, 8, 11, 5, 6, "#524b3d");
      stroke(g, 10, 14, 25, 11, 2, "#534c3c");
      stroke(g, 12, 22, 22, 12, 1, "#554e40");
      poly(
        g,
        [
          [9, 10],
          [11, 6],
          [13, 10],
        ],
        "#a58a56",
      );
      lantern(g, 25, 22, 1.05);
      for (let x = 3; x < 16; x += 3) stroke(g, x, 65, x - 1, 63 - (x % 4), 1, "#667447");
    });
  }
  function paving(wild) {
    return bitmap("paving" + wild, 128, 128, (g) => {
      const r = random(460);
      rect(g, 0, 0, 128, 128, wild ? "#6b6b59" : "#47433a");
      for (let y = -1; y < 16; y++) {
        let x = -20 + r() * 10;
        while (x < 130) {
          const w = 9 + Math.floor(r() * 11),
            h = 6 + Math.floor(r() * 2),
            b = y * 8;
          const shade = wild
            ? ["#979580", "#9e9985", "#a49c85", "#aba28a", "#92917b", "#afa78f"]
            : ["#6a6456", "#736d5d", "#646253", "#756d5d", "#615e51"];
          poly(
            g,
            [
              [x + 2, b],
              [x + w - 3, b],
              [x + w - 1, b + 2],
              [x + w - 2, b + h - 1],
              [x + w - 4, b + h],
              [x + 2, b + h],
              [x, b + h - 2],
              [x, b + 2],
            ],
            shade[Math.floor(r() * shade.length)],
          );
          if (r() < 0.93) rect(g, x + 2, b + 1, w * 0.42, 1, wild ? "#b5ac8b" : "#8b8270");
          for (let j = 0; j < 3; j++)
            rect(g, x + 2 + r() * (w - 5), b + 2 + r() * 3, 1 + r() * 2, 1, wild ? "#95917a" : "#686558");
          x += w;
        }
      }
    });
  }
  function stonework(index, torch) {
    return bitmap("masonry" + index + torch, 128, 128, (g) => {
      const r = random(817 + index * 151);
      const colors = ["#68716a", "#71756b", "#65706b", "#777a6e", "#69726b", "#73776a"];
      rect(g, 0, 0, 128, 128, "#3c4946");
      for (let row = 0; row < 8; row++) {
        let x = -19 + Math.floor(r() * 16);
        const y = row * 16;
        while (x < 128) {
          const w = 19 + Math.floor(r() * 23);
          const c = colors[Math.floor(r() * colors.length)],
            chip = 1 + Math.floor(r() * 4);
          poly(
            g,
            [
              [x + 2, y + 1],
              [x + w - 3, y + 1],
              [x + w - 1, y + 3],
              [x + w - 2, y + 13],
              [x + w - 4, y + 15],
              [x + 3, y + 15],
              [x + 1, y + 12],
              [x + 1, y + chip],
            ],
            "#535f58",
          );
          poly(
            g,
            [
              [x + 3, y + 2],
              [x + w - 4, y + 1],
              [x + w - 2, y + 3],
              [x + w - 3, y + 12],
              [x + w - 6, y + 14],
              [x + 4, y + 13],
              [x + 2, y + 11],
            ],
            c,
          );
          stroke(g, x + 3, y + 2, x + w - 6, y + 1, 1, "#929487");
          rect(g, x + 2, y + 4, 1, 5, "#7f8477");
          const ridgeWidth = Math.floor(r() * (w - 10));
          stroke(g, x + 5, y + 12, x + 7 + ridgeWidth, y + 13, 1, "#606a60");
          for (let i = 0; i < 12; i++) {
            const px = x + 4 + r() * (w - 9),
              py = y + 3 + r() * 8;
            rect(g, px, py, 1 + r() * 3, 1 + r() * 2, i % 3 ? "rgba(43,55,52,.13)" : "rgba(171,168,136,.17)");
          }
          if (r() < 0.35) {
            const px = x + 7 + r() * (w - 13);
            stroke(g, px, y + 1, px + 2, y + 4, 1, "#536059");
            stroke(g, px + 2, y + 4, px - 2, y + 7, 1, "#536059");
          }
          if (r() < 0.26) {
            for (let j = 0; j < 10; j++)
              rect(g, x + 5 + r() * 12, y + 12 + r() * 5, 2 + r() * 2, 1, "#53634d");
          }
          x += w;
        }
      }
      if (torch) {
        const cx = 63,
          cy = 39;
        const light = g.createRadialGradient(cx, cy, 2, cx, cy, 50);
        light.addColorStop(0, "rgba(246,175,76,.56)");
        light.addColorStop(0.32, "rgba(222,152,69,.33)");
        light.addColorStop(1, "rgba(120,91,48,0)");
        g.fillStyle = light;
        g.fillRect(0, 0, 128, 128);
        poly(
          g,
          [
            [59, 53],
            [66, 51],
            [65, 67],
            [61, 71],
            [58, 68],
          ],
          "#3e4036",
        );
        rect(g, 61, 52, 4, 15, "#62503b");
        rect(g, 58, 49, 10, 4, "#413f31");
        rect(g, 59, 49, 8, 1, "#b3975f");
        poly(
          g,
          [
            [60, 49],
            [57, 43],
            [59, 36],
            [61, 41],
            [63, 27],
            [66, 34],
            [65, 39],
            [68, 35],
            [67, 46],
            [65, 49],
          ],
          "#dc8b45",
        );
        poly(
          g,
          [
            [61, 48],
            [59, 43],
            [62, 39],
            [64, 33],
            [65, 41],
            [66, 43],
            [64, 48],
          ],
          "#f7bd5e",
        );
        poly(
          g,
          [
            [62, 48],
            [61, 44],
            [63, 40],
            [64, 43],
            [64, 48],
          ],
          "#fff1a0",
        );
        rect(g, 66, 28, 1, 2, "#d6984f");
      }
    });
  }
  function dungeonDoor(locked) {
    return bitmap("vaultdoor" + locked, 128, 128, (g) => {
      const r = random(611);
      g.drawImage(stonework(2, false), 0, 0);
      const arch = [
        [15, 128],
        [15, 52],
        [19, 36],
        [28, 23],
        [42, 15],
        [55, 10],
        [73, 10],
        [88, 15],
        [102, 24],
        [111, 37],
        [115, 50],
        [115, 128],
      ];
      poly(g, arch, "#363c35");
      for (let k = 0; k < 13; k++) {
        const a = Math.PI + (k / 13) * Math.PI,
          b = Math.PI + ((k + 1) / 13) * Math.PI;
        const edge = (t, rad) => [64 + Math.cos(t) * rad, 53 + Math.sin(t) * rad * 0.91];
        poly(
          g,
          [edge(a, 56), edge(b - 0.015, 56), edge(b - 0.02, 47), edge(a + 0.007, 47)],
          ["#989684", "#858777", "#91907e"][k % 3],
        );
      }
      for (let j = 0; j < 9; j++) {
        const x = 20 + j * 10,
          top = 53 - Math.sqrt(Math.max(0, 44 * 44 - (x + 4 - 64) ** 2)) * 0.91;
        rect(g, x, top, 9, 128 - top, ["#765d44", "#80654b", "#735e47", "#876b4b"][j % 4]);
        for (let k = 0; k < 9; k++) {
          const px = x + 2 + r() * 5,
            py = top + 2 + r() * (122 - top);
          stroke(g, px, py, px + (r() < 0.6 ? -1 : 1), py + 3 + r() * 11, 1, k % 2 ? "#65523f" : "#8a6e4e");
        }
      }
      for (let y of [53, 102]) {
        poly(
          g,
          [
            [20, y],
            [100, y + 1],
            [108, y + 5],
            [99, y + 9],
            [20, y + 8],
          ],
          "#41453d",
        );
        stroke(g, 22, y, 98, y + 1, 1, "#848575");
        for (let x of [24, 49, 81, 98]) {
          disk(g, x, y + 4, 2, "#343c35");
          rect(g, x - 1, y + 3, 2, 1, "#94917c");
        }
      }
      rect(g, 90, 70, 10, 16, locked ? "#aa8a51" : "#606457");
      rect(g, 92, 72, 6, 12, locked ? "#c0a26a" : "#6e7360");
      if (locked) {
        disk(g, 95, 76, 2, "#4e4836");
        rect(g, 94, 77, 2, 4, "#4e4836");
      } else {
        disk(g, 95, 80, 5, "#333b33");
        disk(g, 95, 80, 3, "#9a997e");
        disk(g, 95, 80, 2, "#645e47");
      }
    });
  }
  let ceilingTexture = null,
    ceilingPixels = null;
  function ceiling(g, cam) {
    const { w, hz, f, x, y, sa, ca } = cam;
    if (!ceilingTexture) {
      const c = canvas(128, 128),
        s = c.getContext("2d"),
        r = random(899);
      rect(s, 0, 0, 128, 128, "#49463c");
      for (let j = 0; j < 8; j++) {
        rect(s, j * 16 + 1, 0, 15, 128, ["#48483e", "#48453d", "#44453b", "#4a493f"][j % 4]);
        rect(s, j * 16, 0, 1, 128, "#363c34");
        for (let k = 0; k < 65; k++)
          rect(s, j * 16 + 2 + r() * 11, r() * 128, 1, 3 + r() * 9, k % 2 ? "#45443b" : "#4d4c40");
      }
      rect(s, 0, 22, 128, 14, "#383831");
      rect(s, 0, 22, 128, 2, "#535041");
      rect(s, 0, 33, 128, 4, "#2e332d");
      for (let k = 0; k < 58; k++) rect(s, r() * 128, 24 + r() * 8, 3 + r() * 11, 1, "#46453b");
      const pix = s.getImageData(0, 0, 128, 128).data;
      ceilingTexture = [];
      for (let k = 0; k < 8; k++) {
        const t = new Uint32Array(16384),
          a = 0.79 - 0.05 * k;
        for (let n = 0; n < t.length; n++)
          t[n] = (255 << 24) | ((pix[n * 4 + 2] * a) << 16) | ((pix[n * 4 + 1] * a) << 8) | (pix[n * 4] * a);
        ceilingTexture.push(t);
      }
    }
    if (!ceilingPixels || ceilingPixels.width !== w || ceilingPixels.height !== hz)
      ceilingPixels = g.createImageData(w, hz);
    const out = new Uint32Array(ceilingPixels.data.buffer);
    for (let row = 0; row < hz; row++) {
      const d = (0.82 * f) / (hz - row),
        left = (-w * d) / (2 * f),
        dx = (d * ca) / f,
        dy = (d * sa) / f;
      let wx = x + sa * d + left * ca,
        wy = y - ca * d + left * sa;
      const tex = ceilingTexture[Math.min(7, Math.floor(d * 1.3))];
      for (let col = 0; col < w; col++, wx += dx, wy += dy)
        out[row * w + col] = tex[(Math.floor(wx * 64) & 127) + 128 * (Math.floor(wy * 64) & 127)];
    }
    g.putImageData(ceilingPixels, 0, 0);
  }
  function bricks(kind) {
    return bitmap("wall" + kind, 64, 64, (g) => {
      const r = random(19);
      rect(g, 0, 0, 64, 64, "#45473e");
      for (let y = 0; y < 8; y++)
        for (let x = -1; x < 5; x++) {
          const a = x * 16 + (y % 2) * 8,
            b = y * 8;
          rect(
            g,
            a + 1,
            b + 1,
            15,
            7,
            ["#747566", "#7e7c69", "#898470", "#797867", "#6f7366"][Math.floor(r() * 5)],
          );
          rect(g, a + 2, b + 1, 12, 1, "#97917c");
          rect(g, a + 3, b + 6, 12, 1, "#606356");
          for (let j = 0; j < 5; j++) rect(g, a + 2 + r() * 11, b + 2 + r() * 3, 1 + r() * 3, 1, "#858371");
        }
      if (kind === "L" || kind === "D") {
        poly(
          g,
          [
            [7, 64],
            [7, 23],
            [10, 17],
            [16, 11],
            [26, 7],
            [38, 7],
            [48, 12],
            [54, 18],
            [57, 24],
            [57, 64],
          ],
          "#34382f",
        );
        poly(
          g,
          [
            [11, 64],
            [11, 25],
            [14, 19],
            [21, 14],
            [29, 11],
            [36, 11],
            [44, 15],
            [50, 20],
            [53, 26],
            [53, 64],
          ],
          "#826447",
        );
        for (let x = 15; x < 52; x += 6)
          rect(g, x, 22 - Math.floor(Math.sin((x / 64) * Math.PI) * 9), 1, 55, "#544733");
        for (let y of [28, 50]) {
          rect(g, 12, y, 39, 4, "#43483e");
          for (let x of [14, 24, 45]) rect(g, x, y + 1, 2, 1, "#94927b");
        }
        rect(g, 43, 36, 3, 5, kind === "L" ? "#d0ae68" : "#b0a684");
      }
      if ("ISTHG".includes(kind)) {
        rect(g, 0, 0, 64, 64, "#ae956c");
        [2, 31, 60].forEach((x) => rect(g, x, 0, 3, 64, "#554636"));
        rect(g, 0, 31, 64, 4, "#554636");
        pane(g, (x, y) => [x * 64, y * 64], 0.15, 0.12, 0.17, 0.26, r);
        rect(g, 35, 36, 19, 28, "#594834");
        rect(g, 48, 49, 2, 2, "#d4ac63");
        const field = { I: "#a5683b", S: "#577357", T: "#62788a", H: "#8c5243", G: "#686278" }[kind];
        poly(
          g,
          [
            [6, 34],
            [24, 34],
            [24, 51],
            [15, 57],
            [6, 51],
          ],
          field,
        );
        if (kind === "I") {
          rect(g, 10, 39, 8, 8, "#e4be71");
          rect(g, 18, 40, 3, 5, "#d4ad67");
        } else if (kind === "T") {
          stroke(g, 14, 38, 14, 50, 2, "#eed7a3");
          stroke(g, 9, 43, 20, 43, 1, "#eed7a3");
        } else if (kind === "H") {
          stroke(g, 12, 50, 19, 37, 2, "#dfd4b8");
          stroke(g, 11, 44, 17, 48, 1, "#c0ae83");
        } else
          poly(
            g,
            [
              [15, 37],
              [20, 44],
              [15, 51],
              [10, 44],
            ],
            "#dbc286",
          );
      }
    });
  }
  function foliage(variant) {
    return bitmap("broadleaf" + variant, 125, 134, (g) => {
      const r = random(2081 + variant);
      poly(
        g,
        [
          [56, 132],
          [59, 100],
          [55, 76],
          [39, 55],
          [37, 49],
          [53, 64],
          [67, 78],
          [77, 53],
          [91, 35],
          [87, 48],
          [79, 74],
          [68, 92],
          [68, 119],
          [73, 133],
        ],
        "#464438",
      );
      stroke(g, 62, 128, 64, 84, 3, "#776e4f");
      stroke(g, 64, 86, 78, 63, 2, "#756d4e");
      const clouds = [];
      for (let i = 0; i < 46; i++) {
        const a = r() * TAU,
          dist = Math.sqrt(r());
        clouds.push([60 + Math.cos(a) * 46 * dist, 44 + Math.sin(a) * 30 * dist, 7 + r() * 12]);
      }
      clouds.sort((a, b) => b[1] - a[1]);
      for (const [x, y, s] of clouds) {
        const top = y < 44;
        const palette = top
          ? ["#586b4a", "#718252", "#83915a", "#a3a66a"]
          : ["#354e40", "#445d46", "#566d4b", "#708253"];
        for (let j = 0; j < 13; j++) {
          const a = r() * TAU,
            dist = r() * s;
          const u = x + Math.cos(a) * dist,
            v = y + Math.sin(a) * dist;
          disk(g, u, v, 3 + Math.floor(r() * 4), palette[j < 5 ? 0 : j < 9 ? 1 : 2]);
          if (j > 6) {
            rect(g, u - 3, v - 3, 3 + r() * 3, 2, palette[3]);
            rect(g, u - 3, v - 1, 2, 1, palette[3]);
          }
        }
      }
    });
  }
  function cart() {
    return bitmap("handcart", 84, 56, (g) => {
      const r = random(382);
      // A market handcart laden with covered baskets and red winter apples.
      const wheel = (x, y, a) => {
        disk(g, x, y, a, "#443c30");
        disk(g, x, y, a - 2, "#94794f");
        disk(g, x, y, a - 3, "#535743");
        for (let i = 0; i < 8; i++)
          stroke(
            g,
            x,
            y,
            x + Math.cos((i * Math.PI) / 4) * (a - 2),
            y + Math.sin((i * Math.PI) / 4) * (a - 2),
            1,
            "#a08656",
          );
        disk(g, x, y, 2, "#5e4d36");
        rect(g, x, y, 1, 1, "#d2b381");
      };
      wheel(21, 39, 10);
      stroke(g, 35, 34, 75, 36, 2, "#6f5d3c");
      stroke(g, 37, 30, 77, 31, 2, "#8f764e");
      poly(
        g,
        [
          [4, 19],
          [39, 12],
          [58, 17],
          [54, 34],
          [24, 44],
          [8, 37],
        ],
        "#5a4932",
      );
      poly(
        g,
        [
          [5, 19],
          [26, 25],
          [26, 40],
          [10, 35],
        ],
        "#947145",
      );
      poly(
        g,
        [
          [26, 24],
          [58, 16],
          [54, 32],
          [26, 41],
        ],
        "#a27e4c",
      );
      for (let j = 0; j < 3; j++) {
        stroke(g, 7, 22 + j * 4, 26, 27 + j * 4, 1, "#665438");
        stroke(g, 27, 27 + j * 4, 55, 20 + j * 4, 1, "#765c3b");
      }
      for (let k = 0; k < 45; k++) {
        const x = 12 + r() * 36,
          y = 15 + r() * 6 - (x - 20) * 0.15;
        disk(
          g,
          x,
          y,
          1 + Math.floor(r() * 1.6),
          ["#85513b", "#9f593a", "#b46c43", "#bf8e53", "#849052"][k % 5],
        );
      }
      stroke(g, 5, 19, 25, 25, 2, "#bd995c");
      stroke(g, 26, 24, 57, 16, 2, "#c09b62");
      wheel(32, 39, 12);
      stroke(g, 56, 31, 58, 40, 2, "#67583d");
    });
  }
  function garden(v) {
    return bitmap("garden" + v, 72, 29, (g) => {
      const r = random(782 + v);
      for (let j = 0; j < 74; j++) {
        const x = 3 + r() * 65,
          y = 16 + r() * 9 - Math.sin((x / 70) * Math.PI) * 3,
          s = 2 + r() * 8;
        stroke(
          g,
          x,
          y,
          x - s * 0.32,
          y - s,
          1,
          ["#4c6143", "#778557", "#85925d", "#4d5c3d", "#626e47"][j % 5],
        );
        if (j % 4 === 0) {
          rect(g, x - s * 0.32 - 1, y - s - 1, 3, 2, ["#dec184", "#b38260", "#c6b997"][j % 3]);
        }
      }
    });
  }
  function banner() {
    return bitmap("standard", 42, 84, (g) => {
      stroke(g, 11, 9, 12, 79, 2, "#4c4636");
      stroke(g, 12, 8, 13, 77, 1, "#ad9362");
      rect(g, 9, 77, 6, 4, "#706446");
      poly(
        g,
        [
          [10, 8],
          [12, 2],
          [15, 8],
          [12, 10],
        ],
        "#dbc18b",
      );
      stroke(g, 10, 13, 36, 17, 2, "#8b7753");
      stroke(g, 13, 24, 26, 16, 1, "#5e523c");
      poly(
        g,
        [
          [17, 14],
          [34, 17],
          [33, 43],
          [26, 49],
          [17, 40],
        ],
        "#6d4235",
      );
      poly(
        g,
        [
          [18, 15],
          [31, 17],
          [31, 41],
          [25, 46],
          [19, 39],
        ],
        "#a15d3e",
      );
      stroke(g, 20, 16, 20, 38, 1, "#c88f57");
      stroke(g, 29, 18, 28, 40, 1, "#7c4535");
      poly(
        g,
        [
          [24, 20],
          [25, 26],
          [28, 27],
          [25, 29],
          [25, 35],
          [23, 30],
          [21, 28],
          [23, 26],
        ],
        "#ebc480",
      );
      rect(g, 24, 36, 2, 2, "#dcb873");
    });
  }
  function townObjects(level) {
    if (towns.has(level)) return towns.get(level);
    const gameMap = level.grid,
      list = [];
    const add = (x, y, height, img, mirror = false, foot = 0.93) =>
      list.push({ x, y, height, img, mirror, foot });
    for (let y = 1; y < gameMap.length - 1; y++)
      for (let x = 1; x < gameMap[y].length - 1; x++) {
        const type = gameMap[y][x];
        if ("ISHTG".includes(type)) {
          const h = type === "I" ? 2.85 : type === "T" ? 3.15 : type === "G" ? 2.26 : 2.42;
          add(x, y, h, house(type, (x + y) % 4), x > 7);
        }
      }
    add(7, 1.08, 3.65, gate(), false, 1);
    // Additional rooftops, orchard trees and pines frame the inhabited street.
    add(4.6, 2.7, 2.38, house("S", 1));
    add(9.7, 2.5, 2.65, house("I", 3), true);
    add(4.18, 8.85, 3.05, foliage(0));
    add(10.55, 8.55, 3.25, foliage(1));
    add(8.98, 7.8, 0.73, cart());
    add(8.54, 5.1, 1.88, banner());
    add(5.48, 8.1, 0.34, garden(1));
    add(8.95, 8.6, 0.36, garden(2));
    add(5.42, 6.0, 0.34, garden(3));
    add(8.79, 4.85, 0.33, garden(0));
    add(5.1, 4.1, 1.58, foliage(2));
    add(9.1, 3.1, 2.55, tree(1));
    add(4.6, 3.4, 2.7, tree(0));
    add(6.1, 1.4, 1.4, tree(3));
    add(8.65, 1.15, 1.85, tree(2));
    add(4.9, 8.05, 1.22, lamp());
    add(9.45, 5.2, 1.24, lamp(), true);
    add(5.1, 5.5, 1.1, lamp());
    for (let j = 1; j < 13; j += 2) {
      add(0.9, j, 2.2 + (j % 3) * 0.24, tree(j % 4));
      add(13, j + 0.25, 2.43 + (j % 2) * 0.2, tree((j + 1) % 4));
    }
    towns.set(level, list);
    return list;
  }
  const groundTextures = new Map();
  function groundTexture(town) {
    if (groundTextures.has(town)) return groundTextures.get(town);
    const tex = paving(town),
      data = tex.getContext("2d").getImageData(0, 0, 128, 128).data;
    const moss = canvas(128, 128),
      m = moss.getContext("2d"),
      r = random(12);
    rect(m, 0, 0, 128, 128, "#72805a");
    for (let i = 0; i < 420; i++) {
      const x = r() * 128,
        y = r() * 128;
      rect(m, x, y, 4 + r() * 8, 2 + r() * 5, ["#687451", "#859063", "#8f9266", "#6b7955"][i % 4]);
    }
    for (let i = 0; i < 1300; i++) {
      const x = r() * 128,
        y = r() * 128;
      rect(m, x, y, 1 + r() * 4, 1 + r() * 2, ["#828862", "#96966b", "#626c4e", "#a5a177", "#777d56"][i % 5]);
    }
    const grass = m.getImageData(0, 0, 128, 128).data;
    const result = [];
    // Cache distance lighting to keep floor casting inexpensive on tablets.
    for (let k = 0; k < 16; k++) {
      const texture = new Uint32Array(32768),
        l = town ? (k < 8 ? 0.94 + k * 0.012 : 0.65 + (k - 8) * 0.014) : 0.86 - (k % 8) * 0.097;
      for (let i = 0; i < texture.length; i++) {
        const j = (i % 16384) * 4,
          s = i < 16384 ? data : grass;
        texture[i] =
          (255 << 24) | (((s[j + 2] * l) | 0) << 16) | (((s[j + 1] * l) | 0) << 8) | ((s[j] * l) | 0);
      }
      result.push(texture);
    }
    groundTextures.set(town, result);
    return result;
  }
  let floorImage = null;
  function ground(g, cam, town) {
    const { w, h, hz, f, x, y, sa, ca } = cam;
    const hh = h - hz;
    if (!floorImage || floorImage.width !== w || floorImage.height !== hh)
      floorImage = g.createImageData(w, hh);
    const out = new Uint32Array(floorImage.data.buffer),
      textures = groundTexture(town);
    for (let row = 0; row < hh; row++) {
      const d = (0.72 * f) / (row + 0.6),
        left = (-w / (2 * f)) * d;
      const sx = (d * ca) / f,
        sy = (d * sa) / f;
      let wx = x + sa * d + left * ca,
        wy = y - ca * d + left * sa;
      const light = Math.min(7, Math.floor(d * 1.4)),
        texture = textures[light],
        shadeTexture = textures[light + 8];
      for (let col = 0; col < w; col++, wx += sx, wy += sy) {
        let u = Math.floor(wx * 64) & 127,
          v = Math.floor(wy * 64) & 127;
        const turf =
          town && Math.abs(wx - 7) > 1.24 + 0.25 * Math.sin(wy * 0.65) + 0.0027 * ((u * 7 + v * 11) % 39);
        const underEave = town && ((wx < 5.7 && wy > 4 && wy < 9.9) || (wx > 8.7 && wy > 3.7 && wy < 10.6));
        const leafShadow = town && wy > 9.25 && wx < 5.1 + (wy - 9.25) * 1.04 && v * 0.23 + u * 0.3 < 48;
        out[row * w + col] = (underEave || leafShadow ? shadeTexture : texture)[
          (turf ? 16384 : 0) + v * 128 + u
        ];
      }
    }
    g.putImageData(floorImage, 0, hz);
  }
  function panorama(g, cam) {
    const skyArt = sky(),
      { w, h, hz, angle } = cam;
    const skyHeight = Math.round(h * 0.66),
      skyWidth = Math.round((skyHeight / 180) * 1536);
    const offset = ((angle % TAU) / TAU + 0.5) * skyWidth;
    const x = Math.round(w / 2 - offset);
    for (let n = -1; n <= 2; n++) {
      const pos = x + n * skyWidth;
      if (pos < w && pos + skyWidth > 0) g.drawImage(skyArt, pos, hz - skyHeight, skyWidth, skyHeight + 1);
    }
  }
  function walls(g, cam, level, town, state) {
    const { w, h, hz, f, x, y, sa, ca } = cam;
    if (depths.length !== w) depths = new Float32Array(w);
    for (let u = 0; u < w; u++) {
      const plane = (u + 0.5 - w / 2) / f,
        dx = sa + plane * ca,
        dy = -ca + plane * sa;
      let cx = Math.floor(x + 0.5),
        cy = Math.floor(y + 0.5),
        sx = dx >= 0 ? 1 : -1,
        sy = dy >= 0 ? 1 : -1;
      const stepX = 1 / (Math.abs(dx) || 1e-8),
        stepY = 1 / (Math.abs(dy) || 1e-8);
      let tx = (0.5 + (cx - x) * sx) * stepX,
        ty = (0.5 + (cy - y) * sy) * stepY,
        d = 0,
        side = 0,
        kind = "#";
      for (let j = 0; j < 75; j++) {
        if (tx < ty) {
          d = tx;
          tx += stepX;
          cx += sx;
          side = 0;
        } else {
          d = ty;
          ty += stepY;
          cy += sy;
          side = 1;
        }
        kind = level.grid[cy]?.[cx] || "#";
        if (WALL.includes(kind)) break;
      }
      depths[u] = d = Math.max(0.018, d);
      const border = cx <= 0 || cy <= 0 || cx >= level.grid[0].length - 1 || cy >= level.grid.length - 1;
      const height = town ? (border ? 0.36 : 0.53) : 1.54;
      let q = side ? x + dx * d + 0.5 : y + dy * d + 0.5;
      let wallArt;
      if (town) wallArt = bricks(kind);
      else if (kind === "D" || kind === "L") wallArt = dungeonDoor(kind === "L");
      else wallArt = stonework((cx * 3 + cy * 7) & 3, (cx + cy) % 5 === 0);
      const tex = Math.floor((q - Math.floor(q)) * wallArt.width),
        top = hz - ((height - 0.72) * f) / d,
        bottom = hz + (0.72 * f) / d;
      g.drawImage(
        wallArt,
        tex,
        0,
        1,
        wallArt.height,
        u,
        Math.floor(top),
        1,
        Math.max(1, Math.ceil(bottom - top) + 1),
      );
      const shade = town ? 0.14 + (side ? 0.07 : 0) : Math.min(0.82, 0.12 + d * 0.065 + (side ? 0.12 : 0));
      g.fillStyle = "rgba(20,25,24," + shade + ")";
      g.fillRect(u, Math.floor(top), 1, Math.ceil(bottom - top) + 1);
      if (town && border && tex % 16 < 10) rect(g, u, top - 2, 1, 3, "#888c78");
    }
  }
  function stairs(up) {
    return bitmap("steps" + up, 62, 46, (g) => {
      if (up) {
        for (let j = 0; j < 7; j++) {
          const a = 7 - j;
          poly(
            g,
            [
              [a * 2, 40 - j * 5],
              [58 - a * 0.75, 40 - j * 5],
              [60 - a, 43 - j * 5],
              [a, 43 - j * 5],
            ],
            "#a7a18a",
          );
          rect(g, a, 44 - j * 5, 59 - a * 2, 2, "#5c5d51");
        }
      } else {
        poly(
          g,
          [
            [2, 44],
            [10, 18],
            [50, 18],
            [60, 44],
          ],
          "#373b34",
        );
        for (let j = 0; j < 5; j++) rect(g, 10 - j * 1.2, 20 + j * 5, 40 + j * 2, 2, "#79796a");
      }
    });
  }
  function treasure() {
    return bitmap("chest", 38, 30, (g) => {
      poly(
        g,
        [
          [2, 26],
          [2, 12],
          [5, 7],
          [29, 4],
          [34, 7],
          [36, 22],
          [28, 27],
          [6, 29],
        ],
        "#473f31",
      );
      poly(
        g,
        [
          [4, 13],
          [7, 9],
          [28, 6],
          [31, 10],
          [29, 14],
          [6, 17],
        ],
        "#b18a50",
      );
      poly(
        g,
        [
          [5, 18],
          [28, 15],
          [28, 25],
          [5, 27],
        ],
        "#806644",
      );
      for (const x of [9, 23]) {
        stroke(g, x, 8, x - 2, 15, 2, "#e0b574");
        stroke(g, x - 2, 15, x - 2, 25, 2, "#b59a66");
      }
      rect(g, 16, 15, 4, 5, "#d7b06b");
    });
  }
  function droppedPack() {
    return bitmap("pack", 28, 18, (g) => {
      poly(
        g,
        [
          [4, 16],
          [3, 11],
          [6, 7],
          [12, 5],
          [10, 1],
          [17, 2],
          [20, 0],
          [19, 6],
          [24, 11],
          [24, 15],
          [18, 17],
          [8, 17],
        ],
        "#6d563b",
      );
      poly(
        g,
        [
          [6, 14],
          [7, 9],
          [14, 6],
          [17, 8],
          [12, 15],
        ],
        "#b08e59",
      );
      rect(g, 13, 5, 7, 2, "#cbb583");
      rect(g, 8, 17, 13, 1, "#3a3e31");
    });
  }
  function markedTrap() {
    return bitmap("markedtrap", 38, 12, (g) => {
      poly(
        g,
        [
          [1, 10],
          [10, 2],
          [27, 2],
          [36, 10],
        ],
        "#574736",
      );
      stroke(g, 7, 9, 26, 3, 1, "#dc9464");
      stroke(g, 12, 3, 30, 9, 1, "#dc9464");
    });
  }
  function viewSprites(g, cam, list, town) {
    const { w, h, hz, f, x, y, sa, ca } = cam,
      visible = [];
    for (const o of list) {
      const dx = o.x - x,
        dy = o.y - y,
        z = dx * sa - dy * ca;
      if (z < 0.27) continue;
      const scale = f / z,
        sh = o.height * scale,
        sw = (sh * o.img.width) / o.img.height;
      const mid = w / 2 + (dx * ca + dy * sa) * scale,
        base = hz + 0.72 * scale;
      const left = mid - sw / 2;
      if (left > w || left + sw < 0) continue;
      visible.push({ o, z, sh, sw, base, left, top: base - sh * (o.foot ?? 0.96) });
    }
    visible.sort((a, b) => b.z - a.z);
    for (const { o, z, sh, sw, base, left, top } of visible) {
      g.save();
      if (!town) {
        let start = -1;
        g.beginPath();
        const end = Math.min(w, Math.ceil(left + sw));
        for (let i = Math.max(0, Math.floor(left)); i <= end; i++) {
          if (i < end && depths[i] + 0.04 >= z) {
            if (start === -1) start = i;
          } else if (start >= 0) {
            g.rect(start, 0, i - start, h);
            start = -1;
          }
        }
        g.clip();
      }
      g.fillStyle = town ? "rgba(37,48,41,.33)" : "rgba(14,16,13,.45)";
      g.beginPath();
      g.ellipse(left + sw * 0.48, base, sw * 0.39, Math.max(1, sh * 0.031), 0, 0, TAU);
      g.fill();
      if (o.mirror) {
        g.translate(Math.round(left + sw), Math.round(top));
        g.scale(-1, 1);
        g.drawImage(o.img, 0, 0, Math.ceil(sw), Math.ceil(sh));
      } else g.drawImage(o.img, Math.round(left), Math.round(top), Math.ceil(sw), Math.ceil(sh));
      g.restore();
    }
  }
  function draw(target, state, level, pose) {
    if (!target || !state || !level?.grid) return;
    const w = Math.min(520, target.width || 520),
      h = Math.max(120, Math.round((w * (target.height || 260)) / (target.width || 520)));
    if (!buffer || buffer.width !== w || buffer.height !== h) buffer = canvas(w, h);
    const g = buffer.getContext("2d"),
      angle = pose?.angle ?? (state.dir * Math.PI) / 2;
    const town = state.area === "town";
    const cam = {
      w,
      h,
      hz: Math.round(h * (town ? 0.61 : 0.49)),
      f: w * 0.505,
      x: pose?.x ?? state.x,
      y: pose?.y ?? state.y,
      angle,
      sa: Math.sin(angle),
      ca: Math.cos(angle),
    };
    g.imageSmoothingEnabled = false;
    if (town) panorama(g, cam);
    else ceiling(g, cam);
    ground(g, cam, town);
    walls(g, cam, level, town, state);
    const objects = town ? townObjects(level).slice() : [];
    if (!town) {
      const add = (p, img, height) => objects.push({ x: p[0], y: p[1], img, height });
      if (level.start) add(level.start, stairs(true), 0.48);
      if (level.exit) add(level.exit, stairs(false), 0.34);
      if (
        level.quest &&
        !state.cleared?.[level.id + "/event"] &&
        !(state.floor === 0 && state.quests?.[state.id]?.relic) &&
        level.grid[level.quest[1]]?.[level.quest[0]] === "!"
      )
        add(level.quest, treasure(), 0.33);
      for (const c of level.caches || []) if (!state.cleared?.[c.id]) add([c.x, c.y], treasure(), 0.32);
    }
    for (const hazard of level.traps || []) {
      if (state.seen?.[hazard.id] && !state.cleared?.[hazard.id])
        objects.push({ x: hazard.x, y: hazard.y, img: markedTrap(), height: 0.12 });
    }
    const groundPrefix = state.id + "/" + state.area + (town ? "" : "/" + state.floor) + "/";
    for (const [key, items] of Object.entries(state.ground || {})) {
      if (!items.length || !key.startsWith(groundPrefix)) continue;
      const [x, y] = key.slice(groundPrefix.length).split(",").map(Number);
      objects.push({ x, y, img: droppedPack(), height: 0.23 });
    }
    for (const e of level.entities || []) {
      if (state.cleared?.[e.id] || typeof Figures === "undefined") continue;
      if (
        !state.seen?.[e.id] &&
        typeof Monsters !== "undefined" &&
        Monsters.get(e.name)?.special.includes("ambush") &&
        Math.max(Math.abs(state.x - e.x), Math.abs(state.y - e.y)) > 1
      )
        continue;
      const img = bitmap("enemy" + e.name, 48, 48, (g) => Figures.monster(g.canvas, e.name));
      objects.push({ x: e.x, y: e.y, img, height: 0.93 });
    }
    viewSprites(g, cam, objects, town);
    if (town && Number.isFinite(state.minutes)) {
      const hour = (state.minutes / 60) % 24;
      if (hour < 6 || hour >= 19) {
        g.fillStyle = "rgba(21,35,71,.5)";
        g.fillRect(0, 0, w, h);
      } else if (hour < 7 || hour >= 17) {
        g.fillStyle = "rgba(178,109,56,.13)";
        g.fillRect(0, 0, w, h);
      }
    }
    const display = target.getContext("2d");
    display.imageSmoothingEnabled = false;
    display.drawImage(buffer, 0, 0, target.width, target.height);
  }
  return { draw };
})();
