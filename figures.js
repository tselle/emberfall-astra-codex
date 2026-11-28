/* Pixel portraits and vector heraldry for the tactical tabletop. */
var Figures = (() => {
  "use strict";

  const faces = [
    {
      skin: ["#52352c", "#825039", "#aa704d", "#ca9065", "#ebba85"],
      hair: ["#302725", "#51382d", "#754e35", "#a07448"],
      cloth: ["#27353d", "#415968", "#68838c", "#a7b8b4"],
      bg: ["#202a30", "#34464a", "#435354"],
    },
    {
      skin: ["#665043", "#986e55", "#bf9470", "#e2ba90", "#f3d6a7"],
      hair: ["#4c5551", "#717e75", "#aab5a5", "#d6d7bd"],
      cloth: ["#233a34", "#3e5948", "#638263", "#9cab81"],
      bg: ["#25372e", "#394b3e", "#4c5c48"],
    },
    {
      skin: ["#623b30", "#945b42", "#bd8055", "#daa06d", "#f1c18a"],
      hair: ["#492e22", "#794528", "#a96635", "#d0944e"],
      cloth: ["#3b4143", "#5c6564", "#92948a", "#c2c0a9"],
      bg: ["#322b29", "#4b4139", "#605044"],
    },
    {
      skin: ["#4e312e", "#794b3d", "#a1644f", "#c58969", "#e2a985"],
      hair: ["#211f2a", "#34303d", "#4a414c", "#6a555e"],
      cloth: ["#352d48", "#58435e", "#836185", "#ad88a3"],
      bg: ["#2b2736", "#413b49", "#574b59"],
    },
    {
      skin: ["#564036", "#825a43", "#af7d57", "#cd986a", "#eabd89"],
      hair: ["#322b23", "#4e4230", "#6e583f", "#927548"],
      cloth: ["#283c3c", "#3c5955", "#608075", "#8f9c86"],
      bg: ["#233136", "#374b4b", "#495c55"],
    },
    {
      skin: ["#614137", "#92614b", "#bb8664", "#dcab80", "#f4cca0"],
      hair: ["#534737", "#837147", "#b9a064", "#e6d199"],
      cloth: ["#38444f", "#566b79", "#889da4", "#c3cec9"],
      bg: ["#2e3337", "#424b50", "#535d5f"],
    },
  ];
  const brass = ["#524131", "#896942", "#bb985b", "#ead193"];
  const leather = ["#392b28", "#604338", "#8b6144", "#b38b60"];
  const portraitCache = [],
    creatureCache = new Map();

  function surface(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // Centre-sampled scan conversion keeps all contours on the same pixel grid.
  function brushes(ctx) {
    function box(color, x, y, w = 1, h = 1) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    function line(color, x0, y0, x1, y1) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let j = 0; j <= steps; j++)
        box(color, Math.round(x0 + ((x1 - x0) * j) / steps), Math.round(y0 + ((y1 - y0) * j) / steps));
    }
    function poly(color, ...p) {
      let lo = Infinity,
        hi = -Infinity;
      for (let i = 1; i < p.length; i += 2) {
        lo = Math.min(lo, p[i]);
        hi = Math.max(hi, p[i]);
      }
      for (let y = Math.ceil(lo); y < hi; y++) {
        const edges = [],
          v = y + 0.5;
        for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
          const a = p[i + 1],
            b = p[j + 1];
          if ((a <= v && b > v) || (b <= v && a > v)) edges.push(p[i] + ((p[j] - p[i]) * (v - a)) / (b - a));
        }
        edges.sort((a, b) => a - b);
        for (let i = 0; i < edges.length; i += 2) {
          const x = Math.ceil(edges[i] - 0.5);
          box(color, x, y, Math.ceil(edges[i + 1] - 0.5) - x);
        }
      }
    }
    return { box, line, poly };
  }

  function background(pal, b, seed) {
    b.box(pal[0], 0, 0, 52, 54);
    let n = seed + 91;
    function rnd() {
      n = (Math.imul(n, 1664525) + 1013904223) | 0;
      return (n >>> 0) / 4294967296;
    }
    for (let y = 0; y < 54; y += 2) {
      for (let x = 0; x < 52; x += 2) {
        const light = 1 - Math.hypot((x - 19) / 42, (y - 16) / 48) + rnd() * 0.15;
        b.box(pal[light > 0.74 ? 2 : light > 0.24 ? 1 : 0], x, y, 2, 2);
      }
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(rnd() * 52),
        y = Math.floor(rnd() * 54);
      b.box(pal[rnd() > 0.5 ? 1 : 0], x, y, 1 + Math.floor(rnd() * 3));
    }
  }

  function portraitPlate(i) {
    const cvs = surface(52, 54),
      c = cvs.getContext("2d"),
      b = brushes(c);
    const { skin: s, hair: h, cloth: k, bg } = faces[i],
      { box, line, poly } = b;
    const female = i === 1 || i === 3 || i === 5,
      metal = i === 0 || i === 2 || i === 5,
      hood = i === 1 || i === 4;
    background(bg, b, i * 67);

    // Mantle, collar and overlapping armour plates.
    poly(k[0], -2, 55, 3, 46, 11, 42, 20, 39, 30, 37, 39, 40, 48, 43, 55, 50, 55, 56);
    poly(k[1], 1, 55, 6, 47, 14, 43, 21, 42, 27, 49, 26, 54);
    poly(k[2], 1, 54, 8, 46, 17, 43, 12, 47, 6, 49, 4, 54);
    poly(k[1], 30, 54, 31, 43, 36, 40, 45, 42, 50, 48, 53, 54);
    if (metal) {
      poly(k[2], 35, 47, 39, 41, 45, 43, 50, 47, 48, 49, 40, 46);
      line(k[3], 38, 43, 43, 43);
      line(k[3], 44, 44, 47, 45);
      poly(k[0], 32, 54, 36, 48, 43, 47, 49, 50, 50, 52, 43, 50, 37, 51, 35, 54);
      line(k[2], 39, 51, 46, 52);
      poly(leather[1], 11, 42, 15, 41, 32, 54, 26, 54);
      line(leather[2], 11, 43, 26, 54);
      box(brass[2], 17, 47, 4, 2);
      box(leather[0], 18, 47, 2);
    } else {
      poly(k[2], 2, 54, 9, 47, 17, 44, 9, 50, 7, 54);
      poly(k[0], 31, 54, 37, 43, 43, 44, 39, 45);
      line(k[2], 38, 52, 43, 45);
      line(k[2], 12, 48, 10, 52);
      if (i === 1) {
        line(leather[2], 43, 42, 31, 53);
        line(leather[1], 44, 42, 33, 53);
      }
    }

    // Hair behind the ears and a cast shadow under the chin.
    if (female) {
      poly(
        h[0],
        13,
        17,
        16,
        8,
        25,
        5,
        34,
        7,
        38,
        14,
        39,
        32,
        43,
        43,
        37,
        46,
        32,
        42,
        29,
        35,
        20,
        36,
        16,
        43,
        11,
        43,
        13,
        33,
      );
      poly(h[1], 33, 18, 36, 17, 36, 30, 40, 42, 36, 40, 33, 34);
    }
    poly(s[0], 20, 32, 33, 29, 32, 37, 35, 40, 30, 45, 23, 47, 19, 43, 22, 39);
    poly(s[1], 22, 34, 32, 31, 30, 39, 32, 40, 26, 44, 22, 42);
    poly(s[2], 23, 37, 30, 34, 28, 39, 24, 41);
    if (!female && i !== 4) poly(k[0], 15, 38, 22, 39, 25, 45, 32, 39, 37, 39, 31, 47, 25, 49, 19, 44);
    if (i === 2) c.translate(0, 2);
    const jaw = female ? 23 : 21,
      chin = female ? 36 : 38;
    poly(
      s[0],
      14,
      15,
      18,
      9,
      29,
      8,
      35,
      13,
      36,
      23,
      32,
      30,
      29,
      34,
      jaw + 2,
      chin + 1,
      18,
      chin - 1,
      15,
      32,
      14,
      26,
      12,
      24,
    );
    poly(
      s[1],
      15,
      16,
      19,
      10,
      29,
      10,
      34,
      14,
      34,
      21,
      31,
      27,
      29,
      32,
      24,
      chin,
      19,
      chin - 2,
      16,
      31,
      15,
      26,
    );
    poly(
      s[2],
      15,
      17,
      20,
      12,
      28,
      12,
      31,
      16,
      30,
      21,
      28,
      24,
      29,
      27,
      26,
      32,
      22,
      35,
      19,
      34,
      17,
      29,
      15,
      25,
    );
    poly(s[3], 15, 18, 18, 14, 25, 13, 29, 16, 27, 18, 23, 19, 21, 22, 19, 20, 15, 20);
    poly(s[3], 16, 24, 19, 24, 19, 26, 16, 27);
    poly(s[3], 24, 24, 29, 22, 29, 24, 26, 27, 23, 27);
    line(s[4], 24, 24, 26, 23);

    // One ear is foreshortened by the three-quarter pose.
    if (i === 1) {
      poly(s[0], 31, 21, 42, 15, 39, 22, 34, 27, 31, 27);
      poly(s[2], 32, 22, 40, 17, 36, 23, 33, 25);
      line(s[3], 34, 21, 39, 18);
    } else {
      poly(s[1], 31, 21, 34, 19, 36, 20, 35, 25, 32, 28, 30, 27);
      poly(s[3], 32, 22, 34, 21, 34, 23, 32, 25);
      box(s[0], 32, 24);
    }
    const brow = female ? h[1] : h[0];
    line(brow, 14, 20, 17, 19);
    box(brow, 17, 19, 2);
    line(brow, 23, 20, 26, 18);
    box(brow, 26, 18, 3);
    box(s[0], 14, 22, 4);
    box("#d2c0a3", 15, 22, 2);
    box("#2d322f", 16, 22);
    box(s[0], 23, 22, 5);
    box("#dfcbb1", 24, 22, 3);
    box(i === 1 ? "#455c4e" : "#353638", 25, 22);
    box(s[1], 23, 23, 2);
    box(s[1], 15, 23, 2);
    line(s[1], 20, 22, 19, 27);
    poly(s[3], 20, 23, 22, 23, 21, 27, 23, 28, 20, 29, 18, 28);
    box(s[4], 20, 26, 1, 2);
    box(s[0], 18, 28, 2);
    box(s[1], 22, 28);
    line(female ? "#824b41" : s[0], 18, 31, 23, 31);
    box(s[1], 24, 30);
    box(female ? "#c5826c" : s[3], 20, 32, 3);
    line(s[3], 20, 34, 23, 34);
    if (i === 0 || i === 2) {
      const bottom = i === 2 ? 46 : 39;
      poly(
        h[0],
        14,
        23,
        16,
        25,
        16,
        29,
        18,
        30,
        20,
        29,
        24,
        29,
        25,
        30,
        29,
        27,
        32,
        23,
        32,
        30,
        29,
        36,
        24,
        bottom,
        19,
        bottom - 1,
        15,
        35,
        13,
        29,
      );
      poly(
        h[1],
        15,
        27,
        17,
        31,
        19,
        32,
        22,
        31,
        24,
        32,
        29,
        29,
        28,
        34,
        23,
        bottom - 2,
        19,
        bottom - 3,
        16,
        34,
      );
      line(h[2], 16, 31, 18, 34);
      line(h[2], 18, 35, 20, bottom - 3);
      line(h[2], 23, bottom - 4, 26, 33);
      line(h[2], 25, 32, 28, 30);
      box(h[2], 17, 30, 3);
      box(h[2], 22, 30, 2);
      box(s[1], 19, 32, 4);
      if (i === 2) {
        box(brass[1], 18, 40, 5, 2);
        box(brass[3], 19, 40, 3);
        box(brass[2], 25, 37, 3);
      }
    }
    if (hood) {
      poly(
        k[0],
        9,
        45,
        12,
        35,
        9,
        28,
        10,
        18,
        13,
        10,
        19,
        5,
        28,
        3,
        34,
        5,
        40,
        10,
        41,
        18,
        38,
        29,
        40,
        37,
        43,
        41,
        37,
        44,
        29,
        40,
        30,
        32,
        34,
        26,
        34,
        17,
        29,
        13,
        23,
        12,
        18,
        15,
        14,
        21,
        14,
        29,
        17,
        37,
        20,
        41,
        16,
        44,
      );
      poly(
        k[1],
        10,
        41,
        13,
        34,
        11,
        26,
        12,
        17,
        16,
        10,
        22,
        6,
        30,
        5,
        36,
        8,
        39,
        12,
        33,
        10,
        28,
        10,
        20,
        13,
        16,
        17,
        12,
        24,
        14,
        32,
        16,
        37,
      );
      poly(k[2], 11, 23, 12, 16, 18, 9, 25, 6, 30, 6, 24, 9, 20, 10, 16, 15);
      line(k[3], 14, 14, 19, 9);
      line(k[2], 32, 7, 37, 10);
      poly(k[1], 35, 16, 39, 18, 36, 28, 38, 35, 34, 39, 32, 37, 33, 32, 36, 25);
      line(k[2], 38, 20, 36, 27);
      line(k[2], 33, 36, 36, 32);
      if (i === 1) {
        poly(h[2], 15, 18, 19, 13, 25, 11, 29, 12, 24, 15, 20, 16, 17, 20, 16, 24);
        line(h[3], 17, 18, 22, 13);
        poly(h[2], 31, 15, 34, 17, 33, 26, 31, 31, 34, 37, 32, 43, 29, 45, 30, 38, 28, 32, 30, 26);
        line(h[3], 31, 31, 32, 35);
        line(h[1], 32, 36, 30, 39);
      } else {
        poly(
          h[1],
          15,
          17,
          21,
          12,
          29,
          12,
          33,
          16,
          31,
          20,
          28,
          18,
          27,
          16,
          23,
          17,
          24,
          14,
          20,
          17,
          19,
          15,
          16,
          19,
        );
        poly(k[0], 14, 30, 18, 32, 24, 32, 29, 29, 32, 28, 31, 36, 27, 40, 21, 41, 15, 37);
        line(k[1], 16, 32, 21, 35);
        line(k[2], 22, 35, 29, 31);
        line(k[1], 20, 38, 26, 37);
      }
    } else if (i === 2) {
      poly(
        k[0],
        9,
        23,
        10,
        13,
        15,
        7,
        22,
        3,
        30,
        3,
        36,
        7,
        39,
        13,
        39,
        23,
        35,
        28,
        32,
        27,
        32,
        19,
        24,
        17,
        17,
        19,
        14,
        22,
      );
      poly(k[1], 11, 18, 12, 12, 17, 7, 24, 5, 30, 5, 35, 9, 37, 15, 29, 13, 21, 14);
      poly(k[2], 13, 15, 16, 10, 22, 6, 26, 6, 21, 9, 19, 13);
      line(k[3], 17, 10, 22, 7);
      poly(brass[1], 10, 18, 17, 15, 26, 13, 33, 14, 37, 17, 36, 20, 28, 17, 19, 18, 11, 22);
      line(brass[3], 12, 18, 23, 15);
      line(brass[2], 25, 14, 32, 15);
      poly(k[2], 33, 18, 37, 20, 36, 24, 33, 26);
      box(brass[0], 34, 20, 2, 2);
      box(brass[3], 34, 20);
      c.translate(0, -2);
    } else {
      const long = i === 3 || i === 5;
      poly(
        h[0],
        11,
        21,
        11,
        14,
        14,
        8,
        19,
        5,
        27,
        3,
        34,
        6,
        38,
        11,
        38,
        20,
        34,
        26,
        31,
        25,
        32,
        18,
        28,
        16,
        25,
        12,
        20,
        15,
        16,
        17,
        14,
        22,
      );
      poly(
        h[1],
        12,
        18,
        13,
        12,
        18,
        7,
        26,
        5,
        32,
        6,
        37,
        11,
        33,
        10,
        29,
        9,
        31,
        13,
        28,
        12,
        25,
        10,
        20,
        13,
        17,
        14,
        15,
        18,
      );
      poly(h[2], 14, 13, 18, 8, 24, 6, 29, 6, 24, 8, 21, 9, 21, 10, 18, 11);
      line(h[2], 28, 8, 33, 10);
      line(h[3], 17, 10, 20, 8);
      if (long) {
        poly(
          h[1],
          31,
          12,
          35,
          13,
          35,
          18,
          33,
          22,
          34,
          28,
          32,
          32,
          34,
          36,
          32,
          42,
          29,
          45,
          30,
          39,
          29,
          35,
          30,
          29,
          29,
          26,
          31,
          21,
        );
        line(h[2], 33, 16, 32, 20);
        line(h[2], 31, 26, 32, 29);
        line(h[2], 31, 34, 32, 37);
        if (i === 5) {
          line(brass[1], 13, 17, 25, 14);
          line(brass[2], 14, 16, 26, 13);
          line(brass[2], 26, 13, 32, 14);
          box("#a9c8bd", 22, 14, 2, 2);
          box(brass[1], 29, 40, 4, 2);
          box(brass[3], 30, 40);
        } else {
          box(brass[2], 34, 26, 1, 3);
          box(brass[3], 33, 28);
          poly(k[2], 12, 42, 18, 39, 21, 43, 20, 49, 18, 45);
          poly(k[2], 26, 48, 30, 42, 35, 40, 32, 45);
          poly(brass[1], 22, 47, 25, 45, 28, 47, 25, 51);
          box("#a3b9b2", 24, 47, 2, 2);
        }
      } else {
        poly(h[1], 29, 12, 34, 12, 36, 15, 34, 19, 32, 20, 31, 24, 30, 22, 31, 16);
        line(h[2], 32, 13, 34, 15);
      }
    }
    if (i === 0) {
      line(s[1], 26, 17, 27, 19);
      line(s[3], 27, 20, 28, 21);
      box(s[1], 28, 23, 1, 2);
      box(brass[2], 33, 26);
    }
    if (i === 2) {
      box(h[1], 14, 21, 5, 2);
      box(h[1], 23, 20, 6, 2);
      box(h[3], 23, 20, 4);
      box(h[3], 15, 21, 2);
      box(s[3], 17, 29, 7, 2);
      box(s[0], 18, 30, 2);
      box(s[0], 22, 30, 2);
      poly(brass[1], 20, 8, 26, 6, 27, 7, 25, 15, 22, 17);
      line(brass[2], 23, 9, 23, 14);
      box(brass[3], 23, 8, 2);
      // Broader cheeks, helmet and shoulders give the dwarf a compact silhouette.
      const stout = surface(52, 54),
        sc = stout.getContext("2d");
      sc.imageSmoothingEnabled = false;
      sc.drawImage(cvs, 5, 1, 42, 53, 0, 4, 52, 50);
      sc.drawImage(cvs, 6, 0, 40, 2, 0, 0, 52, 4);
      return stout;
    }
    if (i === 3) {
      poly(h[0], 11, 19, 10, 17, 10, 13, 13, 10, 14, 11, 17, 8, 16, 13, 14, 14, 14, 17);
      line(h[2], 11, 15, 13, 12);
      line(h[1], 13, 18, 14, 16);
      box(h[1], 35, 8, 2);
      box(h[2], 35, 10, 1, 2);
      box(s[0], 26, 27);
      box(s[1], 27, 27);
    }
    if (i === 5) {
      box("#528177", 25, 22);
      box("#528177", 16, 22);
      line(brass[2], 35, 43, 38, 41);
      line(brass[1], 35, 44, 40, 42);
    }
    return cvs;
  }

  function hash(word) {
    let n = 0;
    for (const ch of String(word || "")) n = (Math.imul(n, 31) + ch.charCodeAt(0)) | 0;
    return n >>> 0;
  }

  function beastKind(name) {
    if (/dragon|drake|wyvern|wyrm|basilisk|lizard|serpent|snake|hydra|saur|crocodile/i.test(name)) return 0;
    if (/beetle|spider|scorpion|wasp|centipede|ant\b|insect|crab/i.test(name)) return 1;
    if (/wraith|spect|ghost|shade|wisp|spirit|phantom|banshee|elemental/i.test(name)) return 2;
    if (/wolf|hound|dog|rat|fox|bear|boar|badger|tiger|cat|lion|panther|weasel/i.test(name)) return 3;
    if (/skel|lich|bone|skull|ghoul|undead|zombie|wight/i.test(name)) return 4;
    if (/harpy|raven|vulture|bird|eagle|owl|bat|griff|hawk/i.test(name)) return 5;
    return 6;
  }

  function creature(name) {
    if (creatureCache.has(name)) return creatureCache.get(name);
    const result = surface(28, 32),
      { poly, box, line } = brushes(result.getContext("2d"));
    const kind = beastKind(name),
      seed = hash(name),
      dark = "#282829";
    const ramp =
      kind === 4
        ? ["#514c47", "#8e8a71", "#c3bea1", "#e4d6b4"]
        : kind === 2
          ? ["#364147", "#536768", "#7e9a95", "#b5ccc0"]
          : faces[seed % 6].cloth;
    if (/^(cellar|giant) rat$/i.test(name)) {
      const fur = /^giant/i.test(name) ? "#685246" : "#846c56";
      // Side profile: leave air between the bare tail and the arched back.
      line("#c39782", 18, 25, 24, 24);
      line("#bb8c79", 24, 24, 27, 21);
      line("#bb8c79", 27, 21, 26, 18);
      line("#ceaa93", 26, 18, 22, 16);
      line("#ceaa93", 22, 16, 21, 14);
      poly(dark, 1, 24, 7, 19, 12, 17, 16, 17, 20, 20, 21, 24, 19, 27, 9, 27, 6, 25);
      poly(fur, 2, 24, 8, 20, 12, 18, 16, 18, 19, 20, 20, 24, 17, 26, 9, 26, 6, 24);
      line("#aa9179", 11, 19, 15, 18);
      box(dark, 7, 16, 3, 5);
      box(fur, 6, 17, 4, 3);
      box("#d0a093", 7, 17, 2, 2);
      box("#201b1a", 5, 22);
      box("#d9a098", 1, 24);
      line("#b8aa96", 0, 21, 3, 23);
      line("#b8aa96", 0, 26, 3, 25);
      line("#cb9a84", 9, 26, 7, 27);
      line("#cb9a84", 18, 26, 15, 27);
    } else if (kind === 1) {
      for (let j = 0; j < 4; j++) {
        line(ramp[2], 11, 18 + j, 4 - j, 12 + j * 3);
        line(ramp[1], 4 - j, 12 + j * 3, 1, 18 + j * 3);
        line(ramp[2], 17, 17 + j, 24 + j, 11 + j * 3);
        line(ramp[1], 24 + j, 11 + j * 3, 27, 16 + j * 3);
      }
      poly(dark, 6, 16, 9, 10, 17, 9, 22, 14, 21, 21, 17, 25, 10, 24);
      poly(ramp[2], 8, 16, 12, 11, 17, 11, 20, 15, 19, 20, 13, 21, 9, 19);
      box(ramp[3], 11, 13, 4);
      box("#d8a677", 11, 22, 2);
      box("#d8a677", 16, 22, 2);
    } else if (kind === 0 || kind === 3) {
      poly(
        dark,
        1,
        14,
        6,
        12,
        8,
        6,
        12,
        10,
        17,
        9,
        23,
        13,
        25,
        19,
        28,
        16,
        27,
        22,
        23,
        23,
        23,
        28,
        20,
        30,
        18,
        25,
        12,
        24,
        9,
        29,
        6,
        29,
        7,
        22,
        3,
        20,
        1,
        19,
      );
      poly(ramp[1], 2, 15, 7, 13, 9, 9, 12, 13, 18, 11, 22, 14, 23, 20, 20, 23, 11, 21, 8, 19, 4, 19);
      poly(ramp[2], 7, 14, 10, 11, 13, 14, 17, 12, 20, 13, 17, 15, 14, 16, 9, 16);
      box(ramp[3], 6, 15);
      box(ramp[1], 20, 24, 2, 4);
      box(ramp[2], 7, 23, 2, 4);
      if (kind === 0) {
        poly(ramp[0], 13, 14, 13, 8, 22, 2, 21, 9, 26, 6, 23, 14, 17, 17);
        line(ramp[2], 14, 11, 21, 4);
      }
    } else if (kind === 5) {
      poly(
        dark,
        1,
        5,
        7,
        9,
        11,
        14,
        14,
        11,
        16,
        8,
        21,
        9,
        21,
        12,
        26,
        14,
        20,
        15,
        19,
        21,
        23,
        28,
        17,
        25,
        12,
        26,
        8,
        22,
        6,
        16,
        2,
        11,
      );
      poly(ramp[1], 2, 7, 9, 12, 13, 17, 17, 11, 20, 11, 17, 15, 16, 23, 12, 24, 9, 20);
      line(ramp[2], 4, 10, 11, 17);
      line(ramp[2], 6, 14, 11, 19);
      box(brass[3], 18, 11);
      box(brass[2], 12, 26, 2, 2);
    } else {
      poly(
        dark,
        3,
        31,
        6,
        23,
        7,
        17,
        10,
        14,
        8,
        10,
        9,
        6,
        13,
        3,
        19,
        4,
        22,
        9,
        20,
        14,
        23,
        17,
        26,
        25,
        22,
        26,
        21,
        31,
        16,
        31,
        14,
        26,
        12,
        31,
      );
      poly(
        ramp[1],
        8,
        21,
        10,
        16,
        15,
        15,
        19,
        16,
        23,
        22,
        20,
        24,
        18,
        21,
        20,
        29,
        16,
        28,
        14,
        24,
        10,
        29,
        6,
        30,
      );
      poly(ramp[2], 10, 9, 11, 6, 15, 5, 19, 7, 19, 12, 16, 15, 12, 14);
      box(dark, 11, 10, 2);
      box(dark, 16, 10, 2);
      line(ramp[2], 9, 18, 8, 23);
      line(ramp[2], 18, 17, 21, 21);
      if (kind === 4) {
        box(dark, 14, 12);
        line(ramp[3], 11, 18, 17, 19);
        line(ramp[3], 11, 20, 16, 21);
      }
      if (kind === 2) {
        poly(ramp[0], 8, 9, 11, 4, 16, 2, 22, 6, 22, 12, 20, 14, 19, 8, 15, 7, 12, 9, 10, 14);
      }
      if (kind === 6) {
        poly(ramp[2], 10, 8, 5, 5, 8, 13, 12, 13);
        poly(ramp[2], 19, 8, 25, 5, 21, 13, 18, 13);
        box(brass[2], 18, 12);
      }
    }
    creatureCache.set(name, result);
    return result;
  }

  // Each crest is a closed silhouette. Four coordinates describe a quadratic arc.
  const crests = {
    Fighter: [[0,-9],[3,-5],[1,2],[5,2],[5,4],[1,4],[1,8],[-1,8],[-1,4],[-5,4],[-5,2],[-1,2],[-3,-5]],
    Ranger: [[-6,7],[-5,-4,7,-8],[7,2,-2,4],[4,-5],[-3,2]],
    Cleric: [[-2,-8],[2,-8],[2,-3],[7,-3],[7,1],[2,1],[2,8],[-2,8],[-2,1],[-7,1],[-7,-3],[-2,-3]],
    Mage: [[0,-9],[2,-2],[7,0],[2,2],[0,9],[-2,2],[-7,0],[-2,-2]],
    Thief: [[-6,8],[-3,1],[-5,-1],[-3,-2],[-1,0],[7,-8],[6,-1,1,3],[2,5],[0,6],[-2,4]],
    Paladin: [[0,-8],[7,-5],[7,4,0,9],[-7,4,-7,-5]],
  };
  const beasts = [
    [[-6,8],[-5,0,0,-3],[-5,-4],[-2,-8],[1,-6],[5,-9],[4,-5],[8,-1],[6,1],[2,0],[0,2,4,8]], // drake
    [[0,-7],[3,-6],[4,-3],[8,-6],[5,-1],[8,2],[4,1],[7,7],[3,4],[0,10,-3,4],[-7,7],[-4,1],[-8,2],[-5,-1],[-8,-6],[-4,-3],[-3,-6]],
    [[-7,6],[-5,2,-4,-3],[-3,-9,3,-8],[8,-6,5,-1],[1,3,6,6],[3,7,0,4],[-1,9,-4,6]], // apparition
    [[-6,7],[-5,1,-7,-6],[-2,-3],[2,-8],[3,-3],[8,0],[6,3],[2,2],[1,7]], // beast profile
    [[-6,-1],[-8,-8,0,-8],[8,-8,6,-1],[6,3,3,3],[3,7],[1,6],[0,8],[-2,6],[-3,7],[-3,3],[-6,3]],
    [[-8,-7],[-3,-3,0,-2],[2,-6,5,-4],[7,-3],[4,-2],[3,2,0,3],[-4,8],[-3,3],[-7,3],[-4,0],[-8,-2]], // wing
    [[-7,-8],[-3,-4],[3,-4],[7,-8],[6,0],[3,5],[0,8],[-4,4],[-6,1]], // horned mask
  ];
  function unit(g, x, y, index, enemyName, cls) {
    const enemy = !!enemyName, kind = enemy && beastKind(enemyName);
    const cloth = faces[slot(index)].cloth;
    const outline = enemy ? beasts[kind] : crests[cls] || crests.Fighter;
    g.save();
    g.translate(x, y - 15);
    const rim = g.createLinearGradient(-10,-15,9,12);
    rim.addColorStop(0, '#fff1c4'); rim.addColorStop(.45, '#b49d73'); rim.addColorStop(1, '#665340');
    const enamel = g.createRadialGradient(-4,-8,1,0,0,16);
    enamel.addColorStop(0, enemy ? '#ab6254' : cloth[2]);
    enamel.addColorStop(1, enemy ? '#4a2932' : cloth[0]);
    g.beginPath();
    if (enemy) g.ellipse(0,0,12,14,0,0,Math.PI*2);
    else {
      g.moveTo(0,-14); g.quadraticCurveTo(7,-11,12,-11);
      g.bezierCurveTo(13,1,11,8,0,15); g.bezierCurveTo(-11,8,-13,1,-12,-11);
      g.quadraticCurveTo(-7,-11,0,-14);
    }
    g.closePath(); g.fillStyle = enamel; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#282729'; g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = rim; g.stroke();
    g.beginPath(); g.moveTo(...outline[0]);
    for (const p of outline.slice(1)) {
      if (p.length === 2) g.lineTo(...p); else g.quadraticCurveTo(...p);
    }
    g.closePath(); g.fillStyle = '#fff0cc'; g.fill();
    if (enemy && kind === 4) {
      for (const eye of [-2.8,2.8]) {
        g.beginPath(); g.arc(eye,-1.3,1.6,0,Math.PI*2); g.fillStyle = '#542f33'; g.fill();
      }
    }
    g.restore();
  }

  function slot(index) {
    return ((Math.trunc(Number(index) || 0) % 6) + 6) % 6;
  }
  function paint(canvas, art) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(art, 0, 0, canvas.width, canvas.height);
  }
  return {
    portrait(canvas, index) {
      const i = slot(index);
      if (!portraitCache[i]) portraitCache[i] = portraitPlate(i);
      paint(canvas, portraitCache[i]);
    },
    unit,
    monster(canvas, name) {
      paint(canvas, creature(name));
    },
  };
})();
