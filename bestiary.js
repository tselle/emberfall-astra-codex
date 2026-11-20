"use strict";
const Bestiary = (() => {
  function show() {
    let entries = Object.entries(Game.state.bestiary);
    UI.modal(
      "Field bestiary",
      entries.length
        ? entries
            .map(([id, e], i) => {
              let m = Monsters.get(id);
              return (
                '<section><div class="sheet-top"><canvas id="specimen-' +
                i +
                '" class="portrait" width="56" height="56"></canvas><div><h3>' +
                UI.esc(m.name) +
                "</h3><small>" +
                e.seen +
                " encountered · " +
                e.defeated +
                " defeated</small></div></div><p>" +
                UI.esc(m.description) +
                '</p><p class="muted">HD ' +
                m.hd +
                " · AC " +
                m.ac +
                " · " +
                (m.special.join(", ") || "No special abilities recorded") +
                "</p></section>"
              );
            })
            .join("")
        : "<p>Your field bestiary is empty. Creatures appear here when your company first encounters them.</p>",
      entries.length + " recorded species",
    );
    entries.forEach(([id], i) => Figures.monster(UI.$("specimen-" + i), Monsters.get(id).name));
  }
  return { show };
})();
