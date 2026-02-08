# Contributing to ClipForge

感谢你对 ClipForge 的关注！欢迎任何形式的贡献。

## 如何参与

### 报告 Bug

在 [Issues](https://github.com/yummysource/clipforge/issues) 中创建 Bug Report，请包含：

- 操作系统版本（如 macOS 15.2）
- ClipForge 版本
- 复现步骤
- 预期行为 vs 实际行为
- 错误截图或日志

### 功能建议

同样在 Issues 中创建 Feature Request，描述：

- 你想要什么功能
- 使用场景是什么
- 是否有类似工具的参考

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 提交更改：`git commit -m "feat: 添加某功能"`
4. 推送分支：`git push origin feat/your-feature`
5. 创建 Pull Request

### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `refactor:` 代码重构
- `style:` 代码格式（不影响逻辑）
- `chore:` 构建/工具链变更

## 开发环境

### 前置条件

- Node.js >= 18
- Rust >= 1.70
- FFmpeg / FFprobe（放置到 `src-tauri/` 作为 sidecar）
- yt-dlp（放置到 `src-tauri/` 作为 sidecar）

### 启动开发

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + Tauri）
npm run tauri dev

# 仅启动前端
npm run dev

# 类型检查
npm run typecheck
```

### 项目结构

- `src/` — React 前端（TypeScript + Tailwind CSS）
- `src-tauri/src/` — Rust 后端（Tauri 2）
- `src-tauri/src/commands/` — Tauri IPC 命令
- `src-tauri/src/engine/` — FFmpeg 进程管理

## 代码风格

- 前端遵循 TypeScript strict 模式
- 所有公开函数和组件需要 JSDoc 注释
- CSS 使用 Tailwind + CSS 变量
- Rust 代码遵循标准 `cargo fmt` 格式

## 许可证

提交贡献即表示你同意将代码以 [MIT License](LICENSE) 发布。
