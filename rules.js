"use strict";
const Rules = (() => {
  const abilities = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
  const races = {
    Human: ["Fighter", "Paladin", "Ranger", "Mage", "Cleric", "Thief"],
    Dwarf: ["Fighter", "Cleric", "Thief"],
    Elf: ["Fighter", "Ranger", "Mage", "Cleric", "Thief"],
    Gnome: ["Fighter", "Mage", "Cleric", "Thief"],
    "Half-elf": ["Fighter", "Ranger", "Mage", "Cleric", "Thief"],
    Halfling: ["Fighter", "Cleric", "Thief"],
  };
  const alignments = [
    "Lawful good",
    "Neutral good",
    "Chaotic good",
    "Lawful neutral",
    "True neutral",
    "Chaotic neutral",
    "Lawful evil",
    "Neutral evil",
    "Chaotic evil",
  ];
  const allowedAlignments = (c) =>
    c === "Paladin"
      ? [alignments[0]]
      : c === "Ranger"
        ? alignments.slice(0, 3)
        : c === "Thief"
          ? alignments.slice(1)
          : alignments;
  const minimums = {
    Fighter: [9, 3, 3, 3, 3, 3],
    Ranger: [13, 13, 14, 3, 14, 3],
    Paladin: [12, 3, 9, 3, 13, 17],
    Mage: [3, 3, 3, 9, 3, 3],
    Cleric: [3, 3, 3, 3, 9, 3],
    Thief: [3, 9, 3, 3, 3, 3],
  };
  const classes = ["Fighter", "Ranger", "Cleric", "Mage", "Thief", "Paladin"];
  const prime = { Fighter: [0], Paladin: [0, 5], Ranger: [0, 1, 4], Cleric: [4], Mage: [3], Thief: [1] };
  const dice = { Fighter: 10, Paladin: 10, Ranger: 10, Cleric: 8, Mage: 4, Thief: 6 };
  const xpBase = {
    Fighter: [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000],
    Paladin: [0, 2250, 4500, 9000, 18000, 36000, 75000, 150000, 300000],
    Mage: [0, 2500, 5000, 10000, 20000, 40000, 60000, 90000, 135000, 250000, 375000, 750000],
    Cleric: [0, 1500, 3000, 6000, 13000, 27500, 55000, 110000, 225000, 450000],
    Thief: [0, 1250, 2500, 5000, 10000, 20000, 40000, 70000, 110000, 160000, 220000],
  };
  xpBase.Ranger = xpBase.Paladin;
  function xpFor(c, l) {
    const a = xpBase[c];
    return (
      a[l - 1] ??
      a[a.length - 1] +
        (l - a.length) *
          { Fighter: 250000, Ranger: 300000, Paladin: 300000, Cleric: 225000, Mage: 375000, Thief: 220000 }[c]
    );
  }
  const roll = (sides, r = Math.random) => 1 + Math.floor(r() * sides);
  function rng(seed) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h = (h + 0x6d2b79f5) | 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const warrior = (c) => ["Fighter", "Ranger", "Paladin"].includes(c);
  const thac0 = (c, l) =>
    20 -
    (warrior(c)
      ? l - 1
      : c === "Cleric"
        ? 2 * Math.floor((l - 1) / 3)
        : c === "Thief"
          ? Math.floor((l - 1) / 2)
          : Math.floor((l - 1) / 3));
  const saveNames = ["Poison / death", "Rods / wands", "Petrification", "Breath weapon", "Spells"];
  const saveTables = {
    warrior: [
      [14, 16, 15, 17, 17],
      [13, 15, 14, 16, 16],
      [11, 13, 12, 13, 14],
      [10, 12, 11, 12, 13],
      [8, 10, 9, 9, 11],
      [7, 9, 8, 8, 10],
      [5, 7, 6, 5, 8],
      [4, 6, 5, 4, 7],
      [3, 5, 4, 4, 6],
    ],
    Mage: [
      [14, 11, 13, 15, 12],
      [13, 9, 11, 13, 10],
      [11, 7, 9, 11, 8],
      [10, 5, 7, 9, 6],
      [8, 3, 5, 7, 4],
    ],
    Cleric: [
      [10, 14, 13, 16, 15],
      [9, 13, 12, 15, 14],
      [7, 11, 10, 13, 12],
      [6, 10, 9, 12, 11],
      [5, 9, 8, 11, 10],
      [4, 8, 7, 10, 9],
      [2, 6, 5, 8, 7],
    ],
    Thief: [
      [13, 14, 12, 16, 15],
      [12, 12, 11, 15, 13],
      [11, 10, 10, 14, 11],
      [10, 8, 9, 13, 9],
      [9, 6, 8, 12, 7],
      [8, 4, 7, 11, 5],
    ],
  };
  function saves(p) {
    let w = warrior(p.cls),
      a = saveTables[w ? "warrior" : p.cls],
      i = Math.floor((p.level - 1) / (w ? 2 : p.cls === "Mage" ? 5 : p.cls === "Cleric" ? 3 : 4));
    return a[Math.min(i, a.length - 1)].map((v, j) =>
      Math.max(
        2,
        v -
          (p.cls === "Paladin" ? 2 : 0) -
          (["Dwarf", "Halfling"].includes(p.race) && [0, 1, 4].includes(j) ? 2 : 0),
      ),
    );
  }
  const spellSchool = (c) =>
    c === "Mage" ? "wizard" : c === "Cleric" || c === "Ranger" || c === "Paladin" ? "priest" : "";
  const wizardSlots = [
    "1",
    "2",
    "21",
    "32",
    "321",
    "422",
    "4321",
    "4332",
    "43321",
    "44432",
    "444331",
    "444441",
    "5554421",
    "5554421",
    "55555321",
    "55555321",
    "555553321",
    "555554331",
    "555555332",
    "555554432",
  ];
  const priestSlots = [
    "1",
    "2",
    "21",
    "32",
    "331",
    "332",
    "3321",
    "3332",
    "44321",
    "44332",
    "55432",
    "665321",
    "666421",
    "6665321",
    "6666421",
    "7776532",
    "7777542",
    "8888642",
    "9999752",
    "9999862",
  ];
  // Each threshold adds one daily slot in this circle once the Cleric unlocks it.
  const wisdomThresholds = [[13, 14], [15, 16], [17], [18]];
  function wisdomBonus(p, circle) {
    if (p.cls !== "Cleric") return 0;
    return (wisdomThresholds[circle - 1] || []).filter(score => p.stats?.[4] >= score).length;
  }
  function slots(p) {
    let lv = p.level;
    if (["Paladin", "Ranger"].includes(p.cls)) lv = Math.min(7, lv - (p.cls === "Paladin" ? 8 : 7));
    let school = spellSchool(p.cls);
    if (!school || lv < 1) return [];
    return [...(school === "wizard" ? wizardSlots : priestSlots)[lv - 1]].map((base, i) => Number(base) + wisdomBonus(p, i + 1));
  }
  function plannedSpells(p, circle) {
    const cap = slots(p)[circle - 1] || 0;
    const pool = p.book.filter(id => Data.spell(id)?.level === circle);
    const selected = (p.plan || []).filter(id => pool.includes(id));
    if (p.customCircles?.includes(circle)) return selected.slice(0, cap);
    // Older plans cycled their chosen spells to fill the circle.
    const defaults = selected.length ? selected : pool;
    return defaults.length ? Array.from({length: cap}, (_, i) => defaults[i % defaults.length]) : [];
  }
  function changePreparation(p, id, add) {
    const circle = Data.spell(id)?.level;
    if (!circle || !p.book.includes(id)) return;
    const copies = plannedSpells(p, circle);
    if (add) {
      if (copies.length >= (slots(p)[circle - 1] || 0)) return;
      copies.push(id);
    } else {
      const index = copies.indexOf(id);
      if (index < 0) return;
      copies.splice(index, 1);
    }
    p.plan = (p.plan || []).filter(id => Data.spell(id)?.level !== circle).concat(copies);
    p.customCircles ||= [];
    if (!p.customCircles.includes(circle)) p.customCircles.push(circle);
  }
  function refresh(p) {
    p.ready = {};
    slots(p).forEach((_, i) => {
      for (const id of plannedSpells(p, i + 1)) p.ready[id] = (p.ready[id] || 0) + 1;
    });
  }
  const skills = (p) =>
    Object.fromEntries(
      ["Open locks", "Find traps", "Remove traps", "Move silently", "Hide", "Backstab"].map((k, i) => [
        k,
        i === 5
          ? Math.min(5, 2 + Math.floor((p.level - 1) / 4))
          : Math.min(95, [35, 40, 35, 45, 35][i] + (p.level - 1) * 5 + Math.max(0, p.stats[1] - 12) * 2),
      ]),
    );
  function create(name, cls, race, portrait = 0, level = 1, customStats = null, alignment = null) {
    let stats = customStats || [14, 13, 14, 12, 12, 13].map((v, i) => (prime[cls].includes(i) ? 16 : v));
    stats = stats.map((v, i) => Math.max(minimums[cls][i], v));
    let hp = dice[cls] + Math.max(0, stats[2] - 14) + (level - 1) * (Math.ceil(dice[cls] / 2) + 1);
    let p = {
      name,
      cls,
      race,
      portrait,
      level,
      stats,
      alignment: alignment || allowedAlignments(cls)[0],
      hp,
      maxHp: hp,
      xp: xpFor(cls, level),
      weapon: {
        Fighter: "longsword",
        Ranger: "shortbow",
        Thief: "dagger",
        Paladin: "longsword",
        Mage: "staff",
        Cleric: "mace",
      }[cls],
      armour: cls === "Mage" ? "" : ["Thief", "Ranger"].includes(cls) ? "leather_armour" : "chain_mail",
      specialization: cls === "Fighter" ? "longsword" : "",
      book: [],
      plan: [],
      ready: {},
    };
    if (typeof Data !== "undefined") {
      if (level >= 5) {
        let tier = Math.min(4, Math.floor((level - 1) / 4));
        p.weapon =
          Data.items.find((it) => it.type === "weapon" && it.base === p.weapon && it.bonus === tier)?.id ||
          p.weapon;
        if (p.armour) {
          let base = Data.item(p.armour);
          p.armour =
            Data.items.find((it) => it.type === "armour" && it.ac === base.ac - tier && it.bonus === tier)
              ?.id || p.armour;
        }
      }
      p.book = Data.spells
        .filter(
          (s) =>
            s.school === spellSchool(cls) && (cls !== "Mage" || s.level <= Math.max(1, Math.ceil(level / 2))),
        )
        .filter((s, i, a) => cls !== "Mage" || a.filter((t) => t.level === s.level).indexOf(s) < 3)
        .map((s) => s.id);
      refresh(p);
    }
    return p;
  }
  function gain(p, amount) {
    p.xp += Math.floor(amount * (prime[p.cls].every((i) => p.stats[i] >= 16) ? 1.1 : 1));
  }
  function advance(p) {
    p.level++;
    let n =
      p.level > (p.cls === "Mage" || p.cls === "Thief" ? 10 : 9)
        ? warrior(p.cls)
          ? 3
          : p.cls === "Mage"
            ? 1
            : 2
        : roll(dice[p.cls]) + Math.max(0, p.stats[2] - 14);
    p.maxHp += n;
    p.hp += n;
    refresh(p);
  }
  function canEquip(p, it) {
    if (it.type === "armour") {
      if (p.cls === "Mage") return false;
      if (p.cls === "Thief") return it.id.endsWith("leather_armour") || it.id.endsWith("padded_jack");
      return true;
    }
    if (it.type !== "weapon") return false;
    if (warrior(p.cls)) return true;
    const allowed = {
      Mage: ["staff", "dagger", "sling", "throwing_knife"],
      Cleric: ["mace", "warhammer", "flail", "staff", "sling", "morningstar"],
      Thief: [
        "dagger",
        "shortsword",
        "longsword",
        "shortbow",
        "sling",
        "throwing_knife",
        "light_crossbow",
        "staff",
      ],
    };
    return allowed[p.cls].includes(it.base);
  }
  function ac(p) {
    return (Data.item(p.armour)?.ac ?? 10) - Math.max(0, Math.min(4, p.stats[1] - 14));
  }
  function handsReady(p, minutes) {
    return p?.cls === "Paladin" && p.hp > 0 && p.handsDay !== Math.floor(minutes / 1440);
  }
  function layOnHands(p, ally, minutes) {
    if (!handsReady(p, minutes) || !ally || ally.hp <= 0 || ally.hp >= ally.maxHp) return 0;
    const restored = Math.min(2 * p.level, ally.maxHp - ally.hp);
    ally.hp += restored;
    p.handsDay = Math.floor(minutes / 1440);
    return restored;
  }
  function company(l = 1) {
    return [
      ["Aldric Vale", "Fighter", "Human"],
      ["Sylva Ashwood", "Ranger", "Half-elf"],
      ["Borin Flint", "Cleric", "Dwarf"],
      ["Mira Vey", "Mage", "Human"],
      ["Pip Bramble", "Thief", "Halfling"],
      ["Elara Dawn", "Paladin", "Human"],
    ].map(([n, c, r], i) => create(n, c, r, i, l));
  }
  return {
    handsReady,
    layOnHands,
    canEquip,
    abilities,
    minimums,
    races,
    alignments,
    allowedAlignments,
    classes,
    roll,
    rng,
    warrior,
    thac0,
    saves,
    saveNames,
    xpFor,
    gain,
    advance,
    create,
    company,
    ac,
    skills,
    slots,
    wisdomBonus,
    plannedSpells,
    changePreparation,
    refresh,
    spellSchool,
    movement: (p) => (p.race === "Human" ? 1 : 0.85),
  };
})();
