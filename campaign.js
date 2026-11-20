"use strict";
const Campaign = (() => {
  let draft = [],
    filter = "hand",
    selected = "E0",
    stats = [],
    config = {};
  const { btn, esc } = UI;
  const options = (arr, val) =>
    arr
      .map(
        (v) => '<option value="' + esc(v) + '" ' + (v === val ? "selected" : "") + ">" + esc(v) + "</option>",
      )
      .join("");
  function show() {
    let group =
      filter === "hand"
        ? Adventures.list.filter((a) => a.authored)
        : Adventures.list.filter((a) => !a.authored && a.range[0] === +filter);
    UI.modal(
      "Campaign atlas",
      '<p>Travel with your current company or muster a new one at an adventure’s starting level.</p><label>Adventure collection <select id="campaign-filter"><option value="hand">The Emberwild Saga</option>' +
        [1, 5, 9, 13, 17]
          .map(
            (n) =>
              '<option value="' +
              n +
              '" ' +
              (+filter === n ? "selected" : "") +
              ">Expeditions · levels " +
              n +
              "–" +
              (n + 3) +
              "</option>",
          )
          .join("") +
        "</select></label>" +
        group
          .map(
            (a) =>
              '<div class="listrow"><span><b>' +
              esc(a.name) +
              "</b><br><small>" +
              a.id +
              " · Levels " +
              a.range.join("–") +
              " · " +
              a.floors.length +
              " floors</small></span>" +
              btn(a.id === Game.state.id ? "Current" : "View", "adventure", a.id) +
              "</div>",
          )
          .join("") +
        '<div class="btns">' +
        btn("Create company", "create") +
        "</div>",
      "Adventures",
    );
    UI.$("campaign-filter").onchange = (e) => {
      filter = e.target.value;
      show();
    };
  }
  function detail(id) {
    let a = Adventures.list.find((a) => a.id === id);
    selected = id;
    UI.modal(
      a.name,
      "<p>" +
        esc(a.brief) +
        "</p><p>" +
        esc(a.town) +
        " · Levels " +
        a.range.join("–") +
        '</p><div class="btns">' +
        btn("Travel with current company", "travel", id) +
        btn("Start with ready-made company", "newConfirm", id) +
        btn("Create a company", "create", id) +
        "</div>",
      a.id,
    );
  }
  function reroll() {
    stats = Rules.abilities.map(() =>
      Array.from({ length: 4 }, () => Rules.roll(6))
        .sort((a, b) => b - a)
        .slice(0, 3)
        .reduce((a, b) => a + b),
    );
  }
  function builder(reset = false) {
    if (reset) {
      draft = [];
      reroll();
      config = { race: "Human", cls: "Fighter", name: "", alignment: "Lawful good", weapon: "longsword" };
    }
    let a = Adventures.list.find((a) => a.id === selected);
    let { race, cls, name, alignment, weapon } = config;
    UI.modal(
      "Create a company",
      "<p>Muster up to six adventurers for " +
        esc(a.name) +
        ".</p>" +
        (draft.length
          ? draft
              .map(
                (p, i) =>
                  '<div class="listrow"><span>' +
                  esc(p.name) +
                  " · " +
                  p.race +
                  " " +
                  p.cls +
                  "</span>" +
                  btn("Remove", "removeDraft", i) +
                  "</div>",
              )
              .join("")
          : "") +
        (draft.length < 6
          ? '<h3>Recruit</h3><div class="form-grid"><label>Name<input id="char-name" maxlength="28" placeholder="Character name" value="' +
            esc(name) +
            '"></label><label>Race<select id="char-race">' +
            options(Object.keys(Rules.races), race) +
            '</select></label><label>Class<select id="char-class">' +
            options(Rules.races[race], cls) +
            '</select></label><label>Alignment<select id="char-align">' +
            options(Rules.allowedAlignments(cls), alignment) +
            "</select></label>" +
            (cls === "Fighter"
              ? '<label>Specialization<select id="char-weapon">' +
                ["longsword", "shortbow", "dagger", "mace", "staff"]
                  .map(
                    (id) =>
                      '<option value="' +
                      id +
                      '" ' +
                      (id === weapon ? "selected" : "") +
                      ">" +
                      Data.item(id).name +
                      "</option>",
                  )
                  .join("") +
                "</select></label>"
              : "") +
            '</div><p class="stats">' +
            Rules.abilities
              .map(
                (k, i) =>
                  "<span>" + k.slice(0, 3) + " " + Math.max(stats[i], Rules.minimums[cls][i]) + "</span>",
              )
              .join("") +
            '</p><div class="btns">' +
            btn("Roll abilities", "rollDraft") +
            btn("Add character", "addDraft") +
            "</div>"
          : "") +
        '<div class="btns">' +
        btn("Begin adventure", "startDraft", "", !draft.length, "primary") +
        btn("Use ready-made company", "newConfirm", selected) +
        "</div>",
      "Company creation",
    );
    if (draft.length < 6) {
      UI.$("char-name").oninput = (e) => (config.name = e.target.value);
      UI.$("char-race").onchange = (e) => {
        config.race = e.target.value;
        if (!Rules.races[config.race].includes(config.cls)) config.cls = Rules.races[config.race][0];
        builder();
      };
      UI.$("char-class").onchange = (e) => {
        config.cls = e.target.value;
        config.alignment = Rules.allowedAlignments(config.cls)[0];
        builder();
      };
      UI.$("char-align").onchange = (e) => (config.alignment = e.target.value);
      if (UI.$("char-weapon")) UI.$("char-weapon").onchange = (e) => (config.weapon = e.target.value);
    }
  }
  function handle(a, arg) {
    switch (a) {
      case "adventure":
        detail(arg);
        return true;
      case "travel":
        Game.transfer(arg);
        return true;
      case "create":
        selected = arg || Game.state.id;
        builder(true);
        return true;
      case "rollDraft":
        reroll();
        builder();
        return true;
      case "addDraft": {
        if (draft.length >= 6) return true;
        let name = config.name.trim();
        if (!name) {
          UI.$("char-name").setCustomValidity("Enter a character name.");
          UI.$("char-name").reportValidity();
          UI.$("char-name").setCustomValidity("");
          return true;
        }
        let c = config.cls,
          align = Rules.allowedAlignments(c),
          p = Rules.create(
            name,
            c,
            config.race,
            Rules.classes.indexOf(c),
            Adventures.list.find((a) => a.id === selected).range[0],
            stats.slice(),
            align.includes(config.alignment) ? config.alignment : align[0],
          );
        if (c === "Fighter") {
          p.specialization = config.weapon;
          const tier = Data.item(p.weapon).bonus;
          p.weapon = Data.items.find(
            (it) => it.type === "weapon" && it.base === config.weapon && it.bonus === tier,
          ).id;
        }
        draft.push(p);
        config.name = "";
        reroll();
        builder();
        return true;
      }
      case "removeDraft":
        draft.splice(+arg, 1);
        builder();
        return true;
      case "newConfirm":
      case "startDraft":
        selected = arg || selected;
        UI.modal(
          "Begin a new company?",
          '<p>The new company will take the autosave. Your manual save slots remain available.</p><div class="btns">' +
            btn("Begin adventure", a === "newConfirm" ? "startReady" : "commitDraft", selected) +
            btn("Cancel", "campaign") +
            "</div>",
          "New expedition",
        );
        return true;
      case "startReady":
      case "commitDraft":
        Game.transfer(
          selected,
          a === "startReady"
            ? Rules.company(Adventures.list.find((v) => v.id === selected).range[0])
            : draft.slice(),
        );
        return true;
    }
    return false;
  }
  return { show, handle };
})();
