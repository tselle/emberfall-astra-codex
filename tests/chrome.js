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
