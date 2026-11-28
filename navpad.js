"use strict";
const Navpad = (() => {
  const moves = {
    w: "forward",
    arrowup: "forward",
    s: "back",
    arrowdown: "back",
    a: "left",
    arrowleft: "left",
    d: "right",
    arrowright: "right",
    q: "strafeLeft",
    e: "strafeRight",
  };
  const keys = {
    f: "search",
    r: "camp",
    m: "map",
    j: "journal",
    b: "bestiary",
    l: "listen",
    i: "inventory",
    c: "campaign",
    enter: "interact",
    "?": "help",
    escape: "menu",
  };
  function show(on) {
    let pad = UI.$("touchpad");
    pad.classList.toggle("active", on);
    pad.innerHTML = [
      ["strafeLeft", "↖", "Sidestep left"],
      ["left", "↶", "Turn left"],
      ["forward", "↑", "Forward"],
      ["back", "↓", "Backward"],
      ["right", "↷", "Turn right"],
      ["strafeRight", "↗", "Sidestep right"],
    ]
      .map(
        ([a, g, l]) =>
          '<button data-act="move" data-arg="' +
          a +
          '" aria-label="' +
          l +
          '" title="' +
          l +
          '">' +
          g +
          "</button>",
      )
      .join("");
    if (on) {
      let scene = UI.$("view").closest?.(".scene-shell") || UI.$("view").parentElement;
      scene.insertAdjacentElement("afterend", pad);
    }
  }
  function bind() {
    let last = 0;
    document.addEventListener("keydown", (e) => {
      let key = e.key.toLowerCase();
      if (UI.$("dialog").open) return UI.dialogKey(e);
      if (
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
      )
        return;
      if (key === "enter" && e.target.closest?.("button")) return;
      if (moves[key]) {
        e.preventDefault();
        if (e.repeat && performance.now() - last < 150) return;
        last = performance.now();
        Game.move(moves[key]);
      } else if (keys[key] || /^[1-6]$/.test(key)) {
        e.preventDefault();
        if (e.repeat) return;
        if (keys[key]) Game.act(keys[key]);
        else Game.act("sheet", String(Number(key) - 1));
      }
    });
    let start = null;
    let view = UI.$("view");
    view.addEventListener("pointerdown", (e) => {
      start = [e.clientX, e.clientY];
      view.setPointerCapture?.(e.pointerId);
    });
    view.addEventListener("pointercancel", () => {
      start = null;
    });
    view.addEventListener("pointerup", (e) => {
      if (!start) return;
      let dx = e.clientX - start[0],
        dy = e.clientY - start[1];
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24)
        Game.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy < 0 ? "forward" : "back");
    });
  }
  return { show, bind };
})();
