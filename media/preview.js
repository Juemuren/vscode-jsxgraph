(function () {
  "use strict";

  const maxRuntimeLoadAttempts = 100;
  let runtimeLoadAttempts = 0;
  let runtimeLoadTimer;

  function decodeSource(encoded) {
    const binary = window.atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function showError(host, error) {
    const output = host.querySelector(".jsxgraph-error");
    if (!(output instanceof HTMLElement)) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    host.classList.add("has-error");
    output.textContent = `JSXGraph render failed: ${message}`;
    output.hidden = false;
  }

  function render(host) {
    if (!(host instanceof HTMLElement) || host.dataset.jsxgraphRendered === "true") {
      return true;
    }

    const element = host.querySelector(".jsxgraph-board");
    const encoded = host.dataset.jsxgraphSource;

    if (!(element instanceof HTMLElement) || !encoded) {
      host.dataset.jsxgraphRendered = "true";
      showError(host, "The generated diagram container is invalid.");
      return true;
    }

    if (!window.JXG) {
      return false;
    }

    host.dataset.jsxgraphRendered = "true";

    try {
      const source = decodeSource(encoded);
      const execute = new Function(
        "JXG",
        "BOARDID",
        `"use strict";\n${source}\n//# sourceURL=jsxgraph-markdown-preview.js`,
      );
      execute(window.JXG, element.id);
    } catch (error) {
      const isContentSecurityPolicyError =
        error instanceof EvalError || /unsafe-eval|Content Security Policy/i.test(String(error));

      if (isContentSecurityPolicyError) {
        showError(
          host,
          "JavaScript execution is blocked by Markdown preview security. " +
            "Run ‘Markdown: Change Preview Security Settings’ and select ‘Disable’.",
        );
      } else {
        showError(host, error);
      }
    }

    return true;
  }

  function renderAll() {
    const hosts = Array.from(document.querySelectorAll(".jsxgraph-preview"));
    const isRuntimePending = hosts.some((host) => !render(host));

    window.clearTimeout(runtimeLoadTimer);
    if (isRuntimePending && runtimeLoadAttempts < maxRuntimeLoadAttempts) {
      runtimeLoadAttempts += 1;
      runtimeLoadTimer = window.setTimeout(renderAll, 50);
    } else if (isRuntimePending) {
      hosts.forEach((host) => {
        if (host instanceof HTMLElement && host.dataset.jsxgraphRendered !== "true") {
          host.dataset.jsxgraphRendered = "true";
          showError(host, "The JSXGraph runtime could not be loaded.");
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }

  window.addEventListener("vscode.markdown.updateContent", () => {
    runtimeLoadAttempts = 0;
    renderAll();
  });
})();
