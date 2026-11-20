"use strict";
const Combat = (() => {
  const W = 9,
    H = 7,
    dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const S = () => Game.state,
    B = () => S().battle,
    P = (u) => S().party[u.index],
    M = (u) => Monsters.get(u.monster),
    name = (u) => (u.enemy ? M(u).name : P(u).name);
  const hp = (u) => (u.enemy ? u.hp : P(u).hp),
    alive = (u) => !u.fled && hp(u) > 0;
  function health(u, v) {
    if (u.enemy) u.hp = Math.max(0, Math.min(M(u).hp, v));
    else P(u).hp = Math.max(0, Math.min(P(u).maxHp, v));
  }
  function log(t) {
    let b = B();
    b.log.push(t);
    if (b.log.length > 15) b.log.shift();
  }
  function dice(pair) {
    let v = 0;
    for (let i = 0; i < pair[0]; i++) v += Rules.roll(pair[1]);
    return v;
  }
  function round() {
    let b = B();
    b.round++;
    let rolls = b.units.map((u, i) => ({
      i,
      r: Rules.roll(10) - (u.enemy ? 0 : Math.floor((P(u).stats[1] - 10) / 4)),
    }));
    b.order = rolls.sort((a, b) => a.r - b.r).map((o) => o.i);
    b.index = 0;
    b.clouds = b.clouds.filter((c) => c.until >= b.round);
  }
  const actor = () => B().units[B().order[B().index]];
  function begin(monster, id, boss = false) {
    if (B()) return;
    let m = Monsters.get(monster);
    if (!m) return;
    let units = S().party.map((p, i) => ({ index: i, x: i % 2, y: 1 + Math.floor(i / 2) * 2, enemy: false }));
    // Large solitary creatures consume more of a site's encounter budget.
    const budget = 4 + Game.world.adventure.range[0] * 0.9;
    let count = boss
      ? 1
      : Math.min(
          Math.max(1, Math.floor(budget / Math.max(1, m.hd))),
          Math.max(1, Math.min(3, Math.ceil(S().party.length / 3) + (Rules.roll(3) === 1 ? 1 : 0))),
        );
    for (let i = 0; i < count; i++) units.push({ enemy: true, monster, x: 6 + (i % 2), y: 2 + i, hp: m.hp });
    S().battle = {
      id,
      monster,
      boss,
      round: 0,
      order: [],
      index: 0,
      units,
      mode: "attack",
      auto: false,
      log: [],
      clouds: [],
      surprise: S().creeping,
    };
    S().bestiary[monster] ||= { seen: 0, defeated: 0 };
    S().bestiary[monster].seen += count;
    Game.note(m.name + " challenges the company.", "story");
    round();
    log("Initiative rolled. " + m.name + " takes the field.");
    run();
  }
  function path(u) {
    const budget = u.enemy
      ? 3
      : Math.floor(B().round * 3 * Rules.movement(P(u))) -
        Math.floor((B().round - 1) * 3 * Rules.movement(P(u)));
    let b = B(),
      occupied = new Set(b.units.filter((v) => v !== u && alive(v)).map((v) => v.x + "," + v.y)),
      queue = [{ x: u.x, y: u.y, steps: 0 }],
      seen = new Set([u.x + "," + u.y]);
    for (let i = 0; i < queue.length; i++) {
      let t = queue[i];
      if (t.steps >= budget) continue;
      for (let [dx, dy] of Modules.dirs) {
        let x = t.x + dx,
          y = t.y + dy,
          k = x + "," + y;
        if (x >= 0 && x < W && y >= 0 && y < H && !occupied.has(k) && !seen.has(k)) {
          seen.add(k);
          queue.push({ x, y, steps: t.steps + 1 });
        }
      }
    }
    return queue;
  }
  function strike(u, v) {
    let m = u.enemy ? M(u) : null,
      p = u.enemy ? null : P(u),
      w = p && Data.item(p.weapon),
      lev = p?.level || m?.level,
      bon =
        (w?.bonus || 0) +
        (p?.specialization && p.specialization === w?.base ? 1 : 0) +
        (p?.cls === "Ranger" ? 1 : 0) +
        (p ? Math.max(0, p.stats[w?.missile ? 1 : 0] - 15) : 0);
    let back =
      p?.cls === "Thief" &&
      (B().surprise ||
        B().units.some(
          (t) =>
            t !== u &&
            !t.enemy &&
            alive(t) &&
            dist(t, v) === 1 &&
            (t.x - v.x) * (u.x - v.x) + (t.y - v.y) * (u.y - v.y) < 0,
        ));
    let d = Rules.roll(20),
      target = (u.enemy ? m.thac0 : Rules.thac0(p.cls, p.level)) - (v.enemy ? M(v).ac : Rules.ac(P(v)));
    let hit =
      d === 20 ||
      (d !== 1 && d + bon + (u.buff > 0 ? 2 : 0) - (u.debuff > 0 ? 2 : 0) + (back ? 4 : 0) >= target);
    if (!hit) {
      log(name(u) + " misses " + name(v) + ".");
      return;
    }
    let damage =
      dice(u.enemy ? m.damage : w?.damage || [1, 2]) +
      (w?.bonus || 0) +
      (p?.specialization && p.specialization === w?.base ? 2 : 0) +
      (p?.cls === "Ranger" || p?.cls === "Paladin" ? 2 : 0) +
      (u.buff > 0 ? 1 : 0);
    if (back) damage *= Rules.skills(p).Backstab;
    if (v.enemy && M(v).resistance > (w?.bonus || 0))
      damage = Math.max(1, Math.floor(damage / (1 + M(v).resistance)));
    health(v, hp(v) - damage);
    log((back ? "Backstab! " : "") + name(u) + " hits " + name(v) + " for " + damage + ".");
    if (u.enemy && alive(v)) {
      let save = Rules.roll(20) >= Rules.saves(P(v))[0];
      if (!save && m.special.includes("poison")) v.poison = 3;
      if (!save && m.special.includes("paralysis")) v.disabled = 2;
      if (!save && m.special.includes("drain")) {
        let p = P(v);
        if (p.level > 1) {
          p.level--;
          p.xp = Rules.xpFor(p.cls, p.level);
          p.maxHp = Math.max(1, p.maxHp - 3);
          p.hp = Math.min(p.hp, p.maxHp);
          Rules.refresh(p);
        } else health(v, hp(v) - 1);
        log("The touch drains " + name(v) + " of vitality.");
      }
    }
    if (p && Rules.warrior(p.cls) && lev >= 7 && !u.extra && alive(v)) {
      u.extra = true;
      strike(u, v);
      u.extra = false;
    }
  }
  function range(u) {
    return u.enemy ? (M(u).special.includes("missile") ? 7 : 1) : Data.item(P(u).weapon)?.range || 1;
  }
  function automated(u) {
    let b = B(),
      foes = b.units
        .filter((v) => v.enemy !== u.enemy && alive(v))
        .sort((a, c) => dist(a, u) - dist(c, u) || hp(a) - hp(c));
    if (!foes.length) return;
    let target = foes[0];
    if (u.enemy) {
      let m = M(u);
      if (m.special.includes("regeneration")) health(u, hp(u) + 2);
      if (!b.boss && hp(u) < m.hp / 3 && Rules.roll(20) > m.morale) {
        u.fled = true;
        log(name(u) + " breaks and flees.");
        return;
      }
      if (m.special.includes("breath") && dist(u, target) <= 5 && (!u.breathed || Rules.roll(6) === 1)) {
        u.breathed = true;
        for (let v of foes.filter((v) => dist(v, target) <= 1)) {
          let n = dice(m.damage);
          health(v, hp(v) - (Rules.roll(20) >= Rules.saves(P(v))[3] ? Math.ceil(n / 2) : n));
        }
        log(name(u) + " unleashes a breath attack.");
        return;
      }
    } else {
      let ready = Object.keys(P(u).ready)
          .filter((id) => P(u).ready[id] > 0)
          .map(Data.spell),
        ally = b.units.find((v) => !v.enemy && alive(v) && hp(v) < P(v).maxHp / 2),
        sp =
          ready.find((v) => ally && v.effect === "heal" && dist(u, ally) <= v.range) ||
          ready.find((v) => v.effect === "damage" && dist(u, target) <= v.range);
      if (sp) {
        cast(u, sp, sp.effect === "heal" ? ally : target);
        P(u).ready[sp.id]--;
        return;
      }
    }
    if (dist(u, target) <= range(u)) {
      strike(u, target);
      return;
    }
    let cells = path(u).sort((a, c) => dist(a, target) - dist(c, target) || c.steps - a.steps);
    u.x = cells[0].x;
    u.y = cells[0].y;
    log(name(u) + " advances.");
  }
  function inCloud(tile, origin) {
    return tile.x >= origin.x && tile.x < origin.x + 2 && tile.y >= origin.y && tile.y < origin.y + 2;
  }
  function cast(u, sp, at) {
    let b = B(),
      friendly = ["heal", "cure", "buff"].includes(sp.effect);
    for (let v of b.units.filter(
      (v) =>
        alive(v) &&
        (sp.id === "stinking_cloud" ? inCloud(v, at) : dist(v, at) <= sp.radius) &&
        (friendly ? v.enemy === u.enemy : sp.id === "stinking_cloud" || v.enemy !== u.enemy),
    )) {
      let saved =
        sp.save &&
        Rules.roll(20) >=
          (v.enemy
            ? Math.max(4, 16 - M(v).level / 2)
            : Rules.saves(P(v))[sp.save === "breath" ? 3 : sp.save === "poison" ? 0 : 4]);
      let n = dice(sp.dice);
      if (sp.id === "magic_missile") n = (n + 1) * Math.min(5, Math.ceil(P(u).level / 2));
      if (["damage", "drain"].includes(sp.effect)) {
        n = saved ? Math.ceil(n / 2) : n;
        health(v, hp(v) - n);
        if (sp.effect === "drain") health(u, hp(u) + n);
      }
      if (friendly) {
        if (sp.effect === "buff") v.buff = sp.duration;
        else {
          health(v, hp(v) + n);
          if (sp.effect === "cure") {
            v.disabled = 0;
            v.poison = 0;
            v.debuff = 0;
          }
        }
      } else if (!saved) {
        if (sp.effect === "disable") v.disabled = sp.duration;
        if (sp.effect === "debuff") v.debuff = sp.duration;
        if (sp.effect === "turn" && v.enemy && M(v).undead) v.fled = true;
      }
    }
    if (sp.id === "stinking_cloud") b.clouds.push({ x: at.x, y: at.y, until: b.round + sp.duration - 1 });
    log(name(u) + " casts " + sp.name + ".");
  }
  function end() {
    let b = B(),
      foes = b.units.filter((u) => u.enemy && alive(u)),
      friends = b.units.filter((u) => !u.enemy && alive(u));
    if (friends.length && foes.length) return false;
    if (!friends.length) {
      S().battle = null;
      Game.finish();
      return true;
    }
    let dead = b.units.filter((u) => u.enemy && !u.fled && hp(u) <= 0),
      xp = Math.floor(dead.reduce((n, u) => n + M(u).xp, 0) / friends.length);
    S().bestiary[b.monster].defeated += dead.length;
    for (let u of friends) Rules.gain(P(u), xp);
    S().cleared[b.id] = true;
    S().battle = null;
    Game.loot(Monsters.get(b.monster).treasure);
    Game.note("Victory. Each survivor earns " + xp + " XP.", "good");
    if (b.boss) Game.record("The final guardian of " + Game.world.adventure.place + " is defeated.");
    UI.modal(
      "Victory",
      "<p>The field belongs to your company. Each survivor earns " +
        xp +
        " experience before prime-requisite bonuses.</p>" +
        UI.btn("Continue exploring", "close"),
      "Battle report",
    );
    Game.finish();
    return true;
  }
  function next() {
    let b = B();
    b.index++;
    b.mode = "attack";
    b.selection = "";
    if (b.index >= b.order.length) {
      b.surprise = false;
      round();
    }
    b.started = false;
  }
  function run() {
    let b = B();
    if (!b || end()) return;
    for (let i = 0; i < 250 && B(); i++) {
      let u = actor();
      if (!alive(u)) {
        next();
        continue;
      }
      if (!b.started) {
        b.started = true;
        if (u.poison > 0) {
          health(u, hp(u) - 2);
          u.poison--;
        }
        if (b.clouds.some((c) => inCloud(u, c)) && Rules.roll(20) < (u.enemy ? 13 : Rules.saves(P(u))[0]))
          u.disabled = Math.max(1, u.disabled || 0);
        if (u.buff) u.buff--;
        if (u.debuff) u.debuff--;
        if (u.disabled > 0 || !alive(u)) {
          u.disabled = Math.max(0, (u.disabled || 0) - 1);
          log(name(u) + " loses a turn.");
          next();
          if (end()) return;
          continue;
        }
      }
      if (!u.enemy && !b.auto) {
        panel();
        Game.save();
        return;
      }
      automated(u);
      next();
      if (end()) return;
    }
    if (B()) {
      Game.save();
      setTimeout(run, 30);
    }
  }
  const toScreen = (x, y) => [270 + (x - y) * 29, 38 + (x + y) * 14];
  function render() {
    let c = UI.$("battlefield"),
      g = c.getContext("2d"),
      b = B(),
      u = actor(),
      steps = b.mode === "move" ? path(u) : [];
    g.fillStyle = "#182322";
    g.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let [cx, cy] = toScreen(x, y);
        g.fillStyle = steps.some((p) => p.x === x && p.y === y)
          ? "#697b53"
          : b.clouds.some((p) => inCloud({ x, y }, p))
            ? "#708548"
            : (x + y) % 2
              ? "#465147"
              : "#3c493f";
        g.beginPath();
        g.moveTo(cx, cy - 14);
        g.lineTo(cx + 28, cy);
        g.lineTo(cx, cy + 13);
        g.lineTo(cx - 28, cy);
        g.closePath();
        g.fill();
      }
    for (let v of b.units.filter(alive).sort((a, c) => a.x + a.y - c.x - c.y)) {
      let [x, y] = toScreen(v.x, v.y);
      g.fillStyle = v === u ? "#e0c584" : v.enemy ? "#ad7056" : "#839575";
      g.fillRect(x - 8, y + 2, 16, 3);
      Figures.unit(g, x, y + 1, v.enemy ? 0 : P(v).portrait, v.enemy ? M(v).name : null);
    }
    c.onclick = (e) => {
      let rect = c.getBoundingClientRect(),
        mx = ((e.clientX - rect.left) * c.width) / rect.width,
        my = ((e.clientY - rect.top) * c.height) / rect.height,
        x = Math.round(((mx - 270) / 29 + (my - 38) / 14) / 2),
        y = Math.round(((my - 38) / 14 - (mx - 270) / 29) / 2);
      target(x, y);
    };
  }
  function target(x, y) {
    let b = B();
    if (!b || x < 0 || x >= W || y < 0 || y >= H) return;
    let u = actor(),
      v = b.units.find((t) => t.x === x && t.y === y && alive(t)),
      at = { x, y },
      valid = true;
    if (b.mode === "move" && path(u).some((t) => t.x === x && t.y === y) && (x !== u.x || y !== u.y)) {
      u.x = x;
      u.y = y;
      log(name(u) + " moves.");
    } else if (b.mode === "attack" && v?.enemy && dist(u, v) <= range(u)) strike(u, v);
    else if (b.mode === "spell" || b.mode === "item") {
      let isItem = b.mode === "item",
        obj = isItem && S().inventory[+b.selection],
        sp = Data.spell(isItem ? Data.item(obj.id).spell : b.selection);
      if (
        dist(u, at) > sp.range ||
        (!sp.radius && (!v || (["heal", "buff", "cure"].includes(sp.effect) ? v.enemy : !v.enemy)))
      )
        valid = false;
      else {
        cast(u, sp, at);
        if (isItem) Game.consume(+b.selection);
        else P(u).ready[sp.id]--;
      }
    } else valid = false;
    if (valid) {
      next();
      run();
    } else {
      log("Choose a valid square within range.");
      panel();
    }
  }
  function panel() {
    let b = B();
    if (!b) return;
    let u = actor();
    if (u.enemy || !alive(u)) {
      run();
      return;
    }
    let p = P(u),
      modes = [
        ["Attack", "attack"],
        ["Move", "move"],
        ["Spell", "spells"],
        ["Item", "items"],
        ["Wait", "wait"],
        ["Flee", "flee"],
        ["Auto-fight", "auto"],
      ];
    if (p.cls === "Cleric" || (p.cls === "Paladin" && p.level >= 3)) modes.push(["Turn undead", "turn"]);
    let buttons = modes
      .map(([n, k]) =>
        UI.btn(
          n,
          "battleAction",
          k,
          (k === "spells" && !Object.values(p.ready).some((v) => v > 0)) ||
            (k === "items" && !S().inventory.some((o) => Data.item(o.id).spell)),
          b.mode === k ? "primary" : "",
        ),
      )
      .join("");
    let instruction =
      b.mode === "attack"
        ? "Choose a foe within " + range(u) + " squares."
        : b.mode === "move"
          ? "Choose a highlighted square."
          : b.mode === "spell" || b.mode === "item"
            ? "Choose the target square for " +
              Data.spell(b.mode === "spell" ? b.selection : Data.item(S().inventory[+b.selection].id).spell)
                .name +
              "."
            : "";
    if (["spell", "item"].includes(b.mode)) {
      const sp = Data.spell(
        b.mode === "spell" ? b.selection : Data.item(S().inventory[+b.selection].id).spell,
      );
      instruction +=
        " Range " +
        sp.range +
        " squares · " +
        (sp.id === "stinking_cloud" ? "2 × 2 cloud" : sp.radius ? "radius " + sp.radius : "single target") +
        ". " +
        sp.description;
    }
    let choices =
      b.mode === "spells"
        ? Object.entries(p.ready)
            .filter(([, n]) => n > 0)
            .map(([id, n]) => UI.btn(Data.spell(id).name + " ×" + n, "battleSpell", id))
            .join("")
        : b.mode === "items"
          ? S()
              .inventory.map((o, i) =>
                Data.item(o.id).spell ? UI.btn(Data.item(o.id).name, "battleItem", i) : "",
              )
              .join("")
          : "";
    let targets = b.units
      .filter(
        (v) =>
          alive(v) &&
          (b.mode === "attack" ? v.enemy && dist(u, v) <= range(u) : ["item", "spell"].includes(b.mode)),
      )
      .map((v) => UI.btn(name(v) + " · " + hp(v) + " HP", "battleTarget", v.x + "," + v.y))
      .join("");
    UI.modal(
      p.name + "’s turn",
      '<canvas class="battle-canvas" id="battlefield" width="560" height="245" aria-label="Isometric battlefield"></canvas><div class="btns">' +
        buttons +
        "</div><p>" +
        instruction +
        '</p><div class="choices">' +
        choices +
        targets +
        '</div><div class="log-history">' +
        b.log
          .slice(-3)
          .map((t) => "<p>" + UI.esc(t) + "</p>")
          .join("") +
        "</div>",
      "Tactical combat · Round " + b.round,
      true,
    );
    render();
  }
  function handle(a, arg) {
    if (!a.startsWith("battle") || !B()) return false;
    let b = B(),
      u = actor();
    if (a === "battleTarget") {
      target(...arg.split(",").map(Number));
      return true;
    }
    if (a === "battleSpell" || a === "battleItem") {
      b.mode = a === "battleSpell" ? "spell" : "item";
      b.selection = arg;
      panel();
      return true;
    }
    if (arg === "auto") {
      b.auto = true;
      run();
      return true;
    }
    if (arg === "flee") {
      S().battle = null;
      let pos = Game.level.start;
      Game.enter(S().area, S().floor, pos);
      Game.note("The company retreats to safety. The enemy still guards its post.");
      UI.close();
      return true;
    }
    if (arg === "turn") {
      let lv = P(u).level - (P(u).cls === "Paladin" ? 2 : 0);
      let n = 0;
      for (let v of b.units.filter((v) => v.enemy && alive(v) && M(v).undead))
        if (Rules.roll(20) + lv >= 9 + M(v).undead) {
          v.fled = true;
          n++;
        }
      log(n ? "The undead recoil and flee." : "The dead withstand the invocation.");
      next();
      run();
      return true;
    }
    if (arg === "wait") {
      log(name(u) + " holds position.");
      next();
      run();
      return true;
    }
    b.mode = arg;
    panel();
    return true;
  }
  return { begin, handle, panel };
})();
