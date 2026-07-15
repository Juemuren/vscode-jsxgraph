// biome-ignore lint/complexity/useArrowFunction: Keep a classic-script IIFE for VS Code's Markdown preview.
(function () {
  // biome-ignore lint/suspicious/noRedundantUseStrict: This preview asset is loaded as a classic script, not an ES module.
  "use strict";

  const CONTROLLER_KEY = "__jsxgraphMarkdownController";
  const CONTENT_UPDATE_EVENT = "vscode.markdown.updateContent";
  const PREVIEW_SELECTOR = ".jsxgraph-preview";
  const ERROR_SELECTOR = ".jsxgraph-error";
  const RUNTIME_RETRY_INTERVAL_MS = 50;
  const RUNTIME_LOAD_TIMEOUT_MS = 5_000;
  const MAX_RUNTIME_LOAD_ATTEMPTS =
    RUNTIME_LOAD_TIMEOUT_MS / RUNTIME_RETRY_INTERVAL_MS;

  const previousController = window[CONTROLLER_KEY];
  if (previousController && typeof previousController.dispose === "function") {
    previousController.dispose();
  }

  // The nonce belongs to this contributed preview script and authorizes the
  // temporary scripts used to execute each diagram under VS Code's CSP.
  const previewNonce = document.currentScript?.nonce;
  const renderedSources = new WeakMap();
  const managedBoards = new Map();
  const runnerName = `__jsxgraphMarkdownRun_${Math.random().toString(36).slice(2)}`;
  let runtimeLoadAttempts = 0;
  let runtimeLoadTimer;
  let isDisposed = false;
  let defaultsConfigured = false;

  // Theme configuration

  function configureDefaults() {
    if (defaultsConfigured || !window.JXG?.Options) {
      return;
    }

    const foreground = "var(--vscode-editor-foreground, #1f1f1f)";
    const background = "var(--vscode-editor-background, #ffffff)";
    const mutedForeground = "var(--vscode-descriptionForeground, #666666)";
    const options = window.JXG.Options;

    Object.assign(options.text, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.label, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.ticks, {
      strokeColor: mutedForeground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.slider, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
      fillColor: background,
      highlightFillColor: background,
    });
    Object.assign(options.slider.baseline, {
      strokeColor: mutedForeground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.slider.ticks, {
      strokeColor: mutedForeground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.slider.highline, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.slider.label, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
    });

    defaultsConfigured = true;
  }

  // Preview host and error presentation

  function decodeSource(encoded) {
    const binary = window.atob(encoded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder().decode(bytes);
  }

  function findHost(boardId) {
    const boardElement = document.getElementById(boardId);
    return boardElement?.closest(PREVIEW_SELECTOR);
  }

  function getDiagramDefinition(host) {
    if (!(host instanceof HTMLElement)) {
      return undefined;
    }

    const encodedSource = host.dataset.jsxgraphSource;
    const boardId = host.dataset.jsxgraphBoardId;
    if (!encodedSource || !boardId) {
      return undefined;
    }

    return { boardId, encodedSource };
  }

  function showError(boardId, error) {
    const host = findHost(boardId);
    if (!(host instanceof HTMLElement)) {
      return;
    }

    const output = host.querySelector(ERROR_SELECTOR);
    const message =
      error instanceof Error ? error.stack || error.message : String(error);
    host.classList.add("has-error");
    if (output instanceof HTMLElement) {
      output.textContent = `JSXGraph render failed: ${message}`;
      output.hidden = false;
    }
  }

  function clearError(host) {
    const output = host.querySelector(ERROR_SELECTOR);
    host.classList.remove("has-error");
    if (output instanceof HTMLElement) {
      output.textContent = "";
      output.hidden = true;
    }
  }

  // JSXGraph board lifecycle

  function findBoard(boardId) {
    const registries = [window.JXG?.boards, window.JXG?.JSXGraph?.boards];
    for (const registry of registries) {
      if (!registry || typeof registry !== "object") {
        continue;
      }
      for (const board of Object.values(registry)) {
        if (
          board &&
          (board.container === boardId ||
            board.containerObj?.getAttribute?.("id") === boardId)
        ) {
          return board;
        }
      }
    }
    return undefined;
  }

  function freeBoard(boardId) {
    const board = managedBoards.get(boardId) || findBoard(boardId);
    if (board && window.JXG?.JSXGraph?.freeBoard) {
      try {
        window.JXG.JSXGraph.freeBoard(board);
      } catch (error) {
        console.warn(`Unable to release JSXGraph board ${boardId}:`, error);
      }
    }
    managedBoards.delete(boardId);
  }

  function cleanupDetachedBoards() {
    for (const boardId of managedBoards.keys()) {
      if (!document.getElementById(boardId)) {
        freeBoard(boardId);
      }
    }
  }

  function runDiagram(boardId, callback) {
    try {
      callback(window.JXG, boardId);
      const board = findBoard(boardId);
      if (!board) {
        throw new Error(
          `No JSXGraph board was initialized for BOARDID "${boardId}". ` +
            "Call JXG.JSXGraph.initBoard(BOARDID, options).",
        );
      }
      managedBoards.set(boardId, board);
    } catch (error) {
      const board = findBoard(boardId);
      if (board) {
        managedBoards.set(boardId, board);
      }
      showError(boardId, error);
    }
  }

  Object.defineProperty(window, runnerName, {
    configurable: true,
    value: runDiagram,
  });

  // Diagram source execution

  function injectDiagramScript(source, boardId) {
    let scriptError;
    const captureScriptError = (event) => {
      scriptError = event.error || event.message;
    };
    const script = document.createElement("script");
    script.nonce = previewNonce;
    script.textContent = [
      `globalThis[${JSON.stringify(runnerName)}](${JSON.stringify(boardId)}, function (JXG, BOARDID) {`,
      '"use strict";',
      source,
      "});",
    ].join("\n");

    window.addEventListener("error", captureScriptError);
    try {
      document.body.appendChild(script);
    } finally {
      window.removeEventListener("error", captureScriptError);
      script.remove();
    }

    if (scriptError) {
      throw scriptError;
    }
  }

  function executeDiagram(host) {
    const definition = getDiagramDefinition(host);
    if (!definition) {
      return;
    }
    const { boardId, encodedSource } = definition;

    const signature = `${boardId}:${encodedSource}`;
    if (renderedSources.get(host) === signature) {
      return;
    }
    renderedSources.set(host, signature);
    clearError(host);
    freeBoard(boardId);

    if (!previewNonce) {
      showError(
        boardId,
        "VS Code did not grant the JSXGraph preview script a CSP nonce.",
      );
      return;
    }

    try {
      injectDiagramScript(decodeSource(encodedSource), boardId);
    } catch (error) {
      showError(boardId, error);
    }
  }

  // Rendering and controller lifecycle

  function reportRuntimeLoadFailure(hosts) {
    for (const host of hosts) {
      const definition = getDiagramDefinition(host);
      if (definition) {
        showError(
          definition.boardId,
          "The JSXGraph runtime could not be loaded.",
        );
      }
    }
  }

  function ensureRuntimeLoaded(hosts) {
    if (window.JXG) {
      runtimeLoadAttempts = 0;
      return true;
    }

    window.clearTimeout(runtimeLoadTimer);
    if (runtimeLoadAttempts < MAX_RUNTIME_LOAD_ATTEMPTS) {
      runtimeLoadAttempts += 1;
      runtimeLoadTimer = window.setTimeout(
        renderAll,
        RUNTIME_RETRY_INTERVAL_MS,
      );
    } else {
      reportRuntimeLoadFailure(hosts);
    }
    return false;
  }

  function renderAll() {
    if (isDisposed) {
      return;
    }

    cleanupDetachedBoards();
    const hosts = Array.from(document.querySelectorAll(PREVIEW_SELECTOR));
    if (!ensureRuntimeLoaded(hosts)) {
      return;
    }

    configureDefaults();
    hosts.forEach(executeDiagram);
  }

  function handleContentUpdate() {
    runtimeLoadAttempts = 0;
    window.setTimeout(renderAll, 0);
  }

  function dispose() {
    if (isDisposed) {
      return;
    }
    isDisposed = true;
    window.clearTimeout(runtimeLoadTimer);
    window.removeEventListener(CONTENT_UPDATE_EVENT, handleContentUpdate);
    for (const boardId of Array.from(managedBoards.keys())) {
      freeBoard(boardId);
    }
    delete window[runnerName];
  }

  window[CONTROLLER_KEY] = { dispose };
  window.addEventListener(CONTENT_UPDATE_EVENT, handleContentUpdate);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }
})();
