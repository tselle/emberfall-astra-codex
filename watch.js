"use strict";
const Watch = (() => {
  function trap(t) {
    let s = Game.state;
    if (s.cleared[t.id]) return;
    s.cleared[t.id] = true;
    let all = ["falling block", "fire", "gas"].includes(t.type),
      targets = s.party.filter((p) => p.hp > 0);
    if (!all) targets = [targets[Math.floor(Math.random() * targets.length)]];
    for (let p of targets) {
      let harm = Rules.roll(4) + s.floor + Math.ceil(Game.world.adventure.range[0] / 2);
      if (Rules.roll(20) >= Rules.saves(p)[t.type === "gas" ? 0 : 3]) harm = Math.ceil(harm / 2);
      p.hp = Math.max(0, p.hp - harm);
    }
    Game.note("A " + t.type + " trap strikes " + (all ? "the company" : targets[0].name) + ".", "story");
  }
  function search() {
    let s = Game.state;
    if (s.area === "wild") {
      Game.note(Game.world.adventure.rumours[Rules.roll(2) - 1]);
      return;
    }
    let found = 0;
    let scout = s.party.find((p) => p.hp > 0 && p.cls === "Thief");
    let skill = s.party.some((p) => p.hp > 0 && (p.race === "Dwarf" || p.cls === "Thief")) ? 0.86 : 0.48;
    let trapChance = scout ? Rules.skills(scout)["Find traps"] / 100 : 0.2;
    for (let [x, y] of Game.level.doors || []) {
      let k = Game.tileKey(x, y);
      if (!s.opened[k] && Math.abs(x - s.x) + Math.abs(y - s.y) <= 1 && Math.random() < skill) {
        s.opened[k] = true;
        found++;
        Game.note("A concealed stone panel slides aside.", "good");
      }
    }
    for (let t of Game.level.traps || []) {
      if (
        !s.seen[t.id] &&
        !s.cleared[t.id] &&
        Math.abs(t.x - s.x) + Math.abs(t.y - s.y) <= 1 &&
        Math.random() < trapChance
      ) {
        s.seen[t.id] = true;
        found++;
        Game.note("You find a " + t.type + " trap. Interact to disarm it.", "story");
      }
    }
    if (!found)
      Game.note(
        s.area === "town"
          ? "You inspect the old cobbles. The street is clear."
          : "You search the surrounding stonework and find nothing.",
      );
    s.minutes += 5;
  }
  function disarm(t) {
    let thief = Game.state.party.find((p) => p.cls === "Thief" && p.hp > 0);
    if (!thief) {
      Game.note("A thief is needed to remove this trap.");
      return;
    }
    if (Rules.roll(100) <= Rules.skills(thief)["Remove traps"]) {
      Game.state.cleared[t.id] = true;
      Game.note(thief.name + " disarms the " + t.type + " trap.", "good");
    } else trap(t);
  }
  function camp() {
    let s = Game.state;
    UI.modal(
      "Make camp",
      "<p>Set watches and rest for eight hours. A healer uses available prayers on wounded companions. Spells return after each rest.</p><p>Company fatigue · " +
        s.fatigue +
        ' / 100</p><div class="btns">' +
        UI.btn("Rest eight hours", "rest", "once") +
        UI.btn("Rest until healed", "rest", "heal") +
        "</div>",
      "Company",
    );
  }
  function rest(mode) {
    let s = Game.state,
      n = 0;
    do {
      for (let healer of s.party.filter((p) => p.hp > 0))
        for (let [id, casts] of Object.entries(healer.ready)) {
          let sp = Data.spell(id);
          if (sp.effect !== "heal") continue;
          while (casts--) {
            let target = s.party
              .filter((p) => p.hp > 0 && p.hp < p.maxHp)
              .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            if (!target) break;
            target.hp = Math.min(target.maxHp, target.hp + Math.max(1, sp.dice[0] * Rules.roll(sp.dice[1])));
          }
        }
      for (let p of s.party)
        if (p.hp > 0) {
          p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.floor(p.level / 3)));
          Rules.refresh(p);
        }
      n++;
      s.minutes += 480;
      s.fatigue = 0;
    } while (mode === "heal" && s.party.some((p) => p.hp > 0 && p.hp < p.maxHp) && n < 200);
    UI.close();
    Game.note("The company rests for " + n * 8 + " hours. Spells are memorized.", "good");
  }
  function listen() {
    let s = Game.state,
      near = Game.level?.entities?.some(
        (e) => !s.cleared[e.id] && Math.abs(e.x - s.x) + Math.abs(e.y - s.y) <= 5,
      );
    if (near)
      for (let e of Game.level.entities)
        if (Math.abs(e.x - s.x) + Math.abs(e.y - s.y) <= 5) s.seen[e.id] = true;
    Game.note(
      s.area === "town"
        ? "Beyond the shutters, a tavern keeper hums an old marching song."
        : near
          ? "Footfalls scrape against stone nearby."
          : "You listen carefully. All is quiet.",
    );
    s.minutes++;
  }
  return { trap, search, disarm, camp, rest, listen };
})();
