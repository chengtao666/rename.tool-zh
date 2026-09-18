# GitHub 发布说明

源码应提交到 GitHub 仓库，`.exe`、`.dmg`、`.zip` 等安装包不要提交到普通分支。
仓库中的 `.github/workflows/release.yml` 会在推送版本标签后自动构建并创建 GitHub Release。

## 首次上传源码

在 GitHub 新建一个空仓库，不要勾选自动创建 README、`.gitignore` 或 License。
然后在项目目录执行：

```powershell
git init -b main
git add .
git commit -m "feat: 添加中文桌面版和桌面端发布流程"
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

## 构建并发布桌面版

版本标签必须使用 `v` 开头，例如 `v0.1.0`：

```powershell
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions 将自动完成：

- Windows：构建便携版 `.exe`
- macOS：构建 Intel 与 Apple 芯片版 `.dmg` 和 `.zip`
- 所有产物统一上传到 GitHub Releases

也可以在仓库的 Actions 页面手动运行 `Build and publish desktop releases`。
手动运行只会保留 Actions artifacts，不会自动创建 GitHub Release；正式发行建议推送版本标签。

## macOS 签名说明

当前配置生成未签名的 macOS 安装包。普通用户首次打开时可能看到 Gatekeeper 提示，
可右键应用并选择“打开”，或在“系统设置 -> 隐私与安全性”中允许。

如果后续配置 Apple Developer ID 与公证凭据，需要移除工作流中的
`CSC_IDENTITY_AUTO_DISCOVERY: "false"`，并增加 Apple 证书和公证相关 secrets。
