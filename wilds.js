"use strict";
const Wilds = (() => {
  const names = {
    g: "Meadow",
    r: "Old road",
    b: "Bridge",
    f: "Woodland",
    h: "Foothills",
    w: "Fen",
    m: "Mountains",
    "~": "River",
  };
  const speed = { g: 1, r: 0.65, b: 0.7, f: 1.7, h: 1.8, w: 2.1 };
  function make(a) {
    const r = Rules.rng(a.id + "/wilderness"), int = n => Math.floor(r() * n);
    const width = 23, height = 15;
    const grid = Array.from({ length: height }, () => Array(width).fill("g"));
    // Grow stretches of woodland, fen and high ground rather than scattering single tiles.
    for (let patch = 0; patch < 30; patch++) {
      const terrain = "fffhhwm"[int(7)], cx = int(width), cy = int(height);
      const rx = 1 + r() * 4, ry = 1 + r() * 3;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) grid[y][x] = terrain;
    }
    const sideways = r() < 0.5, span = sideways ? height : width;
    let bank = 2 + int(span - 4);
    for (let i = 0; i < (sideways ? width : height); i++) {
      const next = Math.max(2, Math.min(span - 3, bank + int(3) - 1));
      for (let j = Math.min(bank, next); j <= Math.max(bank, next); j++)
        grid[sideways ? j : i][sideways ? i : j] = "~";
      bank = next;
    }
    const sites = [], candidates = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++)
      if (grid[y][x] !== "~") candidates.push({ x, y });
    const distance = (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
    for (const [type, name] of [
      ["town", a.town], ["dungeon", a.place], ["hamlet", "Fallowcross"],
      ["healer", "The Yarrow House"], ["holy", "Shrine of the Quiet Star"],
      ["lair", "The Bramble Den"], ["camp", "Wayfarer’s Hollow"], ["seal", "The Lantern Postern"],
    ]) {
      // Sample several locations and prefer the one furthest from existing landmarks.
      let index = int(candidates.length), best = -1;
      for (let i = 0; sites.length && i < 24; i++) {
        const k = int(candidates.length), gap = Math.min(...sites.map(s => distance(s, candidates[k])));
        if (gap > best) { index = k; best = gap; }
      }
      const [pos] = candidates.splice(index, 1);
      let { x, y } = pos;
      grid[y][x] = "r";
      if (sites.length) {
        const dest = sites.reduce((p, q) => distance(pos, p) <= distance(pos, q) ? p : q);
        while (x !== dest.x || y !== dest.y) {
          if (y === dest.y || (x !== dest.x && r() < 0.5)) x += Math.sign(dest.x - x);
          else y += Math.sign(dest.y - y);
          grid[y][x] = "~b".includes(grid[y][x]) ? "b" : "r";
        }
      }
      sites.push({ type, name, ...pos });
    }
    return {
      grid: grid.map((row) => row.join("")),
      sites,
      start: [sites[0].x, sites[0].y],
      rumours: a.rumours,
      encounters: a.encounters,
    };
  }
  return { make, names, speed };
})();
