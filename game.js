"use strict";
const Game = (() => {
  const prefix = "emberfall.1.",
    $ = UI.$,
    btn = UI.btn,
    esc = UI.esc;
  let s,
    world,
    anim = 0,
    displayPose = null,
    storageOK = true;
  function fresh() {
    return {
      version: 1,
      id: "E0",
      area: "town",
      x: 7,
      y: 11,
      dir: 0,
      floor: 0,
      minutes: 480,
      party: Rules.company(),
      gold: 120,
      inventory: [{ id: "healing_potion" }],
      log: [],
      notes: [],
      quests: {},
      opened: {},
      seen: {},
      cleared: {},
      visited: {},
      ground: {},
      bestiary: {},
      fatigue: 0,
      pad: matchMedia("(pointer:coarse)").matches,
      creeping: false,
      battle: null,
    };
  }
  function setState(next) {
    cancelAnimationFrame(anim);
    displayPose = null;
    s = next;
    world = Adventures.world(s.id);
    Navpad.show(s.pad);
  }
  const areaKey = () => s.id + "/" + s.area + (s.area === "dungeon" ? "/" + s.floor : "");
  const tileKey = (x, y) => areaKey() + "/" + x + "," + y;
  function level() {
    return s.area === "town" ? world.town : s.area === "wild" ? world.wild : world.levels[s.floor];
  }
  function effective() {
    let l = level();
    if (s.area !== "dungeon") return l;
    let grid = l.grid.map((row, y) => row.replace(/[?DL]/g, (c, x) => (s.opened[tileKey(x, y)] ? "." : c)));
    return { ...l, grid };
  }
  function note(msg, type = "") {
    s.log.push({ time: s.minutes, msg, type });
    if (s.log.length > 120) s.log.shift();
  }
  function record(msg) {
    s.notes.push({ time: s.minutes, msg, id: s.id });
    note(msg, "story");
  }
  function save(slot = "auto") {
    try {
      localStorage.setItem(prefix + slot, JSON.stringify(s));
      storageOK = true;
    } catch (e) {
      storageOK = false;
    }
    $("save-status").innerHTML = UI.icon("saved") + (storageOK ? "Saved locally" : "Storage unavailable");
    return storageOK;
  }
  function read(slot) {
    try {
      let v = JSON.parse(localStorage.getItem(prefix + slot));
      if (
        v?.version === 1 &&
        Array.isArray(v.party) &&
        v.party.length &&
        Adventures.list.some((a) => a.id === v.id)
      )
        return v;
    } catch {}
    return null;
  }
  function reveal() {
    if (s.area !== "dungeon") return;
    let radius = 2;
    for (let y = s.y - radius; y <= s.y + radius; y++)
      for (let x = s.x - radius; x <= s.x + radius; x++)
        if (level().grid[y]?.[x]) s.visited[tileKey(x, y)] = true;
  }
  function finish(paintScene = true) {
    reveal();
    save();
    UI.paint(paintScene);
    if (!s.party.some((p) => p.hp > 0) && !s.battle) defeat();
  }
  function draw(pose) {
    if (s.area === "wild") {
      Overland.draw($("view"));
      return;
    }
    View3D.draw($("view"), s, effective(), pose);
  }
  function animate(old, diff = 0, bump = false) {
    cancelAnimationFrame(anim);
    if (s.area === "wild" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayPose = null;
      draw();
      return;
    }
    const from = displayPose || { x: old[0], y: old[1], angle: (old[2] * Math.PI) / 2 };
    const heading = ((old[2] + diff) * Math.PI) / 2;
    const rotation = Math.atan2(Math.sin(heading - from.angle), Math.cos(heading - from.angle));
    const dest = [s.x, s.y],
      start = performance.now(),
      d = Modules.dirs[s.dir];
    function frame(t) {
      const f = Math.min(1, Math.max(0, (t - start) / 145)),
        k = f * f * (3 - 2 * f),
        n = bump ? Math.sin(f * Math.PI) * 0.07 : 0;
      displayPose = {
        x: from.x + (dest[0] - from.x) * k + n * d[0],
        y: from.y + (dest[1] - from.y) * k + n * d[1],
        angle: from.angle + rotation * k,
      };
      draw(displayPose);
      if (f < 1) anim = requestAnimationFrame(frame);
      else displayPose = null;
    }
    frame(start);
  }
  function enter(area, floor = 0, pos = null, dir = 0) {
    cancelAnimationFrame(anim);
    displayPose = null;
    s.area = area;
    s.floor = floor;
    s.dir = dir;
    let a = pos || level().start;
    [s.x, s.y] = a;
    reveal();
    note("You enter " + (area === "wild" ? world.adventure.town + " Marches" : level().name) + ".", "story");
    if (area === "dungeon" && level().story) note(level().story[0]);
  }
  function front() {
    let [dx, dy] = Modules.dirs[s.dir];
    return [s.x + dx, s.y + dy];
  }
  function tile(x, y) {
    return s.opened[tileKey(x, y)] ? "." : Modules.tile(level(), x, y);
  }
  function guard() {
    if (s.area !== "dungeon") return false;
    for (const e of level().entities) {
      if (s.cleared[e.id]) continue;
      const m = Monsters.get(e.name),
        dx = e.x - s.x,
        dy = e.y - s.y,
        steps = Math.max(Math.abs(dx), Math.abs(dy));
      if (steps > 4) continue;
      let visible = true;
      for (let i = 1; i < steps; i++) {
        if (Modules.blocking(tile(s.x + Math.round((dx * i) / steps), s.y + Math.round((dy * i) / steps)))) {
          visible = false;
          break;
        }
      }
      if (!visible) continue;
      const scout = s.creeping && s.party.find((p) => p.hp > 0 && p.cls === "Thief");
      if (
        steps > 1 &&
        (m.special.includes("ambush") || (scout && Rules.roll(100) <= Rules.skills(scout)["Move silently"]))
      )
        continue;
      Combat.encounter(e.name, e.id, e.boss);
      return true;
    }
    return false;
  }
  function move(action) {
    if (s.battle || s.encounter) return;
    if (!s.party.some((p) => p.hp > 0)) return defeat();
    let old = [s.x, s.y, s.dir];
    if (["left", "right"].includes(action)) {
      let delta = action === "left" ? -1 : 1;
      s.dir = (s.dir + 4 + delta) % 4;
      finish(false);
      animate(old, delta);
      return;
    }
    let dir = (s.dir + { forward: 0, back: 2, strafeLeft: 3, strafeRight: 1 }[action]) % 4,
      [dx, dy] = Modules.dirs[dir],
      x = s.x + dx,
      y = s.y + dy;
    if (s.area === "wild") {
      Overland.step(x, y);
      finish();
      return;
    }
    let target = tile(x, y),
      foe = level().entities.find((e) => e.x === x && e.y === y && !s.cleared[e.id]);
    if (foe) {
      Combat.encounter(foe.name, foe.id, foe.boss);
      finish();
      return;
    }
    if (Modules.blocking(target)) {
      if ("ISTHGDL".includes(target)) {
        interact(x, y);
      } else note("The way is blocked.");
      finish(false);
      animate(old, 0, true);
      return;
    }
    s.x = x;
    s.y = y;
    s.minutes++;
    s.fatigue = Math.min(100, s.fatigue + 0.25);
    s.fatigue = Math.round(s.fatigue * 100) / 100;
    let t = level().traps?.find((t) => t.x === x && t.y === y && !s.cleared[t.id]);
    if (t) {
      if (s.seen[t.id]) {
        s.x = old[0];
        s.y = old[1];
        note("You halt before the marked " + t.type + " trap. Interact to disarm it.");
      } else Watch.trap(t);
    }
    if (s.party.some((p) => p.hp > 0) && !guard()) {
      if ("<>!".includes(target)) note(contextLabel() + " · press Enter.");
      let cache = level().caches?.find((c) => c.x === x && c.y === y && !s.cleared[c.id]);
      if (cache) note("A cache lies at your feet.");
      if (s.ground[tileKey(x, y)]?.length) note("Dropped equipment lies here.");
    }
    finish(false);
    animate(old);
  }
  const services = { I: "Wayside inn", S: "Outfitter", T: "Temple", H: "Training hall", G: "Warden's hall" };
  function interaction(x, y) {
    if (s.area === "wild") return { kind: "wild", label: Overland.site()?.name || "Survey" };
    const [fx, fy] = x === undefined ? front() : [x, y],
      f = tile(fx, fy);
    const at = (v, px, py) => v.x === px && v.y === py;
    const feature = (t) =>
      ({
        ">": [
          "down",
          s.area === "town"
            ? "North gate"
            : s.floor === world.levels.length - 1
              ? "Final chamber"
              : "Descend",
        ],
        "<": ["up", "Ascend"],
        "!": ["event", s.floor === 0 ? "Inspect find" : "Investigate"],
      })[t];
    if (x === undefined) {
      const here = feature(tile(s.x, s.y));
      if (here) return { kind: here[0], label: here[1] };
      const cache = level().caches.find((c) => at(c, s.x, s.y) && !s.cleared[c.id]);
      if (cache) return { kind: "cache", label: "Open cache", cache };
      if (s.ground[tileKey(s.x, s.y)]?.length) return { kind: "ground", label: "Ground items" };
      const t = level().traps.find((t) => at(t, fx, fy) && s.seen[t.id] && !s.cleared[t.id]);
      if (t) return { kind: "trap", label: "Disarm trap", trap: t };
    }
    if (services[f]) return { kind: "service", label: services[f], service: f };
    if (f === "D" || f === "L")
      return {
        kind: "door",
        label: f === "L" ? "Unlock door" : "Open door",
        x: fx,
        y: fy,
        locked: f === "L",
      };
    let ahead = feature(f);
    if (ahead) return { kind: ahead[0], label: ahead[1] };
    return s.area === "town"
      ? { kind: "square", label: "Town square" }
      : { kind: "empty", label: "Interact" };
  }
  function contextLabel() {
    return interaction().label;
  }
  function interact(x, y) {
    const action = interaction(x, y),
      a = world.adventure;
    switch (action.kind) {
      case "wild":
        return Overland.visit();
      case "service":
        return service(action.service);
      case "ground":
        return inventory();
      case "trap":
        return Watch.disarm(action.trap);
      case "cache":
        s.cleared[action.cache.id] = true;
        return loot("B");
      case "event":
        return Journal.relic();
      case "door": {
        const scout = s.party.find((p) => p.cls === "Thief" && p.hp > 0);
        if (action.locked && Rules.roll(100) > (scout ? Rules.skills(scout)["Open locks"] : 25)) {
          s.minutes += 5;
          note("The lock holds. Try it again.");
          return;
        }
        s.opened[tileKey(action.x, action.y)] = true;
        note("The door swings open.");
        return;
      }
      case "down": {
        if (s.area === "town") return enter("wild");
        if (s.floor + 1 < world.levels.length) return enter("dungeon", s.floor + 1);
        const boss = level().entities.find((e) => e.boss);
        if (!s.cleared[boss.id]) Combat.encounter(boss.name, boss.id, true);
        else note("The lowest hall lies quiet. Return to the warden.");
        return;
      }
      case "up": {
        if (s.floor) return enter("dungeon", s.floor - 1, world.levels[s.floor - 1].exit, 2);
        const p = world.wild.sites.find((v) => v.type === "dungeon");
        return enter("wild", 0, [p.x, p.y]);
      }
      case "square":
        return UI.modal(
          a.town,
          "<p>At the north gate, a fingerpost points toward " +
            esc(a.place) +
            '. Narrow lanes lead to the market and the warden’s hall.</p><div class="choices">' +
            Object.entries(services)
              .map(([k, v]) => btn(v, "visitService", k))
              .join("") +
            btn("North gate · leave town", "leaveTown") +
            "</div>",
          "Town square",
        );
      default:
        note("There is nothing to use here.");
    }
  }
  function recoverTreasure(gold, items = []) {
    s.gold += gold;
    s.inventory.push(...items.map(id => ({ id })));
    // Appraised gems and jewellery are already included in gold.
    const value = items.reduce((total, id) => total + Data.item(id).price, gold);
    const survivors = s.party.filter(p => p.hp > 0);
    if (!value || !survivors.length) return 0;
    const share = Math.floor(value / survivors.length), remainder = value % survivors.length;
    survivors.forEach((p, i) => Rules.gain(p, share + (i < remainder ? 1 : 0)));
    note(`Treasure worth ${value} gp: ${value} base XP shared among ${survivors.length} surviving companions.`, "good");
    return value;
  }
  function loot(type) {
    let drop = Treasure.roll(type, world.adventure.range[0] + s.floor, Math.random);
    const treasureXP = recoverTreasure(drop.gold, drop.items);
    note(
      "Recovered " +
        drop.gold +
        " gp" +
        (drop.items.length ? " and " + drop.items.map((id) => Data.item(id).name).join(", ") : "") +
        ".",
      "good",
    );
    if (drop.valuables.length) {
      let preview = drop.valuables.slice(0, 3).join(", ");
      note(
        "Appraised for the purse: " +
          preview +
          (drop.valuables.length > 3 ? " and " + (drop.valuables.length - 3) + " more valuables" : "") +
          ".",
      );
    }
    return treasureXP;
  }
  function service(k) {
    let a = world.adventure;
    if (k === "G") return Journal.commission();
    if (k === "S") return shop();
    let html =
      k === "I"
        ? "<p>Hot stew and clean straw cost 2 gp for the company. Restore fatigue and recover overnight.</p>" +
          btn("Lodging · 2 gp", "lodge", "", s.gold < 2)
        : k === "T"
          ? "<p>The lantern sisters offer full healing and recall fallen companions for 20 gp.</p>" +
            btn("Receive healing · 20 gp", "heal", "20", s.gold < 20)
          : "<p>Training costs 100 gp per new level. Enough experience and a living student are required.</p>" +
            s.party
              .map(
                (p, i) =>
                  '<div class="listrow"><span>' +
                  esc(p.name) +
                  "<br><small>" +
                  p.xp +
                  " / " +
                  (p.level === 20 ? "—" : Rules.xpFor(p.cls, p.level + 1)) +
                  " XP</small></span>" +
                  btn(
                    "Train · " + (p.level + 1) * 100 + " gp",
                    "train",
                    i,
                    p.hp <= 0 ||
                      p.level >= 20 ||
                      p.xp < Rules.xpFor(p.cls, p.level + 1) ||
                      s.gold < (p.level + 1) * 100,
                  ) +
                  "</div>",
              )
              .join("");
    UI.modal(services[k], html, a.town);
  }
  function saleStats(it) {
    if (it.type === "weapon" || it.type === "armour") {
      const classes = Rules.classes.filter(cls => Rules.canEquip({cls}, it)).join(", ");
      const stats = it.type === "armour" ? `AC ${it.ac} (lower is better)` :
        `${it.damage.join("d")}${it.bonus ? " + " + it.bonus : ""} damage · ${it.range === 1 ? "Adjacent" : "Range " + it.range * 10 + " ft"}${it.bonus ? " · +" + it.bonus + " to hit" : ""}`;
      return `${stats} · Equippable by: ${classes}`;
    }
    const sp = Data.spell(it.spell);
    return `${it.type} · ${it.charges} ${it.charges === 1 ? "charge" : "charges"} · ${sp.name}: ${Data.spellDetails(sp)}` +
      (it.type === "scroll" && sp.school === "wizard" ? " A mage can learn this spell from the scroll." : "");
  }
  function shop() {
    UI.modal(
      "The outfitter",
      "<p>Company purse · " +
        s.gold +
        " gp</p>" +
        Treasure.shop(world.adventure.range[0])
          .map((id) => {
            let it = Data.item(id);
            return (
              '<div class="listrow"><span>' +
              esc(it.name) +
              "<br><small>" + esc(saleStats(it)) + "</small></span>" +
              btn(it.price + " gp", "buy", id, s.gold < it.price) +
              "</div>"
            );
          })
          .join(""),
      "Market",
    );
  }
  function sheet(i) {
    let p = s.party[i];
    if (!p) return;
    const caps = Rules.slots(p);
    const plans = caps.map((_, j) => Rules.plannedSpells(p, j + 1));
    let fields = (labels, vals) =>
      '<div class="stats">' +
      labels.map((k, j) => "<span>" + k + " <b>" + vals[j] + "</b></span>").join("") +
      "</div>";
    UI.modal(
      p.name,
      '<div class="sheet-top"><canvas id="sheet-face" class="portrait" width="52" height="54"></canvas><div>' +
        esc(p.race) +
        " " +
        p.cls +
        " · Level " +
        p.level +
        "<br>" +
        p.alignment +
        " · " +
        p.xp +
        " XP</div></div><h3>Attributes</h3>" +
        fields(Rules.abilities, p.stats) +
        "<h3>Combat</h3>" +
        fields(
          ["HP", "AC", "THAC0", "Movement"],
          [
            p.hp + "/" + p.maxHp,
            Rules.ac(p),
            Rules.thac0(p.cls, p.level),
            Math.round(Rules.movement(p) * 100) + "%",
          ],
        ) +
        "<p>" +
        esc(Data.item(p.weapon)?.name || "Unarmed") +
        " · " +
        esc(Data.item(p.armour)?.name || "Unarmoured") +
        (p.specialization ? " · Specialized in " + esc(Data.item(p.specialization)?.name) : "") +
        "</p><h3>Saving throws</h3>" +
        fields(Rules.saveNames, Rules.saves(p)) +
        (p.cls === "Paladin"
          ? "<h3>Lay on Hands</h3><p>Heal yourself or one companion for up to " + 2 * p.level +
            " HP once per day. " + (Rules.handsReady(p, s.minutes) ? "Available." : "Unavailable.") + "</p>" +
            (s.battle ? "" : s.party.map((ally, j) => ally.hp > 0 && ally.hp < ally.maxHp
              ? btn("Heal " + ally.name, "layOnHands", i + "," + j, !Rules.handsReady(p, s.minutes)) : "").join(""))
          : "") +
        (p.cls === "Thief"
          ? "<h3>Thief skills</h3>" +
            fields(Object.keys(Rules.skills(p)), Object.values(Rules.skills(p))) +
            btn(s.creeping ? "Stop creeping" : "Creep ahead", "creep", i)
          : "") +
        (p.book.length
          ? "<h3>Spell memorization</h3><p>Each copy gives one cast after rest. Remove a copy to free a slot. Planned / total by circle · " +
            (caps.map((cap, j) => plans[j].length + "/" + cap).join(" · ") || "None yet") +
            (p.cls === "Cleric" ? " (includes Wisdom bonus: " +
              Rules.slots(p).map((_, i) => "+" + Rules.wisdomBonus(p, i + 1)).join(" / ") + ")" : "") +
            "</p>" +
            p.book
              .map((id) => {
                let sp = Data.spell(id);
                const plan = plans[sp.level - 1] || [];
                const copies = plan.filter(k => k === id).length;
                return (
                  '<div class="listrow"><span>' +
                  sp.name +
                  " <small>· Circle " +
                  sp.level +
                  " · " +
                  (p.ready[id] || 0) +
                  " ready · " + copies + " planned</small><br><small>" + esc(Data.spellDetails(sp)) + "</small></span>" +
                  btn("−1", "unprepare", i + "," + id, !copies) +
                  btn("+1", "prepare", i + "," + id, plan.length >= (caps[sp.level - 1] || 0)) +
                  (!s.battle && ["heal", "cure"].includes(sp.effect) ?
                    btn("Cast", "fieldHeal", i + "," + id, !p.ready[id] || p.hp <= 0 ||
                      !s.party.some(ally => ally.hp < ally.maxHp)) : "") +
                  "</div>"
                );
              })
              .join("")
          : ""),
      "Character sheet",
    );
    Figures.portrait($("sheet-face"), p.portrait);
  }
  function inventory() {
    let ground = s.ground[tileKey(s.x, s.y)] || [];
    UI.modal(
      "Company inventory",
      "<p>" +
        s.gold +
        " gold pieces · " +
        s.inventory.length +
        " carried items</p>" +
        s.inventory
          .map((o, i) => {
            let it = Data.item(o.id);
            return (
              '<div class="listrow"><span>' +
              esc(it.name) +
              (o.charges !== undefined ? " · " + o.charges + " charges" : "") +
              "</span>" +
              btn("Inspect", "inspect", i) +
              btn("Drop", "drop", i) +
              "</div>"
            );
          })
          .join("") +
        (ground.length
          ? "<h3>On the ground</h3>" +
            ground
              .map(
                (o, i) =>
                  '<div class="listrow"><span>' +
                  esc(Data.item(o.id).name) +
                  "</span>" +
                  btn("Pick up", "pickup", i) +
                  "</div>",
              )
              .join("")
          : ""),
      "Equipment",
    );
  }
  function inspect(i) {
    let it = Data.item(s.inventory[i].id),
      sp = Data.spell(it.spell),
      gear = ["weapon", "armour"].includes(it.type);
    UI.modal(
      it.name,
      "<p>" +
        it.type +
        " · " +
        it.price +
        " gp" +
        (gear
          ? it.type === "weapon"
            ? " · " + it.damage.join("d") + " damage · range " + it.range
            : " · AC " + it.ac
          : "") +
        "</p>" +
        (sp ? "<p>" + esc(sp.name) + " · " + esc(sp.description) + "</p><p>In combat · " + esc(Data.spellDetails(sp)) + "</p>" : "") +
        s.party
          .map(
            (p, n) =>
              '<div class="listrow"><span>' +
              esc(p.name) +
              "</span>" +
              (gear
                ? btn("Equip", "equip", i + "," + n, p.hp <= 0 || !Rules.canEquip(p, it))
                : sp && ["heal", "cure"].includes(sp.effect)
                  ? btn("Use", "use", i + "," + n, p.hp <= 0)
                  : "") +
              (it.type === "scroll" && p.cls === "Mage" && sp.school === "wizard"
                ? btn(
                    p.book.includes(sp.id) ? "Learned" : "Learn",
                    "learn",
                    i + "," + n,
                    p.book.includes(sp.id),
                  )
                : "") +
              "</div>",
          )
          .join("") +
        (!gear && sp && !["heal", "cure"].includes(sp.effect)
          ? "<p>Use this item during a combat turn.</p>"
          : ""),
      "Equipment",
    );
  }
  function consume(i) {
    let o = s.inventory[i],
      it = Data.item(o.id);
    o.charges = (o.charges ?? it.charges ?? 1) - 1;
    if (o.charges <= 0) s.inventory.splice(i, 1);
  }
  function menu() {
    UI.modal(
      "Game menu",
      '<div class="btns">' +
        btn("Resume", "close") +
        btn("Create company", "create") +
        btn("How to play", "help") +
        btn("Movement pad · " + (s.pad ? "on" : "off"), "menuPad") +
        "</div><h3>Save slots</h3>" +
        ["1", "2", "3", "auto"]
          .map((k) => {
            let v = read(k);
            return (
              '<div class="listrow"><span>' +
              (k === "auto" ? "Autosave" : "Slot " + k) +
              "<br><small>" +
              (v
                ? esc(v.id + " · " + v.party[0].name + " · Day " + (1 + Math.floor(v.minutes / 1440)))
                : "Empty") +
              "</small></span>" +
              (k === "auto" ? "" : btn("Save", "slotSave", k)) +
              btn("Load", "slotLoad", k, !v) +
              "</div>"
            );
          })
          .join(""),
      "Emberfall",
    );
  }
  function defeat() {
    UI.modal(
      "The company has fallen",
      "<p>The expedition ends here. The town watch can bring the company home at the cost of half its gold.</p>" +
        btn("Return to town", "rescue") +
        btn("Load a save", "menu"),
      "Defeat",
    );
  }
  function act(action, arg = "", el) {
    if (s.encounter) {
      if (action === "encounterChoice") {
        Combat.encounterChoice(arg);
        finish();
      } else Combat.encounterPanel();
      return;
    }
    if (action === "close") {
      if (!s.party.some((p) => p.hp > 0)) return defeat();
      if (s.battle) {
        Combat.panel();
        return;
      }
      UI.close();
      return;
    }
    let ids = arg.split(",");
    switch (action) {
      case "menu":
        menu();
        return;
      case "slotSave":
        if (read(arg))
          UI.modal(
            "Replace slot " + arg + "?",
            btn("Replace saved company", "writeSlot", arg) + btn("Cancel", "menu"),
            "Save game",
          );
        else act("writeSlot", arg);
        return;
      case "writeSlot":
        save(arg);
        menu();
        return;
      case "slotLoad": {
        let v = read(arg);
        if (v) {
          setState(v);
          UI.close();
          note("Saved company restored.");
          if (s.encounter) Combat.encounterPanel();
          else if (s.battle) Combat.panel();
        }
        break;
      }
      case "move":
        return move(arg);
      case "interact":
        interact();
        break;
      case "leaveTown":
        UI.close();
        enter("wild");
        break;
      case "visitService": {
        let l = world.town,
          y = l.grid.findIndex((row) => row.includes(arg)),
          x = l.grid[y].indexOf(arg);
        s.x = x < 7 ? x + 1 : x - 1;
        s.y = y;
        s.dir = x < 7 ? 3 : 1;
        service(arg);
        break;
      }
      case "buy": {
        let it = Data.item(arg);
        if (it && s.gold >= it.price) {
          s.gold -= it.price;
          s.inventory.push({ id: it.id });
          note("Purchased " + it.name + ".");
        }
        shop();
        break;
      }
      case "train": {
        let p = s.party[+arg],
          price = 100 * (p.level + 1);
        if (p.hp > 0 && p.level < 20 && p.xp >= Rules.xpFor(p.cls, p.level + 1) && s.gold >= price) {
          s.gold -= price;
          Rules.advance(p);
          note(p.name + " advances to level " + p.level + ".", "good");
        }
        service("H");
        break;
      }
      case "heal":
        if (s.gold >= +arg) {
          s.gold -= +arg;
          for (let p of s.party) p.hp = p.maxHp;
          note("The company is restored.", "good");
          UI.close();
        }
        break;
      case "lodge":
        if (s.gold >= 2) {
          s.gold -= 2;
          Watch.rest("once");
        }
        break;
      case "listen":
        Watch.listen();
        break;
      case "search":
        Watch.search();
        break;
      case "camp":
        Watch.camp();
        return;
      case "rest":
        Watch.rest(arg);
        break;
      case "bestiary":
        Bestiary.show();
        return;
      case "map":
        Atlas.show();
        return;
      case "journal":
        Journal.show();
        return;
      case "campaign":
        Campaign.show();
        return;
      case "help":
        UI.help();
        return;
      case "pad":
      case "menuPad":
        s.pad = !s.pad;
        Navpad.show(s.pad);
        if (action === "menuPad") menu();
        break;
      case "sheet":
        sheet(+arg);
        return;
      case "layOnHands": {
        if (s.battle) return;
        const p = s.party[+ids[0]], ally = s.party[+ids[1]];
        const amount = Rules.layOnHands(p, ally, s.minutes);
        if (amount) note(p.name + " uses Lay on Hands on " + ally.name + ", restoring " + amount + " HP.", "good");
        sheet(+ids[0]);
        break;
      }
      case "creep":
        s.creeping = !s.creeping;
        note(s.creeping ? "Your thief scouts ahead silently." : "The company closes ranks.");
        sheet(+arg);
        break;
      case "prepare":
      case "unprepare":
        Rules.changePreparation(s.party[+ids[0]], ids[1], action === "prepare");
        sheet(+ids[0]);
        break;
      case "fieldHeal": {
        const [caster, id, target] = ids;
        const p = s.party[+caster], sp = Data.spell(id);
        if (s.battle || !p || p.hp <= 0 || !(p.ready[id] > 0) || !["heal","cure"].includes(sp?.effect)) return;
        if (target === undefined) {
          UI.modal(sp.name, "<p>Choose a wounded companion.</p>" + s.party.map((ally, j) =>
            btn(ally.name + " · " + ally.hp + "/" + ally.maxHp + " HP", "fieldHeal", arg + "," + j,
              ally.hp >= ally.maxHp)).join("") + btn("Back", "sheet", caster), p.name);
          return;
        }
        const ally = s.party[+target];
        if (!ally || ally.hp >= ally.maxHp) return;
        const recipients = sp.radius ? s.party.filter(v => v.hp < v.maxHp) : [ally];
        for (const member of recipients) {
          let amount = 0;
          for (let n = 0; n < sp.dice[0]; n++) amount += Rules.roll(sp.dice[1]);
          amount = Math.min(amount, member.maxHp - member.hp);
          member.hp += amount;
          note(p.name + " casts " + sp.name + " on " + member.name + " for " + amount + " HP.", "good");
        }
        p.ready[id]--;
        sheet(+caster);
        break;
      }
      case "inventory":
        inventory();
        return;
      case "inspect":
        inspect(+arg);
        return;
      case "drop":
        (s.ground[tileKey(s.x, s.y)] ||= []).push(s.inventory.splice(+arg, 1)[0]);
        inventory();
        break;
      case "pickup":
        s.inventory.push(s.ground[tileKey(s.x, s.y)].splice(+arg, 1)[0]);
        inventory();
        break;
      case "equip":
      case "use":
      case "learn": {
        let [i, n] = ids.map(Number),
          p = s.party[n],
          it = Data.item(s.inventory[i].id);
        if (action === "equip") {
          if (!Rules.canEquip(p, it) || p.hp <= 0) return;
          let k = it.type;
          s.inventory.splice(i, 1);
          if (p[k]) s.inventory.push({ id: p[k] });
          p[k] = it.id;
        } else if (action === "learn") {
          if (!p.book.includes(it.spell)) {
            p.book.push(it.spell);
            s.inventory.splice(i, 1);
          }
        } else {
          let sp = Data.spell(it.spell);
          p.hp = Math.min(p.maxHp, p.hp + Math.max(1, sp.dice[0] * Rules.roll(sp.dice[1])));
          consume(i);
        }
        inventory();
        break;
      }
      case "rescue":
        s.gold = Math.floor(s.gold / 2);
        s.party.forEach((p) => (p.hp = Math.max(1, Math.floor(p.maxHp / 2))));
        s.battle = null;
        UI.close();
        enter("town");
        break;
      default:
        if (
          Combat.handle(action, arg) ||
          Campaign.handle(action, arg) ||
          Journal.handle(action, arg) ||
          Overland.handle(action, arg)
        )
          break;
        return;
    }
    finish();
  }
  function start() {
    UI.init();
    let loaded = read("auto");
    setState(loaded || fresh());
    if (!loaded) {
      note("Your company arrives in Thornwick.", "story");
      note("The market stirs beneath the morning mist.");
      note("Seek Warden Ysra at the warden’s hall for a commission.", "good");
    }
    Navpad.bind();
    finish();
    if (s.encounter) Combat.encounterPanel();
    else if (s.battle) Combat.panel();
  }
  function transfer(id, newParty) {
    if (newParty) {
      let oldPad = s.pad;
      setState(fresh());
      s.pad = oldPad;
      s.party = newParty;
    }
    s.id = id;
    world = Adventures.world(id);
    UI.close();
    enter("town");
  }
  return {
    get state() {
      return s;
    },
    get world() {
      return world;
    },
    get level() {
      return level();
    },
    setState,
    draw,
    act,
    start,
    move,
    enter,
    note,
    record,
    save,
    finish,
    tile,
    tileKey,
    areaKey,
    transfer,
    contextLabel,
    loot,
    recoverTreasure,
    consume,
    shop,
    service,
    inventory,
    defeat,
  };
})();
Game.start();
