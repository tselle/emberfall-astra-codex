// These scenarios also run inside a real browser through tests/chrome.js.
function playAutoFight() {
  const original = globalThis.setTimeout;
  const queue = [];
  globalThis.setTimeout = (tick, delay) => queue.push({ tick, delay });
  try {
    Game.act("battleAction", "auto");
    let turns = 0;
    while (Game.state.battle) {
      if (++turns > 10000 || queue.length !== 1) throw new Error("Expected one scheduled combat turn");
      const { tick, delay } = queue.shift();
      if (delay !== 200) throw new Error("Incorrect turn delay");
      tick();
    }
  } finally {
    globalThis.setTimeout = original;
  }
}
(() => {
  function check(condition, message) {
    if (!condition) throw new Error(message);
  }
  function step(name, fn) {
    fn();
    console.log("PASS " + name);
  }
  const command = (action, arg = "") => Game.act(action, String(arg));
  const reset = JSON.stringify(Game.state);
  Math.random = Rules.rng("emberfall-playtest-v1");
  const state = () => Game.state;
  step("Town movement, turning, character sheets and local save slots", () => {
    check(state().party.length === 6, "ready company");
    Game.move("forward");
    check(state().y === 10, "walk north");
    Game.move("right");
    check(state().dir === 1, "turn east");
    Game.move("strafeRight");
    check(state().y === 11, "strafe south");
    command("sheet", 2);
    check(UI.$("modal-body").innerHTML.includes("Saving throws"), "sheet");
    command("close");
    command("slotSave", 1);
    command("close");
    Game.move("left");
    command("slotLoad", 1);
    check(state().dir === 1, "saved heading");
  });
  step("Company builder and standalone adventure levels", () => {
    command("create", "E2");
    UI.$("char-name").oninput({ target: { value: "Aster" } });
    command("addDraft");
    command("startDraft");
    command("commitDraft");
    check(
      state().party.length === 1 && state().party[0].name === "Aster" && state().party[0].level === 3,
      "custom company",
    );
    Game.setState(JSON.parse(reset));
    Game.finish();
  });
  step("Equipment, scroll learning, dropping and pickup", () => {
    const p = state().party[3],
      sp = Data.spells.find((v) => v.school === "wizard" && !p.book.includes(v.id));
    state().inventory.push({ id: "scroll_of_" + sp.id });
    command("inspect", 1);
    command("learn", "1,3");
    check(p.book.includes(sp.id), "learned from scroll");
    state().inventory.push({ id: "scroll_of_" + sp.id });
    command("inspect", 1);
    check(/disabled[^>]*>Learned/.test(UI.$("modal-body").innerHTML), "known spell Learn disabled");
    command("drop", 0);
    check(state().ground[Game.tileKey(state().x, state().y)].length === 1, "ground item");
    command("pickup", 0);
    check(state().inventory.length === 2, "pickup");
    command("close");
  });
  step("Prepare repeat copies and cast healing on a companion", () => {
    const snapshot = JSON.stringify(state());
    const caster = state().party.findIndex(p => p.cls === "Cleric");
    const p = state().party[caster], ally = state().party[0], heal = "cure_light_wounds";
    const prepareArg = caster + "," + heal;
    const capacity = Rules.slots(p)[0];
    for (const id of Rules.plannedSpells(p, 1)) command("unprepare", caster + "," + id);
    for (let i = 0; i <= capacity; i++) command("prepare", prepareArg);
    check(Rules.plannedSpells(p, 1).length === capacity, "circle slot limit");
    command("rest", "once");
    check(p.ready[heal] === capacity, "each planned copy is memorized");
    ally.hp = 0;
    command("fieldHeal", prepareArg);
    check(UI.$("modal-body").innerHTML.includes(ally.name), "field target picker");
    command("fieldHeal", prepareArg + ",0");
    check(ally.hp > 0 && p.ready[heal] === capacity - 1, "one copy restores a downed member");
    if (typeof HTMLButtonElement !== "undefined") {
      const card = document.querySelector(`#roster .member[data-arg="${caster}"]`);
      const dots = [...card.querySelectorAll('.slot-circle:first-child .spell-dot')];
      check(dots.length === capacity && dots.filter(d => d.classList.contains('ready')).length === capacity - 1,
        "roster shows one indicator per slot and updates after casting");
      check(dots.every(d => d.title.includes(Data.spell(heal).name)) && dots.some(d => d.title.includes('Empty')),
        "slot hover names ready spells and empty slots planned for rest");
    }
    Combat.begin("cellar_rat", "test/cleric-heal");
    const b = state().battle;
    const unit = b.units.findIndex(u => !u.enemy && u.index === caster);
    b.index = b.order.indexOf(unit);
    const recipient = b.units.find(v => !v.enemy && v.index !== caster &&
      Battlefield.visible(b.field.grid, b.units[unit], v) &&
      Math.max(Math.abs(v.x-b.units[unit].x), Math.abs(v.y-b.units[unit].y)) <= 2);
    const wounded = state().party[recipient.index];
    wounded.hp = 0;
    command("battleAction", "spells");
    command("battleSpell", heal);
    check(UI.$("modal-body").innerHTML.includes("Heal " + wounded.name + " · Downed (0 HP)"), "downed ally has an explicit heal action");
    const targetKey = recipient.x + "," + recipient.y;
    if (typeof HTMLButtonElement !== "undefined") {
      const button = document.querySelector('.combat-roster [data-act="battleTarget"][data-arg="' + targetKey + '"]');
      check(button && !button.disabled, "downed ally selectable in combat roster");
      button.click();
    } else command("battleTarget", targetKey);
    check(p.ready[heal] === capacity - 2 && wounded.hp > 0, "combat healing restores a downed member");
    Game.setState(JSON.parse(snapshot));
    UI.close();
    Game.finish();
  });
  step("Paladin Lay on Hands shares one daily use across exploration and combat", () => {
    const snapshot = JSON.stringify(state());
    const paladin = state().party.findIndex(p => p.cls === "Paladin");
    const p = state().party[paladin];
    p.hp = p.maxHp - 1;
    command("layOnHands", paladin + "," + paladin);
    check(p.hp === p.maxHp && !Rules.handsReady(p, state().minutes), "sheet healing and daily limit");
    const rosterShows = text => UI.$("roster").innerHTML.includes(`title="Lay on Hands · ${text}`);
    check(rosterShows("Used"), "daily ability indicator spent");
    state().minutes += 1440;
    UI.paint(false);
    check(rosterShows("Ready"), "daily ability indicator refreshes on day change alone");
    Combat.begin("cellar_rat", "test/hands");
    const b = state().battle;
    const i = b.units.findIndex(u => !u.enemy && u.index === paladin);
    b.index = b.order.indexOf(i);
    Combat.panel();
    check(UI.$("modal-body").innerHTML.includes("Lay on Hands"), "Paladin combat action");
    p.hp = p.maxHp - 1;
    command("battleAction", "hands");
    command("battleTarget", b.units[i].x + "," + b.units[i].y);
    check(p.hp === p.maxHp && !Rules.handsReady(p, state().minutes), "combat self-heal after daily reset");
    Game.setState(JSON.parse(snapshot));
    UI.close();
    Game.finish();
  });
  step("A combatant can split movement and then attack before initiative advances", () => {
    const snapshot = JSON.stringify(state());
    Combat.begin("cellar_rat", "test/advance");
    const b = state().battle;
    const fighter = b.units.findIndex(u => !u.enemy && u.index === 0);
    const foe = b.units.find(u => u.enemy);
    b.field.grid = Array(14).fill(".".repeat(18));
    b.index = b.order.indexOf(fighter);
    Object.assign(b.units[fighter], {x:0,y:0});
    const speed = 6 * Rules.movement(state().party[0]);
    const budget = Math.floor(b.round * speed) - Math.floor((b.round - 1) * speed);
    Object.assign(foe, {x:budget + 1,y:1});
    const initiative = b.index;
    command("battleAction", "move");
    command("battleTarget", "2,0");
    check(b.index === initiative && b.moved === 2 && b.mode === "move", "partial move keeps movement available");
    command("battleTarget", (budget + 1) + ",0");
    check(b.units[fighter].x === 2 && b.moved === 2, "out-of-budget destination rejected without spending steps");
    command("battleAction", "attack");
    command("battleAction", "move");
    command("battleTarget", budget + ",0");
    check(b.index === initiative && b.moved === budget && b.mode === "attack", "final move preserves attack");
    command("battleAction", "move");
    check(b.mode === "attack", "movement blocked after exhausting budget");
    check(UI.$("modal-body").innerHTML.includes('data-act="battleTarget" data-arg="' + (budget + 1) + ',1"'), "diagonal melee target offered");
    command("battleTarget", (budget + 1) + ",1");
    check(b.log.some(msg => msg.includes(state().party[0].name) && /hits|misses/.test(msg)), "diagonal attack after moving");
    Game.setState(JSON.parse(snapshot));
    UI.close();
    Game.finish();
  });
  step("Finishing attacks animate before victory and resolve once", () => {
    const snapshot = JSON.stringify(state());
    const originalMedia = globalThis.matchMedia, originalTimer = globalThis.setTimeout;
    const originalFrame = globalThis.requestAnimationFrame, originalRandom = Math.random;
    try {
      Combat.begin("cellar_rat", "test/animation", true);
      const b = state().battle;
      const fighter = b.units.findIndex(v => !v.enemy && v.index === 0);
      const foe = b.units.find(v => v.enemy);
      Object.assign(b.units[fighter], {x:0, y:0});
      Object.assign(foe, {x:1, y:0, hp:1});
      b.field.grid = Array(14).fill(".".repeat(18));
      b.index = b.order.indexOf(fighter);
      b.mode = "attack";
      let drawFrame;
      globalThis.matchMedia = () => ({matches:true});
      check(UI.$("modal-body").innerHTML.includes("Attack animations: Off"), "reduced-motion default visible");
      command("battleAnimations");
      check(state().combatAnimations && UI.$("modal-body").innerHTML.includes("Attack animations: On"), "player can enable effects");
      globalThis.requestAnimationFrame = draw => { drawFrame = draw; };
      globalThis.setTimeout = () => { throw Error("playback must wait for rendered frames"); };
      Math.random = () => 0.99;
      command("battleTarget", "1,0");
      check(b.resolved && foe.hp === 0 && state().battle === b, "winning blow visible");
      check(UI.$("modal-body").innerHTML.includes("d20 [20]"), "winning attack shows actual die face");
      const first = performance.now() + 2000; // simulate a delayed first paint
      drawFrame(first);
      command("battleAction", "wait");
      check(b.order[b.index] === fighter, "input cannot advance playback");
      for (let i = 1; i <= 35 && state().battle; i++) drawFrame(first + i * 64);
      check(!state().battle && state().cleared["test/animation"], "victory after playback");
      drawFrame(performance.now() + 240);
      const restored = JSON.parse(JSON.stringify(state()));
      Game.setState(restored);
      command("journal");
      const journal = UI.$("modal-body").innerHTML;
      check(journal.includes('<details><summary>Cellar Rat') && journal.includes('d20 [20]') && journal.includes('initiative: d10'), "saved rolls in collapsed battle history");
    } finally {
      globalThis.matchMedia = originalMedia;
      globalThis.setTimeout = originalTimer;
      globalThis.requestAnimationFrame = originalFrame;
      Math.random = originalRandom;
      Game.setState(JSON.parse(snapshot));
      UI.close();
      Game.finish();
    }
  });
  step("Encounter choices precede initiative and respect the foe's intelligence", () => {
    const snapshot = JSON.stringify(state()), random = Math.random;
    const shows = text => UI.$("modal-body").innerHTML.includes(text);
    try {
      Combat.encounter("cellar_rat", "test/rat");
      command("close");
      check(state().encounter && !state().battle && shows("Back away slowly") && !shows("Attempt parley"), "animal encounter cannot be dismissed or negotiated");
      command("encounterChoice", "study");
      check(shows("incisors leave twin grooves"), "study before initiative");
      Math.random = () => .99;
      command("encounterChoice", "withdraw");
      check(state().cleared['test/rat'] && !state().battle, "animal backs off");
      Combat.encounter("bandit", "test/bandit");
      check(shows("Attempt parley"), "reasoning foe offers parley");
      command("encounterChoice", "talk");
      check(state().cleared['test/bandit'] && !state().bestiary.bandit.defeated, "safe passage without a kill");
      Combat.encounter("bandit", "test/guardian", true);
      command("encounterChoice", "talk");
      check(!state().cleared['test/guardian'] && !shows("Attempt parley") && shows("refused"), "guardian cannot be bypassed or rerolled");
      Game.setState(JSON.parse(snapshot));
      Combat.encounter("skeleton", "test/skeleton");
      check(shows("Engage") && !shows("Attempt parley") && !shows("Back away slowly"), "mindless foe still pauses before combat");
    } finally {
      Math.random = random;
      Game.setState(JSON.parse(snapshot)); UI.close(); Game.finish();
    }
  });
  step("Loot shares its full appraised value only among survivors", () => {
    const snapshot = JSON.stringify(state()), original = Treasure.roll;
    try {
      const s = state(), before = s.party.map(p => p.xp), purse = s.gold;
      s.party.forEach((p, i) => { p.hp = i < 2 ? 1 : 0; p.stats.fill(10); });
      Treasure.roll = () => ({gold: 53, valuables: ["Quartz (50 gp)"], items:["healing_potion"]});
      const value = 53 + Data.item("healing_potion").price;
      check(Game.loot("B") === value && s.gold === purse + 53, "coins and appraised gem counted once, item retained not sold");
      check(s.party.every((p,i) => p.xp - before[i] === (i === 0 ? Math.ceil(value/2) : i === 1 ? Math.floor(value/2) : 0)), "whole XP pool distributed without rewarding downed characters");
    } finally { Treasure.roll = original; Game.setState(JSON.parse(snapshot)); Game.finish(); }
  });
  step("Isometric initiative, auto-fight, loot and creature records", () => {
    Combat.begin("cellar_rat", "test/guard");
    check(!!state().battle, "battle started");
    const {field, units} = state().battle;
    check(field.grid.length === 14 && field.grid.every(row => row.length === 18), "five-foot battlefield");
    check(field.grid.some(row => row.includes("#")), "local masonry");
    check(new Set(units.map(u => u.x + "," + u.y)).size === units.length, "distinct starting squares");
    check(units.every(u => !["#", "D", "~"].includes(field.grid[u.y][u.x])), "passable starting squares");
    const center = {x:1,y:1};
    check(Battlefield.flood(["...", "...", "..."], center, 1).length === 9, "one step in all eight directions");
    check(Battlefield.flood([".#", "#."], {x:0,y:0}).length === 1, "no diagonal through sealed corner");
    check(Battlefield.flood(["..", ".."], {x:0,y:0}, 1, new Set([1,Battlefield.width])).length === 1,
      "no diagonal between two occupied squares");
    const occupied = new Set([1, Battlefield.width]);
    const squeeze = allies => Battlefield.flood(["..", ".."], {x:0,y:0}, 1, occupied, allies);
    const friendlyGap = squeeze(occupied);
    check(friendlyGap.length === 2 && friendlyGap.some(p => p.x === 1 && p.y === 1 && p.steps === 1),
      "step diagonally between two allies without entering their squares");
    check(squeeze(new Set([1])).length === 1, "one ally and one enemy still block the diagonal");
    const corridor = ["..D..", "#####"];
    check(Battlefield.flood(corridor, {x:0,y:0}).length === 2, "door blocks movement");
    check(!Battlefield.visible(corridor, {x:0,y:0}, {x:4,y:0}), "door blocks sight");
    check(Battlefield.visible(["....."], {x:0,y:0}, {x:4,y:0}), "open corridor sight");
    state().autoFightDelay = 100; // Legacy saves may include a speed preference.
    playAutoFight();
    check(!state().battle && state().cleared["test/guard"], "battle victory");
    check(state().bestiary.cellar_rat.seen > 0, "bestiary encounter");
    command("close");
  });
  step("Training, market, resting, campaigns and commissions", () => {
    let p = state().party[0];
    state().gold = 400;
    p.xp = Rules.xpFor(p.cls, 2);
    command("visitService", "H");
    command("train", 0);
    check(p.level === 2 && state().gold === 200, "training");
    command("close");
    command("visitService", "S");
    const stock = UI.$("modal-body").innerHTML;
    check(stock.includes("1d8 damage · Adjacent") && stock.includes("AC 8 (lower is better)") && stock.includes("Equippable by:"), "shop equipment stats before purchase");
    check(stock.includes("Cure Light Wounds: Restore 1d8 HP") && stock.includes("1 charge"), "shop magic item stats before purchase");
    command("buy", "healing_potion");
    check(
      state().inventory.some((o) => o.id === "healing_potion"),
      "shop",
    );
    command("close");
    p.hp = 1;
    command("camp");
    command("rest", "heal");
    check(p.hp === p.maxHp, "rest until healed");
    command("visitService", "G");
    command("questAccept", "main");
    command("questAccept", "side");
    command("close");
    command("leaveTown");
    check(state().area === "wild", "north gate");
    let before = state().minutes;
    Game.move("strafeRight");
    check(state().minutes > before, "overland travel");
    command("map");
    check(UI.$("dialog").open, "area map");
    command("close");
    const dest = Game.world.wild.sites.find((v) => v.type === "dungeon");
    Game.enter("wild", 0, [dest.x, dest.y]);
    command("interact");
    check(state().area === "dungeon", "enter dungeon");
    let l = Game.level;
    Game.enter("dungeon", 0, l.quest);
    command("interact");
    check(state().quests.E0.relic, "quest relic");
    Game.enter("dungeon", 0, l.exit);
    command("interact");
    check(state().floor === 1, "stairs destination");
    Combat.begin(Game.world.adventure.boss, "E0/boss", true);
    playAutoFight();
    check(state().cleared["E0/boss"], "boss victory");
    command("close");
    command("travel", "E0");
    command("visitService", "G");
    let old = state().gold;
    command("questPay", "main");
    command("questPay", "side");
    check(state().quests.E0.side === "paid" && state().gold > old, "commission rewards");
    command("close");
    command("campaign");
    command("travel", "E3");
    check(state().id === "E3" && state().party[0].level === 2, "retain company");
  });
  step("Hazards, secret passages and generated expedition", () => {
    command("travel", "W50");
    Game.enter("dungeon");
    let l = Game.level,
      t = l.traps[0];
    let pos = Modules.dirs
      .map(([dx, dy]) => [t.x + dx, t.y + dy])
      .find(([x, y]) => !Modules.blocking(Game.tile(x, y)));
    if (pos) {
      Game.enter("dungeon", 0, pos);
      for (let i = 0; i < 40 && !state().seen[t.id]; i++) Watch.search();
      check(state().seen[t.id], "discover trap");
      Watch.disarm(t);
      check(state().cleared[t.id], "disarm or trigger trap");
    }
    let [dx, dy] = l.doors[0];
    let near = Modules.dirs
      .map(([x, y]) => [dx + x, dy + y])
      .find(([x, y]) => !Modules.blocking(Game.tile(x, y)));
    if (near) {
      Game.enter("dungeon", 0, near);
      for (let i = 0; i < 40 && Game.tile(dx, dy) === "?"; i++) Watch.search();
      check(Game.tile(dx, dy) === ".", "discover secret");
    }
    command("journal");
    command("close");
    command("bestiary");
    command("close");
    command("map");
    command("close");
    command("help");
    command("close");
    const previousPad = state().pad;
    command("pad");
    check(state().pad !== previousPad, "touch pad");
    command("pad");
  });
  Game.setState(JSON.parse(reset));
  Game.finish();
})();
