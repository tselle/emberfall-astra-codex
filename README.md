# Emberfall · The Emberwild Saga

A self-contained, party-based fantasy RPG with first-person exploration, overland travel and turn-based isometric combat. Open **index.html** to play. The game uses ordinary JavaScript, one stylesheet and Canvas2D. All artwork is drawn locally in code. There are no downloads, runtime dependencies or build steps.

## Getting started

Your six adventurers begin in Thornwick. Choose **Town square → Warden’s hall** to accept the two commissions. Return to the square or walk to the north gate to reach the wilderness. The map shows the dungeon entrance and the company’s coordinates.

The opening company is ready for play. **Game menu → Create company** lets you roll characters, choose a race, eligible class and alignment, and specialize a fighter. You can embark with one to six adventurers. **Campaign** lets you bring the same company to another adventure or start a fresh one at its suggested level.

## Controls

| Action | Keyboard |
| --- | --- |
| Forward / backward | W / S or ↑ / ↓ |
| Turn left / right | A / D or ← / → |
| Sidestep | Q / E |
| Interact, visit a site or use stairs | Enter |
| Search / listen | F / L |
| Camp / inventory | R / I |
| Map / journal / bestiary | M / J / B |
| Campaign / field guide | C / ? |
| Character sheets | 1–6 |
| Game menu / close panel | Esc |

**Move** toggles the on-screen movement pad. The pad starts open on touch devices. You can also swipe the scene to move or turn. In combat, select an action and a square on the field. Named target buttons provide another way to choose a creature. **Auto-fight** resolves the encounter for the company.

## Company and campaign

- Six races and six classes use six ability scores, descending armour class, THAC0, five saving throws, class experience tables and advancement through level 20. Eligible characters receive a prime-requisite experience bonus. Training costs 100 gp times the new level.
- Inspect a character to view equipment, specialization, thief skills and memorized spells. A mage learns from wizard scrolls in the pack. Choose spells to prepare on the sheet and rest to refill slots. Potions, scrolls, wands and other charged gear are available through **Item** in battle.
- Search adjacent squares for secrets and traps. Face a marked trap and interact to attempt removal with a thief. Thieves can enable creeping from their character sheet. Listening can reveal an ambush.
- Resting uses healing prayers, restores spell slots and relieves fatigue. A temple can revive the fallen. Items dropped from the shared pack remain on that square.
- Each adventure has two commissions. Return to its giver for gold and one quarter of the listed experience, split among living companions. Holy sites award experience separately. Side commissions unlock a wilderness postern.

| Adventure | Levels | Home town |
| --- | --- | --- |
| E0 · The Cellars of Thornwick | 1–2 | Thornwick |
| E1 · The Hollow Vaults | 1–3 | Vellbridge |
| E2 · Barrow of the Iron King | 3–5 | Ashmere |
| E3 · The Witch-Queen of Ravenmoor | 5–7 | Wickerhaven |

The atlas also contains **50 seeded expeditions**, with ten per four-level band. Each band contains four small, three medium, two large and one huge expedition. Layout, population, event, ordinary door, secret, trap and wilderness generation use named random streams. The full campaign contains 162 dungeon floors, 353 monster entries, 296 items, 75 wizard and priest spells, and treasure types A through Z.

## Saves and hosting

Game state, explored areas, quest progress, ground items and active encounters go to localStorage. The game autosaves after actions. **Game menu** also provides three manual slots. Storage belongs to the current browser and site origin. When storage is unavailable, the status line reports it.

To serve the game from a website, copy index.html, style.css and the 19 runtime JavaScript files into one directory. All runtime paths are relative, including when that directory sits below the site root.

## Verification

Run the development checks from this directory using Node. They use built-in modules.

```sh
node tests/validate.js
node tests/playtest.js
node tests/chrome.js
```

The validator checks script order, data references, level bands, accessible services, dungeon and wilderness connectivity, stair destinations, sealed treasure rooms, hazards, spell slots, shops and 5,200 treasure rolls. It regenerates the campaign in a fresh execution context and compares the worlds.

The Node play-test runs the game entry point with a DOM adapter. It exercises company creation, manual saves, equipment, scrolls, combat, camping, training, hazards and campaign transfers. A second scenario walks the same company through all four authored adventures, claims both commissions in each and trains between adventures. An optional CANVAS_MODULE environment variable can point to an installed Canvas2D implementation for raster checks.

The Chrome runner uses disposable browser profiles and local copies under a subdirectory at desktop, phone and tablet viewport sizes. It defaults to google-chrome on Linux. Set CHROME_BIN to select another Chrome executable. Chrome needs permission to create its local sockets. Browser support and old-tablet performance still need confirmation on the target devices.

## Source

The script order in index.html follows the game’s dependencies. Rules and content precede the renderers. Exploration, combat, campaign, journal, atlas and watch systems feed the game controller loaded last.

Released under the [MIT licence](LICENSE).
