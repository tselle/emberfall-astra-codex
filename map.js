"use strict";
const Atlas = (() => {
  const palette = {
    "#": "#424e42",
    ".": "#26332e",
    "?": "#424e42",
    I: "#8c7555",
    S: "#8c7555",
    T: "#859583",
    H: "#9b846b",
    G: "#c6a46a",
    D: "#836d4f",
    L: "#a2825e",
    ">": "#c4bb88",
    "<": "#c4bb88",
    "!": "#a69a73",
  };
  function draw(canvas, mini = false) {
    let s = Game.state,
      l = Game.level,
      w = l.grid[0].length,
      h = l.grid.length,
      c = canvas.getContext("2d");
    if (s.area === "wild") {
      Overland.draw(canvas, true);
      return;
    }
    let width = canvas.width,
      height = canvas.height,
      n = Math.min(Math.floor(width / w), Math.floor(height / h));
    let ox = Math.floor((width - n * w) / 2),
      oy = Math.floor((height - n * h) / 2);
    if (mini) {
      n = Math.max(6, Math.floor(width / 23));
      ox = Math.floor(width / 2 - (s.x + 0.5) * n);
      oy = Math.floor(height / 2 - (s.y + 0.5) * n);
    }
    c.fillStyle = "#18211e";
    c.fillRect(0, 0, width, height);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let visible = s.area !== "dungeon" || s.visited[Game.tileKey(x, y)];
        if (!visible) continue;
        let t = Game.tile(x, y);
        c.fillStyle = palette[t] || palette["."];
        c.fillRect(ox + x * n, oy + y * n, n - 1, n - 1);
        if (mini && s.area === "town" && "#ISTHG".includes(t)) {
          c.fillStyle = "#686f59";
          c.fillRect(ox + x * n + 1, oy + y * n + 1, n - 3, 1);
          c.fillStyle = "#313c33";
          c.fillRect(ox + x * n + 2, oy + y * n + n - 3, n - 4, 1);
          if ("ISTHG".includes(t)) {
            c.fillStyle = "#c3ac7a";
            c.fillRect(ox + x * n + 3, oy + y * n + 3, 2, 2);
          }
        }
        if (!mini && "ISTHG<>!".includes(t)) {
          c.fillStyle = "#191f1b";
          c.font = "bold " + Math.max(8, n * 0.6) + "px monospace";
          c.textAlign = "center";
          c.fillText(t, ox + (x + 0.5) * n, oy + (y + 0.72) * n);
        }
      }
    for (let t of l.traps || [])
      if (s.seen[t.id] && !s.cleared[t.id]) {
        c.fillStyle = "#d7785c";
        c.fillRect(ox + (t.x + 0.25) * n, oy + (t.y + 0.25) * n, n / 2, n / 2);
      }
    c.save();
    c.translate(ox + (s.x + 0.5) * n, oy + (s.y + 0.5) * n);
    c.rotate((s.dir * Math.PI) / 2);
    let r = Math.max(4, n * 0.65);
    c.fillStyle = "#e1be7a";
    c.beginPath();
    c.moveTo(0, -r);
    c.lineTo(r * 0.72, r * 0.7);
    c.lineTo(0, r * 0.4);
    c.lineTo(-r * 0.72, r * 0.7);
    c.closePath();
    c.fill();
    c.restore();
    if (mini) {
      c.fillStyle = "#c7b690";
      c.font = "9px monospace";
      c.textAlign = "right";
      c.fillText("N", width - 8, 13);
      c.fillStyle = "#7c8975";
      c.fillRect(width - 12, 16, 1, 7);
    }
  }
  function show() {
    let l = Game.level,
      s = Game.state;
    UI.modal(
      s.area === "wild" ? Game.world.adventure.town + " Marches" : l.name,
      '<canvas id="full-map" class="map-canvas" width="580" height="350"></canvas><p class="muted">' +
        (s.area === "town"
          ? "I · Inn　S · Shop　G · Warden　H · Training　T · Temple　> · North gate"
          : s.area === "wild"
            ? "Uncharted ground is dark. Known sites: " + Overland.knownSites().map((v) => v.name + " (" + v.x + ", " + v.y + ")").join(" · ")
            : "Gold arrow · Company　 Red square · Known trap　 < > · Stairs") +
        "</p><p>Company position · " +
        s.x +
        ", " +
        s.y +
        " · Facing " +
        ["north", "east", "south", "west"][s.dir] +
        "</p>",
      "Area map",
      true,
    );
    draw(UI.$("full-map"));
  }
  return { draw, show };
})();
