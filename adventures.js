"use strict";
const Adventures = (() => {
  const authored = [
    {
      id: "E0",
      name: "The Cellars of Thornwick",
      town: "Thornwick",
      place: "The Cinder Cellars",
      range: [1, 2],
      giver: "Warden Ysra",
      main: "The missing bell",
      brief:
        "The bell beneath the granary has rung three nights in a row. Its rope was cut a winter ago. Descend the old cellars and silence the thing pulling it.",
      side: "The tallyman's seal",
      sideText: "Find the copper grain seal among the abandoned stores.",
      relic: "copper grain seal",
      boss: "thornwick_broodmother",
      floors: ["The Malt Galleries", "The Drowned Granary"],
      encounters: ["cellar_rat", "goblin"],
      rumours: [
        "A draught rises from a solid wall in the malt galleries.",
        "The bell sounds loudest just before dawn.",
      ],
    },
    {
      id: "E1",
      name: "The Hollow Vaults",
      town: "Vellbridge",
      place: "The Hollow Vaults",
      range: [1, 3],
      giver: "Archivist Orel",
      main: "A debt in echoes",
      brief:
        "The counting vaults have started speaking the names of the dead. Break the hollow warden's covenant before it calls another debtor home.",
      side: "A letter undelivered",
      sideText: "Recover a wax-bound letter from the first archive.",
      relic: "wax-bound letter",
      boss: "hollow_warden",
      floors: ["The Counting Rooms", "Court of Echoes", "The Empty Treasury"],
      encounters: ["goblin", "skeleton"],
      rumours: [
        "No echo returns from the lowest vault.",
        "Old auditors kept their letters behind false stone.",
      ],
    },
    {
      id: "E2",
      name: "Barrow of the Iron King",
      town: "Ashmere",
      place: "The King's Barrow",
      range: [3, 5],
      giver: "Reeve Temren",
      main: "The rusted crown",
      brief:
        "Iron flakes fall like snow from the barrow pines. End the burial king's vigil before the roots carry his rust into Ashmere's wells.",
      side: "A smith's promise",
      sideText: "Retrieve the broken oath-ring from the barrow approach.",
      relic: "broken oath-ring",
      boss: "iron_king",
      floors: ["The Root Gate", "The Furnace Walk", "Hall of the Riveted King"],
      encounters: ["skeleton", "orc"],
      rumours: ["A king's oath still binds the iron doors.", "The roots ring hollow where an old road ran."],
    },
    {
      id: "E3",
      name: "The Witch-Queen of Ravenmoor",
      town: "Wickerhaven",
      place: "Ravenmoor Spire",
      range: [5, 7],
      giver: "Ferrier Senn",
      main: "A crown of reeds",
      brief:
        "The fen is rising against the wind. Follow the drowned road and sever the witch-queen's claim upon the tide.",
      side: "The last ferry token",
      sideText: "Recover the bone token left by the ferrier's daughter.",
      relic: "bone ferry token",
      boss: "witch_queen",
      floors: ["The Reed Causeway", "Flooded Cloister", "The Black Weir", "The Tide Throne"],
      encounters: ["troll", "skeleton"],
      rumours: [
        "Only the old causeway keeps its stones above water.",
        "The flood recedes when the queen sleeps.",
      ],
    },
  ];
  const layout = (w, h, segments) => {
    let g = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => (x === 0 || x === w - 1 || y === 0 || y === h - 1 ? "#" : ".")),
    );
    for (let [x, y, dx, dy, n] of segments) for (let i = 0; i < n; i++) g[y + dy * i][x + dx * i] = "#";
    return g.map((row) => row.join(""));
  };
  const plans = [
    [
      [3, 2, 0, 1, 7],
      [7, 1, 0, 1, 5],
      [7, 8, 1, 0, 6],
      [10, 3, 0, 1, 4],
      [1, 9, 1, 0, 2],
    ],
    [
      [2, 3, 1, 0, 7],
      [5, 4, 0, 1, 5],
      [7, 6, 1, 0, 6],
      [9, 8, 0, 1, 3],
    ],
    [
      [3, 1, 0, 1, 7],
      [6, 4, 0, 1, 7],
      [9, 1, 0, 1, 7],
      [12, 4, 0, 1, 7],
    ],
    [
      [2, 3, 1, 0, 10],
      [2, 5, 0, 1, 4],
      [4, 8, 1, 0, 8],
      [7, 4, 0, 1, 2],
    ],
    [
      [2, 2, 1, 0, 5],
      [9, 2, 0, 1, 4],
      [4, 5, 1, 0, 4],
      [2, 7, 0, 1, 3],
      [5, 9, 1, 0, 7],
    ],
    [
      [3, 3, 1, 0, 8],
      [3, 4, 0, 1, 4],
      [10, 4, 0, 1, 2],
      [7, 7, 1, 0, 5],
      [5, 9, 0, 1, 2],
    ],
    [
      [3, 2, 0, 1, 4],
      [3, 8, 0, 1, 3],
      [6, 3, 1, 0, 5],
      [8, 6, 0, 1, 5],
      [11, 7, 1, 0, 3],
    ],
    [
      [2, 2, 1, 0, 4],
      [8, 2, 1, 0, 5],
      [3, 5, 1, 0, 8],
      [6, 7, 0, 1, 4],
      [10, 8, 1, 0, 3],
    ],
    [
      [2, 2, 0, 1, 6],
      [5, 4, 0, 1, 7],
      [8, 1, 0, 1, 7],
      [11, 5, 0, 1, 6],
    ],
    [
      [2, 3, 1, 0, 5],
      [9, 3, 1, 0, 4],
      [2, 7, 1, 0, 5],
      [9, 7, 1, 0, 4],
      [7, 9, 0, 1, 3],
    ],
    [
      [3, 2, 0, 1, 7],
      [6, 2, 1, 0, 6],
      [6, 5, 1, 0, 5],
      [6, 7, 0, 1, 4],
      [10, 8, 1, 0, 4],
    ],
    [
      [2, 4, 1, 0, 4],
      [9, 4, 1, 0, 4],
      [4, 6, 0, 1, 5],
      [10, 6, 0, 1, 5],
      [7, 7, 0, 1, 2],
    ],
  ];
  const floorStories = [
    [
      [
        "Empty grain sacks hang from hooks. Something has gnawed the brass weights off the scales.",
        "A grain seal lies inside the cracked measuring cup.",
      ],
      [
        "Black water laps against the lowest bins. A bronze bell rocks on a cord of braided hair.",
        "You wedge a timber under the bell. Its shivering note fades.",
        "heal",
      ],
    ],
    [
      [
        "Sheets of slate hang like washing between the counting desks. Each carries a single name.",
        "The missing letter is sealed inside a hollow slate.",
      ],
      [
        "A clerk made of loose paper walks the same route between two empty desks.",
        "You stamp the clerk’s last receipt. Its pages scatter, exposing the floor mechanisms.",
        "reveal",
      ],
      [
        "Candle stubs float in the air above an empty strongbox.",
        "Beneath the false bottom you find the last unclaimed deposit.",
        "coin",
      ],
    ],
    [
      [
        "The trees have sent their roots down the barrow steps. An iron chain holds each root in place.",
        "The smith’s oath-ring hangs from the smallest chain.",
      ],
      [
        "Cold anvils stand in pairs along the furnace walk. One still holds a red coal.",
        "You feed the coal a splinter of rowan. Its warmth seeps into stiff fingers.",
        "heal",
      ],
      [
        "Iron courtiers kneel around a throne. Rust drifts from their empty sleeves.",
        "An iron courtier opens its palm to reveal the king’s last tithe.",
        "coin",
      ],
    ],
    [
      [
        "The causeway rests on thousands of sunken ferry poles.",
        "A bone ferry token is wedged between two poles.",
      ],
      [
        "Closed lilies crowd the flooded cloister. They open when someone speaks a name.",
        "You speak the ferrier’s daughter’s name. The lilies yield a draught of clear water.",
        "heal",
      ],
      [
        "Water presses against the weir in the shape of an enormous hand.",
        "You lift the bronze spill gate. Silt drains away from the old trap plates.",
        "reveal",
      ],
      [
        "Above the tide throne a birdcage swings. The bird inside is made of rain.",
        "You unlatch the cage. The rainbird folds a single bright coin into each open hand.",
        "coin",
      ],
    ],
  ];
  const first = ["Amber", "Cinder", "Briar", "Glass", "Ivory", "Bitter", "Copper", "Ash", "Hollow", "Star"];
  const endings = ["Watch", "Deep", "Crossing", "Spire", "Sepulchre"];
  const floorWords = [
    "Outer Works",
    "Pillar Hall",
    "The Long Descent",
    "Candle Crypt",
    "Buried Court",
    "Ember Throne",
  ];
  const list = authored.map((a, i) => ({ ...a, authored: true, size: i < 2 ? 0 : 1 }));
  function generated() {
    for (let b = 0; b < 5; b++)
      for (let n = 0; n < 10; n++) {
        let k = b * 10 + n,
          id = "W" + String(k + 1).padStart(2, "0"),
          size = n < 4 ? 0 : n < 7 ? 1 : n < 9 ? 2 : 3,
          place = first[n] + endings[b],
          low = b * 4 + 1,
          high = low + 3;
        let pool = Monsters.list.filter((m) => m.level >= Math.max(1, low - 2) && m.level <= high),
          r = Rules.rng(id + "/roster");
        let choose = () => pool[Math.floor(r() * pool.length)].id;
        list.push({
          id,
          name: "The " + place + " Expedition",
          town: first[(n + b + 2) % 10] + "ford",
          place,
          range: [low, high],
          giver: "Keeper " + ["Edda", "Wren", "Lys", "Neris", "Eld"][b],
          main: "The " + place + " covenant",
          brief:
            "The road wardens have traced the raids to " +
            place +
            ". Clear its lowest hall and return the warden's standard.",
          side: "The lost waymark",
          sideText: "Find the inscribed waymark in the outer works.",
          relic: "inscribed waymark",
          boss: choose(),
          floors: floorWords.slice(0, size + 2),
          encounters: [choose(), choose(), choose()],
          rumours: [
            "Listen at the doors beneath " + place + ".",
            "Waymarks once guided pilgrims through the outer works.",
          ],
          size,
          authored: false,
        });
      }
  }
  const cache = new Map();
  function world(id) {
    if (cache.has(id)) return cache.get(id);
    let a = list.find((a) => a.id === id),
      index = authored.findIndex((v) => v.id === id);
    let levels = a.floors.map((name, i) =>
      Modules.dungeon(
        id + "/" + i,
        name,
        i + 1,
        a.size,
        id + "/" + i,
        a.encounters,
        a.authored ? layout(15, 13, plans[[0, 2, 5, 8][index] + i]) : null,
      ),
    );
    if (a.authored) levels.forEach((l, i) => (l.story = floorStories[index][i]));
    let last = levels[levels.length - 1];
    last.entities.push({ x: last.exit[0], y: last.exit[1], name: a.boss, id: id + "/boss", boss: true });
    let w = { adventure: a, town: Modules.town(a.town), levels, wild: Wilds.make(a) };
    cache.set(id, w);
    return w;
  }
  if (typeof Monsters !== "undefined") generated();
  return { list, world };
})();
