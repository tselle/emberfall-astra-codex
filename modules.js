"use strict";
const Modules = (() => {
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const townRows = [
    "###############",
    "#......>......#",
    "#.###.....###.#",
    "#.###.....###.#",
    "#..##.....##..#",
    "#..#T.....H#..#",
    "#..##.....##..#",
    "#..#I.....S#..#",
    "#..##.....##..#",
    "#..##.....G#..#",
    "#..##.....##..#",
    "#.............#",
    "#.............#",
    "###############",
  ];
  function town(name) {
    return {
      name,
      grid: townRows.slice(),
      start: [7, 11],
      entities: [],
      traps: [],
      caches: [],
      doors: [],
      exit: [7, 1],
    };
  }
  function tile(l, x, y) {
    return l.grid[y]?.[x] || "#";
  }
  const blocking = (t) => "#?ISTHGDL".includes(t);
  function connected(l, origin = l.start) {
    let queue = [origin],
      seen = new Set([origin.join(",")]);
    for (let i = 0; i < queue.length; i++) {
      let [x, y] = queue[i];
      for (let [dx, dy] of dirs) {
        let k = [x + dx, y + dy].join(",");
        if (!seen.has(k) && tile(l, x + dx, y + dy) !== "#") {
          seen.add(k);
          queue.push([x + dx, y + dy]);
        }
      }
    }
    return seen;
  }
  function dungeon(id, name, depth, size, seed, encounters, layout = null) {
    const r = Rules.rng(seed + "/layout"),
      feature = Rules.rng(seed + "/secrets"),
      hazard = Rules.rng(seed + "/traps"),
      population = Rules.rng(seed + "/denizens");
    let w = 15 + 2 * size,
      h = 13 + 2 * size,
      g = Array.from({ length: h }, () => Array(w).fill("#"));
    let start = [1, h - 2],
      stack = [start];
    g[start[1]][1] = ".";
    while (stack.length) {
      let [x, y] = stack[stack.length - 1],
        options = dirs.filter(
          ([dx, dy]) =>
            g[y + 2 * dy]?.[x + 2 * dx] === "#" &&
            x + 2 * dx > 0 &&
            x + 2 * dx < w - 1 &&
            y + 2 * dy > 0 &&
            y + 2 * dy < h - 1,
        );
      if (!options.length) {
        stack.pop();
        continue;
      }
      let [dx, dy] = options[Math.floor(r() * options.length)];
      g[y + dy][x + dx] = g[y + 2 * dy][x + 2 * dx] = ".";
      stack.push([x + 2 * dx, y + 2 * dy]);
    }
    for (let i = 0; i < w / 2; i++) {
      let x = 2 * Math.floor(r() * ((w - 3) / 2)) + 1,
        y = 2 * Math.floor(r() * ((h - 3) / 2)) + 1;
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) g[y + j][x + k] = ".";
    }
    if (layout) {
      g = layout.map((row) => row.split(""));
      h = g.length;
      w = g[0].length;
      start = [1, h - 2];
    }
    let exit = [w - 2, 1];
    g[start[1]][start[0]] = "<";
    g[1][w - 2] = ">";
    // Keep a ring of masonry outside the playable floor for sealed treasure rooms.
    const innerW = w,
      innerH = h;
    g = [
      Array(w + 4).fill("#"),
      Array(w + 4).fill("#"),
      ...g.map((row) => ["#", "#", ...row, "#", "#"]),
      Array(w + 4).fill("#"),
      Array(w + 4).fill("#"),
    ];
    w += 4;
    h += 4;
    start = start.map((n) => n + 2);
    exit = exit.map((n) => n + 2);
    let cells = [];
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (g[y][x] === ".") cells.push([x, y]);
    function pickCell(rng) {
      return cells.splice(Math.floor(rng() * cells.length), 1)[0];
    }
    let doors = [],
      caches = [],
      traps = [],
      entities = [];
    const quest = pickCell(Rules.rng(seed + "/event"));
    g[quest[1]][quest[0]] = "!";
    for (let i = 0; i < Math.min(5, 2 + size); i++) {
      let [x, y] = pickCell(population);
      entities.push({ x, y, id: id + "/guard/" + i, name: encounters[i % encounters.length] });
    }
    let candidates = cells.filter(
      ([x, y]) => dirs.filter(([a, b]) => g[y + b]?.[x + a] === ".").length === 2,
    );
    const doorRng = Rules.rng(seed + "/doors");
    for (let i = 0, n = Math.min(3, candidates.length); i < n; i++) {
      let [x, y] = candidates.splice(Math.floor(doorRng() * candidates.length), 1)[0];
      g[y][x] = i === 2 ? "L" : "D";
    }
    cells = cells.filter(([x, y]) => g[y][x] === ".");
    let rims = [];
    for (let x = 3; x < innerW + 1; x++) {
      rims.push([x, 2, 0, -1], [x, innerH + 1, 0, 1]);
    }
    for (let y = 3; y < innerH + 1; y++) {
      rims.push([2, y, -1, 0], [innerW + 1, y, 1, 0]);
    }
    rims = rims.filter(([x, y, dx, dy]) => g[y - dy][x - dx] === ".");
    for (let i = 0, n = 1 + Math.floor(feature() * 3); i < n; i++) {
      const [x, y, dx, dy] = rims.splice(Math.floor(feature() * rims.length), 1)[0];
      g[y][x] = "?";
      g[y + dy][x + dx] = ".";
      doors.push([x, y]);
      caches.push({ x: x + dx, y: y + dy, id: id + "/cache/" + i });
      rims = rims.filter(([xx, yy]) => Math.abs(xx - x) + Math.abs(yy - y) > 2);
    }
    for (let i = 0, n = 2 + Math.floor(hazard() * 2); i < n; i++) {
      let [x, y] = pickCell(hazard);
      traps.push({
        x,
        y,
        id: id + "/trap/" + i,
        type: ["pit", "darts", "blade", "spear", "falling block", "fire", "gas"][Math.floor(hazard() * 7)],
      });
    }
    return {
      id,
      name,
      depth,
      grid: g.map((row) => row.join("")),
      entities,
      traps,
      doors,
      caches,
      start,
      exit,
      quest,
    };
  }
  return { dirs, town, tile, blocking, connected, dungeon };
})();
