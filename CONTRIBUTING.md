# Contributing to ClipForge

Thank you for your interest in ClipForge! Contributions of any kind are welcome.

## How to Contribute

### Report Bugs

Create a Bug Report in [Issues](https://github.com/yummysource/clipforge/issues). Please include:

- OS version (e.g. macOS 15.2)
- ClipForge version
- Steps to reproduce
- Expected behavior vs actual behavior
- Screenshots or logs

### Feature Requests

Create a Feature Request in Issues, describing:

- What feature you'd like
- Your use case
- Any reference to similar tools

### Submit Code

1. Fork this repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add some feature"`
4. Push the branch: `git push origin feat/your-feature`
5. Create a Pull Request

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `refactor:` Code refactoring
- `style:` Code formatting (no logic change)
- `chore:` Build/toolchain changes

## Development Environment

### Prerequisites

- Node.js >= 18
- Rust >= 1.70
- FFmpeg / FFprobe (place in `src-tauri/` as sidecar)
- yt-dlp (place in `src-tauri/` as sidecar)

### Getting Started

```bash
# Install dependencies
npm install

# Start dev server (frontend + Tauri)
npm run tauri dev

# Frontend only
npm run dev

# Type check
npm run typecheck
```

### Project Structure

- `src/` — React frontend (TypeScript + Tailwind CSS)
- `src-tauri/src/` — Rust backend (Tauri 2)
- `src-tauri/src/commands/` — Tauri IPC commands
- `src-tauri/src/engine/` — FFmpeg process management

## Code Style

- Frontend follows TypeScript strict mode
- All public functions and components require JSDoc comments
- CSS uses Tailwind + CSS variables
- Rust code follows standard `cargo fmt` formatting

## License

By submitting a contribution, you agree to release your code under the [MIT License](LICENSE).
