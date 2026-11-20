// Run the game's ordinary script entry point with a small DOM adapter in Node.
// Set CANVAS_MODULE to an installed Canvas2D implementation to exercise rasterization too.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const canvasModule = process.env.CANVAS_MODULE && require(process.env.CANVAS_MODULE);
const elements = new Map();
const store = new Map();
const handlers = {};
const blank = () => {};
const gradient = { addColorStop: blank };
function canvas(width = 64, height = 64) {
  if (canvasModule) return canvasModule.createCanvas(width, height);
  const node = { width, height };
  const context = new Proxy(
    {
      canvas: node,
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      measureText: (t) => ({ width: t.length * 6 }),
    },
    { get: (target, key) => target[key] ?? blank },
  );
  node.getContext = () => context;
  return node;
}
function element(id) {
  if (!elements.has(id)) {
    const el = Object.assign(canvas(208, 101), {
      id,
      open: false,
      dataset: {},
      value: "",
      innerHTML: "",
      textContent: "",
      classList: { toggle: blank },
      addEventListener: blank,
      parentElement: { insertAdjacentElement: blank },
      close() {
        this.open = false;
      },
      showModal() {
        this.open = true;
      },
    });
    elements.set(id, el);
  }
  return elements.get(id);
}
const document = {
  getElementById: element,
  createElement: () => canvas(),
  querySelectorAll: () => [],
  addEventListener: (type, fn) => (handlers[type] = fn),
};
const sandbox = vm.createContext({
  console,
  assert,
  document,
  performance,
  setTimeout,
  cancelAnimationFrame: blank,
  requestAnimationFrame: () => 0,
  matchMedia: () => ({ matches: false }),
  localStorage: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  },
});
for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) {
  vm.runInContext(fs.readFileSync(path.join(root, src), "utf8"), sandbox, { filename: src });
}
vm.runInContext(fs.readFileSync(path.join(__dirname, "scenarios.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "journey.js"), "utf8"), sandbox);
