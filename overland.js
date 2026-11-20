"use strict";
const Overland = (() => {
  const colors = {
    g: "#747e51",
    r: "#b4a278",
    b: "#bc9e6c",
    f: "#3e5c48",
    h: "#8d8968",
    w: "#657d69",
    m: "#86867c",
    "~": "#527a85",
  };
  const marks = {
    town: "⌂",
    hamlet: "⌂",
    dungeon: "▼",
    seal: "♦",
    healer: "+",
    holy: "✧",
    camp: "△",
    lair: "×",
  };
  function site() {
    let s = Game.state;
    return Game.world.wild.sites.find((v) => v.x === s.x && v.y === s.y);
  }
  function draw(canvas, small = false) {
    let c = canvas.getContext("2d"),
      l = Game.world.wild,
      s = Game.state,
      w = canvas.width,
      h = canvas.height;
    let n = Math.min(w / 23, h / 15),
      ox = (w - 23 * n) / 2,
      oy = (h - 15 * n) / 2;
    c.fillStyle = "#28382e";
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < 15; y++)
      for (let x = 0; x < 23; x++) {
        let tile = l.grid[y][x],
          px = ox + x * n,
          py = oy + y * n;
        c.fillStyle = colors[tile];
        c.fillRect(Math.floor(px), Math.floor(py), Math.ceil(n), Math.ceil(n));
        let r = Rules.rng("wild-art/" + x + "/" + y);
        for (let i = 0; i < 3; i++) {
          let ax = px + n * (0.2 + r() * 0.6),
            ay = py + n * (0.2 + r() * 0.6);
          if ("mfh".includes(tile)) {
            c.fillStyle = tile === "f" ? "#254938" : "#5d6757";
            c.beginPath();
            c.moveTo(ax, ay - n * 0.23);
            c.lineTo(ax + n * 0.23, ay + n * 0.13);
            c.lineTo(ax - n * 0.22, ay + n * 0.13);
            c.fill();
          } else {
            c.fillStyle = tile === "~" ? "#86a7a2" : "#ffffff15";
            c.fillRect(ax, ay, n * 0.18, Math.max(n * 0.05, 1));
          }
        }
      }
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (let v of l.sites) {
      let x = ox + (v.x + 0.5) * n,
        y = oy + (v.y + 0.5) * n;
      c.fillStyle = "#323d30";
      c.fillRect(x - n * 0.47, y - n * 0.46, n * 0.94, n * 0.92);
      c.font = "bold " + Math.max(6, Math.round(n * 0.79)) + "px Georgia";
      c.fillStyle = "#f4d49a";
      c.fillText(marks[v.type], x, y);
    }
    let px = ox + (s.x + 0.5) * n,
      py = oy + (s.y + 0.5) * n;
    c.save();
    c.translate(px, py);
    c.rotate((s.dir * Math.PI) / 2);
    c.fillStyle = "#a6492f";
    c.strokeStyle = "#f5d697";
    c.lineWidth = Math.max(1, n * 0.08);
    c.beginPath();
    c.moveTo(0, -n * 0.54);
    c.lineTo(n * 0.38, n * 0.41);
    c.lineTo(0, n * 0.22);
    c.lineTo(-n * 0.38, n * 0.41);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  function step(x, y) {
    let s = Game.state,
      l = Game.world.wild,
      t = l.grid[y]?.[x],
      cost = Wilds.speed[t];
    if (!cost) {
      Game.note(t === "~" ? "The water runs too deep. Find a bridge." : "The ridge is impassable.");
      return;
    }
    s.x = x;
    s.y = y;
    let hr = (s.minutes % 1440) / 60,
      night = hr < 6 || hr >= 19;
    s.minutes += Math.ceil(
      (6 * cost * (night ? 1.4 : 1) * (1 + s.fatigue / 160)) /
        Math.min(...s.party.filter((p) => p.hp > 0).map(Rules.movement)),
    );
    s.fatigue = Math.min(100, Math.round(s.fatigue + cost * 2));
    let v = site();
    if (v) {
      Game.note("You reach " + v.name + ". Press Enter to visit.", "story");
      return;
    }
    let chance = 0.018 * cost * (night ? 1.8 : 1) * (1 + s.fatigue / 100);
    if (Math.random() < chance) {
      if (Rules.roll(4) === 1)
        Game.note("A passing carter says, “" + l.rumours[Rules.roll(l.rumours.length) - 1] + "”");
      else Combat.begin(l.encounters[Rules.roll(l.encounters.length) - 1], "road/" + s.minutes);
    }
  }
  function visit() {
    let s = Game.state,
      v = site(),
      a = Game.world.adventure;
    if (!v) {
      let list = Game.world.wild.sites
        .map(
          (v) =>
            '<div class="listrow"><span>' +
            UI.esc(v.name) +
            "</span><small>" +
            v.x +
            ", " +
            v.y +
            "</small></div>",
        )
        .join("");
      UI.modal(
        "Survey the marches",
        "<p>Use the movement controls to travel. Your position is " + s.x + ", " + s.y + ".</p>" + list,
        "Wilderness",
      );
      return;
    }
    switch (v.type) {
      case "town":
        Game.enter("town");
        break;
      case "dungeon":
        Game.enter("dungeon");
        break;
      case "seal":
        if (s.quests[a.id]?.side === "paid") Game.enter("dungeon", Math.min(1, Game.world.levels.length - 1));
        else Game.note("The postern is sealed. Complete the warden’s side commission to enter.");
        break;
      case "hamlet":
        UI.modal(
          v.name,
          "<p>A few farmsteads overlook the road. A drover shares word from the hills. “" +
            UI.esc(a.rumours[0]) +
            '”</p><div class="btns">' +
            UI.btn("Trade", "wildShop") +
            UI.btn("Rest", "camp") +
            "</div>",
          "Hamlet",
        );
        break;
      case "healer":
        UI.modal(
          v.name,
          "<p>A traveling healer will tend the whole company for 10 gp.</p>" +
            UI.btn("Receive care · 10 gp", "heal", "10", s.gold < 10),
          "Healer",
        );
        break;
      case "camp":
        Watch.camp();
        break;
      case "holy": {
        let id = a.id + "/shrine";
        if (!s.cleared[id]) {
          s.cleared[id] = true;
          s.party.filter((p) => p.hp > 0).forEach((p) => Rules.gain(p, 25));
          Game.record("A quiet vigil at the shrine. Each living companion receives 25 XP.");
        } else Game.note("The shrine lantern burns steadily.");
        break;
      }
      case "lair": {
        let id = a.id + "/lair";
        if (s.cleared[id]) Game.note("The old lair is silent.");
        else Combat.begin(a.encounters.at(-1), id);
        break;
      }
    }
  }
  function handle(a) {
    if (a !== "wildShop") return false;
    Game.shop();
    return true;
  }
  return { draw, visit, site, step, handle };
})();
