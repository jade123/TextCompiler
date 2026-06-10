# 文本阅读器 Tauri 打包操作文档

## 1. 环境准备

安装 Node.js 20 或更高版本，并确认 npm 可用：

```bash
node -v
npm -v
```

安装 Rust stable 工具链，并确认 `cargo` 可用：

```bash
rustc --version
cargo --version
```

Windows 推荐通过 `rustup-init.exe` 安装 Rust，并选择默认 MSVC 工具链。还需要安装 Visual Studio Build Tools 的“使用 C++ 的桌面开发”工作负载。

安装项目依赖：

```bash
npm ci
```

建议先跑测试和前端构建：

```bash
npm test
npm run build
```

## 2. 生成 macOS 通用版 App

macOS 通用版同时兼容 Apple Silicon M 系列芯片和 Intel 芯片。

在 macOS 机器上执行：

```bash
npm run dist:mac:universal
```

输出目录：

```text
src-tauri/target/universal-apple-darwin/release/bundle/
```

常见产物：

```text
文本阅读器_0.1.0_universal.dmg
文本阅读器.app
```

说明：

- `dmg` 适合分发给用户安装。
- `.app` 适合内部测试或直接运行。
- 当前配置为本地未正式签名构建，`src-tauri/tauri.conf.json` 中使用 ad-hoc 签名。
- 未签名 App 首次打开时，macOS 可能提示来自未知开发者，可在“系统设置 > 隐私与安全性”中允许打开。
- 如需正式发布，需要 Apple Developer ID 证书、公证 notarization 和 hardened runtime 配置。

## 3. 生成 Windows App

在 Windows 机器上执行：

```bash
npm ci
npm test
npm run build
npm run dist:win
```

执行前可先确认脚本内容必须包含 `--bundles nsis`：

```bash
npm pkg get scripts.dist:win
```

输出目录：

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/
```

常见产物：

```text
nsis/文本阅读器_0.1.0_x64-setup.exe
```

说明：

- `.exe` 是 NSIS 安装包。
- 当前配置生成 Windows x64 的 NSIS `.exe` 安装包。
- Windows 不再默认生成 `.msi`，避免 WiX `light.exe` 在部分环境中打包失败。
- 不要使用 `npm install --omit=dev`，打包需要 TypeScript、Vite、Tauri CLI 等开发依赖。
- 如需正式发布，建议配置 Windows 代码签名证书，避免 SmartScreen 提示。

## 4. 跨平台打包注意事项

推荐在目标系统上打包目标平台：

- macOS 通用版：在 macOS 上打包。
- Windows 安装包：在 Windows 上打包。
- Linux 包：可按需执行 `npm run dist` 或增加专门的 Linux target 脚本。

虽然 Tauri 支持交叉编译部分目标，但 Windows 安装包、签名、公证等流程在对应系统上更稳定。

## 5. 常见问题

依赖下载超时：

```bash
npm ci
```

如果网络不稳定，换网络或配置 npm registry 后重试。

缺少 Rust：

```text
failed to run 'cargo metadata'
```

说明当前机器没有安装 Rust/Cargo。安装 Rust 后重新打开终端，再执行：

```bash
cargo --version
npm run dist:win
```

Windows 上出现 `TS2688: Cannot find type definition file for 'vite/client'` 或 `TS5101: Option 'baseUrl' is deprecated`：

- 拉取最新代码后重新执行 `npm ci`。
- 当前项目已移除 `tsconfig.json` 中的 `vite/client` 类型入口和 `baseUrl` 路径别名，并已迁移为 Tauri + React + Vite。
- 如果仍看到旧错误，删除本地旧依赖和构建产物后重新安装：

```bash
rmdir /s /q node_modules
rmdir /s /q dist
rmdir /s /q src-tauri\target
npm ci
npm run build
```

macOS 打开提示不安全：

当前是未正式签名本地构建，正式分发前需要 Apple Developer ID 签名和 notarization。

Windows 提示未知发布者：

当前是未签名本地构建，正式分发前需要配置代码签名证书。

Windows 打包报 `failed to run ... WixTools314\light.exe`：

这是 MSI/WiX 打包阶段失败。当前脚本已改为只生成 NSIS 安装包：

```bash
npm run dist:win
```

如果本地仍然触发 MSI，请确认 `package.json` 中 `dist:win` 包含 `--bundles nsis`，并删除旧构建目录后重试：

```bash
rmdir /s /q src-tauri\target
npm ci
npm run dist:win
```

不要执行 `npm run dist` 来打 Windows 包；`npm run dist` 是通用打包入口，可能按默认 bundle 配置触发 MSI。Windows 只使用：

```bash
npm run dist:win
```

在 macOS 上交叉打 Windows 包报 `NotAttempted("llvm-rc")`：

这是 macOS 交叉编译 Windows 资源文件时缺少 `llvm-rc`，和 Windows 本机 `light.exe` 错误不是同一个问题。推荐在 Windows 机器上执行 `npm run dist:win`；如果一定要在 macOS 上交叉编译，需要额外安装 LLVM/llvm-rc。
