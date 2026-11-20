"use strict";
const Journal = (() => {
  const q = () =>
    (Game.state.quests[Game.state.id] ||= { main: "available", side: "available", relic: false });
  const rewards = {
    E0: [1250, 250, 40000, 8000],
    E1: [1800, 450, 64000, 12000],
    E2: [3600, 850, 240000, 48000],
    E3: [5200, 1200, 840000, 112000],
  };
  function reward(k, experience) {
    let a = Game.world.adventure,
      lv = a.range[0],
      table = rewards[a.id] || [1400 * lv, 250 * lv, 32000 * lv * lv, 6400 * lv * lv];
    return table[(experience ? 2 : 0) + (k === "main" ? 0 : 1)];
  }
  const gold = (k) => reward(k, false),
    xp = (k) => reward(k, true);
  function complete(k) {
    return k === "main" ? Game.state.cleared[Game.state.id + "/boss"] : q().relic;
  }
  function entry(k, withAction) {
    let a = Game.world.adventure,
      qv = q()[k],
      status =
        qv === "paid"
          ? "Completed"
          : qv === "active"
            ? complete(k)
              ? "Ready to report"
              : "In progress"
            : "Available";
    let act =
      qv === "available"
        ? UI.btn("Accept commission", "questAccept", k)
        : qv === "active" && complete(k)
          ? UI.btn("Claim reward", "questPay", k)
          : "";
    return (
      "<section><h3>" +
      UI.esc(a[k]) +
      "</h3><p>" +
      UI.esc(k === "main" ? a.brief : a.sideText) +
      '</p><p class="muted">' +
      status +
      " · " +
      gold(k) +
      " gp · " +
      xp(k) +
      " listed XP (" +
      xp(k) / 4 +
      " awarded)</p>" +
      (withAction ? act : "") +
      "</section>"
    );
  }
  function commission() {
    UI.modal(Game.world.adventure.giver, entry("main", true) + entry("side", true), "Commission giver");
  }
  function show() {
    let s = Game.state,
      notes = s.notes.slice().reverse();
    UI.modal(
      "Quest journal",
      entry("main", false) +
        entry("side", false) +
        "<h3>Dated notes</h3>" +
        (!notes.length
          ? "<p>Visit the warden’s hall to take a commission.</p>"
          : '<div class="log-history">' +
            notes
              .map(
                (n) =>
                  "<p><small>Day " +
                  (1 + Math.floor(n.time / 1440)) +
                  " · " +
                  UI.time(n.time) +
                  " · " +
                  n.id +
                  "</small><br>" +
                  UI.esc(n.msg) +
                  "</p>",
              )
              .join("") +
            "</div>"),
      Game.world.adventure.name,
    );
  }
  function relic() {
    let l = Game.level,
      s = Game.state;
    if (s.floor > 0) {
      let key = l.id + "/event";
      if (s.cleared[key]) {
        Game.note("The chamber is quiet.");
        return;
      }
      s.cleared[key] = true;
      let effect = l.story?.[2] || "coin";
      if (effect === "heal")
        s.party.filter((p) => p.hp > 0).forEach((p) => (p.hp = Math.min(p.maxHp, p.hp + Rules.roll(6))));
      else if (effect === "reveal") l.traps.forEach((t) => (s.seen[t.id] = true));
      else s.gold += 25 * (s.floor + 1);
      Game.record(l.story?.[1] || "A battered campaign chest holds a handful of silver.");
      return;
    }
    if (l.story && !q().relic) Game.note(l.story[1]);
    if (q().relic) Game.note("You have already recovered the " + Game.world.adventure.relic + ".");
    else {
      q().relic = true;
      Game.record(
        "Recovered the " + Game.world.adventure.relic + ". Return it to " + Game.world.adventure.giver + ".",
      );
    }
  }
  function handle(a, k) {
    if (!["questAccept", "questPay"].includes(a) || !["main", "side"].includes(k)) return false;
    if (a === "questAccept" && q()[k] === "available") {
      q()[k] = "active";
      Game.record("Accepted “" + Game.world.adventure[k] + "”.");
    } else if (a === "questPay" && q()[k] === "active" && complete(k)) {
      q()[k] = "paid";
      Game.state.gold += gold(k);
      let party = Game.state.party.filter((p) => p.hp > 0);
      party.forEach((p) => Rules.gain(p, Math.floor(xp(k) / 4 / party.length)));
      Game.record(
        "Completed “" +
          Game.world.adventure[k] +
          "” for " +
          gold(k) +
          " gp and " +
          xp(k) / 4 +
          " company XP.",
      );
    }
    commission();
    return true;
  }
  return { commission, show, relic, handle };
})();
