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
  const btn = (label, act, arg = "", disabled = false, cls = "") =>
    '<button class="btn ' +
    cls +
    '" data-act="' +
    esc(act) +
    '" data-arg="' +
    esc(arg) +
    '" ' +
    (disabled ? "disabled" : "") +
    ">" +
    esc(label) +
    "</button>";
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
      if (b && !b.disabled) Game.act(b.dataset.act, b.dataset.arg, b);
    });
    $("dialog").addEventListener("cancel", (e) => {
      e.preventDefault();
      Game.act("close");
    });
  }
  function modal(title, html, tag = "Emberfall", wide = false) {
    $("modal-title").textContent = title;
    $("modal-tag").textContent = tag;
    $("modal-body").innerHTML = html;
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
      .map((p) => [p.name, p.cls, p.level, p.hp, p.maxHp, p.portrait].join("/"))
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
            '</span><span class="hp"><span class="track"><i style="width:' +
            Math.max(0, (100 * p.hp) / p.maxHp) +
            '%"></i></span><span class="hptext">' +
            p.hp +
            "/" +
            p.maxHp +
            " <b>HP</b></span></span></span></button>",
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
          ["Esc", "Game menu or close panel"],
        ]
          .map(([k, v]) => '<div class="keyline"><kbd>' + k + "</kbd>" + v + "</div>")
          .join("") +
        "<p>Choose Move to show the touch controls. In battle, choose an action and select a highlighted square. Lower armour class is stronger. Choose Auto-fight to let the company finish an encounter.</p><h3>Spells and equipment</h3><p>Inspect a scroll in Inventory and choose Learn for a mage. Select Prepare on a character sheet, then rest to memorize the spell. Equipped weapons determine attack range. Dropped items stay at your current coordinates.</p><h3>Commissions and advancement</h3><p>Claim rewards in the warden’s hall. The company shares a quarter of the listed quest experience. Visit the training hall with sufficient experience and 100 gp per new level. Temples can recall fallen adventurers.</p>",
      "Field guide",
    );
  }
  return { $, esc, btn, icon, init, modal, close, time, paint, help };
})();
