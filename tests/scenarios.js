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
  step("Party transfer restores the roster, shared pack and purse together", () => {
    const s = state();
    s.inventory.push({id:"cinder_wand", charges:1}, {id:"cinder_wand"}, {id:"locket_of_the_third_sister", charges:0});
    s.gold = 73;
    s.purseCopper = 141;
    command("exportParty");
    const file = JSON.parse(UI.$("party-json").value);
    const pack = JSON.stringify(s.inventory), roster = JSON.stringify(s.party);
    s.party.reverse();
    s.inventory = [];
    s.gold = 7;
    s.purseCopper = 3;
    s.minutes += 30;
    const minutes = s.minutes;
    function load(data) {
      command("importParty");
      UI.$("party-json").value = JSON.stringify(data);
      command("replaceParty");
    }
    for (const bad of [{gold:-1}, {purseCopper:200}, {inventory:[{id:"missing_item"}]},
        {inventory:[{id:"cinder_wand", charges:999}]}, {party:[]}]) {
      load({...file, ...bad});
      check(UI.$("party-error").textContent && JSON.stringify(s.party) !== roster && !s.inventory.length &&
        s.gold === 7 && s.purseCopper === 3, "invalid import leaves the company intact");
    }
    load({format:file.format, version:1, party:file.party});
    check(JSON.stringify(s.party) === roster && !s.inventory.length && s.gold === 7 && s.purseCopper === 3,
      "legacy roster retains the destination's pack and purse");
    load(file);
    command("slotLoad", "auto");
    check(JSON.stringify(state().inventory) === pack && JSON.stringify(state().party) === roster &&
      state().gold === 73 && state().purseCopper === 141 && state().minutes === minutes,
      "autosave restores exact company possessions and keeps current adventure time");
    load({...file, gold:0, purseCopper:0, inventory:[]});
    check(!state().inventory.length && state().gold === 0 && state().purseCopper === 0, "empty pack and purse replace existing possessions");
    Game.setState(JSON.parse(reset)); Game.finish();
  });
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
  step("Party order controls move the selected character and autosave the roster", () => {
    const snapshot = JSON.stringify(state()), party = state().party.slice();
    command("sheet", 0);
    function clickOrder(arg) {
      if (typeof HTMLButtonElement !== "undefined") {
        document.querySelector('[data-act="order"][data-arg="' + arg + '"]').click();
      } else command("order", arg);
    }
    clickOrder("0,-1");
    check(state().party[0] === party[0], "first character stays at the front");
    clickOrder("0,1");
    check(state().party[0] === party[1] && state().party[1] === party[0], "adjacent members swapped");
    check(UI.$("modal-title").textContent === party[0].name, "sheet follows moved character");
    if (typeof HTMLButtonElement !== "undefined") {
      check(document.querySelector("#roster .member-name").textContent.includes(party[1].name), "roster repaints");
    }
    for (let dir = 0; dir < 4; dir++) {
      state().dir = dir;
      const allies = state().party.map((_, index) => ({index, enemy:false}));
      const foe = {enemy:true};
      Battlefield.create("test/marching-order", [...allies, foe]);
      const visibleOrder = allies.slice().sort((a, b) =>
        (a.x + a.y) - (b.x + b.y) || (a.x - a.y) - (b.x - b.y));
      check(visibleOrder.map(u => u.index + 1).join() === "1,2,3,4,5,6",
        "battlefield rows match roster left to right, top to bottom facing direction " + dir);
    }
    command("slotLoad", "auto");
    check(state().party[1].name === party[0].name, "autosave restores order");
    command("sheet", 1);
    clickOrder("1,-1");
    check(state().party[0].name === party[0].name, "move up restores original leader");
    Game.setState(JSON.parse(snapshot)); UI.close(); Game.finish();
  });
  step("Company builder and standalone adventure levels", () => {
    command("create", "E2");
    UI.$("char-race").onchange({ target: { value: "Dwarf" } });
    const preview = UI.$("modal-body").innerHTML;
    check(preview.includes("+1 Constitution, -1 Charisma"), "builder explains racial modifiers");
    UI.$("char-name").oninput({ target: { value: "Aster" } });
    command("addDraft");
    command("startDraft");
    command("commitDraft");
    check(
      state().party.length === 1 && state().party[0].name === "Aster" && state().party[0].level === 3,
      "custom company",
    );
    state().party[0].stats.forEach((score, i) =>
      check(preview.includes(Rules.abilities[i].slice(0, 3) + " " + score + "</span>"), "builder matches recruit"));
    Game.setState(JSON.parse(reset));
    Game.finish();
  });
  step("Racial ability adjustments apply once across creation and save loads", () => {
    const expected = {
      Human: [12,12,12,12,12,12], "Half-elf": [12,12,12,12,12,12],
      Dwarf: [12,12,13,12,12,11], Elf: [12,13,11,12,12,12],
      Gnome: [12,12,12,13,11,12], Halfling: [11,13,12,12,12,12],
    };
    for (const [race, scores] of Object.entries(expected)) {
      const recruit = Rules.create("Tester", "Fighter", race, 0, 1, Array(6).fill(12));
      check(String(recruit.stats) === String(scores), race + " ability scores");
    }
    for (const weapon of Data.items.filter(it => it.type === "weapon")) {
      const eligible = ["longsword", "shortsword", "longbow", "shortbow"].includes(weapon.base);
      check(Rules.racialAttackBonus({race:"Elf"}, weapon) === Number(eligible), "elf attack bonus for " + weapon.name);
      check(Rules.racialAttackBonus({race:"Half-elf"}, weapon) === 0, "half-elf attack bonus for " + weapon.name);
    }
    const legacy = JSON.parse(reset);
    legacy.version = 1;
    const cleric = legacy.party.find(p => p.race === "Dwarf");
    cleric.stats = [14,13,14,12,16,13];
    cleric.maxHp = 8;
    cleric.hp = 5;
    Game.setState(legacy);
    check(cleric.stats[2] === 15 && cleric.stats[5] === 12 &&
      cleric.hp === 6 && cleric.maxHp === 9, "legacy dwarf retains wounds");
    const migrated = JSON.stringify(state());
    Game.setState(JSON.parse(migrated));
    check(JSON.stringify(state()) === migrated, "reload keeps migrated scores");
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
    const originalUnit = Figures.unit;
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
      check(UI.$("modal-body").innerHTML.includes("Battle animations: Off"), "reduced-motion default visible");
      let phase;
      Figures.unit = (...args) => { phase = args[6].phase; originalUnit(...args); };
      globalThis.requestAnimationFrame = draw => { drawFrame = draw; };
      command("battleAnimations");
      check(state().combatAnimations && UI.$("modal-body").innerHTML.includes("Battle animations: On"), "player can enable effects");
      const firstPose = phase, idleState = JSON.stringify(b);
      drawFrame(performance.now() + 100);
      check(phase !== firstPose && JSON.stringify(b) === idleState, "idle figurines move without advancing combat");
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
      Figures.unit = originalUnit;
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
  step("Encounter treasure distinguishes purses, fleeing foes and shared lairs", () => {
    const snapshot = JSON.stringify(state()), random = Math.random, original = Treasure.roll;
    const rolled = [];
    try {
      Treasure.roll = type => {
        rolled.push(type);
        return {gold:0, copper:type === "K" ? 30 : 0, items:[], valuables:[]};
      };
      function victory(monster, id, kills, chance) {
        Game.setState(JSON.parse(snapshot));
        state().combatAnimations = false;
        Math.random = () => 0.5;
        Combat.begin(monster, id);
        const battle = state().battle;
        const enemies = battle.units.filter(u => u.enemy);
        check(enemies.length >= kills, "fixture has enough enemies");
        enemies.forEach((u, i) => { if (i < kills) u.hp = 0; else u.fled = true; });
        rolled.length = 0;
        Math.random = () => chance;
        command("battleAction", "wait");
        check(!state().battle, "victory resolved");
        return rolled.join(",");
      }
      check(victory("goblin", "road/123", 1, 0) === "K", "only defeated goblin drops silver");
      check(state().purseCopper === 30, "sub-gp silver is retained");
      check(victory("goblin", "road/123", 0, 0) === "", "fleeing patrol retains its purses");
      check(victory("skeleton", "test/guard", 1, 0) === "", "skeleton has no treasure");
      const lair = state().id + "/lair";
      check(victory("goblin", lair, 2, 0) === "K,K,C", "two purses and one shared hoard");
      check(victory("goblin", lair, 2, .99) === "K,K", "small lair may have no hoard");
    } finally {
      Treasure.roll = original;
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
    const carried = state().inventory.length;
    command("buy", "healing_potion");
    check(state().inventory[carried].id === "healing_potion" && state().gold === 182, "buy potion");
    check(UI.$("modal-body").innerHTML.includes("Sell · 9 gp"), "show resale offer");
    command("sell", carried);
    check(state().inventory.length === carried && state().gold === 191, "sell one potion at half price");
    const wand = state().inventory.push({id:"cinder_wand"}, {id:"cinder_wand", charges:1}) - 1;
    command("sell", wand);
    check(state().inventory.at(-1).charges === undefined && state().gold === 206, "sell selected partially charged wand");
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
    const dest = Game.world.wild.sites.find(v => v.type === "dungeon");
    const townKey = Game.tileKey(state().x, state().y);
    check(state().visited[townKey] && !Overland.knownSites().includes(dest), "start with a partial wilderness chart");
    let before = state().minutes;
    Game.move("strafeRight");
    check(state().minutes > before, "overland travel");
    command("map");
    check(UI.$("dialog").open, "area map");
    command("close");
    check(!UI.$("modal-body").innerHTML.includes(dest.name + " ("), "map does not list undiscovered coordinates");
    Game.enter("wild", 0, [dest.x, dest.y]);
    Game.finish();
    command("slotLoad", "auto");
    check(state().visited[townKey] && Overland.knownSites().includes(dest), "wilderness discoveries survive reload");
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
  step("Auto this turn honors Yes, No and Ask before spending a prepared spell", () => {
    Game.setState(JSON.parse(reset));
    state().combatAnimations = false;
    Combat.begin("cellar_rat", "test/auto-spells");
    const b = state().battle;
    const caster = b.units.findIndex(v => !v.enemy && state().party[v.index].cls === "Mage");
    const mage = state().party[b.units[caster].index];
    const foe = b.units.find(v => v.enemy);
    b.field.grid = Array(14).fill(".".repeat(18));
    b.units[caster].x = 2;
    b.units[caster].y = 2;
    foe.x = 3;
    foe.y = 2;
    foe.hp = 1000;
    mage.ready = {magic_missile:4};
    b.order = [caster, b.units.findIndex(v => !v.enemy && v !== b.units[caster])];
    const original = globalThis.setTimeout;
    const queue = [];
    globalThis.setTimeout = fn => queue.push(fn);
    try {
      for (const decision of ["yes", "no", "skip", "cast"]) {
        b.index = 0;
        b.started = false;
        if (decision === "no" || decision === "skip") command("battleAutoSpells");
        const before = mage.ready.magic_missile;
        command("battleAction", "autoTurn");
        check(queue.length === 1, "one scheduled turn");
        queue.shift()();
        if (decision === "skip" || decision === "cast") {
          Combat.panel();
          check(b.proposedSpell?.id === "magic_missile" && mage.ready.magic_missile === before &&
            !queue.length && UI.$("modal-body").innerHTML.includes("Skip spell"), "ask pauses before spending");
          command("battleDecideSpell", decision);
        }
        check(!b.auto && b.index === 1 && !queue.length, "manual control resumes");
        check(mage.ready.magic_missile === before - Number(decision === "yes" || decision === "cast"), "spell expenditure");
      }
    } finally {
      globalThis.setTimeout = original;
    }
  });
  step("Melee and missile weapons stay with their owner and switch within a turn", () => {
    Game.setState(JSON.parse(reset));
    function equip(id) {
      const index = state().inventory.push({id}) - 1;
      command("equip", index + ",0");
    }
    equip("shortbow");
    equip("longbow");
    const fighter = state().party[0];
    check(fighter.weapon === "longbow" && fighter.alternateWeapon === "longsword" &&
      state().inventory.some(it => it.id === "shortbow"), "new bow replaces only the previous bow");
    command("switchWeapon", 0);
    command("slotLoad", "auto");
    const p = state().party[0];
    check(p.weapon === "longsword" && p.alternateWeapon === "longbow", "both weapons survive save and load");
    state().combatAnimations = false;
    Combat.begin("cellar_rat", "test/weapon-switch");
    const b = state().battle, unit = b.units.findIndex(v => !v.enemy && v.index === 0);
    b.index = b.order.indexOf(unit);
    b.field.grid = Array(14).fill(".".repeat(18));
    Object.assign(b.units[unit], {x:2,y:2});
    const foe = b.units.find(v => v.enemy);
    Object.assign(foe, {x:8,y:2});
    const companion = b.units.find(v => !v.enemy && v.index === 1);
    Object.assign(companion, {x:5, y:2});
    b.moved = 1;
    const turn = b.index;
    Combat.panel();
    const rangedTarget = 'data-act="battleTarget" data-arg="8,2"';
    check(!UI.$("modal-body").innerHTML.includes(rangedTarget), "sword cannot reach distant foe");
    if (typeof HTMLButtonElement !== "undefined")
      document.querySelector('[data-act="battleAction"][data-arg="switchWeapon"]').click();
    else command("battleAction", "switchWeapon");
    check(b.index === turn && b.moved === 1 && p.weapon === "longbow" &&
      UI.$("modal-body").innerHTML.includes(rangedTarget), "switch immediately updates targets and preserves movement");
    const logLength = b.log.length;
    command("battleTarget", "8,2");
    check(b.log.slice(logLength).some(line => line.startsWith(p.name) && /(?:hits|misses) Cellar Rat/.test(line)),
      "archer attacks the foe through the intervening companion on the same turn");
    Game.setState(JSON.parse(reset)); UI.close();
  });
  step("Attack sight can pass through a narrow opening from the attacker's square", () => {
    let grid = [".........", ".#..#....", ".........", ".........", "........."];
    let a = {x:0, y:0}, b = {x:8, y:4};
    for (let turn = 0; turn < 4; turn++) {
      check(!Battlefield.visible(grid, a, b), "center ray blocked");
      check(Battlefield.attackVisible(grid, a, b), "opening visible from part of the attacker square");
      check(!Battlefield.attackVisible(grid, b, a), "reverse shot cannot see the original attacker's center");
      const rotate = p => ({x:grid.length - 1 - p.y, y:p.x});
      a = rotate(a); b = rotate(b);
      grid = Array.from(grid[0], (_, x) => grid.map(row => row[x]).reverse().join(""));
    }
    check(!Battlefield.attackVisible(["..#..", "..#..", "..#.."], {x:0,y:1}, {x:4,y:1}),
      "solid wall blocks every ray");
  });
  step("Melee attacks reach all eight adjacent squares", () => {
    Game.setState(JSON.parse(reset));
    state().combatAnimations = false;
    Combat.begin("cellar_rat", "test/melee-reach");
    const b = state().battle, fighter = b.units.findIndex(u => !u.enemy && u.index === 0);
    const foe = b.units.find(u => u.enemy);
    b.index = b.order.indexOf(fighter);
    Object.assign(b.units[fighter], {x:1, y:1});
    b.field.grid = ["....", "....", "....", "...."];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      if (x === 1 && y === 1) continue;
      Object.assign(foe, {x, y});
      Combat.panel();
      check(UI.$("modal-body").innerHTML.includes('data-act="battleTarget" data-arg="' + x + ',' + y + '"'),
        "adjacent foe selectable at " + x + "," + y);
    }
    b.field.grid = ["....", "..#.", ".#..", "...."];
    Combat.panel();
    check(!Battlefield.visible(b.field.grid, b.units[fighter], foe), "corner blocks sight");
    command("battleTarget", "2,2");
    check(b.log.some(line => line.startsWith(state().party[0].name) && /hits|misses/.test(line)),
      "melee strike across a blocked diagonal resolves");
  });
  step("Wearables occupy body slots and preserve their effects, owner and charges", () => {
    Game.setState(JSON.parse(reset));
    const s = state(), fighter = s.party[0], mage = s.party[3];
    function wear(id, member, slot, charges) {
      const obj = charges === undefined ? {id} : {id,charges};
      const index = s.inventory.push(obj) - 1;
      command("inspect", index);
      check(UI.$("modal-body").innerHTML.includes('data-act="wear"'), "inspect wearable " + id);
      command("wear", [index, member, slot].join(","));
      return obj;
    }
    command("wearSlot", "0,feet");
    check(UI.$("modal-title").textContent.includes("Feet"), "open empty body slot on old character");
    wear("boots_of_the_unfinished_errand", 0, "feet");
    check(Rules.movement(fighter) === 1.4, "boots change movement");
    const ac = Rules.ac(fighter);
    wear("applewood_buckler", 0, "offhand");
    check(Rules.ac(fighter) === ac - 1, "shield protects sword hand");
    fighter.alternateWeapon = "shortbow";
    command("switchWeapon", 0);
    check(Rules.ac(fighter) === ac, "shield slung when bow readied");
    wear("armlets_of_the_glass_citadel", 3, "wrists");
    check(Rules.ac(mage) === 3, "unarmoured mage uses bracers");
    const robe = s.inventory.push({id:"inkkeeper_s_smock"}) - 1;
    command("wearSlot", "3,torso");
    command("equip", robe + ",3,torso");
    check(mage.armour === "inkkeeper_s_smock" && Rules.ac(mage) === 9 && Rules.gearBonus(mage,"search") === 8,
      "robe occupies torso and suppresses bracer AC");
    command("unwear", "3,torso");
    check(Rules.ac(mage) === 3, "removing robe restores bracers");
    const finite = wear("tinner_s_band", 3, "leftRing", 2);
    wear("ring_of_the_waking_hound", 3, "rightRing");
    wear("ring_of_the_empty_scabbard", 3, "leftRing");
    check(s.inventory.includes(finite) && finite.charges === 2 && Rules.gearBonus(mage,"initiative") === 2,
      "replacing one ring preserves other ring and old charges");
    wear("locket_of_the_third_sister", 3, "neck");
    s.combatAnimations = false;
    Combat.begin("cellar_rat", "test/worn-healing");
    const b = s.battle, caster = b.units.findIndex(u => !u.enemy && u.index === 3);
    b.index = b.order.indexOf(caster);
    mage.hp = 1;
    command("battleAction", "items");
    check(UI.$("modal-body").innerHTML.includes('data-arg="neck"'), "worn power appears in combat items");
    command("battleItem", "neck");
    command("battleTarget", b.units[caster].x + "," + b.units[caster].y);
    check(mage.hp > 1 && mage.worn.neck.charges === 0, "cast from worn locket and keep depleted relic");
    s.battle = null;
    command("exportParty");
    const transfer = UI.$("party-json").value;
    command("importParty");
    UI.$("party-json").value = transfer;
    command("replaceParty");
    command("slotLoad", "auto");
    const restored = state().party[3];
    check(restored.worn.neck.charges === 0 && restored.worn.rightRing.id === "ring_of_the_waking_hound",
      "portable roster and autosave retain equipped gear");
    command("rest", "once");
    check(restored.worn.neck.charges === 1, "rest renews worn locket");
    command("unwear", "3,neck");
    check(!restored.worn.neck && state().inventory.some(o => o.id === "locket_of_the_third_sister" && o.charges === 1),
      "unequipping retains renewed charge");
  });
  Game.setState(JSON.parse(reset));
  Game.finish();
})();
