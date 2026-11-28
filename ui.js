"use strict";
const UI = (() => {
  const $ = (id) => document.getElementById(id),
    esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const symbols = {
    menu: "M3 6h18M3 12h18M3 18h18",
    sun: "M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2 M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 1 1 9 0",
    coins:
      "M3 7c0-4 13-4 13 0s-13 4-13 0zm0 0v4c0 4 13 4 13 0V7M3 11v4c0 2 4 3 7 3m4-3c3 1 6 0 7-2v4c0 4-11 4-11 1v-3",
    banner: "M5 22V3m0 1c4-4 9 3 15-1v12c-6 4-11-3-15 1",
    pin: "M12 21s7-8 7-13a7 7 0 0 0-14 0c0 5 7 13 7 13zm2-13a2 2 0 1 1-4 0 2 2 0 1 1 4 0",
    map: "m2 5 7-3 6 3 7-3v16l-7 3-6-3-7 3zm7-3v16m6-13v16",
    expand: "M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6",
    quill: "M3 21c3-3 8-10 15-16M6 16C6 8 14 2 22 2c-2 9-8 16-16 14Zm-4 5h10",
    company: "M12 3l8 3v5c0 5-4 8-8 11-4-3-8-6-8-11V6zm0 4v10m-4-6h8",
    compass: "m12 2 7 19-7-4-7 4z",
    move: "M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4",
    search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0zm-1 5 6 6",
    listen: "M5 9a7 7 0 0 1 14 1c0 4-5 6-6 10-1 3-6 2-6-1m2-9c0-5 7-5 7 0 0 3-5 3-5 7",
    camp: "m2 21 10-17 10 17H2zm6 0 4-8 4 8M9 2l3 4 3-4",
    pack: "M5 9h14l2 12H3L5 9zm0 0 2-5h10l2 5M9 4V2h6v2m-7 9h8v5H8z",
    book: "M12 6C8 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-6-1-10 2zm0 0v15",
    beast: "m3 3 6 4 3-3 4 3 5-4-2 8 2 4-5 5-4 2-5-3-4-5 2-4zm4 9 3 2m7-2-3 2m-4 3h4",
    help: "M22 12a10 10 0 1 1-20 0 10 10 0 1 1 20 0zm-13-3c0-4 7-4 7 0 0 3-4 3-4 6m0 2v1",
    saved: "m2 12 6 6L21 5",
    moon: "M20 16a9 9 0 0 1-12-12A9 9 0 1 0 20 16z",
  };
  const icon = (k) =>
    '<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' +
    (symbols[k] || symbols.book) +
    '"/></svg>';
  const btn = (label, act, arg = "", disabled = false, cls = "", shortcut = "") =>
    '<button class="btn ' +
    cls +
    '" data-act="' +
    esc(act) +
    '" data-arg="' +
    esc(arg) +
    '" ' +
    (shortcut ? 'data-shortcut="' + esc(shortcut) + '" ' : "") +
    (disabled ? "disabled" : "") +
    ">" +
    (shortcut ? "<kbd>" + esc(shortcut.toUpperCase()) + "</kbd> " : "") +
    esc(label) +
    "</button>";
  function partyOrder(index, size) {
    return '<div class="btns" role="group" aria-label="Party order"><span>Party position ' +
      (index + 1) + " of " + size + "</span>" +
      btn("↑ Move up", "order", index + ",-1", index === 0) +
      btn("↓ Move down", "order", index + ",1", index === size - 1) + "</div>";
  }
  function init() {
    document.querySelectorAll("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
    const g = $("sigil").getContext("2d");
    let fire = [
      "       aa       ",
      "      aaaa      ",
      "       aaaa     ",
      "    a   aaaa    ",
      "    aa  abbaa   ",
      "   aabaaabbbba  ",
      "  aabbbbabbcba  ",
      " aabbbbbbbcccba ",
      " abbbcbbcccccca ",
      "aabbbcccccdccba ",
      "abbbccccdddcbaa ",
      "abbbcccddddcbba ",
      " abbbccdddcbaa  ",
      "  aabbccdcbaa   ",
      "   aaabbbaa     ",
      "     aaaa       ",
    ];
    fire.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== " ") {
          g.fillStyle = { a: "#a34834", b: "#d57243", c: "#e5a85e", d: "#f6d390" }[c];
          g.fillRect(x * 2 + 2, y * 2 + 4, 2, 2);
        }
      }),
    );
    const command = (a, k, t, key, cl) =>
      '<button class="' +
      cl +
      '" data-act="' +
      a +
      '">' +
      icon(k) +
      t +
      (key ? "<kbd>" + key + "</kbd>" : "") +
      "</button>";
    $("commands").innerHTML = [
      ["pad", "move", "Move", ""],
      ["search", "search", "Search", "F"],
      ["listen", "listen", "Listen", "L"],
      ["camp", "camp", "Camp", "R"],
      ["inventory", "pack", "Inventory", "I"],
    ]
      .map((v) => command(...v, "action-btn"))
      .join("");
    $("library").innerHTML = [
      ["journal", "quill", "Journal", "J"],
      ["map", "map", "Map", "M"],
      ["bestiary", "beast", "Bestiary", "B"],
      ["campaign", "banner", "Campaign", "C"],
      ["help", "book", "How to play", "?"],
    ]
      .map((v) => command(...v, ""))
      .join("");
    document.addEventListener("click", (e) => {
      let b = e.target.closest("[data-act]");
      if (!b || b.disabled) return;
      // A pointer command must release focus before a dialog remembers its opener.
      // Keyboard activations have detail 0 and retain their native button focus.
      if (e.detail > 0 && b === document.activeElement && b.matches("button")) b.blur();
      Game.act(b.dataset.act, b.dataset.arg, b);
    });
    // Suppress the native Escape dismissal; Delete uses the game's close action.
    $("dialog").addEventListener("cancel", e => e.preventDefault());
  }
  const dialogKeys = new Map();
  let keyPrefix = "";
  function bindDialogKeys() {
    dialogKeys.clear();
    keyPrefix = "";
    const controls = document.querySelectorAll("#modal-body button, #modal-body input, #modal-body select, #modal-body [tabindex='0']");
    const reserved = new Set(Array.from(controls, control => control.dataset.shortcut));
    const alphabet = [..."123456789abcdefghijklmnopqrstuvwxyz"].filter(key => !reserved.has(key)).join("");
    const width = Math.max(1, Math.ceil(Math.log(Math.max(1, controls.length)) / Math.log(alphabet.length)));
    // Manual combat reserves 1–8 for actions.
    const combat = $("dialog").querySelector?.("#battlefield");
    const unassigned = Array.from(controls).filter(control => !control.disabled && !control.dataset.shortcut);
    const combatKeys = ["94", "95", "96", "97", "98", "99"];
    if (combat) {
      while (combatKeys.length < unassigned.length) {
        const prefix = combatKeys.splice(combatKeys.findLastIndex(key => key.length === combatKeys[0].length), 1)[0];
        for (const digit of "123456789") combatKeys.push(prefix + digit);
      }
    }
    controls.forEach((control, index) => {
      if (control.dataset.shortcut) {
        if (!control.disabled) dialogKeys.set(control.dataset.shortcut, control);
        return;
      }
      if (control.disabled) return;
      let key = "";
      if (combat) key = combatKeys.shift();
      else for (let i = 0; i < width; i++) {
        key = alphabet[index % alphabet.length] + key;
        index = Math.floor(index / alphabet.length);
      }
      dialogKeys.set(key, control);
      const hint = document.createElement("kbd");
      hint.textContent = key.toUpperCase();
      if (control.tagName === "BUTTON") control.prepend(hint, " ");
      else control.before(hint, " ");
    });
  }
  function dialogKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === "delete" && !e.shiftKey && !e.target.isContentEditable) {
      e.preventDefault();
      keyPrefix = "";
      if (!e.repeat) Game.act("close");
      return;
    }
    if (key.length !== 1 || !/[a-z1-9]/.test(key)) {
      keyPrefix = "";
      return;
    }
    e.preventDefault();
    if (e.repeat) return;
    keyPrefix += key;
    const control = dialogKeys.get(keyPrefix);
    if (control) {
      keyPrefix = "";
      if (control.tagName === "BUTTON") control.click();
      else control.focus();
    } else if (![...dialogKeys.keys()].some(code => code.startsWith(keyPrefix))) keyPrefix = "";
  }
  function modal(title, html, tag = "Emberfall", wide = false) {
    $("modal-title").textContent = title;
    $("modal-tag").textContent = tag;
    $("modal-tag").classList.toggle("release-label", title === "Game menu");
    $("modal-body").innerHTML = html;
    bindDialogKeys();
    $("dialog").classList.toggle("wide", wide);
    $("dialog").classList.toggle("atlas-page", tag === "Area map");
    if (!$("dialog").open) $("dialog").showModal();
    $("dialog").scrollTop = 0;
  }
  function close() {
    $("dialog").close();
  }
  const time = (n) =>
    String(Math.floor(n / 60) % 24).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
  function slotDot(label, ready, kind = "") {
    const text = esc(label);
    return `<span class="spell-dot${kind ? " " + kind : ""}${ready ? " ready" : ""}" role="img" aria-label="${text}" title="${text}"></span>`;
  }
  function resourceSlots(p, minutes) {
    const circles = Rules.slots(p).map((capacity, i) => {
      if (!capacity) return "";
      const circle = i + 1, planned = Rules.plannedSpells(p, circle).slice(), dots = [];
      function dot(label, ready) {
        dots.push(slotDot(`Circle ${circle} · ${label}`, ready));
      }
      // Editing tomorrow's plan doesn't replace spells still available today.
      for (const [id, copies] of Object.entries(p.ready || {})) {
        const sp = Data.spell(id);
        if (sp?.level !== circle) continue;
        for (let n = 0; n < copies && dots.length < capacity; n++) {
          dot(`${sp.name} · Prepared`, true);
          const pos = planned.indexOf(id);
          if (pos !== -1) planned.splice(pos, 1);
        }
      }
      while (dots.length < capacity) {
        const id = planned.shift();
        dot(id ? `Empty · ${Data.spell(id).name} after rest` : "Empty · No spell planned", false);
      }
      return `<span class="slot-circle">${dots.join("")}</span>`;
    }).join("");
    let abilities = "";
    if (p.cls === "Paladin") {
      const ready = Rules.handsReady(p, minutes);
      const status = ready ? "Ready · 1/day" : p.handsDay === Math.floor(minutes / 1440) ? "Used · Returns next day" : "Unavailable while downed";
      abilities = slotDot(`Lay on Hands · ${status}`, ready, "ability-dot");
    }
    return circles || abilities ? `<span class="spell-dots">${circles}${abilities}</span>` : "";
  }
  function xpMeter(p) {
    const capped = p.level >= 20;
    const base = Rules.xpFor(p.cls, p.level);
    const needed = capped ? 0 : Rules.xpFor(p.cls, p.level + 1) - base;
    const earned = Math.max(0, Math.min(needed, p.xp - base));
    const percent = capped ? 100 : Math.floor(100 * earned / needed);
    const label = capped ? "Maximum level" : earned === needed ? "XP requirement met for training" :
      `${earned.toLocaleString()} / ${needed.toLocaleString()} XP toward level ${p.level + 1}`;
    return `<span class="hp xp" role="meter" aria-label="Level progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="${label}" title="${label}"><span class="track"><i style="width:${percent}%"></i></span><span class="hptext">${capped ? "Max" : earned === needed ? "Ready" : percent + "%"} XP</span></span>`;
  }
  let rosterSignature = "",
    lastLog = null;
  function paint(paintScene = true) {
    let s = Game.state,
      a = Game.world.adventure,
      l = Game.level;
    $("adventure-name").textContent = a.name;
    $("chapter-id").textContent = "Adventure " + a.id;
    $("gold").textContent = s.gold.toLocaleString();
    $("clock").innerHTML =
      icon(s.minutes % 1440 < 360 || s.minutes % 1440 > 1140 ? "moon" : "sun") +
      "Day " +
      (1 + Math.floor(s.minutes / 1440)) +
      "<span class='clock-time'>" +
      time(s.minutes) +
      "</span>";
    $("location").textContent = s.area === "wild" ? a.town + " Marches" : l.name;
    $("biome").textContent = {
      town: "Settlement",
      dungeon: "Dungeon · Level " + (s.floor + 1),
      wild: "Wilderness",
    }[s.area];
    $("bearing").innerHTML = icon("compass") + "NESW"[s.dir];
    $("scene-caption").textContent =
      s.area === "town"
        ? "Market street"
        : s.area === "wild"
          ? Wilds.names[Game.world.wild.grid[s.y][s.x]]
          : "Exploring on foot";
    $("interact").innerHTML = esc(Game.contextLabel()) + " <kbd>↵</kbd>";
    const signature = s.party
      .map((p) => [p.name, p.cls, p.level, p.xp, p.hp, p.maxHp, p.portrait, p.handsDay === Math.floor(s.minutes / 1440), JSON.stringify([p.ready, p.plan, p.customCircles, p.book, p.stats?.[4]])].join("/"))
      .join("|");
    if (signature !== rosterSignature) {
      rosterSignature = signature;
      $("party-count").textContent = s.party.length + " / 6";
      $("roster").innerHTML = s.party
        .map(
          (p, i) =>
            '<button class="member" data-act="sheet" data-arg="' +
            i +
            '"><canvas class="portrait" width="52" height="54"></canvas><span class="member-info"><span class="member-name">' +
            esc(p.name) +
            '<span class="slot">' +
            (i + 1) +
            '</span></span><span class="member-class">' +
            esc(p.cls) +
            " · Lv. " +
            p.level +
            '</span><span class="member-meters"><span class="hp"><span class="track"><i style="width:' +
            Math.max(0, (100 * p.hp) / p.maxHp) +
            '%"></i></span><span class="hptext">' +
            p.hp +
            "/" +
            p.maxHp +
            " <b>HP</b></span></span>" + xpMeter(p) + "</span>" + resourceSlots(p, s.minutes) + "</span></button>",
        )
        .join("");
      document.querySelectorAll(".member canvas").forEach((c, i) => Figures.portrait(c, s.party[i].portrait));
    }
    if (lastLog !== s.log[s.log.length - 1]) {
      lastLog = s.log[s.log.length - 1];
      $("log").innerHTML = s.log
        .slice(-30)
        .map(
          (e) =>
            '<div class="log-line ' +
            esc(e.type) +
            '"><time>' +
            time(e.time) +
            "</time><span>" +
            esc(e.msg) +
            "</span></div>",
        )
        .join("");
      $("log").scrollTop = $("log").scrollHeight;
    }
    if (typeof Atlas !== "undefined") Atlas.draw($("minimap"), true);
    if (paintScene) Game.draw();
  }
  function help() {
    modal(
      "How to play",
      "<p>Your company begins in the market street. Visit the warden for a commission, then take the north gate into the wilderness. Approach a building and interact to enter.</p>" +
        [
          ["W / ↑", "Walk forward"],
          ["S / ↓", "Step backward"],
          ["A D / ← →", "Turn left or right"],
          ["Q / E", "Sidestep"],
          ["Enter", "Interact, open a door or visit a site"],
          ["F / L", "Search or listen"],
          ["R / I", "Camp or open inventory"],
          ["M / J / B", "Map, journal or bestiary"],
          ["1–6", "Inspect a company member"],
          ["Esc", "Open game menu"],
          ["Del", "Close panel"],
        ]
          .map(([k, v]) => '<div class="keyline"><kbd>' + k + "</kbd>" + v + "</div>")
          .join("") +
        "<p>Press the keys printed beside dialog controls in order. Field shortcuts focus the field for editing. Choose Move to show the touch controls. In battle, choose an action and select a highlighted square. Lower armour class is stronger. Choose Auto-fight to let the company finish an encounter. Choose Auto this turn to automate one combatant’s turn. Cycle Auto spells through Yes (cast automatically), No (save prepared spells), and Ask (approve or skip each proposed cast).</p><h3>Spells and equipment</h3><p>Inspect a scroll in Inventory and choose Learn for a mage. On a character sheet, use +1 and −1 to assign spell copies by circle. Rest to memorize them. Choose Cast beside a ready healing spell to heal a companion. Equip a melee weapon and a missile weapon from Inventory to carry both. Switch on the character sheet or during your turn. Switching leaves movement and the attack available. Dropped items stay at your current coordinates.</p><h3>Commissions and advancement</h3><p>Claim rewards in the warden’s hall. The company shares a quarter of the listed quest experience. Visit the training hall with sufficient experience and 100 gp per new level. Temples can recall fallen adventurers.</p>",
      "Field guide",
    );
  }
  return { $, esc, btn, icon, partyOrder, init, dialogKey, modal, close, time, paint, help };
})();
