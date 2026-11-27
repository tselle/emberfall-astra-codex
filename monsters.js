// The field guide's observations are also used as encounter clues in the journal.
var Monsters = (() => {
  "use strict";
  const list = [];
  const traits = {
    p: "poison",
    f: "paralysis",
    d: "drain",
    r: "regeneration",
    b: "breath",
    a: "ambush",
    m: "missile",
    s: "spell",
    t: "trample",
    c: "constrict",
    v: "flight",
    w: "web",
    i: "invisible",
    h: "fireproof",
    k: "coldproof",
    l: "lightningproof",
    g: "grab",
    u: "burrow",
    e: "petrify",
    o: "corrosion",
  };
  // Visual profiles describe existing attacks; they don't grant new combat abilities.
  const familyStrike = {
    "Burrow beast":"bite", "Woodland beast":"bite", "Stalking beast":"claw", "Winged beast":"peck",
    "Great herbivore":"ram", Crawler:"bite", "Silk hunter":"bite", "Scaled beast":"bite",
    "Water hunter":"bite", "Ancient saurian":"bite", "Company fighter":"weapon", "Giant kin":"slam",
    "Restless dead":"touch", "Enchanted beast":"bite", "Deep dweller":"bite", "Dragon kin":"bite",
    Spirit:"touch", "Fey and woodkin":"touch", Shapeshifter:"claw", Construct:"slam",
  };
  function strikeStyle(kind, name, traits) {
    if (traits.includes("missile")) {
      if (/porcupine|manticore/i.test(name)) return "quill";
      if (/cobra/i.test(name)) return "spit";
      if (/lantern eye/i.test(name)) return "ray";
      if (kind === "Giant kin" || /treant|hill reaver/i.test(name)) return "stone";
      return "arrow";
    }
    if (kind === "Company fighter") return name === "War Toad" ? "bite" : "weapon";
    if (/octopus|squid|kraken|vine|trapper|python|constrictor|sea serpent/i.test(name) && kind !== "Company fighter") return "coil";
    if (/scorpion|wasp|hornet|bee\b|stingray|wyvern|mosquito/i.test(name)) return "sting";
    if (/badger|wolverine|bear$|lynx|tiger|displacer cat|griff|harpy|hook horror|crab|crayfish|troll|ghoul|ghast|sickleclaw|hag$/i.test(name)) return "claw";
    if (/bat\b|wererat|werewolf|werejackal|hippopotamus|war toad/i.test(name)) return "bite";
    if (/horse|mule|pegasus|nightmare/i.test(name)) return "kick";
    if (/stag beetle/i.test(name)) return "bite";
    if (/boar|warthog|stag\b|elk|moose|ram\b|goat|bison|aurochs|threehorn|gorgon|unicorn|minotaur|swordfish|narwhal/i.test(name)) return "ram";
    if (/ape\b|gorilla|clubtail|longneck|mimic|ooze|jelly|pudding|cube|slime|mound|bone colossus/i.test(name)) return "slam";
    if (/skeleton|death knight|barrow rider|iron king|animated armour/i.test(name)) return "weapon";
    return familyStrike[kind];
  }
  // Encounter reasoning, separate from hit dice and combat strength.
  function intellect(kind, name) {
    if (/^(Skeleton|Zombie|Bone Colossus|Grave Lantern|Shambling Mound|Strangling Vine)$/i.test(name) ||
        kind === "Construct" || /Mold|Slime|Pudding|Ooze|Jelly|Gelatinous Cube|Shrieking Cap/.test(name)) return "mindless";
    if (["Company fighter", "Giant kin", "Fey and woodkin", "Shapeshifter"].includes(kind) && name !== "War Toad" ||
        kind === "Dragon kin" && /Dragon|Wyrm/.test(name) && name !== "Dragon Turtle" ||
        kind === "Restless dead" && !/Ghoul|Shadow/.test(name) ||
        kind === "Spirit" && !/Hound|Nightmare/.test(name) ||
        /Sphinx|Centaur|Satyr|Medusa|Naga|Siren|Minotaur|Harpy|Lamia|Lamassu|Lantern Eye/.test(name)) return "reasoning";
    return "instinctive";
  }
  function breathColor(name) {
    if (/winter|rime|white dragon|silver dragon|ice fiend/i.test(name)) return "#bdefff";
    if (/electric|storm|blue dragon|bronze dragon/i.test(name)) return "#98bbff";
    if (/black dragon|copper dragon|slug|green dragon|millipede|fungus|troglodyte|ghast|iron golem/i.test(name)) return "#b5d56f";
    if (/steam|dragon turtle|marid|kraken|mirror|bell|banshee|shrieking|gorgon/i.test(name)) return "#c6cfdb";
    return "#ff9856";
  }
  // The optional fields after the description are lair treasure, individual treasure, and mean number appearing.
  // Multiple types roll independently; Q*5 means five checks on table Q.
  function treasureTypes(spec) {
    if (spec === "-") return [];
    return spec.split(" ").flatMap(token => {
      const [type, count = 1] = token.split("*");
      return Array(Number(count)).fill(type);
    });
  }
  function family(kind, defaultLair, shell, courage, records) {
    for (const row of records.trim().split("\n")) {
      const [name, rank, flags, note, lair = defaultLair, carried = "-", mean = 1] = row.trim().split("|");
      const id = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const hd = +rank;
      const level = Math.max(1, Math.round(hd));
      const special = [...flags].map((c) => traits[c]).filter(Boolean);
      const undead = +(flags.match(/U(\d+)/) || [0, 0])[1];
      const resistance = +(flags.match(/R(\d+)/) || [0, 0])[1];
      const hp = Math.max(1, Math.round(hd * 4.5));
      const ac = Math.max(-10, 10 - shell - Math.floor(hd * 0.56));
      const count = hd < 4 ? 1 : hd < 10 ? 2 : hd < 16 ? 3 : 4;
      list.push({
        id,
        name,
        kind,
        level,
        hd,
        hp,
        ac,
        thac0: Math.max(1, 21 - Math.ceil(hd)),
        damage: [count, hd < 1 ? 3 : hd < 2 ? 4 : hd > 12 ? 8 : 6],
        xp: Math.max(5, Math.round(14 * hd ** 1.78 + special.length * hd * 12 + resistance * hd * 12)),
        morale: Math.min(20, courage + Math.floor(hd / 4)),
        lairTreasure: treasureTypes(lair),
        meanAppearing: Number(mean),
        carriedTreasure: treasureTypes(carried),
        special,
        resistance,
        undead,
        intellect: intellect(kind, name),
        strikeStyle: strikeStyle(kind, name, special),
        breathColor: special.includes("breath") ? breathColor(name) : null,
        description: note,
      });
    }
  }

  family(
    "Burrow beast",
    "-",
    2,
    7,
    `
Cellar Rat|0.35||One chewed bung can sour a whole season's ale. Its incisors leave twin grooves in the oak.
Giant Rat|0.5|a|Its nest is a woven raft that rises with the sewer water.|C|-|27.5
Badger|1|u|Long front claws strip earth from its burrow in neat scoops.
Giant Badger|3|u|Sleepers sometimes wake to whole fence posts rolling into its galleries.
Weasel|0.5|g|A blood-dark chin gives away a weasel fresh from the henhouse.
Giant Weasel|3|g|It holds its bite even when lifted clean off the earth.
Wolverine|3||Fur sticks up like brush around the wounds of this solitary scavenger.
Giant Wolverine|5||It will pull doors from their hinges to reach a winter larder.
Hedgehog Boar|4|t|Each stiff quill has a little hook that catches at passing cloth.
Giant Shrew|1|p|Its narrow muzzle shakes constantly as it hunts through the leaf litter.
Giant Porcupine|5|m|Quills stand in a bristling fan above its blunt brown snout.
Rock Mole|2|u|A mound of powdered limestone often marks its blind upward charge.
Thornwick Broodmother|2|a|In the grain vault she has braided scraps of every Thornwick banner into her litter's nest.
`,
  );
  family(
    "Woodland beast",
    "-",
    3,
    9,
    `
Wolf|2||The pack leaves a single long line of prints as each wolf steps in another's track.
Dire Wolf|4||Grey shoulders rise higher than a saddle, and the pack runs in silence.
Winter Wolf|6|bk|Frost collects on the whiskers just before its breath spills out.|I|-|5
Hound|1||A leather collar still circles its neck beneath the bristling fur.
Wild Dog|1||The leader feints while its littermates circle behind.
War Hound|2||It goes straight for the shield arm it learned to bite in the kennel.
Warg|4||It herds panicked quarry towards its waiting kin.
Hyena|2||Pale chips of crushed bone show where the clan has fed.
Giant Hyena|5||A hunched back hides tremendous strength in its jaws.
Fox|0.5|a|A rust-red tail vanishes in the hollow before the brush stops moving.
Jackal|1||One animal calls while another investigates the baggage.
Black Bear|3||It rocks back on broad paws before delivering a sweeping blow.
Brown Bear|6|g|Long fur hides the reach of its forelegs.
Cave Bear|8|g|Old paw marks stripe the walls higher than a tall person can reach.
Ice Bear|8|gk|Only a wet black nose breaks the white of a snow bank.
Boar|3|t|It lowers one tusk like a ploughshare on the charge.
Giant Boar|6|t|Farmers plant stone posts to turn its charge from their orchards.
Warthog|3|t|Yellow tusks twist almost to its eyes.
Stag|3|t|Its hooves leave little black crescents where they cut the turf.
Great Elk|5|t|A line of stripped bark reveals the sweep of its enormous antlers.
Moose|5|t|The dewlap brushes the water before its hooves lift from the marsh.
Ram|2|t|Its curled horns ring against stone on the mountain path.
Mountain Goat|2|t|It gains speed on scree that slides beneath an adventurer's boots.
Bison|5|t|The herd's breath hangs over the trail like a low storm cloud.
Aurochs|6|t|The white points of its horns seem to float ahead of its dark head.
Wild Horse|2|t|Dust stirs before the herd crests the ridge.
Draft Horse|3|t|The rust of an old harness has marked its shoulders.
Mule|2||It pins its ears and turns its hindquarters toward trouble.
`,
  );
  family(
    "Stalking beast",
    "-",
    3,
    10,
    `
Lynx|2|a|Slender ear tufts are often the only warning in deep grass.
Giant Lynx|4|a|It buries its kill in snow and waits nearby for thieves.
Leopard|3|a|It wedges its meals in high forks beyond the reach of wolves.
Panther|4|a|In lantern light two green eyes seem to hang above the branch.
Lion|5||The lioness tests the herd while her sisters wait beside its escape path.
Cave Lion|7|a|A thick buff pelt blends into the limestone of its lair.
Tiger|6|a|Reeds close silently behind the great striped shoulders.
Sabre Cat|8|a|Two long ivory teeth leave holes a handspan apart.
Cheetah|3||The slightest break in a running herd draws its attention.
Baboon|1||A flash of pale gums warns intruders away from its troop.
Ape|4|g|It beats a hollow trunk to call its family before charging.
Great White Ape|5|g|Its colourless fur takes on the stain of its red clay den.
Cave Gorilla|7|g|Its heavy footfalls can be felt through a cavern floor.
`,
  );
  family(
    "Winged beast",
    "-",
    3,
    8,
    `
Bat|0.25|v|Wings as thin as parchment rustle under the eaves.
Giant Bat|2|v|This cave flier can turn between threads of hanging moss.
Vampire Bat|1|vd|Its tongue finds the bare patch between greave and boot.
Raven|0.5|v|It tucks cast-off buckles into a nest lined with black wool.
Giant Raven|3|v|Whole shield rims reinforce its stick nest.
Hawk|1|v|A tight circling shadow marks its patrol.
Giant Hawk|3|v|Long pinions skim the heath before the talons close.
Eagle|2|v|Pale flight feathers flash as it tips into a dive.
Giant Eagle|5|vg|It uses a high ledge as an anvil for hard-shelled prey.
Owl|1|va|Its first wingbeat scarcely stirs the leaves.
Giant Owl|4|va|One grey wing could shade a wagon from the sun.|Q*5 X|-|3.5
Vulture|1|v|Its bare neck turns to follow anything that limps.
Giant Vulture|4|v|Caravans throw scraps far from the wagons to draw it off.
Condor|3|v|It rides the warm air rolling up the cliff face.
Roc|14|vg|The wind under one wing flattens long strips of barley.|C|-|1.5
`,
  );
  family(
    "Great herbivore",
    "-",
    4,
    11,
    `
Elephant|10|t|Its trunk tests the ground before the broad feet commit.
Mammoth|13|t|Snow falls in sheets from its tangled winter fleece.
Mastodon|12|t|Its tusks sweep low enough to overturn a cart.
Rhino|8|t|A single deep furrow marks where its horn caught a fallen log.
Woolly Rhino|9|tk|Ice gathers along its woolly cheek plates.
Hippopotamus|8|g|Two low ears break the water at the ford.
Camel|3||It draws back a long neck before striking with flat yellow teeth.
Giraffe|5||Its kick reaches further than the sweep of a spear.
`,
  );
  family(
    "Crawler",
    "-",
    4,
    8,
    `
Giant Ant|2|g|Its feet beat six parallel tracks into the loam.|Q*3 S|-|50.5
Soldier Ant|3|p|A broad coppery head shields the nest entrance.
Ant Queen|6||Her pale abdomen fills most of the central chamber.
Giant Bee|1|pv|A golden dusting of pollen clings to its shaggy thorax.
Giant Wasp|4|pv|It packs its paper nest with still-living prey.|Q*20|-|10.5
Hornet Swarm|3|pv|The hum climbs by an octave when their nest is disturbed.
Giant Centipede|0.5|p|Amber legs ripple in the seam under the door.
Giant Millipede|2|b|When pressed it exudes a bitter cloud around its coils.
Giant Scorpion|5|pg|Its claws hold the prey steady beneath the poised sting.|D|-|2.5
Cave Scorpion|3|pa|Nearly clear pincers reach from a crack in the chalk.
Fire Beetle|1||Two glowing patches stripe its head like a lamp maker's mark.
Bombardier Beetle|2|b|Its paired wing cases click just before the jet of hot vapour.
Stag Beetle|7|g|The branching mandibles can lift a mounted scout.
Boring Beetle|5|u|A shower of dry dust hints at hollow timber overhead.
Dung Beetle|2|t|Its iron-hard brow pushes aside stones on the barrow path.
Rhinoceros Beetle|8|t|Its horn catches the rims of overturned shields.
Water Beetle|3|a|A trapped bubble glitters beneath its wing cases.
Giant Dragonfly|4|v|Its four clear wings can hold it motionless over the fen.
Giant Fly|2|v|Iridescent eyes watch several doors at once.
Giant Mosquito|1|dv|Its long legs hang like fishing lines above the reeds.
Giant Mantis|6|ag|The bent upper limbs resemble leaf stems until they unfold.
Giant Tick|3|d|What looks like a buried pebble swells as it feeds.
Giant Leech|2|d|A ringed body tightens under the mud of the riverbank.
Rot Grub|0.5|a|The pale lump under a discarded glove writhes at a touch.
Cave Cricket|1||Its sudden rattling call can fill an entire underground gallery.
`,
  );
  family(
    "Silk hunter",
    "-",
    3,
    9,
    `
Large Spider|1|pw|Its web catches soot above forgotten hearths.
Giant Spider|4|pwa|Webbed bundles mark the height of the last traveller to pass.
Wolf Spider|2|pa|It peers from beneath a little lid of moss and grit.
Phase Spider|5|ip|Its legs wink out of sight a moment before the rest of it.
Trapdoor Spider|4|pag|One neat circle in the path opens on a silk hinge.
Glass Spider|6|pw|Light slides through its legs and pools in eight sharp points.
Thread Widow|7|pwa|Taut threads join the web to every entry in the gallery.
`,
  );
  family(
    "Scaled beast",
    "-",
    4,
    10,
    `
Adder|0.5|p|A diamond head rises from a coil no wider than a cup.
Asp|1|p|It stays in the patch of stone most recently warmed by the sun.
Cobra|2|p|Its hood bears a pale double crescent.
Spitting Cobra|3|pm|It aims a bead of venom at the moving glint of an eye.
Viper|1|pa|A row of dark zigzags vanishes against the leaf mould.
Python|4|c|Slow ripples in a fallen log betray a muscular coil.
Giant Constrictor|6|c|It anchors its tail around a tree before tightening its grip.
Sea Serpent|11|c|Ships often mistake the first three coils for separate animals.
Crocodile|3|ag|Its snout leaves a thin V in water still enough to mirror the sky.
Giant Crocodile|7|ag|Little birds rest on the ridges of its armoured back.
Alligator|4|ag|A floating mat of sedge hides its eyes at the edge of the ford.
Cave Lizard|3|a|Its padded toes hold upside down on damp stone.
Monitor Lizard|3||A forked tongue sweeps the trail left by wounded game.
Fire Lizard|8|bh|Heat glows along the yellow seams of its neck.
Horned Lizard|5||A crown of stone-coloured spikes breaks the outline of its skull.
Giant Toad|2|g|A sudden pink tongue plucks things off the bank.
Fire Toad|4|bh|A red pouch under its chin smoulders with each croak.
Giant Frog|2|g|Eyes rise in unison among the mooring ropes.
Giant Turtle|5||Rushes have taken root in cracks between its shell plates.
Snapping Turtle|3|ag|It waits at the ford with a little pink lure on its tongue.
`,
  );
  family(
    "Water hunter",
    "-",
    3,
    10,
    `
Shark|4||A fin cuts imperfect circles around the leaking boat.
Great White Shark|8||A white flash beneath the hull precedes a tremendous impact.
Giant Shark|14||Fishermen count shipwrecks by the old harpoons lodged in its hide.
Swordfish|4|t|The long bill carves a bright slash in the shoal.
Barracuda|3||Its narrow jaw holds two uneven rows of teeth.
Pike|2|a|It waits motionless where a cold stream joins the marsh.
Giant Gar|6||Diamond scales deflect stones thrown into the shallows.
Piranha Shoal|3||The school changes direction with the precision of a single fish.
Electric Eel|4|bl|A prickle on wet skin comes before the jolt.
Giant Eel|5|c|It inhabits submerged chimneys along the drowned road.
Moray|2|ag|The dark hole in the coral opens on a double set of jaws.
Stingray|2|pa|A ripple of sand uncovers the spine on its tail.
Manta Ray|5||It rises from the sea like a black cloak shaken out.
Giant Crab|3|g|Its gait pulls deep comb marks through the tidal flats.
Giant Crayfish|4|g|A red claw reaches through the sluice gate at dusk.
Giant Octopus|8|c|Its suckers leave rings in wet silt up the harbour wall.|R|-|2
Giant Squid|10|cg|A length of white arm glides across the moonlit deck.|A
Kraken|20|cgb|It has learned to loosen anchor chains before it takes a ship.
Killer Whale|9||Its white flank rolls upward as it turns under the ice.
Sperm Whale|15|t|The water draws down around its head as it surfaces.
Narwhal|5|t|The spiral tusk scratches channels into thick blue ice.
`,
  );
  family(
    "Ancient saurian",
    "-",
    5,
    12,
    `
Plateback|9|t|Tall plates flush from ochre to crimson when it turns to fight.
Threehorn|12|t|Its frilled skull shields a calf from the whole horizon.
Longneck|16|t|A row of longneck prints can become a chain of ponds.
Thunderjaw|16|g|Its teeth regrow in a jagged fence behind the front row.
Sickleclaw|4|a|A single claw on each foot never quite touches the ground.
Crested Fisher|10|g|Its tall sail reflects in the water above a crocodilian muzzle.
Clubtail|10|t|Flint splinters show where its tail has struck the rocks.
Sky Sail|5|v|A long bony crest balances its beak as it skims the water.
Reef Paddler|8|g|Four long paddles churn a crescent of white foam.
Wingjaw|3|va|It drops from the cliff on narrow folded wings.
`,
  );
  family(
    "Company fighter",
    "C",
    4,
    9,
    `
Goblin|0.75||Small brass bells sewn into the captain's sash direct the troop.|C|K|220
Kobold|0.5|a|It taps the flagstones with a stick before each backward step.|O Q*5|J|220
Orc|1||The scarred lip of its shield serves as a striking edge.|C O Q*10 S|L|165
Hobgoblin|2||A square of red cord on each shoulder marks its place in the rank.|D Q*5|J M|110
Bugbear|3|a|Soft moss pads cover the buckles on its harness.|B|J K L M|21
Gnoll|2||It fastens trophies to its spear with bright strips of leather.|D Q*5 S|L M|110
Ogre|4||A millstone serves as the counterweight on its enormous club.|Q B S|M*10|11
Ogre Magus|6|isr|It inks new charms across the backs of its broad hands.
Bandit|1|m|A cheap scarf hides the face beneath a traveller's ordinary cap.|A|M|110
Brigand|2|m|Its leather coat is patched with strips from captured belts.|A|M|110
Marauder|3||A row of old toll coins rattles from the blade hilt.|A|M|110
Outlaw Bowman|3|m|A notched tree marks the range of the outlaw's favourite shot.|A|M|110
Pirate|2||Tar on the soles gives it a sure footing on wet boards.|W|K|175
Corsair|4|m|A scrap of captured sailcloth wraps the sword hand.|W|K|175
Berserker|3||Its shield bears fresh tooth marks along the rim.|B|K|55
Mercenary|3||Each buckle is oiled, every seam repaired in a different colour.|C|M
Nomad Scout|2|m|The arrows in its case have blunt heads for tracking and barbs for battle.|Z|L
Cave Hunter|2|a|Chalk outlines on the wall show where it practises its spear cast.
Lizardfolk|2||A fish-bone comb keeps the crest clear of the spear strap.|D
Marsh Troglodyte|3|ba|The bitter scent of crushed garlic precedes its hunting party.|A
Deep Fisher|3|g|Its weighted net can wrap a traveller from boot to shoulder.
War Toad|4|g|A horn of hollow reed summons its kin across the fen.
Mire Raider|4|a|Its woven reed sandals leave a heron's track.
Hill Reaver|5|m|A slingstone is knotted into each loop of the raider's belt.
Goblin Sapper|2|m|It tests every lintel for space to tuck a powder pot.|C|K|220
Kobold Trapper|1|a|It always leaves exactly one passage free of footprints.|O Q*5|J|220
Orc Standard Bearer|3||A bronze hook on the banner pole catches an enemy's shield.|C O Q*10 S|L|165
Gnoll Bonecaller|4|s|Its rattle is tuned to the notes of six different birds.|D Q*5 S|L M|110
Hobgoblin Marshal|5||Two fingers against its shield are enough to order a retreat.|D Q*5|J M|110
Dwarf Exile|3||Its battle harness still bears the filed outline of a clan badge.|G Q*20 R|M*5|220
Elf Waylayer|4|am|A bowstring dyed green vanishes against the tree line.|G S T|N|110
Gnome Delver|2|a|It wears a smoky lens on the side facing its lantern.|C Q*20|M*3
Halfling Footpad|1|a|The left boot sole is stitched on backwards to muddle pursuit.|B|K|165
Half-Elf Duelist|4||Its narrow sword has a thumb ring worn bright from practice.
Human Hedge Mage|4|s|Waxed packets of powdered seeds hang from its collar.|C|M
Human Hex Priest|5|s|The knots in its staff are darkened by burnt offerings.|C|M
Iron Captain|7||It checks the distance between its soldiers with its spear haft.|C|M
`,
  );
  family(
    "Giant kin",
    "D",
    4,
    13,
    `
Ettin|10||One head watches the trail while the other searches the treetops.|C Y|O|2.5
Cyclops|12|m|Each throwing stone has been rounded by patient hands.
Hill Giant|8|m|It uses a pine trunk worn smooth at the roots as a walking stick.
Stone Giant|9|m|Rough seams under the eyes make it look carved from granite.|D|-|4.5
Frost Giant|10|mk|White hair is bound into the steel rings of its armour.|E|-|4.5
Fire Giant|11|mh|It claps slag from its boots before crossing a wooden floor.|E|-|4.5
Cloud Giant|12|ms|A deep scent of rain follows it down from its high hall.|E Q*5|-|3.5
Storm Giant|15|bl|The metal of its belt hums when the clouds gather.|E Q*10 S|-|2.5
Titan|20|ms|Its sandals carry dust from peaks untouched by any road.|E Q*10 R
Troll|6|r|A fresh cut seals behind the edge of the blade that made it.|D|-|6.5
Marsh Troll|6|ra|Mud hides the pale seams where old wounds have grown back.
Stone Troll|8|r|Pebbles stick in its thick skin and travel there for years.
Two-Hearted Troll|10|r|Two pulses beat out of time beneath its long throat.
Ash Giant|14|bh|Its huge palms leave warm grey prints on the valley walls.
`,
  );
  family(
    "Restless dead",
    "B",
    4,
    18,
    `
Skeleton|1|U1|One loose knucklebone rattles as the empty hand closes.|-
Zombie|2|U2|Its head lags behind each slow turn of the shoulders.|-
Ghoul|2|fU3|The long nails are worn smooth from lifting grave slabs.|B T|-|13
Shadow|3|dU4R1|It travels along a wall even after the lantern is put out.|F|-|11
Wight|4|dU5R1|Grass withers under the nails of its armoured gloves.|B|-|9
Ghast|4|fbU4|A wet-earth stench clings to the edges of its robe.|B Q R S T|-|3.5
Wraith|5|dvU6R1|It moves as a crease in the air above its burial cloth.|E|-|7
Mummy|6|fU7R1|Old resin cracks between the folds of its winding sheet.|D|-|5
Spectre|7|dvU8R1|The face appears only in the reflection on a blade.|Q*3 X Y|-|3.5
Vampire|8|drvU9R1|It smooths the dust beside its coffin before rising.|F|-|2.5
Ghost|10|ifU10R2|It pauses at every vanished doorway of its old home.|E S
Lich|14|sfU12R2|A small brass lock hangs over the hollow of its chest.|A
Death Knight|12|bsU11R2|The visor opens on the desperate sound of a distant horn.
Barrow Rider|6|dU6|Its horse leaves two sets of hoofprints and casts no shadow.
Banshee|7|bU8R1|First the birds fall silent, then the reeds bend to a breathless cry.
Grave Lantern|4|dvU5|A blue light swings at the end of an invisible pole.
Bone Colossus|15|tU10R2|Its ribs are made from the joined spines of a dozen horses.
Cinder Revenant|9|bhU8|Grey ash falls in a slow circle around its feet.
Iron King|6|dU7R1|A chain of rusted keys circles his crown. They ring when he remembers the doors his subjects died behind.
`,
  );
  family(
    "Enchanted beast",
    "F",
    5,
    12,
    `
Basilisk|6|e|Its six slow feet make a half-circle around its stone-still prey.|F|-|2.5
Greater Basilisk|10|pe|The little statues near its den still wear expressions of surprise.
Cockatrice|5|ve|Its naked tail scrapes a crooked line behind its feathered tracks.|D|-|3.5
Chimera|9|bv|Three heads tug in different directions until they scent a foe.|F|-|2.5
Manticore|6|mv|Its barbed tail hums like a bundle of arrows in flight.|E|-|2.5
Griffin|7|vg|It keeps a lookout above the high pasture where its mate feeds.
Hippogriff|4|v|The foreclaws grip the ledge while the hind hooves push it into flight.|Q*5|-|9
Pegasus|4|v|A peppering of white feathers marks its favourite updraft.|-
Unicorn|4|t|A pale scraping on the tree trunk marks where it steadied its horn.|X|-|3.5
Owlbear|5|g|A hoarse double hoot rolls out before the hooked beak appears.|C|-|3.5
Displacer Cat|6|i|The grass lies flat a pace to one side of the visible paws.
Blink Hound|4|i|Its tracks skip whole puddles without disturbing their surface.
Hell Hound|5|bh|A cracked black tongue glows at the edges of its mouth.|C|-|5
Death Dog|4|p|Two muzzles test the air for different scents.
Hydra|8|gr|Its many heads drink in turns while the others keep watch.|B
Cinder Hydra|12|brh|Its discarded scales stay warm for a full day.
Rime Hydra|12|brk|A rim of frost follows the heads across the surface of the pool.
Gorgon Bull|8|be|A grey crust spreads wherever its breath touches the reeds.
Lamassu|7|vs|Kind eyes in a leonine face weigh each drawn weapon.
Sphinx|12|vs|It scratches its questions into the dust with one enormous claw.
Harpy|3|vs|Its nest of broken oars hangs high over a cruel bend in the river.|C|-|7
Siren|5|sf|The sweetest voice always seems to be coming from the far bank.
Satyr|5|s|Its flute is wrapped in bark against the rain.|I S X|-|5
Centaur|4|mt|A braided horsehair cord holds spare arrows across its back.|D I T|M Q|14
Minotaur|6|t|Its horns are polished on the corners of its winding path.|C|-|4.5
Lamia|9|ds|Two different tracks merge where the yellow grass grows tall.|D
Medusa|6|ep|Little tongues flick along the silk edge of its veil.|P Q*10 X V|-|2
Naga|9|ps|Its heavy coils frame a face as still as a ceremonial mask.
Water Naga|7|ps|It wears a collar of smooth shells from the deepest part of the pool.
Guardian Naga|12|ps|Its measured hiss echoes precisely between the pillars of its shrine.
`,
  );
  family(
    "Deep dweller",
    "E",
    5,
    12,
    `
Rust Eater|5|o|The long feelers stroke metal gently before the orange dust falls.
Stone Borer|9|u|A ringing in the cliff announces its progress through solid rock.
Purple Worm|15|pug|Gravel pours into its wake like water following a ship.|B Q*5 X|-|1.5
Carrion Crawler|3|f|Eight pale feelers reach out from behind the midden.|B|-|3.5
Ceiling Fisher|7|ag|A shining thread hangs perfectly still above the tunnel.
Rock Piercer|2|a|Its shell is the only dry stalactite in the wet roof.
Tunnel Maw|8|agu|Its plated head parts the ground in three broad wedges.
Lantern Eye|10|msv|Every little eye opens in turn around the creature's floating crown.
Thought Eater|8|sf|The camp grows quiet before anyone notices the missing thought.|-
Brain Leech|6|ad|A soft pulse travels beneath the thin shell of its head.
Stone Mimic|7|ag|The grain of its wooden lid runs straight across the hinges.
Cloak Bat|6|acv|It folds into deep drapes under the lintel.
Cave Lurker|9|ac|Its pale underside has the speckling of a lichen-covered ceiling.
Root Trapper|11|ac|The roots under the flagstones rise together in a woven mat.
Hook Horror|5|g|Two hollow knocks from its hooked arms can sound like a miner at work.
Iron Moth|4|ov|Its wings shed rusty scales onto unattended weapons.
Crystal Slug|10|bo|The walls near its den are satin-smooth from its corrosive trail.
Fungus Hound|3|ba|A line of small mushrooms follows each of its old tracks.
Shrieking Cap|3|b|Its gills quiver when a lantern approaches the bed.
Violet Mold|4|pd|A smear of purple beneath the boot starts to grow fine tendrils.
Ochre Jelly|6|o|The puddle pulls itself uphill in slow golden waves.|-
Black Pudding|10|oc|A bead of black slime eats a groove across the shield boss.|-
Grey Ooze|3|oa|It holds the shape of a wet step until someone bears weight on it.
Gelatinous Cube|4|fg|A handful of coins hangs at different heights in the empty-looking corridor.
Green Slime|2|od|The glossy green drips fall upwards when the floor is warmer.|-
Amber Slime|7|oc|Bright flecks of undigested brass drift inside its skin.
`,
  );
  family(
    "Dragon kin",
    "H",
    7,
    15,
    `
Black Dragon|8|bvo|A shining line of acid runs along the lower jaw.|H|-|2.5
Blue Dragon|10|bvl|Its crest snaps with sparks in the dust before a storm.|H|-|2.5
Green Dragon|9|bvp|The leaves nearest its sleeping place stay curled all year.|H|-|2.5
Red Dragon|12|bvh|Copper coins sag into one another beneath its warm breast.|H S T|-|2.5
White Dragon|7|bvk|Frost clings to the grooves of its translucent horns.|E O S|-|2.5
Brass Dragon|9|bv|Its thin scales sing against one another in a desert wind.|H|-|2.5
Bronze Dragon|11|bvl|The blue-green scales on its feet smell of the open sea.|H S T|-|2.5
Copper Dragon|9|bvo|It sets polished riddling stones in pairs around its den.|H S|-|2.5
Silver Dragon|12|bvk|A little cloud gathers on each wing tip when it lands.|H T|-|2.5
Gold Dragon|15|bvhs|Smoke curls from the long whiskers framing its careful smile.|H|-|2
Wyvern|7|pvg|A black droplet swells on the barb of its folded tail.|E|-|3.5
Drake|5|b|Its short wings spread for balance as it runs.
Dragon Turtle|14|bh|Steam bursts through the reeds growing on its armoured back.|B R S T V
Ancient Ember Wyrm|20|bvhsR2|A wave of furnace heat crosses the valley before the wings appear.
Mirror Wyrm|17|bvsR2|Each scale reflects a slightly different moment in the approach.
Marsh Lindworm|8|pc|Two forelegs hold it upright above its snaking lower body.
`,
  );
  family(
    "Spirit",
    "G",
    5,
    15,
    `
Air Elemental|12|vR2|Leaves whirl upwards inside the outline of a great turning shoulder.|-
Earth Elemental|12|uR2|A seam of fresh slate opens like an eye in the rock face.|-
Fire Elemental|12|bhR2|A hollow shape leans out of the centre of the flames.|-
Water Elemental|12|cgR2|The surface current flows around a pillar standing up from the pool.|-
Salamander|7|chR1|A trail of glowing footprints ends in the smelter's coals.|F|-|3.5
Invisible Stalker|8|ivaR1|Dust briefly settles on the outline of a hand.|-
Efreet|10|bvh|It wears manacles of solid flame as if they were ornaments.
Djinn|8|vs|Its garments billow in a breeze that touches nothing else.
Marid|13|bs|Water spirals around its wrists and drips back uphill.
Dao|11|us|The stone gives under its heels like soft garden soil.
Fire Imp|2|pvh|It delights in cooling one little patch of a blacksmith's forge.
Quasit|3|ipvr|Its grin stays visible for an instant after the rest disappears.|Q*3
Chain Fiend|8|cgR1|Its loose chains find hooks in walls that looked perfectly smooth.
Horned Fiend|12|bhsR2|A hooked shadow falls from each of its blackened horns.
Ice Fiend|11|bksR2|A thin crust of hoarfrost covers the links of its mail.
Pit Tyrant|18|bvhsR3|Its wings close slowly like gates across the red glow of its lair.
Ash Fury|9|bvhR1|Orange sparks dance in the hollows of its eye sockets.
Abyssal Hound|7|bv|Its low howl vibrates first in the collarbone and then in the ear.
Nightmare|7|bvh|Smoke from its nostrils trails behind the beating hooves.|-
Balefire Prince|20|bvhsR3|Even the old burns on its wings burn with a second, deeper flame.
`,
  );
  family(
    "Fey and woodkin",
    "Q",
    3,
    10,
    `
Dryad|3|s|Green veins run to the ends of its woodgrain fingers.|M*100 Q*10|-|3.5
Nymph|6|sf|The meadow pools grow still when it steps to the water.|Q*10 X|-|2.5
Pixie|1|ivm|Arrows no longer than a finger hide inside its seedpod quiver.|R S T X|-|12.5
Sprite|1|vpm|It hangs dewdrops on thorn points like little signal lamps.|C|-|55
Brownie|1|ias|A set of tiny tool marks appears overnight on a damaged latch.|O P Q|-|10
Leprechaun|1|is|Its brightly patched shoes leave astonishingly deep prints.|F
Willow Wisp|9|ivl|A cold light moves into the marsh in answer to a shouted name.
Treant|10|tm|In a rising wind it is the last tree whose branches move.|Q*5 S|-|10.5
Shambling Mound|8|gc|A jumbled heap of reed roots stands up on two thick legs.|B T X|-|2
Strangling Vine|5|ca|Flowers turn to face travellers while tendrils creep behind them.
Moss Dryad|5|ps|Its damp green mantle carries the bitter scent of a peat bog.
Green Hag|9|is|Its cup always smells faintly of the last drinker.
Sea Hag|5|f|A tangle of kelp drapes from fingers crusted in barnacles.|C Y|-|2.5
Night Hag|10|dsR1|Its bag contains dozens of little clay beds with tangled sheets.|-
Witch Queen|8|sb|She wears the splinters of Ravenmoor's old floodgates as a crown. The fen climbs each stair behind her.
`,
  );
  family(
    "Shapeshifter",
    "D",
    4,
    12,
    `
Werewolf|4|R1|A crescent of human tooth marks is hidden among the deeper bites.|G|-|10.5
Wererat|3|aR1|It knots a bright scarf around its throat in either shape.|C|-|14
Wereboar|5|tR1|Deep cracks run along its tusks like wrinkles in an old face.|B S|-|5
Werebear|7|gR1|Its old smith's scar shows through the fur of its left paw.|R T X|-|2.5
Weretiger|6|aR1|One striped pawprint leads out from a pair of abandoned sandals.|D Q*5|-|3.5
Werejackal|4|fR1|It stares without blinking until its prey begins to sway.
Doppelganger|4|as|It practises borrowed smiles in any still water it can find.
Skin Thief|8|dsR1|For a moment its reflection keeps the face it wore yesterday.
`,
  );
  family(
    "Construct",
    "-",
    7,
    20,
    `
Animated Armour|4||The hinged visor tilts towards any footfall on the stairs.
Clay Golem|11|R1|The maker's thumbprint runs as a broad groove across its brow.
Flesh Golem|9|lR1|Uneven stitch lengths trace the work of several hands.
Stone Golem|14|fR2|Its raised heel leaves a perfect chisel mark in the marble.
Iron Golem|18|bhR3|Thick flakes of rust drop from the joints as it salutes.
Bronze Sentinel|15|blR2|A dried river mark crosses the middle of its breastplate.
Hollow Warden|3||A votive candle shines inside its ribs. Its hands keep counting the offerings stolen from the Hollow Vaults.
Bell Colossus|19|bR3|With every stride the bronze ribs sound the final note of a different bell.
`,
  );
  const byId = new Map(list.map((m) => [m.id, m]));
  return { list, get: (id) => byId.get(id) };
})();
