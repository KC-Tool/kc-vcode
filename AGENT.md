# AGENT.md

## 别动的东西

- `package.json` / `electron.vite.config.ts` —— 改完构建链路会炸
- `src/main/index.ts` 的 `app.whenReady().then(createWindow)` 生命周期 —— 改坏就启动不了
- `src/preload/index.d.ts` —— 这是 renderer 唯一能用的 `window.electronAPI` 类型契约，动了 renderer 全报错
- `src/renderer/src/assets/icon.svg` —— 应用图标和打包图标，改了 release 图标就变
- `electron-builder.yml` —— 出包配置

## 改之前要想清楚的东西

- `src/main/terminal.ts`：用的是 `child_process.spawn`，不是真 PTY，要变真 PTY 得加 `node-pty` 原生依赖（**要装包**）。P1 修了之后会有重构成本
- `src/main/git.ts`：所有 git 命令走 `child_process.exec`，**shell 注入风险**。改 `gitCommit` 之外的函数时不要加 `message.replace` 这类转义逻辑
- `src/renderer/src/contexts/EditorContext.tsx`：tab 状态在这里管，state shape 改一处全 renderer 都要跟
- `src/renderer/src/components/Editor.tsx`：Monaco 实例存在 `editorRef` / `monacoRef` 两个 ref 里，被多处 effect 复用，重写会引发 memory leak
- `src/renderer/src/assets/styles/global.css`：1500+ 行的大文件，没拆分，**别全读改**，要加新样式在文件末尾追加即可
- `src/renderer/src/snippets/`：snippet 数据是**纯数据**，`py.ts` 有 380+ 条重复 label（不是 bug，只是同标签不同 detail），不要去重

## 改了会出啥后果

- 改 main 进程任何文件 → 要重启 Electron 才有效果
- 改 preload → 重新打包才生效
- 改 renderer/src/ → Vite HMR 自动热更，但 Context Provider 改动会刷掉所有 state
- 改 `~/kc-vcode/settings.json` 路径（`src/main/index.ts` 里）→ 用户配置丢失

## 工作流

- 改完即 commit，**别规范化 commit 信息**
- 改完要不要 push 是用户的事
- 装新依赖前先问