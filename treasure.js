// Each column is an independent percentage check followed by dice and a multiplier.
// Coin columns are CP / SP / EP / GP / PP. An empty column never rolls.
// Hordes A-I and personal purses J-N use different scales.
var Treasure = (() => {
  "use strict";
  const tables = {};
  const rows = `
A 25:1d6x1000 30:1d6x1000 35:1d6x1000 40:1d10x1000 25:1d4x100 60:4d10 50:3d10 30:3d1
B 50:1d8x1000 25:1d6x1000 25:1d4x1000 25:1d3x1000 - 30:1d8 20:1d4 10:1d1
C 20:1d12x1000 30:1d6x1000 10:1d4x1000 - - 25:1d6 20:1d3 10:2d1
D 10:1d8x1000 15:1d12x1000 15:1d8x1000 50:1d6x1000 - 30:1d10 25:1d6 15:3d1
E 5:1d10x1000 25:1d12x1000 25:1d6x1000 25:1d8x1000 - 15:1d12 10:1d8 25:4d1
F - 10:1d20x1000 15:1d12x1000 40:1d10x1000 35:1d8x100 20:3d10 10:1d10 30:5d1
G - - - 50:10d4x1000 50:1d20x100 30:5d4 25:1d10 35:5d1
H 25:5d6x1000 40:1d100x1000 40:10d4x1000 55:10d6x1000 25:5d10x100 50:1d100 50:10d4 15:6d1
I - - - - 30:3d6x100 55:2d10 50:1d12 15:1d1
J 100:3d8 - - - - - - -
K - 100:3d6 - - - - - -
L - - 100:2d6 - - - - -
M - - - 100:2d4 - - - -
N - - - - 100:1d6 - - -
O 25:1d4x1000 20:1d3x1000 - - - - - -
P - 30:1d6x1000 25:1d2x1000 - - - - -
Q - - - - - 50:1d4 - -
R - - - 40:2d4x1000 50:10d6x100 55:4d8 45:1d12 -
S - - - - - - - 40:2d4
T - - - - - - - 50:1d4
U - - - - - 85:10d8 80:5d6 70:1d4
V - - - - - - - 85:1d4
W - - - 60:5d6x1000 15:1d8x100 60:10d8 50:5d8 55:1d1
X - - - - - - - 60:1d2
Y - - - 70:2d6x1000 - - - -
Z 20:1d3x1000 25:1d4x1000 25:1d4x1000 30:1d4x1000 30:1d6x100 55:10d6 50:5d6 50:3d1`;
  rows
    .trim()
    .split("\n")
    .forEach((line) => {
      const [letter, ...values] = line.trim().split(/\s+/);
      tables[letter] = values.map((value) => {
        if (value === "-") return null;
        const [, chance, count, sides, unit] = /^(\d+):(\d+)d(\d+)(?:x(\d+))?$/.exec(value);
        return { chance: +chance, count: +count, sides: +sides, unit: +(unit || 1) };
      });
    });
  const gems = [
    {
      upto: 25,
      value: 10,
      stones: ["banded agate", "moss opal", "river turquoise", "cairn quartz", "eye agate", "blue feldspar"],
    },
    {
      upto: 50,
      value: 50,
      stones: [
        "copper jasper",
        "sardonyx",
        "milk chalcedony",
        "honey citrine",
        "rose quartz",
        "fossil coral",
      ],
    },
    {
      upto: 70,
      value: 100,
      stones: ["smoke amethyst", "blood garnet", "pale tourmaline", "amber drop", "green spinel", "jet tear"],
    },
    {
      upto: 90,
      value: 500,
      stones: ["sea aquamarine", "winter topaz", "fire opal", "violet pearl", "sunstone", "black onyx"],
    },
    {
      upto: 99,
      value: 1000,
      stones: ["royal sapphire", "bright emerald", "star ruby", "moon opal", "black pearl"],
    },
    { upto: 100, value: 5000, stones: ["clear diamond", "crown ruby", "dawn jacinth", "blue diamond"] },
  ];
  const jewellery = [
    ["copper", 20, 2, 6],
    ["silver", 50, 3, 6],
    ["electrum", 65, 4, 6],
    ["gold", 85, 5, 8],
    ["platinum", 95, 7, 8],
    ["enamelled star-gold", 100, 10, 10],
  ];
  const settings = [
    "braided armlet",
    "mourning brooch",
    "hinged diadem",
    "pilgrim's ring",
    "heart locket",
    "chased goblet",
    "cloak clasp",
    "twisted torc",
    "reed earrings",
    "seal pendant",
    "bell bracelet",
    "filigree comb",
  ];
  const choose = (array, rng) => array[Math.floor(rng() * array.length)];
  const die = (sides, rng) => 1 + Math.floor(rng() * sides);
  function dice(count, sides, rng) {
    let n = 0;
    for (let i = 0; i < count; i++) n += die(sides, rng);
    return n;
  }
  function quantity(entry, rng) {
    if (!entry || die(100, rng) > entry.chance) return 0;
    return dice(entry.count, entry.sides, rng) * entry.unit;
  }
  function gemstone(level, rng) {
    const chance = Math.min(100, die(100, rng) + Math.floor(level / 5));
    let band = gems.findIndex((gem) => chance <= gem.upto);
    // A fine or flawed specimen can move one or more appraisal classes.
    let quality = die(10, rng);
    for (let i = 0; i < 3 && quality === 1 && band < gems.length - 1; i++) {
      band++;
      quality = die(10, rng);
    }
    if (quality === 10 && band > 0) band--;
    const gem = gems[band];
    const modifier = quality === 2 ? 1.5 : quality === 9 ? 0.5 : 1;
    return {
      name: (modifier > 1 ? "Flawless " : modifier < 1 ? "Clouded " : "Cut ") + choose(gem.stones, rng),
      value: Math.round(gem.value * modifier),
    };
  }
  function jewel(level, rng) {
    const chance = Math.min(100, die(100, rng) + Math.floor(level / 4));
    const [metal, , count, sides] = jewellery.find((entry) => chance <= entry[1]);
    const piece = {
      name: metal[0].toUpperCase() + metal.slice(1) + " " + choose(settings, rng),
      value: dice(count, sides, rng) * 10,
    };
    if (die(100, rng) <= chance * 0.65) {
      const stone = gemstone(level, rng);
      piece.name += " set with " + stone.name.toLowerCase();
      piece.value += stone.value;
    }
    return piece;
  }
  const magicTypes = ["potion", "scroll", "ring", "wand", "charm", "armour", "weapon"];
  const magicWeights = [21, 38, 43, 53, 66, 80, 100];
  function magic(type, level, rng, index) {
    const n = die(100, rng);
    let category = magicTypes[magicWeights.findIndex((end) => n <= end)];
    if (type === "B") category = choose(["armour", "weapon"], rng);
    if (type === "F" && category === "weapon") category = choose(magicTypes.slice(0, -1), rng);
    if ((type === "D" && index === 2) || (type === "F" && index === 3) || (type === "H" && index === 4))
      category = "potion";
    if ((type === "E" && index === 3) || (type === "F" && index === 4) ||
        (type === "G" && index === 4) || (type === "H" && index === 5)) category = "scroll";
    if (type === "S") category = "potion";
    if (type === "T") category = "scroll";
    if (type === "X") category = n <= 70 ? "potion" : "charm";
    if (type === "W") category = "weapon";
    // Higher lairs roll within a sliding band so a dragon's magic can keep pace with it.
    const ceiling = Math.max(4, Math.min(20, level + die(4, rng)));
    const floor = Math.max(1, level - 6);
    let pool = Data.items.filter(
      (i) =>
        i.type === category &&
        i.level >= floor &&
        i.level <= ceiling &&
        (!(category === "weapon" || category === "armour") || i.bonus > 0),
    );
    if (!pool.length) pool = Data.items.filter((i) => i.type === category && i.level <= ceiling);
    return choose(pool, rng).id;
  }

  function roll(type = "C", level = 1, rng = Math.random) {
    type = String(type).toUpperCase();
    const table = tables[type] || tables.C;
    const counts = table.map((entry) => quantity(entry, rng));
    const coins = { cp: counts[0], sp: counts[1], ep: counts[2], gp: counts[3], pp: counts[4] };
    // First-edition exchange rates: 200 cp = 20 sp = 2 ep = 1 gp.
    const copper = coins.cp + coins.sp * 10 + coins.ep * 100;
    let gold = Math.floor(copper / 200) + coins.gp + coins.pp * 5;
    const valuables = [];
    for (let i = 0; i < counts[5] + counts[6]; i++) {
      const value = i < counts[5] ? gemstone(level, rng) : jewel(level, rng);
      valuables.push(value.name + " (" + value.value + " gp)");
      gold += value.value;
    }
    const items = [];
    for (let i = 0; i < counts[7]; i++) items.push(magic(type, level, rng, i));
    return { gold, copper: copper % 200, items, valuables, coins };
  }
  function shop(low = 1, high = low) {
    // Include the equipment tier already available at the start of the adventure.
    const gearFloor = Math.max(...Data.items.filter(i => i.type === "weapon" && i.level <= low).map(i => i.level));
    return Data.items.filter(i => {
      const gear = i.type === "weapon" || i.type === "armour";
      return i.level <= high && (i.level === 1 || i.type === "scroll" || i.level >= (gear ? gearFloor : low));
    }).map(i => i.id);
  }
  return { tables, gems, jewellery, gemstone, jewel, roll, shop };
})();
