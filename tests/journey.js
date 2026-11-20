// Walk an entire expedition through the same movement, interaction and combat actions as a player.
(() => {
  Math.random = Rules.rng("company-journey");
  let steps = 0,
    battles = 0;
  const S = () => Game.state;
  const act = (a, b = "") => Game.act(a, String(b));
  function face(dir) {
    while (S().dir !== dir) Game.move((S().dir - dir + 4) % 4 === 1 ? "left" : "right");
  }
  function afterMove() {
    if (S().battle) {
      battles++;
      act("battleAction", "auto");
    }
    if (!S().party.some((p) => p.hp > 0))
      throw new Error(
        "Company fell during " +
          S().id +
          " " +
          Game.level.name +
          " " +
          JSON.stringify(S().party.map((p) => [p.name, p.level, p.maxHp])) +
          " " +
          S()
            .log.slice(-5)
            .map((v) => v.msg)
            .join(" / "),
      );
    if (UI.$("dialog").open) act("close");
    if (S().party.some((p) => p.hp > 0 && p.hp < p.maxHp * 0.75)) {
      act("camp");
      act("rest", "heal");
    }
  }
  function walk(to) {
    for (let attempts = 0; attempts < 500; attempts++) {
      const s = S();
      if (s.x === to[0] && s.y === to[1]) return;
      const queue = [[s.x, s.y, -1]],
        seen = new Set([s.x + "," + s.y]);
      let first;
      for (let n = 0; n < queue.length; n++) {
        const [x, y, dir] = queue[n];
        if (x === to[0] && y === to[1]) {
          first = dir;
          break;
        }
        Modules.dirs.forEach(([dx, dy], d) => {
          const xx = x + dx,
            yy = y + dy,
            key = xx + "," + yy;
          if (seen.has(key)) return;
          const tile = Game.level.grid[yy]?.[xx];
          if (s.area === "wild" ? !Wilds.speed[tile] : !tile || "#?ISTHG".includes(tile)) return;
          seen.add(key);
          queue.push([xx, yy, dir === -1 ? d : dir]);
        });
      }
      if (first === undefined) throw new Error("No walking route to " + to);
      face(first);
      Game.move("forward");
      steps++;
      afterMove();
    }
    throw new Error("Unable to reach " + to);
  }
  for (let id of ["E0", "E1", "E2", "E3"]) {
    const initialSteps = steps,
      initialBattles = battles;
    act("travel", id);
    if (S().gold >= 20) {
      act("heal", "20");
    }
    // Outfit the trained company at each new town before setting out.
    const stock = Treasure.shop(Game.world.adventure.range[0]);
    S().party.forEach((p, i) => {
      if (p.cls === "Mage") {
        for (let circle = 2; circle <= Rules.slots(p).length; circle++) {
          const spell = Data.spells.find(
            (sp) => sp.school === "wizard" && sp.level === circle && sp.effect === "damage",
          );
          const id = "scroll_of_" + spell.id,
            it = Data.item(id);
          if (!p.book.includes(spell.id) && stock.includes(id) && S().gold >= it.price) {
            act("buy", id);
            act("learn", S().inventory.length - 1 + "," + i);
          }
          if (p.book.includes(spell.id) && !p.plan.includes(spell.id)) act("prepare", i + "," + spell.id);
        }
      }
      if (p.armour) {
        const armour = stock
          .map(Data.item)
          .filter(
            (it) =>
              it.type === "armour" &&
              Rules.canEquip(p, it) &&
              it.price <= S().gold &&
              it.ac < Data.item(p.armour).ac,
          )
          .sort((a, b) => a.ac - b.ac || a.price - b.price)[0];
        if (armour) {
          act("buy", armour.id);
          act("equip", S().inventory.length - 1 + "," + i);
        }
      }
    });
    act("rest", "once");
    act("visitService", "G");
    act("questAccept", "main");
    act("questAccept", "side");
    act("close");
    walk(Game.world.town.exit);
    act("interact");
    let entrance = Game.world.wild.sites.find((v) => v.type === "dungeon");
    walk([entrance.x, entrance.y]);
    act("interact");
    if (S().area !== "dungeon") throw new Error("Entrance interaction");
    walk(Game.level.quest);
    act("interact");
    for (let i = 0; i < Game.world.levels.length; i++) {
      walk(Game.level.exit);
      act("interact");
      afterMove();
    }
    if (!S().cleared[id + "/boss"]) throw new Error("Final guardian");
    for (let i = Game.world.levels.length - 1; i >= 0; i--) {
      walk(Game.level.start);
      act("interact");
      afterMove();
    }
    walk(Game.world.wild.start);
    act("interact");
    act("visitService", "G");
    act("questPay", "main");
    act("questPay", "side");
    if (S().quests[id].main !== "paid" || S().quests[id].side !== "paid")
      throw new Error("Unpaid commissions " + id + " " + JSON.stringify(S().quests[id]));
    act("close");
    act("heal", "20");
    act("visitService", "H");
    for (let i = 0; i < S().party.length; i++) {
      let p = S().party[i];
      while (p.level < 20 && p.xp >= Rules.xpFor(p.cls, p.level + 1) && S().gold >= (p.level + 1) * 100)
        act("train", i);
    }
    act("close");
    console.log(
      "PASS " +
        id +
        " round trip and both commissions (" +
        (steps - initialSteps) +
        " moves, " +
        (battles - initialBattles) +
        " battles)",
    );
  }
})();
