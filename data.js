// Compact records keep the offline catalogues inexpensive to load on a tablet.
var Data = (() => {
  "use strict";
  const key = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  const spells = [];
  function circle(school, level, rows) {
    for (const row of rows.trim().split("\n")) {
      const [name, effect, range, radius, dice, duration, save, description] = row.trim().split("|");
      spells.push({
        id: key(name),
        name,
        school,
        level,
        effect,
        range: +range,
        radius: +radius,
        dice: dice.split("d").map(Number),
        duration: +duration,
        save: save === "-" ? null : save,
        description,
      });
    }
  }

  circle(
    "wizard",
    1,
    `
Magic Missile|damage|9|0|1d4|0|-|A bead of white fire follows one marked foe.
Sleep|disable|6|1|0d1|3|spell|A slow chiming note draws nearby creatures into sleep.
Copper Mantle|buff|3|0|1d2|4|-|Copper scales briefly knit across an ally's coat.
Rime Needle|damage|7|0|1d6|0|spell|A shard of clear ice fractures against its target.
Cinder Fan|damage|2|1|1d4|0|breath|A handspan of coals opens into a fan of heat.
Tangled Shadow|debuff|5|0|1d2|3|spell|A shadow catches its owner's ankles.
`,
  );
  circle(
    "wizard",
    2,
    `
Stinking Cloud|disable|9|1|0d1|3|poison|A twenty-foot bank of choking vapour forms within thirty yards. Creatures inside must save against poison or spend their turns retching.
Glass Arrow|damage|9|0|3d4|0|spell|A shaft of white glass bursts behind a shield.
Mirror Veil|buff|2|0|1d3|4|-|False outlines follow an ally's movements.
Woolbind|disable|4|0|0d1|3|spell|Filaments bind wrists, knees and fingers together.
Salt Lash|damage|3|1|2d4|0|breath|A spray of salt scours a small patch of ground.
Harrow Note|debuff|6|1|1d3|3|spell|A dissonant cry makes bowstrings shudder.
`,
  );
  circle(
    "wizard",
    3,
    `
Fireball|damage|10|2|5d6|0|spell|A spark flowers into a round furnace at a chosen point.
Lightning Bolt|damage|9|1|4d6|0|breath|A thunderous branching stroke splits the ground.
Silver Quickstep|buff|5|1|1d3|3|-|Quickening bands of light circle friendly boots.
Drowsebell|disable|8|1|0d1|3|spell|A silent bell settles over its victims like deep snow.
Leaden Marrow|debuff|6|1|1d4|4|spell|Each limb becomes as heavy as a sack of shot.
`,
  );
  circle(
    "wizard",
    4,
    `
Ember Siphon|drain|5|0|4d6|0|spell|Steal a ribbon of living warmth to close your wounds.
Briar Cage|disable|7|1|0d1|4|spell|Black thorn canes spring closed around struggling foes.
Glass Monsoon|damage|8|2|5d6|0|breath|Silver droplets congeal into cutting hail.
Stonecoat|buff|4|0|1d5|6|-|Plates of slate turn aside blade and claw.
Ashen Brand|damage|9|0|6d6|0|spell|An old rune burns through cloth and armour.
`,
  );
  circle(
    "wizard",
    5,
    `
Frost Crucible|damage|6|2|7d6|0|breath|Air flows into a basin of killing cold.
Hollow String|debuff|8|2|1d5|4|spell|A web of ghostly strings pulls weapons off course.
Dusk Exchange|drain|6|0|6d6|0|spell|A thin thread carries a foe's strength to the caster.
Saffron Ward|buff|6|1|1d5|5|-|A bright ward turns blows aside in a ring of allies.
Iron Dream|disable|8|1|0d1|5|spell|An iron weight settles behind the eyes.
`,
  );
  circle(
    "wizard",
    6,
    `
Forked Tempest|damage|10|2|8d6|0|breath|Blue lightning leaps across a knot of enemies.
Winter Seal|disable|8|2|0d1|4|spell|A seal of frost catches foes in their own footprints.
Quicksilver Skin|buff|6|1|1d6|5|-|A quicksilver film follows each ally's stance.
Rust Moon|debuff|9|2|1d6|5|spell|A tarnished moon saps strength from every hostile blade.
Flint Funeral|damage|8|0|10d6|0|spell|A pillar of flint bursts into razor flakes.
`,
  );
  circle(
    "wizard",
    7,
    `
Night Furnace|damage|10|2|10d6|0|breath|A low black flame races across the battlefield.
Crown of Torpor|disable|9|2|0d1|5|spell|Pale crowns hold their bearers in a waking dream.
Borrowed Heart|drain|7|0|8d8|0|spell|A scarlet pulse returns from a wounded foe.
Ninefold Glass|buff|8|2|1d6|6|-|Nine panes of rippling glass shield the company.
`,
  );
  circle(
    "wizard",
    8,
    `
Starfall|damage|12|2|12d6|0|spell|A constellation of hot stones falls on the marked ground.
Amber Prison|disable|10|2|0d1|6|spell|Foes hang motionless in a shell of liquid amber.
Splintered Hour|debuff|10|2|1d8|6|spell|Time slips in the hands of those inside the circle.
Black Orchard|drain|7|1|9d6|0|spell|Roots drink the life of foes and feed their maker.
`,
  );
  circle(
    "wizard",
    9,
    `
Sundering Sky|damage|12|3|16d6|0|breath|A burning fault opens in the sky above the field.
Still Meridian|disable|12|2|0d1|7|spell|A fixed star arrests every foe beneath its gaze.
Everlasting Mail|buff|10|2|2d4|8|-|Layer after layer of radiant mail surrounds your allies.
Worldglass Lance|damage|14|0|18d6|0|spell|A single bright line pierces earth and steel.
`,
  );
  circle(
    "priest",
    1,
    `
Cure Light Wounds|heal|1|0|1d8|0|-|A steady hand closes small cuts and restores lost blood.
Bless|buff|4|1|1d2|5|-|A spoken blessing steadies nearby friends.
Cairn Spark|damage|5|0|1d6|0|spell|A spark from an unseen hearth strikes a foe.
Command|disable|3|0|0d1|1|spell|A word of authority arrests one foe.
Ash Mark|debuff|4|0|1d2|3|spell|A soot-dark sigil burdens one enemy.
`,
  );
  circle(
    "priest",
    2,
    `
Kindling Palm|heal|3|0|2d6|0|-|An amber light binds torn muscle and eases pain.
Hold Person|disable|6|0|0d1|3|spell|A solemn injunction stills a foe's hands and feet.
Salt Circle|turn|4|1|2d4|2|spell|Consecrated salt drives the restless dead away.
White Oath|buff|4|1|1d3|4|-|Friendly shields rise together at the oath.
Belfry Stone|damage|6|0|3d4|0|spell|A ringing stone strikes with the weight of a bell.
`,
  );
  circle(
    "priest",
    3,
    `
Cure Poison|cure|1|0|1d4|0|-|Draw fever and venom into a pinch of powdered chalk.
Lantern Prayer|heal|5|1|2d6|0|-|A warm glow stanches the wounds of gathered allies.
Grave Rebuke|turn|6|1|4d4|3|spell|Challenge the dead with the names carved on their graves.
Storm Psalm|damage|8|1|4d6|0|breath|A bright response to the psalm splits the earth.
Tether of Reed|debuff|6|1|1d4|3|spell|Living reeds snare hostile hands and feet.
`,
  );
  circle(
    "priest",
    4,
    `
Cure Serious Wounds|heal|2|0|3d8|0|-|Close a deep wound with a strand of sacred linen.
Pilgrim's Shield|buff|5|1|1d5|5|-|The company takes shelter in the space between two verses.
Mercy of Rain|cure|4|1|2d4|0|-|Cool rain loosens the grip of venom and paralysis.
Thorn Litany|damage|7|1|6d6|0|spell|A thorn fence erupts beneath the enemy's feet.
`,
  );
  circle(
    "priest",
    5,
    `
Cure Critical Wounds|heal|3|0|5d8|0|-|Golden sutures draw the edges of grievous wounds together.
Dawn Procession|turn|7|2|6d4|4|spell|A procession of lanterns shepherds the dead from the field.
Hammer of Tides|damage|8|2|6d6|0|breath|A wave of cold blue force rolls over its targets.
Hallowed Vow|buff|6|2|1d6|5|-|Companions speak an oath behind a wall of light.
`,
  );
  circle(
    "priest",
    6,
    `
Wellspring|heal|6|1|6d8|0|-|Clear water wells beneath the boots of wounded friends.
Quiet Chapel|disable|8|2|0d1|4|spell|The silence of an empty chapel holds the enemy fast.
Beacon of Flint|damage|9|1|9d6|0|spell|A column of white light splinters into flint.
Rite of Renewal|cure|6|2|4d6|0|-|A rising chord breaks hostile conditions and restores vigour.
`,
  );
  circle(
    "priest",
    7,
    `
Sovereign Mercy|heal|8|2|8d8|0|-|A whole company finds renewed strength in the closing verse.
Last Toll|turn|10|3|9d4|5|spell|A final peal opens a road home for the restless dead.
Sunlit Verdict|damage|10|2|12d6|0|spell|A searing disk settles upon the chosen ground.
Rootfast Covenant|buff|8|2|2d4|7|-|An ancient covenant steadies every ally under its boughs.
`,
  );

  const items = [];
  function add(name, type, level, price, stats, id = key(name)) {
    items.push(Object.assign({ id, name, type, level, price, bonus: 0, charges: 0 }, stats));
  }
  const tiers = ["", "Keen ", "Runeset ", "Starforged ", "Dawnsworn "];
  const tierLevels = [1, 4, 8, 13, 17];
  const weapons = [
    ["Dagger", 4, 1, 2],
    ["Longsword", 8, 1, 15],
    ["Shortbow", 6, 8, 30],
    ["Mace", 6, 1, 8],
    ["Staff", 6, 1, 2],
    ["Hand axe", 6, 1, 5],
    ["Battleaxe", 8, 1, 12],
    ["Spear", 6, 2, 4],
    ["Shortsword", 6, 1, 10],
    ["Warhammer", 6, 1, 9],
    ["Falchion", 8, 1, 18],
    ["Pike", 8, 2, 10],
    ["Flail", 8, 1, 14],
    ["Longbow", 8, 10, 60],
    ["Light crossbow", 6, 9, 35],
    ["Sling", 4, 6, 1],
    ["Morningstar", 8, 1, 10],
    ["Scythe", 8, 1, 6],
    ["Heavy crossbow", 10, 10, 50],
    ["Glaive", 10, 2, 18],
    ["Greatsword", 10, 1, 50],
    ["Throwing knife", 4, 4, 3],
    ["Hatchet", 4, 3, 4],
    ["Javelin", 6, 5, 4],
  ];
  for (const [base, sides, range, price] of weapons) {
    tiers.forEach((prefix, bonus) =>
      add(
        prefix + (bonus ? base.toLowerCase() : base),
        "weapon",
        tierLevels[bonus],
        price + 250 * bonus ** 2,
        { base: key(base), damage: [1, sides], range, bonus, missile: range > 2 },
      ),
    );
  }
  const armours = [
    ["Leather armour", 8, 5],
    ["Padded jack", 9, 3],
    ["Hide coat", 7, 15],
    ["Ring mail", 7, 30],
    ["Scale mail", 6, 45],
    ["Chain mail", 5, 75],
    ["Banded mail", 4, 150],
    ["Plate mail", 3, 400],
    ["Full plate", 1, 1400],
  ];
  for (const [base, ac, price] of armours) {
    tiers.forEach((prefix, bonus) =>
      add(
        prefix + (bonus ? base.toLowerCase() : base),
        "armour",
        tierLevels[bonus],
        price + 350 * bonus ** 2,
        { ac: ac - bonus, bonus },
      ),
    );
  }
  for (const spell of spells) {
    add("Scroll of " + spell.name, "scroll", Math.max(1, spell.level * 2 - 1), spell.level ** 2 * 30, {
      spell: spell.id,
      effect: spell.effect,
      charges: 1,
    });
  }
  function enchanted(type, records) {
    for (const row of records.trim().split("\n")) {
      const [name, spellId, level, charges, price] = row.trim().split("|");
      const spell = spells.find((s) => s.id === spellId);
      add(name, type, +level, +price, { spell: spellId, effect: spell.effect, charges: +charges });
    }
  }
  enchanted(
    "potion",
    `
Healing potion|cure_light_wounds|1|1|18
Copperwort tonic|copper_mantle|1|1|28
Bottle of sleep|sleep|2|1|35
Flask of cinders|cinder_fan|2|1|32
Clearwater cordial|cure_poison|3|1|60
Paleleaf tea|kindling_palm|3|1|60
Rime phial|glass_arrow|4|1|90
Sparkling nettle wine|silver_quickstep|5|1|100
Burnished balm|stonecoat|7|1|160
Pilgrim's bitters|cure_serious_wounds|7|1|180
Coalheart draught|ember_siphon|8|1|240
Elderberry elixir|cure_critical_wounds|9|1|320
Tincture of rain|mercy_of_rain|9|1|340
Ingot syrup|quicksilver_skin|12|1|700
Wellwater ampoule|wellspring|12|1|600
Saint's cordial|sovereign_mercy|15|1|1100
`,
  );
  enchanted(
    "wand",
    `
Cinder wand|cinder_fan|1|3|90
Glass spindle|glass_arrow|4|5|420
Spiral reed|woolbind|4|5|360
Rime switch|rime_needle|3|6|260
Forked hazel wand|lightning_bolt|6|4|730
Unlit firebrand|fireball|6|4|880
Slumber twig|drowsebell|6|5|660
Briar crook|briar_cage|8|4|960
Siphon rod|ember_siphon|9|4|1080
Snowbell wand|frost_crucible|10|4|1280
Moonsteel needle|rust_moon|12|5|1820
Tempest branch|forked_tempest|12|4|2100
Flintwood rod|flint_funeral|13|4|2250
Hollow sceptre|night_furnace|14|4|2500
Star wand|starfall|16|3|2900
Meridian rod|still_meridian|19|3|4000
`,
  );
  enchanted(
    "ring",
    `
Tinner's band|copper_mantle|1|4|110
Ring of the second face|mirror_veil|3|5|260
Reed knot|tether_of_reed|5|5|380
Pilgrim's ring|lantern_prayer|5|5|520
Silverstride band|silver_quickstep|6|5|680
Granite signet|stonecoat|7|5|700
Gatekeeper's band|pilgrim_s_shield|8|5|740
Saffron seal|saffron_ward|10|6|1360
Band of quicksilver|quicksilver_skin|12|6|1800
Ninefold ring|ninefold_glass|14|6|2280
Hourglass signet|splintered_hour|16|6|2800
Rootfast ring|rootfast_covenant|18|6|3460
`,
  );
  enchanted(
    "charm",
    `
Pocket lantern|cairn_spark|1|3|75
Ashwood token|ash_mark|1|4|105
Braided salt cord|salt_circle|3|4|260
Belfry clapper|belfry_stone|4|4|390
Ivory reedpipe|storm_psalm|5|4|490
Candle of quiet|grave_rebuke|6|4|540
Mercy's cup|mercy_of_rain|8|4|840
Twisted thorn|thorn_litany|8|4|920
Little dawn bell|dawn_procession|10|5|1200
Blue pewter fish|hammer_of_tides|11|5|1660
Cairn flint|beacon_of_flint|13|4|1980
Sunchain pendant|sunlit_verdict|17|5|2980
`,
  );
  function spellDetails(sp) {
    const roll = sp.dice.join("d");
    const duration = sp.duration + (sp.duration === 1 ? " round" : " rounds");
    const effects = {
      damage: "Deal " + roll + " damage.",
      drain: "Deal " + roll + " damage and restore that much HP to the caster.",
      heal: "Restore " + roll + " HP.",
      cure: "Restore " + roll + " HP and clear poison, lost turns, and attack penalties.",
      buff: "Grant +2 to attack rolls and +1 to weapon damage for " + duration + ".",
      debuff: "Reduce attack rolls by 2 for " + duration + ".",
      disable: "Cause targets to lose " + sp.duration + (sp.duration === 1 ? " turn." : " turns."),
      turn: "Drive affected undead from the battle.",
    };
    const friendly = ["heal", "buff", "cure"].includes(sp.effect);
    let effect = effects[sp.effect];
    let target = sp.radius
      ? (friendly ? "Allies" : "Foes") + " within " + sp.radius * 10 + " ft of the chosen square"
      : friendly ? "One ally, including yourself" : "One foe";
    if (sp.id === "magic_missile")
      effect = "Deal 1d4 + 1 damage multiplied by the number of missiles. Fire one at level 1 and one more every two levels, up to five.";
    if (sp.id === "stinking_cloud") {
      target = "All creatures in a 20-foot square";
      effect = "The cloud lasts " + duration + ". A failed initial save costs " + sp.duration +
        " turns. Creatures starting a turn in the cloud save again or lose that turn.";
    }
    const save = sp.save ? " Save vs. " + sp.save +
      (["damage", "drain"].includes(sp.effect) ? " for half damage." : " to resist.") : "";
    return effect + " " + target + ". Range " + sp.range * 10 + " ft." + save;
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  const spellById = new Map(spells.map((spell) => [spell.id, spell]));
  return { items, spells, spellDetails, item: (id) => itemById.get(id), spell: (id) => spellById.get(id) };
})();
