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
    if (document.querySelector('.mast').getBoundingClientRect().height !== 10) throw Error('Masthead is not 10px tall');
    const options = document.querySelector('.view-options');
    const sceneTop = () => document.querySelector('.scene').getBoundingClientRect().top;
    const mastBottom = document.querySelector('.mast').getBoundingClientRect().bottom;
    if (sceneTop() !== mastBottom) throw Error('Closed options reserve space above the scene');
    options.querySelector('summary').click();
    if (!options.open || sceneTop() !== mastBottom) throw Error('Options failed to overlay the scene');
    const menuButton = document.querySelector('.chapter [data-act="menu"]');
    if (!menuButton.getClientRects().length || (innerWidth <= 720 && menuButton.getBoundingClientRect().height < 44))
      throw Error('Compact layout lost the game menu target');
    const boxes = Array.from(options.querySelectorAll('input'));
    for (const box of boxes) {
      box.click();
      for (const id of box.getAttribute('aria-controls').split(' ')) {
        if (document.getElementById(id).getClientRects().length) throw Error('View option did not hide ' + id);
      }
    }
    if (document.querySelector('.readouts').getClientRects().length || !options.getClientRects().length ||
        !document.getElementById('interact').getClientRects().length) throw Error('Empty panels or lost layout controls');
    if (JSON.parse(localStorage.getItem('emberfall.hiddenViewPanels')).length !== boxes.length) throw Error('Layout not saved');
    for (const box of boxes) {
      box.click();
      if (box.getAttribute('aria-controls').split(' ').some(id => !document.getElementById(id).getClientRects().length)) throw Error('Panel not restored');
    }
    options.open = false;
    if (matchMedia('(max-width: 720px), (max-height: 480px)').matches &&
        document.getElementById('interact').getBoundingClientRect().top < document.getElementById('view').getBoundingClientRect().bottom - 1)
      throw Error('Interact covers small-screen scene');
    const padButton = document.querySelector('#commands [data-act="pad"]');
    const padInitiallyOpen = Game.state.pad;
    padButton.focus();
    padButton.dispatchEvent(new MouseEvent("click", {bubbles:true, detail:1}));
    if (document.activeElement === padButton || Game.state.pad === padInitiallyOpen)
      throw Error("Pointer command stayed focused or failed to activate");
    padButton.focus();
    padButton.click();
    if (document.activeElement !== padButton || Game.state.pad !== padInitiallyOpen)
      throw Error("Keyboard-style activation lost focus or failed to activate");
    const inventoryButton = document.querySelector('#commands [data-act="inventory"]');
    inventoryButton.focus();
    inventoryButton.dispatchEvent(new MouseEvent("click", {bubbles:true, detail:1}));
    document.querySelector('[data-act="close"]').click();
    if (document.activeElement === inventoryButton) throw Error("Closed dialog refocused pointer command");
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
    const scale = Math.min(2, Math.max(1, Math.ceil(devicePixelRatio)));
    if (canvas.width !== 960 * scale || canvas.height !== 480 * scale || getComputedStyle(canvas).imageRendering !== 'auto')
      throw Error('Battlefield backing resolution or smoothing');
    const rect = canvas.getBoundingClientRect();
    const ally = battle.units.filter(v => !v.enemy).sort((a,b) => b.x+b.y-a.x-a.y)[0];
    canvas.dispatchEvent(new PointerEvent("pointermove", {pointerType:"mouse",
      clientX:rect.left+(420+(ally.x-ally.y)*29)*rect.width/960,
      clientY:rect.top+(38+(ally.x+ally.y)*14-10)*rect.height/480}));
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
    const dialog = document.getElementById('dialog');
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
    if (dialog.dispatchEvent(new Event('cancel', {cancelable:true})) || !dialog.open) throw Error('Escape dismissed dialog');
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Delete', bubbles:true}));
    if (!dialog.open) throw Error('Delete dismissed dialog');
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Tab', shiftKey:true, bubbles:true}));
    if (!dialog.open) throw Error('Shift+Tab dismissed dialog');
    const tab = new KeyboardEvent('keydown', {key:'Tab', bubbles:true, cancelable:true});
    dialog.querySelector('[data-act="close"]').dispatchEvent(tab);
    if (dialog.open || !tab.defaultPrevented) throw Error('Tab did not dismiss dialog');
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
        "--force-device-scale-factor=" + (size === "390,844" ? 2 : 1),
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
