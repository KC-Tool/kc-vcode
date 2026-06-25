# kc-vcode

轻量级 VSCode 风格桌面代码编辑器,Electron + React + TypeScript,自研 TS LSP、内嵌终端、完整 Git 集成。

![version](https://img.shields.io/badge/version-1.1.0-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![electron](https://img.shields.io/badge/electron-33-lightgrey) ![platform](https://img.shields.io/badge/platform-Win%20%7C%20macOS%20%7C%20Linux-lightgrey)

## v1.1.0 刚出

<https://github.com/KC-Tool/kc-vcode/releases/tag/v1.1.0>

这次大改:删了没用的 AI 占位实现,git 后端从手撸 porcelain 重写为 simple-git 高级 API + 结构化 diff,SourceControl UI 重做(5 个 tab:Changes / History / Stash / Branches / Remotes),加了 Git 菜单。修了一堆 build 路径错。

## 装

```bash
git clone https://github.com/KC-Tool/kc-vcode.git
cd kc-vcode
npm install
```

Windows 上 `node-pty` 要 Visual Studio Build Tools 才能 native compile,没装就用 `npm install --ignore-scripts` 跳过(terminal 跑不了,其他功能正常)。

## 跑

```bash
npm run dev       # dev 模式
npm run build     # 出 out/
npm run build:win # 出 .exe 安装包到 dist/
```

## 快捷键

<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> 命令面板  ·  <kbd>Ctrl</kbd>+<kbd>P</kbd> 快速打开文件  ·  <kbd>Ctrl</kbd>+<kbd>`</kbd> 终端  ·  <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Git Commit  ·  <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> 打开 Source Control  ·  <kbd>Ctrl</kbd>+<kbd>W</kbd> 关 tab  ·  <kbd>Ctrl</kbd>+<kbd>\\</kbd> 分屏

## 功能

- **Monaco 编辑器**,100+ 语言语法高亮 + Emmet
- **多 tab + 分屏编辑**,可拖拽重排
- **集成终端**(xterm.js + node-pty,Windows 走 ConPTY)
- **完整 Git 集成** —— init / status / stage / commit (强制 `-S` GPG/SSH 签名) / push / pull / fetch / branch / stash / blame / diff,跟 SourceControl UI 全打通
- **文件树** 拖拽移动文件、拖入窗口自动打开
- **全项目搜索** 支持正则 / 大小写 / 全词匹配 / 批量替换
- **Problems 面板** 跟 Monaco 诊断联动,错误位置一键跳转
- **Markdown 预览** 带 mermaid 流程图 + 代码高亮
- **命令面板** 跟 VSCode 一样能搜命令
- **断点调试** 集成 Node `--inspect-brk` 客户端
- **自研 TS LSP** hover / definition / references / codeActions / diagnostics,内置不依赖外部 language server
- **设置面板** 持久化到 `~/kc-vcode/settings.json`
- **GPG/SSH 提交签名** `~/.gitconfig` 配 `[commit] gpgsign=true [gpg] format=ssh` 后自动带 Verified 标

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面 | Electron 33 |
| 打包 | electron-vite 2.3 + electron-builder |
| 前端 | React 18.3 + TypeScript 5.6 |
| 编辑器 | Monaco 0.55 + emmet-monaco |
| 终端 | xterm.js 6.0 + node-pty |
| Markdown | react-markdown + mermaid + highlight.js |
| Git | simple-git 3.x |
| TS LSP | TypeScript Compiler API (内置,不依赖 tsserver) |

## 项目结构

```
src/
├── main/                 # Electron 主进程
│   ├── index.ts          # 入口
│   ├── window.ts         # BrowserWindow 构造
│   ├── mainWindow.ts     # 全局窗口句柄
│   ├── menu.ts           # 应用菜单 (File / Edit / View / Go / Terminal / Git / Help)
│   ├── fileTree.ts       # 目录递归读 (深度 ≤ 8,过滤 .git/node_modules/...)
│   ├── watcher.ts        # fs.watch 监听 (300ms debounce)
│   ├── terminal.ts       # node-pty 封装
│   ├── settingsStore.ts  # ~/kc-vcode/settings.json
│   ├── git.ts            # simple-git 高级 API + 结构化 diff 解析
│   ├── lsp/
│   │   └── typescript.ts # 自研 TS LSP (hover/def/ref/codeAction/diagnostics)
│   ├── debug/
│   │   └── client.ts     # Node inspect 调试客户端
│   └── ipc/              # 9 个 IPC handler
│       ├── file.ts dialog.ts settings.ts git.ts terminal.ts
│       ├── lsp.ts debug.ts shell.ts
│       └── index.ts
├── preload/index.ts       # contextBridge 暴露 electronAPI
└── renderer/              # React 前端
    └── src/
        ├── App.tsx       # 顶层布局 + 5 个 Provider
        ├── main.tsx
        ├── components/   # 20 个组件 (ActivityBar / Sidebar / Editor / TabBar / SourceControl / ...)
        ├── contexts/     # 5 个 Context (Editor / EditorUI / Settings / Confirm / Toast)
        ├── snippets/     # js / ts / py 代码片段
        └── assets/       # global.css + variables.css
```

## 已知坑

- `node-pty` 在 Windows 上要 Visual Studio Build Tools 才能 native compile,跳过的话 terminal 跑不了
- `Ctrl+Shift+K` 现在是 Push,之前是 KeyboardShortcuts,后续要调
- Debug 客户端 (`src/main/debug/client.ts`) 走 `--inspect-brk` 端口 + DAP over TCP,协议层 (CDP/DAP 混用) 还有问题,见 commit 历史

## 贡献

PR 欢迎。代码风格跟 commit 规范见 `CLAUDE.md`(中文 commit + 极简 body + SSH/GPG 签名)。

## License

MIT — 见 [LICENSE](LICENSE)。