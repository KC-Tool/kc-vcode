# AGENT.md

## 别动的东西

- `package.json` / `electron.vite.config.ts` —— 改完构建链路会炸
- `src/main/index.ts` 的 `app.whenReady().then(createWindow)` 生命周期 —— 改坏就启动不了
- `src/preload/index.d.ts` —— renderer 唯一能用的 `window.electronAPI` 类型契约，动了 renderer 全报错
- `src/renderer/src/assets/icon.svg` —— 应用图标和打包图标，改了 release 图标就变
- `electron-builder.yml` —— 出包配置

## 改之前要想清楚的东西

### 模块耦合
- `src/main/terminal.ts` 用了 `node-pty` 原生模块，**装包时 electron-builder 会自动 rebuild**，删了会挂
- `src/renderer/src/snippets/` 是纯数据，被 `Editor.tsx` 通过 `allSnippets` 消费
- `src/renderer/src/contexts/ConfirmContext.tsx` 必须在 `App.tsx` 里包 `<ConfirmProvider>`，否则 `useConfirm` 抛错
- `Editor.tsx` 顶部 `MonacoEnvironment` worker 配置影响所有 Monaco 实例
- `Editor.tsx` 的 `options` 改完不会自动应用到已挂载的编辑器（key={path} 才会重建）

### 配置文件
- `~/kc-vcode/settings.json` —— 用户配置，删了设置全丢
- `tsconfig.web.json` 里 `strict: true`，snippets 文件里的 `\${...}` 嵌套会触发 TS 报错
- `tsconfig.web.json` 里 `composite: true`，需要保证被引用的项目都有产物

### `src/renderer/src/snippets/` 数据
- `py.ts` 有 380+ 条重复 label（不是 bug，只是同标签不同 detail）
- `js.ts` / `ts.ts` 里 `customerr` / `useMediaQuery` / `retry` 等 snippet 用了 `'\${1:Name}Error'` 这种嵌套引号写法，**TS 5 严格模式不解析**（已记录在 commit），需要修改时小心
- 任何 snippet 内容含 `${...}` 模板插值的，**外层必须用反引号**，否则单/双引号字符串里的 `${}` 在 TS 5 严格模式会报 unterminated string literal

## 改了会出啥后果

- 改 main 进程任何文件 → 要重启 Electron 才有效果
- 改 preload → 重新打包才生效
- 改 renderer/src/ → Vite HMR 自动热更，但 Context Provider 改动会刷掉所有 state
- 改 `~/kc-vcode/settings.json` 路径（`src/main/index.ts` 里）→ 用户配置丢失
- 改 `node-pty` 相关代码 → Windows 上需要管理员权限或装 VS Build Tools 才能 npm install

## 工作流

- 改完即 commit，**别规范化 commit 信息**
- 改完要不要 push 是用户的事
- 装新依赖前先问

## 本次修复涉及的点

- **P1-1** `preload` 漏注册 git IPC：补全 `gitDiff` / `gitLog` / `gitStage` / `gitUnstage` / `gitCommit` / `gitDiscard` / `gitPush` / `gitPull` / `gitStash` / `gitStashPop` / `gitCheckout` / `gitCreateBranch` / `gitDiffStat` / `gitBlame` 到 `electronAPI`
- **P1-2** terminal 从 `child_process.spawn` 升级到 `node-pty`，需要 `node-pty` 依赖
- **P2-3** `vite-env.d.ts` 加了 `self.MonacoEnvironment` 类型声明
- **P2-4 / P2-5** `Editor.tsx` 接 `useSettings()`，editor options 全用 `settings.editor.*`，theme 跟 `settings.appearance.theme` 走
- **P2-6** 删了 `Editor.tsx` 顶部 200+ 行重复的 `snippetCompletions`，改用 `snippets/index.ts` 的 `allSnippets`
- **P3-7** `Editor.tsx` 加了 `settings.files.autoSave` 开启时的 debounce 1.5s 自动保存
- **P3-8** 新建 `ConfirmDialog` 组件 + `ConfirmContext`，替换 App.tsx / TabBar.tsx 的 `window.confirm()`，有动画+背景模糊
- **terminal.ts** 类型微调：去掉 `pty.IPty` 依赖（没装 @types），用 `ReturnType<typeof pty.spawn>` 推断

## 还没修的（按规则 14 放掉）

- **P3-9** `StatusBar` 的 `0 Errors 0 Warnings` 是硬编码，没接 Monaco marker service
- **P3-10** `mainWin` 还是 `let` 全局，没封装成 `getMainWindow()` / `setMainWindow()`
- **snippets 错**：上游就有的 `customerr` / `useMediaQuery` / `retry` 等 snippet 嵌套引号 TS 解析错，**不在本次任务范围**（规则 30）

## 后续修复

### 状态恢复（commit d9e6503）
- `EditorContext.tsx` 的 `loadSavedState`：恢复时**清空所有 tabs**，不再恢复上次的 tab 列表
- 原因：恢复 tabs 但 content 是空的，用户看到空白 tab，体验很差

### 终端异常（commit d9e6503）
- `Terminal.tsx`：**每次 visible=true 时重新创建 xterm + pty**，visible=false 时销毁
- 原来用 `createdRef` 锁死只创建一次，pty 重启后 xterm 还在监听旧的，导致数据丢失

### snippet 解析错误（commits 96ccab6 / 82a6ee2）
- esbuild 在 TS 严格模式下把 snippet 字符串里的 `${...}` Monaco 占位符当模板插值解析
- 修法：简化/删除有问题的 snippet（strinter/clgt/useMediaQuery），修 customerr/retry 的引号嵌套