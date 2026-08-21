# dsh-image-upload

为 DeepSeek Harness Web 版补上原生图片文件选择器。

插件不会新增独立按钮。点击输入框左下角原有的 `+` 后，菜单顶部显示 `attach`（浏览图片），下面保留 Harness 原来的全部命令，并用分隔线区分两层。选择的图片继续走 Harness 官方的附件校验、缩略图、删除、预览、发送和本地持久化流程。

## 当前支持范围

- PNG、JPEG、WebP、GIF。
- 一次可多选；Harness 本地附件存储的默认上限是每条消息 20 张。
- 默认单张最大 3.5 MiB、每条消息图片合计最大 100 MiB、单边最大 2000 px；部署可以修改这些限制。
- PDF、Word、Excel 和其他普通文件暂不支持，因为当前 Harness 的附件协议、会话事件、历史渲染和模型请求都只实现了图片。插件不会伪装成已支持这些格式。

## 安装

从 npm Registry 安装：

```powershell
dsh plugin --profile web add dsh-image-upload
```

本地开发安装：

```powershell
npm install
npm run build
dsh plugin --profile web add C:\absolute\path\to\dsh-image-upload
```

重启 `dsh web` 后生效。

## 隐私

插件不包含网络请求、分析统计或遥测，也不会自己读取文件内容或把文件复制进工作区。系统文件选择器返回的 `File` 对象会被送入 Harness 已有的 document-drop 附件通道；只有用户发送消息后，Harness 才会按当前模型和提供方配置处理图片。

## 验证

```powershell
npm test
npm run test:coverage
npm run pack:check
```

## English

Adds a native multi-image file picker to the existing DeepSeek Harness `+` command menu. The `attach` row appears above the original Harness commands and feeds selected PNG, JPEG, WebP, and GIF files into Harness's official image attachment pipeline. PDF, Word, Excel, and other non-image attachments are not supported by the current Harness attachment contract.

## License

MIT
