// These scenarios also run inside a real browser through tests/chrome.js.
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
  step("Isometric initiative, auto-fight, loot and creature records", () => {
    Combat.begin("cellar_rat", "test/guard");
    check(!!state().battle, "battle started");
    command("battleAction", "auto");
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
    command("battleAction", "auto");
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
