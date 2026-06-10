# TextCompiler / CodeDiff Studio

CodeDiff Studio 是 TextCompiler 仓库中的跨平台桌面代码编辑器，支持本地文件读写、拖拽打开、多标签编辑、Monaco 语法高亮、左右并排文件差异对比，以及打赏码弹窗。

## 本地开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
```

## 打包

macOS M 系列与 Intel 双架构通用版：

```bash
npm run dist:mac:universal
```

Windows x64 安装包与免安装压缩包：

```bash
npm run dist:win
```

详细操作见 [打包操作文档](./docs/PACKAGING.md)。
