# 目标

编写 VSCode 插件，基于 [JSXGraph](https://github.com/jsxgraph/jsxgraph) 实现以下功能

## 渲染

在 Markdown 的如下代码块中，渲染 `JSXGraph` 图表

````markdown
```jsxgraph
// ...
```
````

实现方式

- 通过 VS Code 的 `markdown.markdownItPlugins` 扩展原生 Markdown 预览，将
  `jsxgraph` fenced code block 转换为具有唯一 ID 的 JSXGraph 容器；源码使用
  UTF-8 Base64 放入 `data` 属性，不直接拼接进 HTML。
- 通过 `markdown.previewScripts` 从扩展包内离线加载 JSXGraph 和预览控制脚本，
  不使用外部 CDN。预览脚本异步加载时会进行有上限的等待。
- 控制脚本只读取 VS Code 授予自身 `<script>` 元素的
  `document.currentScript.nonce`。执行代码块时，动态创建 `<script>`，设置同一个
  nonce，并通过 `textContent` 写入代码。因此保留原生 Markdown CSP，不使用
  `eval`、`new Function` 或 `unsafe-eval`，也不要求将预览安全设置改为
  `Disable`。
- 每个代码块在局部函数作用域中执行，可直接使用参数 `JXG` 和内部变量
  `BOARDID`；初始化方式为 `JXG.JSXGraph.initBoard(BOARDID, options)`。
- 监听 `vscode.markdown.updateContent` 更新图表；更新或卸载时调用
  `JXG.JSXGraph.freeBoard` 释放已管理的画板、事件与动画引用。
- 同步运行错误、脚本语法错误、JSXGraph 加载失败以及未使用 `BOARDID` 初始化
  画板都会显示在对应代码块位置。
- 扩展显式设置 `untrustedWorkspaces.supported: false`。代码仍运行在原生 Markdown
  预览页面中，并非独立沙箱，因此只应预览可信工作区中的 Markdown；死循环仍可
  占用预览进程。

## 语言服务

在代码块内部提供语言服务，包括

- 语法高亮
- 代码补全
- 悬浮文档

最好能够借用 VSCode 已有的 JavaScript 插件，通过将 jsxgraph 内的代码识别为 JavaScript 代码，并导入 JSXGraph 导出的函数到代码补全的上下文里，从而自动让 VSCode 实现语法高亮、代码补全和悬浮文档。
