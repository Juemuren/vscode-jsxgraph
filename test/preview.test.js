const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const previewScript = readFileSync(
  join(__dirname, "..", "media", "preview.js"),
  "utf8",
);

function createPreviewHarness({ nonce = "preview-nonce", source }) {
  const listeners = new Map();
  const injectedScripts = [];
  const boards = {};

  class FakeHTMLElement {
    constructor() {
      this.classList = {
        add() {},
        remove() {},
      };
      this.dataset = {};
      this.hidden = false;
      this.textContent = "";
    }
  }

  const errorOutput = new FakeHTMLElement();
  errorOutput.hidden = true;
  const host = new FakeHTMLElement();
  host.dataset.jsxgraphBoardId = "jsxgraph-board-1";
  host.dataset.jsxgraphSource = Buffer.from(source, "utf8").toString("base64");
  host.querySelector = (selector) =>
    selector === ".jsxgraph-error" ? errorOutput : null;

  const boardElement = new FakeHTMLElement();
  boardElement.closest = (selector) =>
    selector === ".jsxgraph-preview" ? host : null;

  const options = {
    text: {},
    label: {},
    ticks: {},
    slider: {
      baseline: {},
      ticks: {},
      highline: {},
      label: {},
    },
  };

  let context;
  const sandbox = {
    HTMLElement: FakeHTMLElement,
    TextDecoder,
    Uint8Array,
    atob: (encoded) => Buffer.from(encoded, "base64").toString("binary"),
    console,
    document: {
      currentScript: { nonce },
      readyState: "complete",
      body: {
        appendChild(script) {
          injectedScripts.push({
            nonce: script.nonce,
            textContent: script.textContent,
          });
          vm.runInContext(script.textContent, context);
        },
      },
      createElement(tagName) {
        assert.equal(tagName, "script");
        return { nonce: "", textContent: "", remove() {} };
      },
      getElementById(id) {
        return id === host.dataset.jsxgraphBoardId ? boardElement : null;
      },
      querySelectorAll(selector) {
        assert.equal(selector, ".jsxgraph-preview");
        return [host];
      },
      addEventListener() {},
    },
    JXG: {
      Options: options,
      boards,
      JSXGraph: {
        initBoard(boardId, boardOptions) {
          const board = { container: boardId, options: boardOptions };
          boards[boardId] = board;
          return board;
        },
        freeBoard() {},
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
  };
  sandbox.window = sandbox;
  context = vm.createContext(sandbox);

  vm.runInContext(previewScript, context);

  return {
    boards,
    context,
    errorOutput,
    injectedScripts,
    options,
  };
}

test("executes a diagram using the preview script's CSP nonce", () => {
  const harness = createPreviewHarness({
    nonce: "granted-preview-nonce",
    source:
      "globalThis.executedBoardId = BOARDID; JXG.JSXGraph.initBoard(BOARDID, { axis: true });",
  });

  assert.equal(harness.injectedScripts.length, 1);
  assert.equal(harness.injectedScripts[0].nonce, "granted-preview-nonce");
  assert.equal(harness.context.executedBoardId, "jsxgraph-board-1");
  assert.equal(harness.boards["jsxgraph-board-1"].options.axis, true);
});

test("refuses to execute a diagram when the preview has no CSP nonce", () => {
  const harness = createPreviewHarness({
    nonce: "",
    source: "globalThis.diagramExecuted = true;",
  });

  assert.equal(harness.injectedScripts.length, 0);
  assert.equal(harness.context.diagramExecuted, undefined);
  assert.equal(harness.errorOutput.hidden, false);
  assert.match(harness.errorOutput.textContent, /did not grant.*CSP nonce/);
});

test("configures VS Code theme colors before executing diagrams", () => {
  const harness = createPreviewHarness({
    source:
      "globalThis.foregroundSeenByDiagram = JXG.Options.text.strokeColor; JXG.JSXGraph.initBoard(BOARDID, {});",
  });

  assert.equal(
    harness.context.foregroundSeenByDiagram,
    "var(--vscode-editor-foreground, #1f1f1f)",
  );
  assert.deepEqual(harness.options.text, {
    strokeColor: "var(--vscode-editor-foreground, #1f1f1f)",
    highlightStrokeColor: "var(--vscode-editor-foreground, #1f1f1f)",
  });
  assert.equal(
    harness.options.slider.fillColor,
    "var(--vscode-editor-background, #ffffff)",
  );
  assert.equal(
    harness.options.ticks.strokeColor,
    "var(--vscode-descriptionForeground, #666666)",
  );
});
