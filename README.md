# kc-vcode

A lightweight VSCode-like desktop code editor built with Electron, React, and TypeScript.

## Features

- Monaco Editor with syntax highlighting for 100+ languages
- Multi-tab editing with split view support
- Integrated terminal powered by xterm.js and node-pty
- Built-in Git integration (status, diff, log, stage, commit, push, pull, stash)
- File tree explorer with folder management
- Problems panel with diagnostic markers
- Markdown preview with syntax highlighting
- Search and replace across files
- Customizable settings with persistent storage
- Cross-platform support (Windows, macOS, Linux)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 33 |
| Build Tool | electron-vite 2.3 |
| Frontend | React 18.3 + TypeScript 5.6 |
| Editor | Monaco Editor 0.55 |
| Terminal | xterm.js 6.0 + node-pty |
| Markdown | react-markdown + mermaid + highlight.js |
| Packaging | electron-builder |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/KC-Tool/kc-vcode.git
cd kc-vcode
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run build:win
```

## Project Structure

```
├── src/
│   ├── main/          # Electron main process
│   │   ├── index.ts   # Entry point, IPC handlers
│   │   ├── git.ts     # Git operations
│   │   ├── terminal.ts # PTY management
│   │   └── watcher.ts # File system watcher
│   ├── preload/       # Preload scripts
│   └── renderer/      # React renderer process
│       └── src/
│           ├── components/  # UI components
│           ├── contexts/    # React contexts
│           ├── utils/       # Utilities
│           └── assets/      # Styles and static assets
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.