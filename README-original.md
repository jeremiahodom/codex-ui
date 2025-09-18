<div align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Codexia Logo" width="120" height="120" />

  # [Codexia](https://github.com/milisp/codexia)
</div>

[![Downloads](https://img.shields.io/github/downloads/milisp/codexia/total.svg)](https://github.com/milisp/codexia/releases)
[![Stars](https://img.shields.io/github/stars/milisp/codexia?style=social)](https://github.com/milisp/codexia/stargazers)
[![Forks](https://img.shields.io/github/forks/milisp/codexia?style=social)](https://github.com/milisp/codexia/network/members)
[![Issues](https://img.shields.io/github/issues/milisp/codexia)](https://github.com/milisp/codexia/issues)
[![Feature Requests](https://img.shields.io/github/issues/milisp/codexia/feature-request?label=feature%20requests)](https://github.com/milisp/codexia/labels/feature-request)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/milisp/codexia/actions/workflows/ci.yml/badge.svg)](https://github.com/milisp/codexia/actions/workflows/ci.yml)

🚀 A powerful GUI and Toolkit for [Codex CLI](https://github.com/openai/codex)

fork chat, file-tree integration, notepad, git diff, build-in pdf csv/xlsx viewer, and more.

[USAGE](docs/USAGE.md) | [CONTRIBUTING](CONTRIBUTING.md) | [ARCHITECTURE](docs/ARCHITECTURE.md)

> [!TIP]
> **⭐ Star the repo and follow milisp on [x|Twitter](https://x.com/lisp_mi) and [github](https://github.com/milisp) for more**.

<div style="display: flex; gap: 10px; justify-content: center;">
  <div style="text-align: center;">
    <img src="public/codexia-reason.png" alt="reason" width="300">
    <p>Reason</p>
  </div>
  <div style="text-align: center;">
    <img src="public/codexia-web-search.png" alt="web-search" width="300">
    <p>Web Search</p>
  </div>
</div>

▶️ [Watch the automation video on Twitter](https://x.com/lisp_mi/status/1966147638266589376)

## News

- [2025-09-11] support codex built-in web search + file and filetree change detect and refresh
- [2025-09-05] fork chat + edit chat
  * (theme select + category conversatin) ideas thanks to reddit user [rachelo3](https://racheluidesign.weebly.com/)
- [2025-09-03] show the plan message
- [2025-08-29] support image input, codexia can read image now

## ✨ Features

### 🔄 **Multi-Session Support**
- Multiple independent chat sessions
- Auto-restore sessions on restart

### 💬 **Real-Time Streaming**

### Build-in Mutil file format support

- PDF text selection
- CSV/XLSX preview & selection

### ⚙️ **Flexible Configuration**
- Multiple AI providers (OpenAI, Ollama, Custom)
- Per-session model configs
- Adjustable sandbox policies
- Custom approval workflows
- Select working directory

### 🎯 **Professional UX**
- Responsive UI with shadcn/ui
- Config panel
- Notepad-chat integration
- Syntax-highlighted markdown
- Todo plan display
- Screenshot as input
- Fork chat
- Persistent UI state
- Auto WebPreview (e.g., Next.js http://localhost:3000)
- Theme & Accent selection

### 🛡️ **Security & Control**

Codexia prioritizes your privacy and security:

#### Codex CLI features
- Sandbox execution modes for safe code running
- Approval workflows for sensitive operations
- Configurable command execution policies
- Isolated processes per session for security

#### Privacy
- **Local Storage**: All data stays on your machine
- **No Telemetry**: No data collection or tracking
- **Open Source**: Full transparency through open source code

## Documentation

- Usage and setup: [USAGE](docs/USAGE.md)
- Architecture overview: [ARCHITECTURE](docs/ARCHITECTURE.md)
- Development and contributing: [CONTRIBUTING](CONTRIBUTING.md)

## 📋 Supported Codex Features

- ✅ Interactive chat
- ✅ Code generation/editing
- ✅ File operations with sandbox
- ✅ Command execution with approval
- ✅ Multiple AI providers
- ✅ Project-aware assistance
- ✅ Streaming responses
- ✅ Built-in Web Search

## 🛣️ Roadmap

- MCP tool call
- More file format support
- Better UI customization
- Plugin system
- Advanced debugging tools
- Real-time collaboration
- Performance optimizations

🚀 **Call to Action**

If you’re a developer, designer, or AI tinkerer — Join us on this exciting journey to redefine the developer experience with AI. Contribute to the project, share your feedback, and help build the future of intelligent coding environments. Together, we can make Codexia the go-to platform for developers worldwide!

## Development & Support Docs

For development commands, troubleshooting/FAQ, and contribution guidance, see [CONTRIBUTING](CONTRIBUTING.md) and [USAGE](docs/USAGE.md).

## 💖 Contributors

Thanks to all our wonderful contributors!

<a href="https://github.com/milisp/codexia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=milisp/codexia" />
</a>

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

Codexia is an independent open-source project and is not built by OpenAI or any company.

## 🙏 Acknowledgments

- [Plux](https://github.com/milisp/plux) one click @files from FileTree & notepad
- [Claude code](https://www.anthropic.com/claude-code) Co-Authored-By Claude code
- [codex](https://chatgpt.com/codex) for the Codex CLI
- [Tauri](https://tauri.app/) for the excellent desktop app framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [ChatGPT](https://chatgpt.com) Some code suggest by ChatGPT
- The open source community for the amazing tools and libraries

---

**Built with ❤️ using Tauri, React, and Rust**
