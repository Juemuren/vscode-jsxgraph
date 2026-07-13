# 目标

编写 VSCode 插件，实现以下功能

## 渲染

在 Markdown 的如下代码块中，渲染 `JSXGraph` 图表

````markdown
```jsxgraph
// ...
```
````

## 语言服务

在代码块内部提供语言服务，包括

- 语法高亮
- 代码补全
- 悬浮文档

最好能够借用 VSCode 已有的 JavaScript 插件，通过将 jsxgraph 内的代码识别为 JavaScript 代码，并导入 JSXGraph 导出的函数到代码补全的上下文里，从而自动让 VSCode 实现语法高亮、代码补全和悬浮文档。
