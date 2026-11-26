// Exercise the same local entry point and real DOM in a disposable Chrome profile.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "emberfall-browser-"));
try {
  const dir = path.join(temp, "subdirectory");
  fs.mkdirSync(dir);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const [, file] of html.matchAll(/(?:href|src)="([\w.-]+\.(?:css|js))"/g)) {
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  const scenario = fs.readFileSync(path.join(__dirname, "scenarios.js"), "utf8");
  const controls = `
    const initialState = JSON.stringify(Game.state);
    Combat.begin("cellar_rat", "test/hotkeys");
    const panel = document.getElementById("dialog").getBoundingClientRect();
    if (Math.abs(panel.width - innerWidth * 0.95) > 1 || Math.abs(panel.height - innerHeight * 0.95) > 1)
      throw Error("Combat panel size");
    const battle = Game.state.battle;
    const foe = battle.units.find(v => v.enemy);
    const selected = document.querySelector('[data-act="battleInspect"][data-arg="' + battle.units.indexOf(foe) + '"]');
    const turn = battle.index;
    selected.click();
    const details = document.getElementById("unit-description");
    const pinned = details.textContent;
    if (!pinned.includes(Monsters.get(foe.monster).description) || selected.getAttribute("aria-pressed") !== "true" ||
        battle.index !== turn) throw Error("Roster inspection");
    const canvas = document.getElementById("battlefield");
    const rect = canvas.getBoundingClientRect();
    const ally = battle.units.filter(v => !v.enemy).sort((a,b) => b.x+b.y-a.x-a.y)[0];
    canvas.dispatchEvent(new PointerEvent("pointermove", {pointerType:"mouse",
      clientX:rect.left+(420+(ally.x-ally.y)*29)*rect.width/canvas.width,
      clientY:rect.top+(38+(ally.x+ally.y)*14-10)*rect.height/canvas.height}));
    if (!details.textContent.includes(Game.state.party[ally.index].name)) throw Error("Battlefield hover");
    canvas.dispatchEvent(new PointerEvent("pointerleave"));
    if (details.textContent !== pinned) throw Error("Restore inspected unit");
    const actions = document.querySelectorAll("#modal-body button");
    if (!actions.length) throw Error("Missing combat actions");
    for (const action of actions) {
      const hint = action.querySelector("kbd");
      if (!hint || !/^[1-9]+$/.test(hint.textContent) || !hint.getBoundingClientRect().width || !hint.getBoundingClientRect().height)
        throw Error("Missing visible shortcut for " + action.textContent);
    }
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"2",bubbles:true}));
    if (Game.state.battle.mode !== "move") throw Error("Combat Move shortcut");
    if (document.querySelector('[data-act="battleDelay"]')) throw Error("Unexpected combat delay control");
    Game.setState(JSON.parse(initialState));
    UI.close();
    Game.finish();
    document.querySelector('[data-act="menu"]').click();
    const shortcut = document.querySelector('#modal-body [data-act="help"] kbd').textContent;
    document.dispatchEvent(new KeyboardEvent("keydown",{key:shortcut,bubbles:true}));
    if (!document.getElementById("modal-body").textContent.includes("Lower armour class")) throw Error("Dialog shortcut");
    document.querySelector('[data-act="close"]').click();
    document.querySelector('[data-act="journal"]').click();
    if (!document.getElementById("dialog").open) throw Error("Journal click");
    document.querySelector('[data-act="close"]').click();
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"w",bubbles:true}));
    if(Game.state.y!==10)throw Error("Forward key");
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"s",bubbles:true}));
    if(document.documentElement.scrollWidth>window.innerWidth+1)throw Error("Horizontal layout overflow");
    if(document.querySelectorAll("#roster .portrait").length!==6)throw Error("Missing portrait");
  `;
  const test =
    "<script>try {" +
    controls +
    scenario +
    '\ndocument.body.dataset.playtest="passed";} catch(e){document.body.dataset.failure=e.stack;}</script>';
  fs.writeFileSync(path.join(dir, "index.html"), html.replace("</body>", test + "</body>"));
  const chrome =
    process.env.CHROME_BIN ||
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome");
  for (const size of ["1360,900", "390,844", "844,390", "810,1080"]) {
    const result = spawnSync(
      chrome,
      [
        "--headless",
        "--force-prefers-reduced-motion",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--user-data-dir=" + path.join(temp, "profile-" + size),
        "--window-size=" + size,
        "--dump-dom",
        pathToFileURL(path.join(dir, "index.html")).href,
      ],
      { encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
    );
    if (!result.stdout?.includes('data-playtest="passed"')) {
      throw new Error(
        result.error?.message ||
          result.stdout?.match(/data-failure="([^"]+)/)?.[1] ||
          result.stderr ||
          "Chrome did not complete the scenarios.",
      );
    }
    console.log("PASS headless Chrome " + size);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
