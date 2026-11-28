// In the commit hook, derive the next stamp from HEAD so a retry cannot double-bump.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const file = path.join(__dirname, "..", "game.js");
const source = fs.readFileSync(file, "utf8");
const stamp = /^  const releaseVersion = "v\.(\d{4}\.\d{2}\.\d{2})\.(\d+)";$/m;
if (!stamp.test(source)) throw Error("Missing release version in game.js");
const baseline = process.argv.includes("--commit")
  ? require("node:child_process").execFileSync("git", ["show", "HEAD:game.js"], { encoding: "utf8" })
  : source;
const previous = baseline.match(stamp);
const now = new Date();
const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  .map(value => String(value).padStart(2, "0")).join(".");
const number = previous?.[1] === date ? Number(previous[2]) + 1 : 1;
const version = "v." + date + "." + number;
fs.writeFileSync(file, source.replace(stamp, '  const releaseVersion = "' + version + '";'));
console.log(version);
