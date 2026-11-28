"use strict";
const Battlefield = (() => {
  const width = 18, height = 14;
  const surfaces = {
    "#": ["Masonry", "#535151", "▪"], D: ["Closed door", "#886740", "▥"],
    "!": ["Landmark", "#847755", "!"],
    "<": ["Stairs up", "#726956", "↑"], ">": ["Stairs down", "#726956", "↓"],
    g: ["Grass", "#536a48"], r: ["Road", "#9c896a"], b: ["Bridge", "#997854", "═"],
    f: ["Woodland", "#465f44"], h: ["Foothills", "#847d60"], w: ["Fen", "#607569"],
    T: ["Tree", "#335840", "♠"], R: ["Rock", "#666863", "▲"], "~": ["Water", "#487380", "≈"],
  };
  const solid = t => !t || "#DTR".includes(t);
  const walkable = (grid, x, y) => !solid(grid[y]?.[x]) && grid[y][x] !== "~";
  const moveDirections = [...Modules.dirs, [-1, -1], [-1, 1], [1, -1], [1, 1]];
  function flood(grid, start, limit = Infinity, occupied = new Set(), allies = new Set()) {
    const free = (x, y) => walkable(grid, x, y) && !occupied.has(y * width + x);
    const cells = [{ ...start, steps: 0 }], seen = new Set([start.y * width + start.x]);
    for (let i = 0; i < cells.length; i++) {
      const p = cells[i];
      if (p.steps >= limit) continue;
      for (const [dx, dy] of moveDirections) {
        const x = p.x + dx, y = p.y + dy, key = y * width + x;
        if (seen.has(key) || !free(x, y)) continue;
        if (dx && dy && !free(x, p.y) && !free(p.x, y)) {
          const betweenAllies = allies.has(p.y * width + x) && allies.has(y * width + p.x);
          if (!betweenAllies || !walkable(grid, x, p.y) || !walkable(grid, p.x, y)) continue;
        }
        seen.add(key);
        cells.push({ x, y, steps: p.steps + 1 });
      }
    }
    return cells;
  }
  function create(id, units) {
    const s = Game.state, wild = s.area === "wild";
    const foe = Game.level.entities?.find(e => e.id === id);
    const dx = foe ? Math.max(-4, Math.min(4, foe.x - s.x)) : Modules.dirs[s.dir][0] * 3;
    const dy = foe ? Math.max(-4, Math.min(4, foe.y - s.y)) : Modules.dirs[s.dir][1] * 3;
    const start = { x: 8 - dx, y: 6 - dy };
    const enemy = { x: start.x + dx * 2, y: start.y + dy * 2 };
    const biome = wild && Game.tile(s.x, s.y);
    const rng = Rules.rng(Game.areaKey() + "/" + s.x + "/" + s.y);
    const roadLinks = wild && Modules.dirs.filter(([dx, dy]) =>
      ["r", "b"].includes(Game.tile(s.x + dx, s.y + dy)));
    const bridgeRunsNorth = wild && roadLinks.filter(([dx]) => !dx).length > roadLinks.filter(([,dy]) => !dy).length;
    function terrain(x, y) {
      if (wild) {
        if (biome === "b") return (bridgeRunsNorth ? Math.abs(x - 8) : Math.abs(y - 7)) <= 1 ? "b" : "~";
        if (biome === "r") {
          const road = roadLinks.some(([dx,dy]) => dx ? Math.abs(y-7) <= 1 && dx*(x-8) >= -1
            : Math.abs(x-8) <= 1 && dy*(y-7) >= -1);
          return road || (Math.abs(x-8) <= 1 && Math.abs(y-7) <= 1) ? "r" : "g";
        }
        if (biome === "f" && rng() < 0.15) return "T";
        if (biome === "h" && rng() < 0.12) return "R";
        if (biome === "w" && rng() < 0.17) return "~";
        return biome;
      }
      const t = Game.tile(s.x + Math.floor((x - start.x) / 2), s.y + Math.floor((y - start.y) / 2));
      if ("DL".includes(t)) return "D";
      return Modules.blocking(t) ? "#" : t;
    }
    const grid = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => terrain(x,y)).join(""));
    // Pick a connected patch with room for both formations, closest to the encounter.
    const floor = grid.flatMap((row, y) => [...row].flatMap((_, x) => walkable(grid,x,y) ? [{x,y}] : []));
    const distance = (p, q) => Math.abs(p.x-q.x) + Math.abs(p.y-q.y);
    floor.sort((a,b) => distance(a,start)-distance(b,start));
    let cells;
    for (const p of floor) {
      cells = flood(grid,p);
      if (cells.length >= units.length) break;
    }
    for (const u of units) {
      const anchor = u.enemy ? enemy : start;
      cells.sort((a,b) => distance(a,anchor)-distance(b,anchor));
      const p = cells.shift();
      u.x = p.x;
      u.y = p.y;
    }
    // Read the isometric formation like the roster: top row first, left to right.
    const allies = units.filter(u => !u.enemy);
    const formation = allies.map(({x, y}) => ({x, y, screen: toScreen(x, y)}))
      .sort((a, b) => a.screen[1] - b.screen[1] || a.screen[0] - b.screen[0]);
    allies.forEach((ally, i) => {
      ally.x = formation[i].x;
      ally.y = formation[i].y;
    });
    return { grid, place: wild ? Wilds.names[biome] : Game.level.name };
  }
  function visible(grid, a, b) {
    let x = a.x, y = a.y;
    const dx = Math.abs(b.x-x), dy = Math.abs(b.y-y), sx = Math.sign(b.x-x), sy = Math.sign(b.y-y);
    for (let i = 0, j = 0; i < dx || j < dy;) {
      const cross = (1+2*i)*dy - (1+2*j)*dx;
      if (!cross && solid(grid[y]?.[x+sx]) && solid(grid[y+sy]?.[x])) return false;
      if (cross <= 0) { x += sx; i++; }
      if (cross >= 0) { y += sy; j++; }
      if (solid(grid[y]?.[x])) return false;
    }
    return true;
  }
  function attackVisible(grid, attacker, target) {
    if (solid(grid[target.y]?.[target.x])) return false;
    if (visible(grid, target, attacker)) return true;

    // Look back from the target center. Between consecutive directions to grid
    // corners a ray crosses exactly the same tiles, even through a narrow gap.
    const dx = attacker.x - target.x, dy = attacker.y - target.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const forward = Math.sign(horizontal ? dx : dy);
    const slope = (x, y) => horizontal ? y / (x * forward) : x / (y * forward);
    const corners = [-0.5, 0.5].flatMap(x => [-0.5, 0.5].map(y => slope(dx + x, dy + y)));
    const low = Math.min(...corners), high = Math.max(...corners);
    const slopes = new Set([low, high]);
    for (let x = Math.min(0, dx) - 0.5; x <= Math.max(0, dx) + 0.5; x++) {
      for (let y = Math.min(0, dy) - 0.5; y <= Math.max(0, dy) + 0.5; y++) {
        if ((horizontal ? x : y) * forward <= 0) continue;
        const angle = slope(x, y);
        if (angle > low && angle < high) slopes.add(angle);
      }
    }
    function rayReachesAttacker(angle) {
      const vx = horizontal ? forward : angle, vy = horizontal ? angle : forward;
      const sx = Math.sign(vx), sy = Math.sign(vy);
      let x = target.x, y = target.y, crossedX = 0, crossedY = 0;
      while (!solid(grid[y]?.[x])) {
        if (x === attacker.x && y === attacker.y) return true;
        const cross = (1 + 2 * crossedX) * Math.abs(vy) - (1 + 2 * crossedY) * Math.abs(vx);
        if (Math.abs(cross) < 1e-10) {
          if (solid(grid[y]?.[x + sx]) && solid(grid[y + sy]?.[x])) return false;
          // Either side square touches this ray at its corner.
          if ((x + sx === attacker.x && y === attacker.y) ||
              (x === attacker.x && y + sy === attacker.y)) return true;
        }
        if (cross <= 1e-10) { x += sx; crossedX++; }
        if (cross >= -1e-10) { y += sy; crossedY++; }
      }
      return false;
    }
    const sorted = [...slopes].sort((a, b) => a - b);
    return sorted.some((angle, i) => rayReachesAttacker(angle) ||
      (i > 0 && rayReachesAttacker((sorted[i - 1] + angle) / 2)));
  }
  const toScreen = (x, y) => [420 + (x - y) * 29, 38 + (x + y) * 14];
  return { width, height, surfaces, flood, create, visible, attackVisible, toScreen };
})();

