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
  for (const [id, slot] of [["sunchain_pendant","neck"], ["braided_salt_cord","waist"]]) {
    items.find(item => item.id === id).slot = slot;
  }
  const wearSlots = {
    head:"Head", eyes:"Eyes", neck:"Neck", back:"Shoulders", wrists:"Wrists", hands:"Hands",
    waist:"Waist", legs:"Legs", feet:"Feet", offhand:"Shield hand", leftRing:"Left ring", rightRing:"Right ring",
  };
  function slotsFor(it) {
    if (it?.type === "ring") return ["leftRing","rightRing"];
    return it?.slot ? [it.slot] : [];
  }

  // Each entry has its own power budget and history; activated relics recover at rest.
  function relics(slot, records) {
    for (const line of records.trim().split("\n")) {
      const [name, level, price, powers, lore, spell] = line.split("|");
      const traits = {};
      for (const entry of powers.split(",").filter(Boolean)) {
        const [trait, value] = entry.split("=");
        traits[trait] = Number(value);
      }
      add(name, slot === "ring" ? "ring" : "wearable", +level, +price,
        {slot, traits, lore, ...(spell ? {spell, charges:1, rechargeable:true} : {})});
    }
  }
  relics("head", `
Bellfounder's Cap|1|65|initiative=1|The copper lining ticks once before a blade clears its sheath.
Crown of the Last Watch|8|1250|undead=2|Six iron candles burn cold when the dead draw near.
Cinder Judge's Coif|5|610|breath=3|Its scales overlap like the shutters of a kiln.
Thorn Regent's Antlers|13|2300|spellSave=2|A green shoot grows from the crown whenever its wearer forgives a debt.|briar_cage
Helm of the Borrowed Morning|18|4100|initiative=3|There is always a sliver of dawn inside the visor.|dawn_procession`);
  relics("eyes", `
Mason's Seamglass|1|60|search=12|Through its chipped lens, fresh mortar shines blue.
Goggles of the Bowyer's Moth|4|470|aim=1|Two amber wings tilt toward a distant mark.
Salt Widow's Veil|7|860|poisonSave=3|Black salt beads roll across the mesh toward tainted air.
Lens of the Hollow Star|12|1850|search=20,aim=1|Its missing center holds the image after the glass is covered.
Spectacles of the Nine Witnesses|16|3200|spellSave=3|Each lens remembers a different sky.|ninefold_glass`);
  relics("neck", `
Taster's Ivory Tooth|1|85|poisonSave=2|The tooth chatters against its brass cup over poisoned wine.
Locksmith's Last Key|4|440|locks=15|Its ward fits no door, but the chain tugs toward the troublesome pin.
Ferryman's Return Fare|12|1800|drainWard=1|A drilled black coin bears the wearer's face on both sides.
Locket of the Third Sister|8|1050|restHeal=2|Inside, a miniature sister changes the bandages of a painted soldier.|cure_serious_wounds
Pearl of the Sealed Lung|15|2700|gasWard=1,breath=2|A silver bubble travels around the pearl without ever bursting.`);
  relics("back", `
Ratcatcher's Raincape|1|70|stealth=10|Its oiled hem slides over rubble without lifting a pebble.
Mantle of the Door Left Ajar|5|720|guard=1|Its brass clasp shuts a moment before a blow lands.
Shroud of the Empty Chair|9|1450|undead=2,spellSave=1|Embroidered mourners turn their backs on the wearer.
Cloak of the Shuttle Bird|13|2050|stride=25|A woven bird crosses from shoulder to shoulder with every stride.
Banner of the Lost Company|19|4200|guard=2|The stitched muster roll has room for one more name.|rootfast_covenant`);
  relics("wrists", `
Potter's Kiln Cuffs|2|175|bracerAC=7|Clay bracelets harden just before impact.
Bracers of the Spun Gate|6|805|bracerAC=5|Hair-fine bronze wires weave a gate across the chest.
Reed Archer's Wrappings|3|280|aim=1,initiative=1|Each knot marks a crossing of the marsh archery course.
Armlets of the Glass Citadel|14|2500|bracerAC=3|Tiny sentries pace the transparent battlements.
Widowbell Manacles|11|1490|freeAction=1|A broken length of chain rattles when unseen hands try to bind its wearer.`);
  relics("hands", `
Gloves of the Sixth Pin|2|220|locks=20|An extra stitched fingertip feels the last tumbler drop.
Sapper's Chalk Mitts|4|420|disarm=20|Chalk seeps from the seams to mark the wire under tension.
Millstone Knuckles|6|790|force=2|The stone pads smell of flour after a solid hit.
Fletcher's Split Glove|9|1180|aim=2|A silver notch remembers the flight of the last arrow.
Hands of the Hearth-Saint|15|2450|restHeal=3|The palms stay warm long after the campfire dies.|mercy_of_rain`);
  relics("waist", `
Cord of the Tenth Mile|2|185|stride=15|Its tenth knot slips loose every morning.
Gate Porter's Kidney Belt|4|455|force=1,breath=1|The brass plate bears dents from a hundred falling gates.
Girdle of the Sleeping Ox|9|1350|force=3|The leather rises and falls like a sleeping flank.
Gallows Rope of Grey Fen|12|1920|freeAction=1,poisonSave=2|Nine slipknots come loose at the slightest touch.
Saint Vara's Red Sash|17|3450|restHeal=4,guard=1|Names of recovered patients appear along its hem.`);
  relics("legs", `
Greaves of the Low Road|1|85|trapGuard=1|Their overlapping plates bear the teeth marks of spring traps.
Reed Dancer's Legwraps|4|415|initiative=1,stride=10|Slender reeds bend away before the first step.
Quarryman's Split Greaves|7|820|trapGuard=3|A split down each shin catches falling stone and parts it.
Hose of the Ash Harrier|11|1540|stride=25,breath=2|The red wool leaves a bird's tracks in soot.
Marchwarden's Silver Knees|16|2820|guard=1,freeAction=1|Each knee bears a different half of a broken seal.`);
  relics("feet", `
Soles of the Mouse King|2|180|stealth=15|The cobbler stamped a tiny crown beneath each heel.
Fordrunner's Sandals|4|475|stride=25|Blue cords cinch themselves at the sound of running water.
Coalwalker's Clogs|6|705|trapGuard=2,breath=2|Red embers cool to black beneath the wooden soles.
Boots of the Unfinished Errand|10|1400|stride=40|The left boot keeps tapping whenever its wearer stops.
Graveyard Snowshoes|14|2320|drainWard=1,stealth=10|Even in fresh snow they leave no trail toward the grave.`);
  relics("offhand", `
Applewood Buckler|1|95|shield=1|An apple pip rolls beneath the boss whenever a blow draws near.
Hearthdoor Targe|4|460|shield=1,breath=2|A piece of an old oven door still swings on its hinge.
Lantern Porter's Shield|8|1060|shield=2,search=10|Light from the covered boss falls into cracks in the stone.
Oathbreaker's Mirror|13|2480|shield=2,spellSave=2|The polished face reflects a broken promise instead of a face.
The Last Ferry Door|18|3900|shield=3,drainWard=1|A single oarlock remains on the iron rim.`);
  relics("ring", `
Gutter King's Seal|2|200|locks=10,stealth=5|A sewer grate serves as the royal device.
Ring of the Waking Hound|5|540|initiative=2|The chased hound stands up before danger arrives.
Ring of the Empty Scabbard|7|840|guard=1,spellSave=1|A hairline crack circles the band like a sword cut.
Widower's Greenstone|10|1470|poisonWard=1|A green inclusion darkens as venom touches the skin.
Ring of the Unbroken Dance|14|2250|freeAction=1,stride=15|Two dancers clasp hands even when the band is cut.
Signet of the Open Tomb|19|3850|undead=3,drainWard=1|The stone is engraved on the inside, against the living finger.`);

  for (const [name, level, price, ac, traits, lore] of [
    ["Inkkeeper's Smock", 1, 80, 9, {search:8}, "Spilled ink creeps toward a concealed seam."],
    ["Robe of the Patient Spider", 5, 670, 8, {initiative:1, stealth:10}, "A spider works the same unfinished hem every night."],
    ["Ash Reader's Habit", 9, 1300, 7, {breath:3}, "Words appear in the soot where a flame has touched the cloth."],
    ["Surgeon's White Apron", 12, 1860, 7, {restHeal:4, poisonSave:2}, "The linen washes itself clean in the first light of morning."],
    ["Vestment of the Shut Eye", 18, 3900, 5, {spellSave:3, drainWard:1}, "A thousand eyelids close when a hungry spirit draws near."],
  ]) add(name, "armour", level, price, {robe:true, ac, traits, lore});

  const traitText = {
    initiative:n => "+" + n + " initiative", undead:n => "+" + n + " weapon damage against undead",
    breath:n => "+" + n + " breath saves", spellSave:n => "+" + n + " spell saves",
    poisonSave:n => "+" + n + " poison/death saves", search:n => "+" + n + " percentage points to party secret-door searches",
    aim:n => "+" + n + " missile attacks", locks:n => "+" + n + " points to Open locks",
    disarm:n => "+" + n + " points to Remove traps", stealth:n => "+" + n + " points to Move silently and Hide",
    guard:n => "improves AC by " + n, shield:n => "improves AC by " + n + " with a one-handed weapon",
    bracerAC:n => "base AC " + n + " while unarmoured", force:n => "+" + n + " melee damage",
    stride:n => "+" + n + "% base combat movement", restHeal:n => "+" + n + " HP per rest",
    trapGuard:n => "reduces trap damage by " + n, gasWard:() => "immunity to gas traps and stinking clouds",
    drainWard:() => "prevents level drain", freeAction:() => "prevents lost turns from paralysis and disabling spells",
    poisonWard:() => "prevents ongoing poison damage",
  };
  function wornDetails(it) {
    return Object.entries(it.traits || {}).map(([trait, value]) => traitText[trait](value)).join(" · ");
  }
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
  return { items, spells, spellDetails, wearSlots, slotsFor, wornDetails, item: (id) => itemById.get(id), spell: (id) => spellById.get(id) };
})();
