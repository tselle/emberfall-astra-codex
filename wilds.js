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
    let r = Rules.rng(a.id + "/wilderness"),
      grid = Array.from({ length: 15 }, (_, y) =>
        Array.from({ length: 23 }, (_, x) => {
          let v = r() + Math.sin(x * 0.6 + y * 0.4) * 0.18;
          return v < 0.1 ? "m" : v < 0.34 ? "f" : v < 0.48 ? "h" : v > 0.93 ? "w" : "g";
        }),
      );
    let river = Array.from({ length: 15 }, (_, y) => 10 + Math.round(Math.sin(y * 0.55) * 2));
    river.forEach((x, y) => (grid[y][x] = "~"));
    let sites = [
      ["town", a.town, 2, 12],
      ["dungeon", a.place, 20, 2],
      ["hamlet", "Fallowcross", 4, 6],
      ["healer", "The Yarrow House", 6, 2],
      ["holy", "Shrine of the Quiet Star", 16, 11],
      ["lair", "The Bramble Den", 19, 7],
      ["camp", "Wayfarer’s Hollow", 9, 9],
      ["seal", "The Lantern Postern", 20, 13],
    ].map(([type, name, x, y]) => ({ type, name, x, y }));
    for (let s of sites) {
      let x = 2,
        y = 12;
      while (x !== s.x) {
        x += Math.sign(s.x - x);
        grid[y][x] = river[y] === x ? "b" : "r";
      }
      while (y !== s.y) {
        y += Math.sign(s.y - y);
        grid[y][x] = river[y] === x ? "b" : "r";
      }
    }
    return {
      grid: grid.map((row) => row.join("")),
      sites,
      start: [2, 12],
      rumours: a.rumours,
      encounters: a.encounters,
    };
  }
  return { make, names, speed };
})();