const Combat = (() => {
  const W = Battlefield.width,
    dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const S = () => Game.state,
    B = () => S().battle,
    P = (u) => S().party[u.index],
    M = (u) => Monsters.get(u.monster),
    name = (u) => (u.enemy ? M(u).name : P(u).name);
  const hp = (u) => (u.enemy ? u.hp : P(u).hp),
    alive = (u) => !u.fled && hp(u) > 0;
  const legacyGrid = Array(7).fill(".........");
  const grid = () => B().field?.grid || legacyGrid;
  const scale = () => B().field ? 2 : 1;
  const visible = (a,b) => Battlefield.visible(grid(), a, b);
  const reaches = (a,b,n) => dist(a,b) <= n && visible(a,b);
  const attackReaches = (a,b,n) => dist(a,b) <= n && Battlefield.attackVisible(grid(), a, b);
  function health(u, v) {
    if (u.enemy) u.hp = Math.max(0, Math.min(M(u).hp, v));
    else P(u).hp = Math.max(0, Math.min(P(u).maxHp, v));
  }
  function log(t) {
    let b = B();
    b.log.push(t);
    if (b.log.length > 15) b.log.shift();
  }
  const signed = n => n < 0 ? ` − ${-n}` : n ? ` + ${n}` : '';
  function checkRoll(label, sides, modifier, describe) {
    const face = Rules.roll(sides), total = face + modifier;
    Journal.recordRoll(B(), `${label}: d${sides} [${face}]${signed(modifier)} = ${total}${describe ? ' · ' + describe(total, face) : ''}`);
    return total;
  }
  function saveRoll(v, label, target) {
    return checkRoll(`${name(v)} · ${label}`, 20, 0, t => `needs ${target}+ · ${t >= target ? 'saved' : 'failed'}`) >= target;
  }
  function dice(pair, label) {
    const faces = Array.from({length:pair[0]}, () => Rules.roll(pair[1]));
    const sum = faces.reduce((a,b) => a+b, 0);
    if (faces.length) Journal.recordRoll(B(), `${label}: ${pair[0]}d${pair[1]} [${faces.join(', ')}] = ${sum}`);
    return sum;
  }
  function round() {
    let b = B();
    b.round++;
    let rolls = b.units.map((u, i) => ({
      i,
      r: checkRoll(name(u) + ' initiative', 10, u.enemy ? 0 : -Math.floor((P(u).stats[1] - 10) / 4) - Rules.gearBonus(P(u), "initiative")),
    }));
    b.order = rolls.sort((a, b) => a.r - b.r).map((o) => o.i);
    b.index = 0;
    b.clouds = b.clouds.filter((c) => c.until >= b.round);
  }
  const actor = () => B().units[B().order[B().index]];
  function encounter(monster, id, boss = false) {
    if (B() || S().encounter || !Monsters.get(monster)) return;
    S().encounter = {monster, id, boss};
    Game.save();
    encounterPanel();
  }
  function encounterPanel() {
    const e = S().encounter, m = Monsters.get(e.monster);
    let text = e.reply || (e.boss ? "This guardian bars the way. It will not yield its post." :
      m.intellect === "reasoning" ? "Your paths cross. There is time to call out before weapons are drawn." :
      m.intellect === "instinctive" ? "It watches your movements. Words mean little, but it might let you back away." :
      "It advances without hesitation. It cannot be reasoned with.");
    let choices = UI.btn("Engage", "encounterChoice", "fight");
    if (!e.studied) choices += UI.btn("Study the foe", "encounterChoice", "study");
    if (!e.reply && m.intellect === "reasoning") choices += UI.btn("Attempt parley", "encounterChoice", "talk");
    if (!e.reply && !e.boss && m.intellect === "instinctive") choices += UI.btn("Back away slowly", "encounterChoice", "withdraw");
    if (e.studied) text += " " + m.description + (m.special.length ? " Signs of: " + m.special.join(", ") + "." : "");
    UI.modal("Encounter: " + m.name, "<p>" + UI.esc(text) + '</p><div class="btns">' + choices + "</div>", "Before combat");
  }
  function encounterChoice(choice) {
    const s = S(), e = s.encounter, m = Monsters.get(e.monster);
    if (choice === "fight") {
      s.encounter = null;
      begin(e.monster, e.id, e.boss);
      return;
    }
    if (choice === "study") e.studied = true;
    else if (!e.reply && (choice === "talk" && m.intellect === "reasoning" ||
        choice === "withdraw" && !e.boss && m.intellect === "instinctive")) {
      const talk = choice === "talk";
      const speaker = Math.max(...s.party.filter(p => p.hp > 0).map(p => p.stats[5]));
      if (!e.boss && Rules.roll(20) + (talk ? Math.floor((speaker - 10) / 2) : 0) >= 11) {
        s.encounter = null;
        s.cleared[e.id] = true;
        s.bestiary[m.id] ||= {seen:0, defeated:0};
        s.bestiary[m.id].seen++;
        const outcome = talk ? m.name + " accepts safe passage." : m.name + " loses interest and moves on.";
        Game.note(outcome, "story");
        UI.modal("Encounter resolved", "<p>" + UI.esc(outcome) + "</p>" + UI.btn("Continue", "close"), "No combat");
        return;
      }
      e.reply = talk ? "Your offer is refused. The foe prepares to fight." : "It follows as you retreat. Stand and fight.";
    }
    encounterPanel();
  }
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
      field: Battlefield.create(id, units),
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
  function downed(u) {
    return !u.enemy && !u.fled && hp(u) <= 0;
  }
  function spellRecipient(v, sp) {
    return alive(v) || (downed(v) && ["heal", "cure"].includes(sp?.effect));
  }
  function movementLeft(u) {
    const speed = 3 * scale() * (u.enemy ? 1 : Rules.movement(P(u)));
    const budget = Math.floor(B().round * speed) - Math.floor((B().round - 1) * speed);
    // Older saves marked the whole move as spent with a boolean.
    return B().moved === true ? 0 : Math.max(0, budget - (B().moved || 0));
  }
  function path(u) {
    const occupied = new Set(B().units.filter(v => v !== u && alive(v)).map(v => v.y * W + v.x));
    const allies = new Set(B().units.filter(v => !u.enemy && !v.enemy && alive(v)).map(v => v.y * W + v.x));
    const fallen = new Set(B().units.filter(downed).map(v => v.y * W + v.x));
    return Battlefield.flood(grid(), {x:u.x,y:u.y}, movementLeft(u), occupied, allies)
      .filter(tile => !fallen.has(tile.y * W + tile.x));
  }
  function strike(u, v) {
    let m = u.enemy ? M(u) : null,
      p = u.enemy ? null : P(u),
      w = p && Data.item(p.weapon),
      lev = p?.level || m?.level,
      bon =
        (w?.bonus || 0) +
        Rules.racialAttackBonus(p, w) + (w?.missile ? Rules.gearBonus(p, "aim") : 0) +
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
    const target = (u.enemy ? m.thac0 : Rules.thac0(p.cls, p.level)) - (v.enemy ? M(v).ac : Rules.ac(P(v)));
    const modifier = bon + (u.buff > 0 ? 2 : 0) - (u.debuff > 0 ? 2 : 0) + (back ? 4 : 0);
    const face = Rules.roll(20), total = face + modifier;
    const hit = face === 20 || (face !== 1 && total >= target);
    Journal.recordRoll(B(), `${name(u)} attacks ${name(v)}: d20 [${face}]${signed(modifier)} = ${total} vs ${target} · ${hit ? 'hit' : 'miss'}`);
    queueEffect(v, range(u) > 1 ? "missile" : "melee", hit, {weapon:w?.name, style:m?.strikeStyle});
    if (!hit) {
      log(name(u) + " misses " + name(v) + ".");
      return;
    }
    let damage =
      dice(u.enemy ? m.damage : w?.damage || [1, 2], name(u) + ' damage against ' + name(v)) +
      (w?.bonus || 0) +
      (p?.specialization && p.specialization === w?.base ? 2 : 0) +
      (p?.cls === "Ranger" || p?.cls === "Paladin" ? 2 : 0) +
      (u.buff > 0 ? 1 : 0);
    if (p && !w?.missile) damage += Rules.gearBonus(p, "force");
    if (p && v.enemy && M(v).undead) damage += Rules.gearBonus(p, "undead");
    if (back) damage *= Rules.skills(p).Backstab;
    if (v.enemy && M(v).resistance > (w?.bonus || 0))
      damage = Math.max(1, Math.floor(damage / (1 + M(v).resistance)));
    health(v, hp(v) - damage);
    log((back ? "Backstab! " : "") + name(u) + " hits " + name(v) + " for " + damage + ".");
    if (u.enemy && alive(v)) {
      let save = saveRoll(v, 'secondary effect save', Rules.saves(P(v))[0]);
      if (!save && m.special.includes("poison") && !Rules.gearBonus(P(v), "poisonWard")) v.poison = 3;
      if (!save && m.special.includes("paralysis") && !Rules.gearBonus(P(v), "freeAction")) v.disabled = 2;
      if (!save && m.special.includes("drain") && !Rules.gearBonus(P(v), "drainWard")) {
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
  function range(u, weapon = P(u)?.weapon) {
    const n = u.enemy ? (M(u).special.includes("missile") ? 7 : 1) : Data.item(weapon)?.range || 1;
    return n > 1 ? n * scale() : n;
  }
  function canStrike(u, v, weapon = P(u)?.weapon) {
    const reach = range(u, weapon);
    const melee = u.enemy ? reach === 1 : !Data.item(weapon)?.missile;
    if (melee && dist(u, v) === 1) return true;
    return attackReaches(u, v, reach);
  }
  function touchTarget(u, v) {
    return v && !v.enemy && alive(v) && hp(v) < P(v).maxHp && reaches(u, v, 1);
  }
  function healByTouch(u, v) {
    if (!touchTarget(u, v)) return false;
    const amount = Rules.layOnHands(P(u), P(v), S().minutes);
    if (amount) log(name(u) + " uses Lay on Hands on " + name(v) + ", restoring " + amount + " HP.");
    return amount > 0;
  }
  function automated(u, allowSpells = true) {
    let b = B(),
      foes = b.units
        .filter((v) => v.enemy !== u.enemy && alive(v))
        .sort((a, c) => dist(a, u) - dist(c, u) || hp(a) - hp(c));
    if (!foes.length) return;
    let target = foes[0];
    if (u.enemy) {
      let m = M(u);
      if (m.special.includes("regeneration")) health(u, hp(u) + 2);
      if (!b.boss && hp(u) < m.hp / 3 && checkRoll(name(u) + ' morale', 20, 0, t => t > m.morale ? 'flees' : 'holds') > m.morale) {
        u.fled = true;
        log(name(u) + " breaks and flees.");
        return;
      }
      if (m.special.includes("breath") && attackReaches(u, target, 5 * scale()) && (!u.breathed || checkRoll(name(u) + ' breath recharge', 6, 0, t => t === 1 ? 'ready' : 'not ready') === 1)) {
        u.breathed = true;
        queueEffect(target, "breath", true, {color:m.breathColor});
        for (let v of foes.filter((v) => reaches(target, v, scale()))) {
          let n = dice(m.damage, name(u) + ' breath against ' + name(v));
          health(v, hp(v) - (saveRoll(v, 'breath save', Rules.saves(P(v))[3]) ? Math.ceil(n / 2) : n));
        }
        log(name(u) + " unleashes a breath attack.");
        return;
      }
    } else {
      if (Rules.handsReady(P(u), S().minutes)) {
        const injured = b.units.find(v => touchTarget(u, v) && hp(v) <= P(v).maxHp / 2);
        if (injured && healByTouch(u, injured)) return;
      }
      let ready = Object.keys(P(u).ready)
          .filter((id) => P(u).ready[id] > 0)
          .map(Data.spell),
        ally = b.units.find((v) => !v.enemy && !v.fled && hp(v) < P(v).maxHp / 2),
        sp =
          ready.find((v) => ally && v.effect === "heal" && attackReaches(u, ally, v.range * scale())) ||
          ready.find((v) => v.effect === "damage" && attackReaches(u, target, v.range * scale()));
      if (sp && allowSpells && S().autoSpells !== "no") {
        const recipient = sp.effect === "heal" ? ally : target;
        if (S().autoSpells === "ask") {
          b.proposedSpell = {id:sp.id, target:b.units.indexOf(recipient)};
          return;
        }
        cast(u, sp, recipient);
        P(u).ready[sp.id]--;
        return;
      }
    }
    if (!u.enemy && P(u).alternateWeapon) {
      const spare = Data.item(P(u).alternateWeapon);
      if (foes.some(v => canStrike(u, v, spare.id)) &&
          (!spare.missile || !foes.some(v => canStrike(u, v)))) Rules.switchWeapon(P(u));
    }
    const inReach = foes.find(v => canStrike(u, v));
    if (inReach) {
      strike(u, inReach);
      return;
    }
    if (!movementLeft(u)) return;
    const distances = new Map(Battlefield.flood(grid(), {x:target.x,y:target.y})
      .map(p => [p.y * W + p.x, p.steps]));
    const remaining = p => distances.get(p.y * W + p.x) ?? Infinity;
    let cells = path(u).sort((a, c) => remaining(a) - remaining(c) || a.steps - c.steps);
    u.x = cells[0].x;
    u.y = cells[0].y;
    if (cells[0].steps) log(name(u) + " advances.");
    const afterMove = foes.find(v => canStrike(u, v));
    if (afterMove) strike(u, afterMove);
  }
  function inCloud(tile, origin) {
    return tile.x >= origin.x && tile.x < origin.x + 2 * scale() && tile.y >= origin.y && tile.y < origin.y + 2 * scale() && visible(origin, tile);
  }
  function cast(u, sp, at) {
    queueEffect(at, "spell", true, {sp});
    let b = B(),
      friendly = ["heal", "cure", "buff"].includes(sp.effect);
    for (let v of b.units.filter(
      (v) =>
        spellRecipient(v, sp) &&
        (sp.id === "stinking_cloud" ? inCloud(v, at) : reaches(at, v, sp.radius * scale())) &&
        (friendly ? v.enemy === u.enemy : sp.id === "stinking_cloud" || v.enemy !== u.enemy),
    )) {
      if (!v.enemy && sp.id === "stinking_cloud" && Rules.gearBonus(P(v), "gasWard")) continue;
      let saved =
        sp.save &&
        saveRoll(v, sp.name + ' save', v.enemy
            ? Math.max(4, 16 - M(v).level / 2)
            : Rules.saves(P(v))[sp.save === "breath" ? 3 : sp.save === "poison" ? 0 : 4]);
      let n = dice(sp.dice, `${name(u)} · ${sp.name} on ${name(v)}`);
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
        if (sp.effect === "disable" && (v.enemy || !Rules.gearBonus(P(v), "freeAction"))) v.disabled = sp.duration;
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
    const treasure = dead.flatMap(u => M(u).carriedTreasure);
    if (b.boss || b.id === S().id + "/lair") {
      const monster = Monsters.get(b.monster);
      const groupSize = b.units.filter(u => u.enemy).length;
      for (const type of monster.lairTreasure) {
        if (groupSize >= monster.meanAppearing || Math.random() < groupSize / monster.meanAppearing)
          treasure.push(type);
      }
    }
    const treasureXP = Game.loot(treasure);
    Game.note("Victory. Each survivor earns " + xp + " XP.", "good");
    if (b.boss) Game.record("The final guardian of " + Game.world.adventure.place + " is defeated.");
    UI.modal(
      "Victory",
      "<p>The field belongs to your company. Each survivor earns " +
        xp +
        " combat XP before prime-requisite bonuses.</p>" +
        (treasureXP ? `<p>Treasure: ${treasureXP} additional base XP shared among the survivors.</p>` : "") +
        Journal.recentRolls(b) + UI.btn("Continue exploring", "close"),
      "Battle report",
    );
    Game.finish();
    return true;
  }
  const effects = new WeakMap();
  const attackTimes = {melee: 720, missile: 840, spell: 1060, breath: 1060};
  function animationsEnabled() {
    return S().combatAnimations ?? !matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function queueEffect(target, kind, hit, details = {}) {
    if (!animationsEnabled()) return;
    const b = B();
    if (!effects.has(b)) effects.set(b, []);
    effects.get(b).push({ x: target.x, y: target.y, kind, hit, ...details });
  }
  function playAttack() {
    const b = B(), sequence = effects.get(b);
    if (!sequence?.length) return false;
    // A save during playback must resume after the already resolved action.
    b.resolved = true;
    b.mode = "attack";
    const duration = sequence.reduce((ms, e) => ms + attackTimes[e.kind], 0);
    panel();
    Game.save();
    let played = 0, lastFrame;
    function frame(now) {
      if (B() !== b || !b.resolved || effects.get(b) !== sequence) return;
      // Advance on displayed frames, not a timeout that can expire before the canvas paints.
      played += lastFrame == null ? 0 : Math.min(80, Math.max(0, now - lastFrame));
      lastFrame = now;
      if (played >= duration) {
        effects.delete(b);
        next();
        run();
        return;
      }
      let elapsed = played;
      for (const e of sequence) {
        const length = attackTimes[e.kind];
        if (elapsed < length) { render(undefined, e, elapsed / length); break; }
        elapsed -= length;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  }
  function next() {
    let b = B();
    b.resolved = false;
    if (b.auto === "turn") b.auto = false;
    b.index++;
    b.moved = 0;
    b.mode = "attack";
    b.selection = "";
    if (b.index >= b.order.length) {
      b.surprise = false;
      round();
    }
    b.started = false;
  }
  let scheduledBattle;
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
          if (u.enemy || !Rules.gearBonus(P(u), "poisonWard")) health(u, hp(u) - 2);
          u.poison--;
        }
        if ((u.enemy || !(Rules.gearBonus(P(u), "gasWard") || Rules.gearBonus(P(u), "freeAction"))) && b.clouds.some((c) => inCloud(u, c)) && !saveRoll(u, 'cloud save', u.enemy ? 13 : Rules.saves(P(u))[0]))
          u.disabled = Math.max(1, u.disabled || 0);
        if (u.buff) u.buff--;
        if (u.debuff) u.debuff--;
        if (u.disabled > 0 || !alive(u)) {
          u.disabled = Math.max(0, (u.disabled || 0) - 1);
          log(name(u) + " loses a turn.");
          next();
          if (end()) return;
          if (b.auto) return panel();
          continue;
        }
      }
      if (!u.enemy && !b.auto) {
        panel();
        Game.save();
        return;
      }
      automated(u);
      if (b.proposedSpell) {
        Game.save();
        panel();
        return;
      }
      if (playAttack()) return;
      next();
      if (end()) return;
      if (b.auto) return panel();
    }
    if (B()) {
      Game.save();
      setTimeout(run, 30);
    }
  }
  const toScreen = Battlefield.toScreen;
  let inspectedBattle, pinnedUnit, hoveredUnit;
  function rosterName(v) {
    if (!v.enemy) return name(v);
    const copies = B().units.filter(other => other.enemy && other.monster === v.monster);
    return name(v) + (copies.length > 1 ? " " + (copies.indexOf(v) + 1) : "");
  }
  function unitDescription(v) {
    if (v.enemy) {
      const m = M(v);
      return rosterName(v) + " · " + hp(v) + "/" + m.hp + " HP · AC " + m.ac + ". " +
        m.description + (m.special.length ? " Abilities: " + m.special.join(", ") + "." : "");
    }
    const p = P(v);
    if (downed(v)) return p.name + " is down. On a caster’s turn, choose Spell, select a ready healing spell, then choose Heal beside this name.";
    return p.name + " · Level " + p.level + " " + p.race + " " + p.cls + " · " +
      p.hp + "/" + p.maxHp + " HP · AC " + Rules.ac(p) + ". " +
      (Data.item(p.weapon)?.name || "Unarmed") + " · " + (Data.item(p.armour)?.name || "Unarmoured") + ".";
  }
  function facet(g, color, ...points) {
    g.beginPath();
    g.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }
  function diamond(g, color, x, y) {
    facet(g, color, x, y - 14, x + 28, y, x, y + 13, x - 28, y);
  }
  // Terrain never changes during an encounter. Bake its lighting and relief once,
  // leaving targeting, conditions and figures on the live canvas.
  let terrainPlate;
  function terrainArt(rows, width, height) {
    if (terrainPlate?.rows === rows && terrainPlate.canvas.width === width && terrainPlate.canvas.height === height)
      return terrainPlate.canvas;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    const light = g.createRadialGradient(width * .42, height * .28, 0, width * .5, height * .5, width * .65);
    light.addColorStop(0, "#36454a");
    light.addColorStop(1, "#10171d");
    g.fillStyle = light;
    g.fillRect(0, 0, width, height);
    rows.forEach((row, j) => [...row].forEach((tile, i) => {
      const [x,y] = toScreen(i,j), surface = Battlefield.surfaces[tile];
      const n = (i*37 + j*19 + i*j*7) % 23;
      if (i === row.length-1 || j === rows.length-1) {
        facet(g, "#354041", x-28,y, x,y+13, x,y+22, x-28,y+9);
        facet(g, "#202b2e", x,y+13, x+28,y, x+28,y+9, x,y+22);
      }
      diamond(g, surface?.[1] || "#465453", x, y);
      diamond(g, `rgba(14,28,32,${.04 + n/130})`, x, y);
      if (tile === "#" || tile === "R") {
        const w = tile === "#" ? 23 : 14, h = tile === "#" ? 9 : 12;
        facet(g, "#505a5b", x-w,y-4, x,y+4, x,y+10, x-w,y+2);
        facet(g, "#313c40", x,y+4, x+w,y-5, x+w,y+1, x,y+10);
        facet(g, "#7a807a", x-w,y-4, x-3,y-h-4, x+w,y-5, x,y+4);
      } else if (tile === "T") {
        g.fillStyle = "#715c44";
        g.fillRect(x-2,y-2,4,9);
        facet(g, "#709065", x-13,y+1, x,y-15, x,y+5);
        facet(g, "#284e43", x,y-15, x+13,y+1, x,y+5);
      } else if (tile === "~") {
        g.fillStyle = "#86b4b5";
        g.fillRect(x-14+n/2,y-3,9,1);
        g.fillRect(x+5-n/3,y+3,6,1);
      } else if (surface?.[2]) {
        g.fillStyle = "#eee1bb";
        g.textAlign = "center";
        g.fillText(surface[2], x, y+3);
      } else {
        g.fillStyle = "rgba(229,225,182,.22)";
        g.fillRect(x-14+n,y-3,n%5+2,1);
        g.fillRect(x+6-n/2,y+4,2,1);
      }
    }));
    terrainPlate = { rows, canvas };
    return canvas;
  }
  function render(cursor, effect, progress = 0) {
    let c = UI.$("battlefield"),
      g = c.getContext("2d"),
      b = B(),
      u = actor(),
      steps = b.mode === "move" ? path(u) : [];
    const inspected = hoveredUnit || pinnedUnit;
    UI.$("unit-description").textContent = unitDescription(inspected || u);
    const figures = b.units.filter(v => alive(v) || (effect && v.x === effect.x && v.y === effect.y && !v.fled)).sort((a, c) => a.x + a.y - c.x - c.y);
    g.drawImage(terrainArt(grid(), c.width, c.height), 0, 0);
    const reachable = new Set(steps.map(p => p.y * Battlefield.width + p.x));
    for (let y = 0; y < grid().length; y++)
      for (let x = 0; x < grid()[y].length; x++) {
        let [cx, cy] = toScreen(x, y);
        if (reachable.has(y * Battlefield.width + x)) diamond(g, "rgba(99,215,208,.38)", cx, cy);
        if (cursor?.x === x && cursor.y === y) diamond(g, "rgba(255,210,104,.65)", cx, cy);
        if (x === u.x && y === u.y) {
          diamond(g, "rgba(255,218,82,.22)", cx, cy);
          g.save();
          g.strokeStyle = "#211b13";
          g.lineWidth = 6;
          g.stroke();
          g.strokeStyle = "#ffda52";
          g.lineWidth = 3;
          g.stroke();
          g.restore();
        }
        if (b.clouds.some(cloud => inCloud({x,y}, cloud))) {
          diamond(g, "rgba(168,200,85,.4)", cx, cy);
          g.fillStyle = "#adc779";
          g.fillRect(cx - 7, cy - 2, 14, 3);
        }
      }
    for (const v of b.units.filter(downed)) {
      const [x, y] = toScreen(v.x, v.y);
      g.fillStyle = "#dfad94";
      g.textAlign = "center";
      g.fillText("0 HP", x, y + 3);
    }
    for (let v of figures) {
      let [x, y] = toScreen(v.x, v.y);
      g.beginPath();
      g.ellipse(x, y + 2, 13, 5, 0, 0, Math.PI * 2);
      g.fillStyle = "rgba(13,21,25,.8)";
      g.fill();
      g.strokeStyle = v === u ? "#ffda52" : v.enemy ? "#ed997c" : "#86d7cc";
      g.stroke();
      if (effect?.kind === "melee" && v === u) {
        const [tx, ty] = toScreen(effect.x, effect.y);
        const reach = {bite:.76, claw:.67, peck:.8, ram:.92, kick:.48, touch:.42};
        const lunge = (reach[effect.style] ?? .55) * AttackFX.meleePose(progress);
        x += (tx - x) * lunge;
        y += (ty - y) * lunge;
        const lift = {claw:5, peck:7, kick:8, slam:5}[effect.style] || 0;
        y -= lift * Math.sin(Math.PI * Math.min(1, progress / .68));
      }
      if (effect?.hit && v !== u && v.x === effect.x && v.y === effect.y && progress > .68 &&
          !(effect.kind === "spell" && ["heal", "buff", "cure"].includes(effect.sp?.effect))) {
        const recoil = Math.sin(Math.PI * (progress - .68) / .32);
        x += (Math.sign(x - toScreen(u.x, u.y)[0]) || 1) * 4 * recoil;
        y -= 3 * recoil;
      }
      Figures.unit(g, x, y + 1, v.enemy ? 0 : P(v).portrait, v.enemy ? M(v).name : null);
    }
    if (effect) AttackFX.draw(g, effect, progress, toScreen(u.x,u.y), toScreen(effect.x,effect.y));
    if (inspected) {
      const [x, y] = toScreen(inspected.x, inspected.y);
      g.save();
      g.strokeStyle = "#71e4ee";
      g.lineWidth = 3;
      g.strokeRect(x - 16, y - 32, 32, 35);
      g.restore();
    }
    // Draw the turn marker last so nearby figures cannot cover it.
    const [activeX, activeY] = toScreen(u.x, u.y);
    const tipY = Math.max(14, activeY - 31);
    g.save();
    g.beginPath();
    g.moveTo(activeX - 9, tipY - 11);
    g.lineTo(activeX + 9, tipY - 11);
    g.lineTo(activeX, tipY);
    g.closePath();
    g.fillStyle = "#ffda52";
    g.fill();
    g.strokeStyle = "#211b13";
    g.lineWidth = 2;
    g.stroke();
    g.restore();
    c.onfocus = () => render({ x: u.x, y: u.y });
    c.onblur = () => { if (B() === b && UI.$("battlefield") === c) render(); };
    c.onkeydown = (e) => {
      if (!cursor || b.auto || e.altKey || e.ctrlKey || e.metaKey) return;
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = directions[e.key];
      if (delta) {
        e.preventDefault();
        render({ x: Math.max(0, Math.min(grid()[0].length - 1, cursor.x + delta[0])), y: Math.max(0, Math.min(grid().length - 1, cursor.y + delta[1])) });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) target(cursor.x, cursor.y);
      }
    };
    c.onpointermove = e => {
      if (e.pointerType === "touch") return;
      const rect = c.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * c.width / rect.width;
      const my = (e.clientY - rect.top) * c.height / rect.height;
      const hit = figures.findLast(v => {
        const [x, y] = toScreen(v.x, v.y);
        return Math.abs(mx - x) <= (v.enemy ? 14 : 12) && my >= y - 31 && my <= y + 2;
      });
      if (hoveredUnit !== hit) {
        hoveredUnit = hit;
        render(cursor);
      }
    };
    c.onpointerleave = () => {
      if (hoveredUnit) {
        hoveredUnit = undefined;
        render(cursor);
      }
    };
    c.onclick = (e) => {
      let rect = c.getBoundingClientRect(),
        mx = ((e.clientX - rect.left) * c.width) / rect.width,
        my = ((e.clientY - rect.top) * c.height) / rect.height,
        x = Math.round(((mx - 420) / 29 + (my - 38) / 14) / 2),
        y = Math.round(((my - 38) / 14 - (mx - 420) / 29) / 2);
      target(x, y);
    };
  }
  function spellTarget(u, at, v, sp) {
    if (!sp || !attackReaches(u, at, sp.range * scale())) return false;
    if (sp.radius) return true;
    if (!v) return false;
    return ["heal", "buff", "cure"].includes(sp.effect) ? !v.enemy : v.enemy;
  }
  // Numeric keys also work for battles saved before worn items had powers.
  function battleItem(p, key) {
    return Object.hasOwn(Data.wearSlots, key) ? p?.worn?.[key] : S().inventory[Number(key)];
  }
  function usableItems(p) {
    const entries = [...S().inventory.entries(), ...Object.entries(p?.worn || {})];
    return entries.filter(([key, obj]) => {
      const it = Data.item(obj.id);
      return it.spell && (obj.charges ?? it.charges) > 0 && (!it.rechargeable || typeof key === "string");
    });
  }
  function target(x, y) {
    let b = B();
    if (!b || b.auto || b.resolved || x < 0 || x >= grid()[0].length || y < 0 || y >= grid().length) return;
    let u = actor(),
      v = b.units.find((t) => t.x === x && t.y === y && alive(t)),
      at = { x, y },
      valid = true;
    const destination = b.mode === "move" && path(u).find(t => t.x === x && t.y === y);
    if (destination?.steps) {
      u.x = x;
      u.y = y;
      log(name(u) + " moves.");
      b.moved = (b.moved || 0) + destination.steps;
      if (!movementLeft(u)) b.mode = "attack";
      panel();
      Game.save();
      return;
    } else if (b.mode === "attack" && v?.enemy && canStrike(u, v)) strike(u, v);
    else if (b.mode === "hands") valid = healByTouch(u, v);
    else if (b.mode === "spell" || b.mode === "item") {
      let isItem = b.mode === "item",
        obj = isItem && battleItem(P(u), b.selection),
        sp = Data.spell(isItem ? Data.item(obj?.id)?.spell : b.selection);
      if (!v) v = b.units.find(t => t.x === x && t.y === y && spellRecipient(t, sp));
      if (!spellTarget(u, at, v, sp) || (!isItem && !(P(u).ready[sp.id] > 0)))
        valid = false;
      else {
        cast(u, sp, at);
        if (isItem && Object.hasOwn(Data.wearSlots, b.selection)) {
          const it = Data.item(obj.id);
          obj.charges = (obj.charges ?? it.charges) - 1;
          if (!obj.charges && !it.rechargeable) delete P(u).worn[b.selection];
        } else if (isItem) Game.consume(+b.selection);
        else P(u).ready[sp.id]--;
      }
    } else valid = false;
    if (valid) {
      if (playAttack()) return;
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
    if (b.resolved && !effects.has(b)) {
      next();
      run();
      return;
    }
    if (!b.resolved && b.auto && !alive(u)) {
      if (end()) return;
      while (!alive(u)) {
        next();
        u = actor();
      }
    }
    if (!b.resolved && !b.auto && (u.enemy || !alive(u))) {
      run();
      return;
    }
    if (inspectedBattle !== b) {
      inspectedBattle = b;
      pinnedUnit = hoveredUnit = undefined;
    }
    const listed = v => alive(v) || downed(v);
    if (pinnedUnit && !listed(pinnedUnit)) pinnedUnit = undefined;
    if (hoveredUnit && !listed(hoveredUnit)) hoveredUnit = undefined;
    let p = P(u),
      modes = [
        ["Attack", "attack", "1"],
        ["Move", "move", "2"],
        ["Spell", "spells", "3"],
        ["Item", "items", "4"],
        [b.moved ? "End turn" : "Wait", "wait", "5"],
        ["Flee", "flee", "6"],
        ["Auto-fight", "auto", "7"],
        ["Auto this turn", "autoTurn", "92"],
      ];
    if (p && (p.cls === "Cleric" || (p.cls === "Paladin" && p.level >= 3))) modes.push(["Turn undead", "turn", "8"]);
    if (p?.alternateWeapon) modes.push(["Switch to " + Data.item(p.alternateWeapon).name, "switchWeapon", "93"]);
    if (p?.cls === "Paladin") modes.push(["Lay on Hands", "hands", "91"]);
    const buttons = (b.auto || b.resolved ? [] : modes)
      .map(([n, k, key]) =>
        UI.btn(
          n,
          "battleAction",
          k,
          (k === "move" && !movementLeft(u)) ||
          (k === "hands" && !Rules.handsReady(p, S().minutes)) ||
            (k === "spells" && !Object.values(p.ready).some((v) => v > 0)) ||
            (k === "items" && !usableItems(p).length),
          b.mode === k ? "primary" : "",
          key,
        ),
      )
      .join("");
    let instruction = b.auto || b.resolved ? "" :
      b.mode === "attack"
        ? (range(u) === 1 ? "Choose an adjacent foe, including diagonally." : "Choose a foe within " + range(u) + " squares.")
        : b.mode === "move"
          ? `Choose a highlighted square (${movementLeft(u)} steps left), or choose another action. A diagonal costs one step.`
          : b.mode === "spell" || b.mode === "item"
            ? "Choose the target square for " +
              Data.spell(b.mode === "spell" ? b.selection : Data.item(battleItem(p, b.selection).id).spell)
                .name +
              "."
            : "";
    if (b.mode === "hands") instruction = "Choose yourself or a wounded adjacent ally to restore up to " + 2 * p.level + " HP. Once per day.";
    let selectedSpell;
    if (["spell", "item"].includes(b.mode)) {
      const sp = Data.spell(
        b.mode === "spell" ? b.selection : Data.item(battleItem(p, b.selection).id).spell,
      );
      selectedSpell = sp;
      instruction += " " + Data.spellDetails(sp) + " " + sp.description;
    }
    const pickingHeal = !b.auto && !b.resolved && ["heal", "cure"].includes(selectedSpell?.effect);
    if (pickingHeal) instruction = "Choose Heal beside a companion in Combatants, or select their square. " + instruction;
    const roster = b.units.map((v, i) => {
      if (!listed(v)) return "";
      const label = rosterName(v) + (downed(v) ? " · Downed (0 HP)" : "");
      if (pickingHeal && !v.enemy) {
        const blocked = !spellTarget(u, v, v, selectedSpell);
        return UI.btn("Heal " + label + (blocked ? " · Out of reach" : ""), "battleTarget", v.x + "," + v.y, blocked, "ally");
      }
      return UI.btn(label, "battleInspect", String(i), false, v.enemy ? "enemy" : "ally");
    }).join("");
    let choices =
      b.mode === "spells"
        ? Object.entries(p.ready)
            .filter(([, n]) => n > 0)
            .map(([id, n]) => {
              const sp = Data.spell(id);
              return '<div class="spell-choice">' + UI.btn(sp.name + " ×" + n, "battleSpell", id) +
                "<small>" + UI.esc(Data.spellDetails(sp)) + "</small></div>";
            })
            .join("")
        : b.mode === "items"
          ? usableItems(p).map(([key, obj]) => UI.btn(Data.item(obj.id).name +
                (typeof key === "string" ? " · " + Data.wearSlots[key] : ""), "battleItem", key))
              .join("")
          : "";
    if (b.proposedSpell) {
      const proposal = b.proposedSpell;
      instruction = UI.esc(name(u) + " wants to cast " + Data.spell(proposal.id).name +
        " on " + name(b.units[proposal.target]) + ".");
      choices = UI.btn("Cast spell", "battleDecideSpell", "cast") +
        UI.btn("Skip spell", "battleDecideSpell", "skip");
    }
    let targets = b.units.filter(v => {
      if (b.auto || b.resolved || !spellRecipient(v, selectedSpell)) return false;
      if (b.mode === "attack") return v.enemy && canStrike(u, v);
      if (b.mode === "hands") return touchTarget(u, v);
      if (!selectedSpell) return false;
      if (selectedSpell.id === "stinking_cloud") return true;
      return ["heal", "buff", "cure"].includes(selectedSpell.effect) ? !v.enemy : v.enemy;
    }).map(v => {
      const blocked = selectedSpell && !spellTarget(u, v, v, selectedSpell);
      const label = name(v) + " · " + hp(v) + (v.enemy ? "" : "/" + P(v).maxHp) + " HP";
      return UI.btn(label + (blocked ? " · Out of reach" : ""), "battleTarget", v.x + "," + v.y, blocked);
    }).join("");
    const symbols = Object.entries(Battlefield.surfaces)
      .filter(([tile, surface]) => surface[2] && grid().some(row => row.includes(tile)))
      .map(([, surface]) => surface[2] + " " + surface[0]);
    UI.modal(
      (b.auto ? "Auto-fight · " : "") + name(u) + "’s turn",
      '<div class="battle-overview"><div><canvas class="battle-canvas" id="battlefield" width="960" height="480" aria-label="Isometric battlefield"' +
        (b.auto ? "" : ' tabindex="0"') + '></canvas></div><aside class="combat-roster" aria-label="Combatants"><h3>Combatants</h3>' +
        roster + '<p id="unit-description"></p></aside></div>' +
        Journal.recentRolls(b) + (b.auto ? "" : "<small>Press shortcut digits in order. Arrow keys select a square. Enter confirms.</small>") + '<p class="muted">' + UI.esc(symbols.join(" · ")) + '</p><div class="btns">' +
        buttons + (!b.resolved && !b.proposedSpell ? UI.btn("Auto spells: " +
          ({yes:"Yes", no:"No", ask:"Ask"}[S().autoSpells] || "Yes"), "battleAutoSpells") : "") +
        (!b.resolved ? UI.btn("Attack animations: " + (animationsEnabled() ? "On" : "Off"), "battleAnimations") : "") +
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
      (b.field ? b.field.place + " · 5 ft per square" : "Tactical combat") + " · Round " + b.round,
      true,
    );
    const rows = document.querySelectorAll('[data-act="battleInspect"]');
    for (const row of rows) {
      const v = b.units[Number(row.dataset.arg)];
      row.setAttribute("aria-pressed", String(pinnedUnit === v));
      row.onpointerenter = e => {
        if (e.pointerType !== "touch") { hoveredUnit = v; render(); }
      };
      row.onpointerleave = () => { hoveredUnit = undefined; render(); };
    }
    render();
    if (b.auto && !b.resolved && !b.proposedSpell && scheduledBattle !== b) {
      scheduledBattle = b;
      Game.save();
      setTimeout(() => {
        if (scheduledBattle === b) scheduledBattle = null;
        if (B() === b) run();
      }, 200);
    }
  }
  function handle(a, arg) {
    if (!a.startsWith("battle") || !B()) return false;
    let b = B(),
      u = actor();
    if (a === "battleAutoSpells" && !b.resolved && !b.proposedSpell) {
      S().autoSpells = ({yes:"no", no:"ask", ask:"yes"})[S().autoSpells] || "no";
      Game.save();
      panel();
      return true;
    }
    if (a === "battleDecideSpell") {
      const proposal = b.proposedSpell;
      if (!proposal || !["cast", "skip"].includes(arg)) return true;
      delete b.proposedSpell;
      if (arg === "cast") {
        cast(u, Data.spell(proposal.id), b.units[proposal.target]);
        P(u).ready[proposal.id]--;
      } else automated(u, false);
      if (!playAttack()) {
        next();
        run();
      }
      return true;
    }
    if (a === "battleAnimations" && !b.resolved) {
      S().combatAnimations = !animationsEnabled();
      Game.save();
      panel();
      return true;
    }
    if (a === "battleInspect") {
      const unit = b.units[Number(arg)];
      if (unit && (alive(unit) || downed(unit))) {
        pinnedUnit = unit;
        hoveredUnit = undefined;
        for (const row of document.querySelectorAll('[data-act="battleInspect"]'))
          row.setAttribute("aria-pressed", String(b.units[Number(row.dataset.arg)] === unit));
        render();
      }
      return true;
    }
    if (b.auto || b.resolved) return true;
    if (a === "battleTarget") {
      target(...arg.split(",").map(Number));
      return true;
    }
    if (a === "battleSpell" || a === "battleItem") {
      if (a === "battleItem" && !usableItems(P(u)).some(([key]) => String(key) === arg)) return true;
      b.mode = a === "battleSpell" ? "spell" : "item";
      b.selection = arg;
      panel();
      return true;
    }
    if (a === "battleAction" && arg === "switchWeapon") {
      if (!u.enemy && Rules.switchWeapon(P(u))) {
        b.mode = "attack";
        b.selection = "";
        panel();
      }
      return true;
    }
    if (arg === "auto" || arg === "autoTurn") {
      b.auto = arg === "autoTurn" ? "turn" : true;
      b.mode = "attack";
      panel();
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
      for (let v of b.units.filter((v) => v.enemy && alive(v) && M(v).undead && Battlefield.attackVisible(grid(), u, v)))
        if (checkRoll(name(u) + ' turns ' + name(v), 20, lv, t => t >= 9 + M(v).undead ? 'turned' : 'resisted') >= 9 + M(v).undead) {
          v.fled = true;
          n++;
        }
      log(n ? "The undead recoil and flee." : "The dead withstand the invocation.");
      next();
      run();
      return true;
    }
    if (arg === "wait") {
      log(name(u) + (b.moved ? " ends the turn." : " holds position."));
      next();
      run();
      return true;
    }
    if (arg === "move" && !movementLeft(u)) return true;
    b.mode = arg;
    panel();
    return true;
  }
  return { begin, encounter, encounterPanel, encounterChoice, handle, panel };
})();
