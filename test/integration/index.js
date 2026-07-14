const assert = require("node:assert/strict");
const vscode = require("vscode");

async function eventually(action, predicate, message) {
  let result;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    result = await action();
    if (predicate(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.fail(message);
}

async function run() {
  const extension = vscode.extensions.getExtension("raind.vscode-jsxgraph");
  assert.ok(extension, "development extension was not loaded");
  await extension.activate();

  const document = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: "```jsxgraph\nJXG.JSXGraph.\ndocument.\n```\n",
  });
  await vscode.window.showTextDocument(document);
  const completionPosition = new vscode.Position(1, "JXG.JSXGraph.".length);
  const completions = await eventually(
    () =>
      vscode.commands.executeCommand(
        "vscode.executeCompletionItemProvider",
        document.uri,
        completionPosition,
      ),
    (result) => result?.items.some((item) => item.label === "initBoard"),
    "built-in TypeScript provider did not return JSXGraph completions",
  );
  assert.ok(completions.items.some((item) => item.label === "initBoard"));

  const domCompletions = await eventually(
    () =>
      vscode.commands.executeCommand(
        "vscode.executeCompletionItemProvider",
        document.uri,
        new vscode.Position(2, "document.".length),
      ),
    (result) => result?.items.some((item) => item.label === "querySelector"),
    "built-in TypeScript provider did not return DOM standard-library completions",
  );
  assert.ok(domCompletions.items.some((item) => item.label === "querySelector"));

  const hovers = await eventually(
    () =>
      vscode.commands.executeCommand(
        "vscode.executeHoverProvider",
        document.uri,
        new vscode.Position(1, 4),
      ),
    (result) => Array.isArray(result) && result.length > 0,
    "built-in TypeScript provider did not return JSXGraph hover information",
  );
  assert.ok(hovers.length > 0);

  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

module.exports = { run };
