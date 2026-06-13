# Contributing to ContextHub

感谢你对 ContextHub 的关注！本文档将帮助你快速参与项目开发。

---

## Development Environment Setup

### 1. 系统要求

- **Node.js** >= 18
- **Rust** >= 1.70（通过 [rustup](https://rustup.rs/) 安装）
- **Git** >= 2.30
- **操作系统**：macOS / Windows / Linux

### 2. 安装 Tauri 系统依赖

参照 [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/) 安装平台相关依赖。

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows:**
- 安装 [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- 安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### 3. 克隆与安装

```bash
git clone https://github.com/your-username/ContextHub.git
cd ContextHub

# 安装前端依赖
npm install

# 验证 Rust 编译
cd src-tauri && cargo check && cd ..

# 启动开发模式
npm run tauri dev
```

---

## Code Style

### Rust (Backend)

- 遵循 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- 使用 `rustfmt` 格式化：`cargo fmt`
- 使用 `clippy` 检查：`cargo clippy -- -D warnings`
- 错误处理：使用 `anyhow` + `thiserror` 组合
- Pipeline 各阶段通过 trait 接口通信，保持模块解耦
- 数据库操作使用 `rusqlite`，SQL 关键字大写

### TypeScript / React (Frontend)

- 遵循 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) 基本原则
- 使用 TypeScript 严格模式（`strict: true`）
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand，避免 prop drilling
- UI 组件基于 shadcn/ui，不引入额外的 UI 库
- 样式使用 Tailwind CSS，不写自定义 CSS（除非必要）
- 路径别名：`@/` 映射到 `src/`

### 通用规范

- 文件命名：Rust 使用 `snake_case`，React 组件使用 `PascalCase`
- 缩进：2 空格（TypeScript），4 空格（Rust）
- 行宽：尽量不超过 100 字符
- 注释：仅在复杂逻辑处添加，代码应自解释

---

## Commit Message Conventions

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Type

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（不新增功能、不修复 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖变更 |

### Scope

| Scope | 说明 |
|-------|------|
| `ingestion` | 导入管线 |
| `analysis` | 分析引擎 |
| `compression` | 压缩引擎 |
| `export` | 导出适配器 |
| `db` | 数据库层 |
| `ui` | 前端界面 |
| `api` | Tauri IPC 命令 |
| `settings` | 配置管理 |

### 示例

```
feat(ingestion): add zip file import support
fix(analysis): handle empty project gracefully in local rules
docs: update README with export format details
refactor(compression): extract scoring logic into separate module
test(db): add integration tests for analysis versioning
chore: upgrade Tauri to v2.11
```

---

## Pull Request Process

### 1. 创建分支

```bash
# 从 main 创建功能分支
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

分支命名规范：
- `feat/` — 新功能
- `fix/` — Bug 修复
- `refactor/` — 重构
- `docs/` — 文档

### 2. 开发与提交

```bash
# 小步提交，每个 commit 做一件事
git add src-tauri/src/pipeline/ingestion/zip.rs
git commit -m "feat(ingestion): add zip file extraction"
```

### 3. 本地验证

提交 PR 前请确保：

```bash
# Rust 检查
cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings && cargo test && cd ..

# 前端检查
npm run build
```

### 4. 提交 Pull Request

- **标题**：遵循 Conventional Commits 格式，如 `feat(export): add JSON export format`
- **描述**：清晰说明变更内容、动机和影响范围
- **关联 Issue**：如有，在描述中引用 `Closes #123`
- **截图**：UI 变更请附截图

### 5. Code Review

- 至少需要一位维护者 Review 通过
- Review 意见请在 PR 内直接修改并推送，避免关闭重开
- 合并使用 Squash Merge，保持 main 历史整洁

---

## Reporting Issues

- **Bug 报告**：请包含操作系统、ContextHub 版本、复现步骤和预期行为
- **功能请求**：请描述使用场景和期望的解决方案
- **安全漏洞**：请勿在公开 Issue 中报告，请发送邮件至维护者

---

## Development Tips

### 调试 Rust 后端

在 `src-tauri/src/` 中使用 `eprintln!()` 输出调试信息，开发模式下会在终端显示。

### 调试 React 前端

开发模式下可使用浏览器 DevTools（Tauri 窗口右键 → Inspect Element）。

### 数据库位置

- **macOS**: `~/Library/Application Support/com.xiatian.tauri-app/contexthub.db`
- **Linux**: `~/.local/share/com.xiatian.tauri-app/contexthub.db`
- **Windows**: `%APPDATA%\com.xiatian.tauri-app\contexthub.db`

可使用 [DB Browser for SQLite](https://sqlitebrowser.org/) 查看数据库内容。

---

感谢你的贡献！
