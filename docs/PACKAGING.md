# CodeDiff Studio 打包操作文档

## 1. 环境准备

安装 Node.js 20 或更高版本，并确认 npm 可用：

```bash
node -v
npm -v
```

安装项目依赖：

```bash
npm install
```

建议先跑测试和基础构建：

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
release/
```

常见产物：

```text
CodeDiff Studio-0.1.0-mac-universal.dmg
CodeDiff Studio-0.1.0-mac-universal.zip
```

说明：

- `dmg` 适合分发给用户安装。
- `zip` 适合内部测试或直接解压运行。
- 当前配置为本地未签名构建，`package.json` 中设置了 `mac.identity: null`。
- 未签名 App 首次打开时，macOS 可能提示来自未知开发者，可在“系统设置 > 隐私与安全性”中允许打开。
- 如需正式发布，需要 Apple Developer ID 证书、公证 notarization 和 hardened runtime 配置。

只生成未压缩的 `.app` 目录用于本机快速检查：

```bash
npm run pack:mac:universal
```

## 3. 生成 Windows App

在 Windows 机器上执行：

```bash
npm run dist:win
```

输出目录：

```text
release/
```

常见产物：

```text
CodeDiff Studio-0.1.0-win-x64.exe
CodeDiff Studio-0.1.0-win-x64.zip
```

说明：

- `.exe` 是 NSIS 安装包。
- `.zip` 是免安装压缩包。
- 当前配置生成 Windows x64 版本。
- 如需正式发布，建议配置 Windows 代码签名证书，避免 SmartScreen 提示。

## 4. 跨平台打包注意事项

推荐在目标系统上打包目标平台：

- macOS 通用版：在 macOS 上打包。
- Windows 安装包：在 Windows 上打包。
- Linux 包：可按需补充 `electron-builder --linux`。

虽然 electron-builder 支持部分跨平台构建，但 Windows 安装包、签名、公证等流程在对应系统上更稳定。

## 5. 常见问题

依赖下载超时：

```bash
npm install
```

如果网络不稳定，换网络或配置 npm registry 后重试。

macOS 打开提示不安全：

当前是未签名本地构建，正式分发前需要 Apple Developer ID 签名和 notarization。

Windows 提示未知发布者：

当前是未签名本地构建，正式分发前需要配置代码签名证书。
