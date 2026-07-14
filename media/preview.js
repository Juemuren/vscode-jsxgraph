(function () {
  "use strict";

  const controllerKey = "__jsxgraphMarkdownController";
  const previousController = window[controllerKey];
  if (previousController && typeof previousController.dispose === "function") {
    previousController.dispose();
  }

  // Capture only the nonce granted to this contributed preview script. We do
  // not scan unrelated scripts or parse the CSP meta tag for credentials.
  const previewNonce = document.currentScript && document.currentScript.nonce;
  const renderedSources = new WeakMap();
  const managedBoards = new Map();
  const runnerName = `__jsxgraphMarkdownRun_${Math.random().toString(36).slice(2)}`;
  const maxRuntimeLoadAttempts = 100;
  let runtimeLoadAttempts = 0;
  let runtimeLoadTimer;
  let isDisposed = false;
  let defaultsConfigured = false;

  function configureDefaults() {
    if (defaultsConfigured || !window.JXG?.Options) {
      return;
    }

    const foreground = "var(--vscode-editor-foreground, #1f1f1f)";
    const background = "var(--vscode-editor-background, #ffffff)";
    const mutedForeground =
      "var(--vscode-descriptionForeground, var(--vscode-editor-foreground, #666666))";
    const options = window.JXG.Options;

    Object.assign(options.text, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.label, {
      strokeColor: foreground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.axis, {
      strokeColor: mutedForeground,
      highlightStrokeColor: foreground,
    });
    Object.assign(options.axis.ticks, {
      strokeColor: mutedForeground,
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

  function decodeSource(encoded) {
    const binary = window.atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function findHost(boardId) {
    const boardElement = document.getElementById(boardId);
    return boardElement && boardElement.closest(".jsxgraph-preview");
  }

  function showError(boardId, error) {
    const host = findHost(boardId);
    if (!(host instanceof HTMLElement)) {
      return;
    }

    const output = host.querySelector(".jsxgraph-error");
    const message = error instanceof Error ? error.stack || error.message : String(error);
    host.classList.add("has-error");
    if (output instanceof HTMLElement) {
      output.textContent = `JSXGraph render failed: ${message}`;
      output.hidden = false;
    }
  }

  function clearError(host) {
    const output = host.querySelector(".jsxgraph-error");
    host.classList.remove("has-error");
    if (output instanceof HTMLElement) {
      output.textContent = "";
      output.hidden = true;
    }
  }

  function findBoard(boardId) {
    const registries = [window.JXG && window.JXG.boards, window.JXG?.JSXGraph?.boards];
    for (const registry of registries) {
      if (!registry || typeof registry !== "object") {
        continue;
      }
      for (const board of Object.values(registry)) {
        if (
          board &&
          (board.container === boardId || board.containerObj?.getAttribute?.("id") === boardId)
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

  function executeDiagram(host) {
    if (!(host instanceof HTMLElement)) {
      return;
    }

    const encoded = host.dataset.jsxgraphSource;
    const boardId = host.dataset.jsxgraphBoardId;
    if (!encoded || !boardId) {
      return;
    }

    const signature = `${boardId}:${encoded}`;
    if (renderedSources.get(host) === signature) {
      return;
    }
    renderedSources.set(host, signature);
    clearError(host);
    freeBoard(boardId);

    if (!previewNonce) {
      showError(boardId, "VS Code did not grant the JSXGraph preview script a CSP nonce.");
      return;
    }

    let syntaxError;
    const captureScriptError = (event) => {
      syntaxError = event.error || event.message;
    };
    window.addEventListener("error", captureScriptError);

    try {
      const source = decodeSource(encoded);
      const script = document.createElement("script");
      script.nonce = previewNonce;
      script.textContent = [
        `globalThis[${JSON.stringify(runnerName)}](${JSON.stringify(boardId)}, function (JXG, BOARDID) {`,
        '"use strict";',
        source,
        "});",
      ].join("\n");
      document.body.appendChild(script);
      script.remove();
    } catch (error) {
      showError(boardId, error);
    } finally {
      window.removeEventListener("error", captureScriptError);
    }

    if (syntaxError) {
      showError(boardId, syntaxError);
    }
  }

  function renderAll() {
    if (isDisposed) {
      return;
    }

    cleanupDetachedBoards();
    const hosts = Array.from(document.querySelectorAll(".jsxgraph-preview"));
    if (!window.JXG) {
      window.clearTimeout(runtimeLoadTimer);
      if (runtimeLoadAttempts < maxRuntimeLoadAttempts) {
        runtimeLoadAttempts += 1;
        runtimeLoadTimer = window.setTimeout(renderAll, 50);
      } else {
        hosts.forEach((host) => {
          if (host instanceof HTMLElement && host.dataset.jsxgraphBoardId) {
            showError(host.dataset.jsxgraphBoardId, "The JSXGraph runtime could not be loaded.");
          }
        });
      }
      return;
    }

    runtimeLoadAttempts = 0;
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
    window.removeEventListener("vscode.markdown.updateContent", handleContentUpdate);
    for (const boardId of Array.from(managedBoards.keys())) {
      freeBoard(boardId);
    }
    delete window[runnerName];
  }

  window[controllerKey] = { dispose };
  window.addEventListener("vscode.markdown.updateContent", handleContentUpdate);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }
})();
