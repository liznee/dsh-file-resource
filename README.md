# dsh-file-resource

[![CI](https://github.com/liznee/dsh-file-resource/actions/workflows/ci.yml/badge.svg)](https://github.com/liznee/dsh-file-resource/actions/workflows/ci.yml)

DeepSeek Harness Web 的本地文件输入插件。在输入框原有的 `+` 菜单顶部增加 `attach`，并用分隔线与 Harness 原生命令区分；不会再增加一个单独按钮。


<img width="496" height="320" alt="image" src="https://github.com/user-attachments/assets/c1d4a1d3-7193-4599-b80f-50b3e74d815c" />
<img width="780" height="240" alt="image" src="https://github.com/user-attachments/assets/f2ad5e56-3853-4049-b5c0-dff53eee6e05" />



选择图片时继续使用 Harness 官方图片附件流程。选择文档时，插件在本机解析并保存为会话隔离的私有资源，模型只在需要时通过一个受限读取工具按页、幻灯片、工作表、分块或搜索结果读取。界面不会伪造或显示“请读取某个文件”的用户消息。

## 功能

- 一个文件选择器同时接收图片、文档、文本和常见代码文件，可多选。
- 文档以紧凑卡片显示在圆角输入框内部，文件名自动截断，并显示真实上传进度与本地解析状态。
- 卡片右侧的灰色圆形 `×` 可以取消正在进行的上传或移除文件。
- 只有文件、没有输入文字时，可直接使用 Harness 原有发送按钮。
- 图片仍由 Harness 原生预览、删除、持久化和多模态模型流程处理。
- 文档解析完全在本机完成；上传或解析本身不会调用模型，也没有遥测。
- 支持全局拖拽（把文件拖到窗口任意位置，"松开以添加文件"）与文档粘贴（在输入框 `Ctrl+V` 粘贴复制的文件）；图片始终走 Harness 原生流程。
- 发送消息（含"只传文件"）时会自动在消息末尾附上 `@文件名` 引用，聊天记录里直接可见本条消息带了哪些文件；模型按名对应资源 ID 再读取。（输入框里的 `@` 属于 Harness 自带的工作区文件/会话引用，插件不与之冲突。）
- 点击聊天消息里的蓝色 `@文件名`，右侧会滑出该文件的预览面板（Esc、点遮罩或 × 关闭）。

## 更新日志

- **v0.4.9（2026-08-29）**：预览不再遮挡左侧——关闭改为 × / Esc，左边滚动、语音输入完全不受影响。
- **v0.4.8（2026-08-29）**：预览面板顶部/底部与左边会话列精确对齐（窗口缩放自动重排）。
- **v0.4.7（2026-08-29）**：修复左右分栏错位——只收缩会话滚动容器，消息与输入框作为整体左移、与预览列对齐。
- **v0.4.6（2026-08-29）**：预览只对"本会话真实附件的文件"开放（`@邮箱`、随手打的 `@文字` 不再触发），输入框内的点击一律忽略。
- **v0.4.5（2026-08-29）**：Excel/CSV 预览改为带格线的表格（换行显示）；预览面板与对话布局对齐。
- **v0.4.4（2026-08-29）**：会话发送历史——发送过的文件在移除附件卡后仍可预览。
- **v0.4.3（2026-08-29）**：预览失败时给出明确原因，不再笼统提示"无法预览"。
- **v0.4.0（2026-08-29）**：点击聊天中的 `@文件名` 在右侧预览文件内容。
- **v0.3.0（2026-08-29）**：发送消息自动附带 `@文件名` 引用，聊天记录可见、模型可定位。

完整历史见 [CHANGELOG.md](CHANGELOG.md)。

## 支持格式

| 类别 | 格式 |
| --- | --- |
| Harness 原生图片 | PNG、JPEG、WebP、GIF |
| 文档 | PDF、DOCX、XLSX、PPTX、ODT、ODS、ODP、RTF、EPUB |
| 文本与代码 | TXT、Markdown、CSV、TSV、JSON/JSONL、XML、HTML、YAML、日志、配置、SQL，以及常见 JS/TS/Python/Java/C/C++/C#/Go/Rust/Ruby/PHP/Shell/PowerShell/CSS 文件 |

限制：旧二进制 `DOC`、`XLS`、`PPT` 不支持，请先另存为 `DOCX`、`XLSX`、`PPTX`。PDF 读取文字层；纯扫描件不会自动 OCR，避免后台下载识别模型、额外占用 CPU 或把内容发给第三方。

## 安装

要求与当前 DeepSeek Harness 一致：Node.js `22.19+` 或 `24+`。`v0.1.1` 已在 DeepSeek Harness `0.1.1-rc.1` 上验证。

从 npm 安装固定版本：

```powershell
dsh plugin --profile web add dsh-file-resource@0.1.1
```

也可以直接安装对应的 GitHub Release：

```powershell
dsh plugin --profile web add github:liznee/dsh-file-resource#v0.1.1
```

安装后运行 `dsh --profile web --dump-config`，输出中应出现 `# == dsh-file-resource`。随后重启 `dsh web`，从输入框左下角的 `+` 选择 `attach`。

升级时，将上述安装命令中的 `0.1.1` 替换为准备安装的新版本。卸载命令：

```powershell
dsh plugin --profile web remove dsh-file-resource
```

本地开发安装：

```powershell
npm install
npm run build
dsh plugin --profile web add C:\absolute\path\to\dsh-file-resource
```

## 本地存储与清理

默认缓存位于 `$DSH_HOME/resources/dsh-file-resource/v1`；未设置 `DSH_HOME` 时位于 `~/.dsh/resources/dsh-file-resource/v1`。插件不会把副本或 Markdown 转换文件写进当前项目，也不会改动原文件。

- 单文件上限：50 MiB。
- 单次选择上限：20 个文件、合计 200 MiB。
- 总缓存上限：1 GiB，按内容 SHA-256 去重。
- 派生文本使用 gzip 压缩，并与原文件一起计入缓存上限。
- 达到上限时只按 LRU 清理已经发送的旧资源；正在编辑的文件不会被后台淘汰。
- 已解除引用的对象保留最多 7 天，启动时执行回收；没有常驻扫描器或清理定时器。

## Token 与性能

文档全文不会直接塞进系统提示词。插件固定增加一个读取工具；按 Harness 自带的“4 字符约 1 token”估算，它的 schema 约为 188 tokens。文件索引约为：1 个文件 79 tokens、5 个文件 165 tokens、20 个文件 490 tokens。真正的文档内容仅在模型调用 `read_uploaded_resource` 时进入上下文，默认每次最多返回 8,000 字符，硬上限 24,000 字符。

发布前的小型真实文件基准：Host 冷导入约 12 ms、约 1.6 MiB 堆增量；DOCX/XLSX/PPTX 通常在 3–35 ms 内完成，PDF 第一次加载解析器约 0.1–0.6 秒。主机插件包约 51 KiB；PDF.js 只在第一次处理 PDF 时延迟加载。数据取决于机器和文件复杂度。

## 安全与隐私

- 浏览器接口要求同源请求和插件专用请求头，资源 ID 与会话绑定。
- 扩展名、声明类型和文件魔数交叉验证，拒绝伪装的可执行文件。
- ZIP/Office 文件限制条目数、展开体积和压缩比，防止解压炸弹。
- PDF.js 固定为已修复版本，并显式关闭 PDF 脚本与动态求值；限制页数与图片像素预算。
- 文件内容中的指令一律被提示为不可信数据。
- 插件不包含统计、遥测或第三方上传。只有用户发送消息后，所选模型提供方才会按正常 Harness 流程收到模型实际读取的内容。

安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告；不要在公开 Issue 中披露可利用细节。

## 验证

```powershell
npm test
npm run test:coverage
npm audit --omit=dev
npm run pack:check
```

当前测试覆盖文件选择、真实进度、取消、会话隔离、配额、缓存回收、恶意 ZIP 防护，以及真实 DOCX/XLSX/PPTX/PDF/ODF/EPUB/RTF 解析。

## English

`dsh-file-resource` adds a unified `attach` entry to the existing DeepSeek Harness Web `+` menu. Images continue through Harness's native attachment pipeline. Documents are parsed locally into session-scoped, content-addressed resources and exposed to the model through one bounded read tool. Sending with attached documents appends `@fileName` mentions to the message, so the conversation visibly shows what was sent and the model maps the names to resource IDs; clicking an `@fileName` in the conversation previews the file in a right-side split view. (The composer's `@` itself belongs to Harness's native workspace-file references.) Drag any file anywhere over the window, or paste copied files into the composer, to attach them.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history. Recent highlights: sent messages carry visible `@fileName` mentions (v0.3.0); clicking an `@fileName` opens a right-side preview in a split view, spreadsheets render as bordered tables (v0.4.0–v0.4.5); previews are limited to files actually attached or sent in this conversation (v0.4.6); the split is aligned with the conversation column (v0.4.7/0.4.8); preview no longer blocks the left side (v0.4.9); a per-session send history keeps sent-file previews alive after the draft card is removed (v0.4.4).

Supported documents: PDF, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, EPUB, plus common text and source-code formats. Legacy DOC/XLS/PPT files and automatic OCR for image-only PDFs are intentionally unsupported.

Install with:

```powershell
dsh plugin --profile web add dsh-file-resource@0.1.1
# or: dsh plugin --profile web add github:liznee/dsh-file-resource#v0.1.1
```

The plugin has no telemetry or third-party file upload. See the Chinese sections above for cache limits, token estimates, security controls, and performance measurements.

## License

MIT © liznee
