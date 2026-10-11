[English](README.en.md) | [简体中文](README.md)

> **Unofficial third-party plugin. Not affiliated with or endorsed by DeepSeek.**

# DSH Wallpaper / DSH 壁纸背景

> **v0.3.0-rc.7 — MIT-licensed preview candidate; Desktop visual acceptance pending.** A local image/video wallpaper plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Desktop and Web. This changes **only the DSH app window**, not the OS desktop wallpaper. Licensed under **MIT**; publication and Desktop acceptance are still pending.

## ✨ 功能

- **壁纸**：静态 PNG/JPG/WebP，及 Chromium 支持的视频格式（推荐 H.264 MP4/WebM）；本地导入、循环静音播放、独立记忆两种文件。
- **独立设置分类**：`设置 → 壁纸背景`，与「通用」平级，中英文界面。
- **分区透明度（本版本新增）**：四个滑块分别控制「聊天正文」「左侧栏」「顶部导航」「输入框」的**底色不透明度**，互不连动。不会降低整张壁纸的透明度，也不会调节文字透明度。
-  **双模糊调节**：原「模糊」更名为「壁纸自身模糊」（覆盖壁纸的独立 `backdrop-filter` 层，不改变图像尺寸），另加「面板磨砂强度」（`backdrop-filter`，只采样面板后面的壁纸，不模糊面板内文字）。壁纸不透明度、暗度、铺满/完整显示、暂停与系统减少动态效果均保留。
- **侧栏修复**：壁纸启用时消除工作区会话列表底部的白色渐隐遮挡及硬截断线，保留滚动与较柔和的滚动条。
- **可恢复性**：壁纸关闭时自动撤销样式；提供「恢复推荐透明度」、测试渐变图案与诊断信息。
- **外观预设（rc.7 重新设计）**：阅读强调清晰内容、均衡强调半透明玻璃、沉浸强调完整壁纸；三套预设一键应用；支持另存最多 12 个命名自定义预设、覆盖更新和确认后删除。
- **实时 A/B 对比（rc.4）**：拖动滑块时立即更新并保存；自动保存首次调整前的临时比较基准，同时提供双缩略示意图、主窗口切换「修改前 / 当前」和一键恢复。切换查看本身不写入设置。
- **本地隐私**：壁纸 Blob 存入当前客户端 IndexedDB，外观偏好与自定义预设存入不同的 `localStorage` 键。插件不向远端上传壁纸或预设。

## 🎚️ 预设、对比与“透明度”语义

**术语统一**：本插件控制的是壁纸和 UI 面板的**不透明度（opacity）**，不是透明度（transparency）。两者数学上相反：`透明度 = 100% - 不透明度`。例如壁纸**不透明度 40%**意味着只保留 40% 的壁纸像素贡献（在普通 Alpha 叠加模型下），**不是**壁纸有 40% 的透明程度。0% 面板底色不透明度＝底板透明；100%＝底板不透明；滑块不会改变文字自身的不透明度。

**升级安全**：此前设置页错把 `opacity` 显示为「壁纸透明度」。rc.4 **只改标签、不反转数值**，原来存储的 40% 更新后依然是 40%，效果不突变；`localStorage` 媒体偏好键保持 `dsh-local-video-wallpaper-prefs-v2`。壁纸不透明度范围仍为 15%–100%。

### 一键预设

- **阅读**：壁纸柔和失焦，内容区底色更接近不透明，适合长时间阅读。
- **均衡**：更清楚的壁纸 + 局部磨砂玻璃，以交互和氛围平衡为目标。
- **沉浸**：完整清晰的壁纸、显著降低界面底色与去除磨砂，复杂图片上应注意文字对比度。
- **自定义**：输入名称后「另存为新预设」；选中已保存的预设后可「更新选中预设」或二次确认删除。最多 12 个，留在当前设备本地，不同步，不存储实际壁纸文件。

应用预设只改变 9 项外观参数（暗度、壁纸模糊、面板磨砂、壁纸不透明度、四个分区不透明度和适配模式），**不会**自动切换壁纸模式、替换文件、改变暂停或减少动态效果。升级不自动应用任何预设，也不覆盖用户之前的配置。

### 比较与一键恢复

修改滑块/应用预设时，插件自动记录第一笔修改之前的 9 项外观值作为 A；当前已保存外观作为 B。两张缩略示意图使用同一图片/视频来源及模拟 UI 底板，不渲染任何聊天记录；视频缩略图不自动播放，因此**以主窗口实效为准**。可点「主窗口查看修改前」「主窗口查看当前」临时切换实际背景；**查看 A 不会写回持久化设置，滑块始终显示 B**。点「一键恢复修改前」才真正恢复 A 并保存，点「结束对比（保留当前）」则放弃临时基准而保留 B。可以随时「以当前效果重新设为基准」。关闭/重启 DSH 后对比快照消失，自定义预设和当前滑块仍然保留。

详细规则见 [预设与对比设计](docs/PRESETS.md)、[三档视觉差异设计](docs/PRESET-DESIGN.md)。此外，DSH 官方插件管理页也使用“聊天正文”的底色不透明度作为内容底板，以避免插件列表中的文字直接压在壁纸上。

## 🎛️ 分区透明度

| 区域 / Region | 默认不透明度 | 调节的界面部分 |
|---|---:|---|
| 聊天正文 / Conversation body | 35% | 聊天内容阅读底板；不覆盖顶部导航 |
| 左侧栏 / Left sidebar | 90% | 整个侧栏底板，防止文字和图标被壁纸干扰 |
| 顶部导航 / Top navigation | 35% | 对话内标题与 View 标签；**不包含 Windows/macOS 原生标题栏菜单** |
| 输入框 / Composer input | 94% | 可输入文字的卡片；保留原有边框、阴影与交互 |

> **原有设置安全迁移**：更新 v0.2.x 时，「聊天正文」与「顶部导航」先继承旧「界面底色覆盖」（`tint`）的数值；侧栏默认 90%，输入框默认 94%，尽量保持可读性。所有媒体、暗度、模糊与壁纸透明度不变。旧 `tint` 数据保留用于降级兼容；新版不再展示旧全局遮罩滑块。

调整范围 0%–100%。0% 表示该区域底色完全透明，100% 表示该区域的底色不透明（壁纸仍保留在背景层）。建议先将**壁纸不透明度**设为 70%–100%，再按需增减阅读区域底色。过低的不透明度会降低可读性。

分区不透明度并非全局主题系统：**官方插件管理页额外使用聊天正文底色不透明度**，右侧第三方插件面板、弹窗和原生 Desktop 标题栏不会随这四个滑块改变。主聊天底部的原有渐变淡出与「聊天正文」透明度联动，不属于输入卡片本身。详细设计见 [docs/REGION-OPACITY.md](docs/REGION-OPACITY.md)。

## 🧊 壁纸模糊 vs 面板磨砂（v0.3.0-rc.3）

| 参数 | 生效位置 | 范围 | 升级后默认 |
|---|---|---:|---:|
| 壁纸自身模糊（旧 `blur`） | 壁纸图片 / 视频画面本身 | 0–20px | 继承旧值 |
| 面板磨砂强度（新 `panelBlur`） | 侧栏底板、对话正文底板、顶部导航、输入卡片的背景像素 | 0–12px | **0px**（不增加磨砂） |

**建议的“壁纸细节清晰、文字背后磨砂”设置**：壁纸自身模糊 **0px**、面板磨砂 **4–6px**，聊天正文不透明度约 **30–50%**、输入框 90–95%。侧栏若高于 90% 不透明，磨砂变化可能不明显。提高面板磨砂不会降低 UI 字体清晰度，但可能增加动态视频的 GPU 合成负担；低性能设备先使用 2–4px 或关闭。

实现使用 Chrome/Electron 的 `backdrop-filter` 与 `-webkit-backdrop-filter`，只在磨砂值大于 0 时注入相关 CSS；切换到关闭壁纸模式后释放该样式。磨砂会应用在 UI 的四个区域上；**输入卡片位于正文内部，局部磨砂可能发生叠加**，效果仍需真实 Desktop 验证。

**壁纸模糊不再放大（rc.6）**：壁纸画面在 0px、1px、4px 和 20px 模糊时保持相同的尺寸、铺满/适应方式和裁剪位置。模糊由覆盖在壁纸上的透明背景模糊层负责，不对图片/视频进行 `scale()`。这避免了 0px → 1px 的构图跳变以及单纯移除缩放时的浅色边缘。对比预览同步采用此方案，视频不增加第二路解码。高模糊可能增加 GPU 合成开销，可按设备性能降低模糊值。

**Windows 兼容修复（始于 rc.5，rc.6 保留）**：侧栏磨砂已改由独立的 `::before` 背景层绘制，不再把 `backdrop-filter` 加在侧栏容器本身。此前这样会让 `position:fixed` 的折叠按钮相对侧栏定位，向下移动并覆盖 DeepSeek Logo。设置 0px 与 6px 时折叠按钮应保持原位；新的 Chromium 回归检查已验证该定位关系，真实 Desktop 仍需确认。

## 📥 安装与更新

1. 下载源码目录（不是只下载 `client.js`），确保根目录包含 `package.json`、`index.js`、`client.js`、`cordis.patch.yml`。
2. 打开 **DSH Desktop → Creator Mode**，使用插件管理工具 `plugin_manager` 的 `install_bundle` 操作，`target` 指向上述目录**绝对路径**。
3. 确认安装或替换结果不是 `failed`、`restart-required` 等待处理状态；**从系统托盘彻底退出 DSH 再重启**，以加载新的 Client JS。
4. 进入 **设置 → 壁纸背景**，确认显示版本 `0.3.0-rc.7`。建议先开启测试图案验证四个滑块，之后再选择个人图片或视频。

详见 [English quick start](README.en.md) / [安装说明](docs/INSTALLATION.md) 和 [排障指南](docs/TROUBLESHOOTING.md)。不要清空整个 DSH Profile 作为更新手段；媒体文件存放在该 Profile 的浏览器存储内。

## 🧪 开发与验证

Requirements: Node.js 22+（使用原生测试运行器，无需额外 npm 依赖）。

```bash
npm run check           # 语法检查、数据与源码回归测试
npm run visual:smoke    # 可选：需要独立可运行的 Chromium（可通过 CHROME_BIN 指定）
```

`visual:smoke` 使用仿照官方 DOM 结构的**独立静态页面**来检查 CSS 计算结果。它不是 DSH Electron 实机端到端测试，部分容器会无法启动 Chromium。**目前已完成 Node 测试，真实 DSH Desktop 的新版视觉验收仍在进行。**

## 📘 项目文档

- [更新记录](CHANGELOG.md) · [当前状态](PROJECT-STATUS.md) · [待办路线图](docs/ROADMAP.md)
- [三档预设设计](docs/PRESET-DESIGN.md) · [分区透明度与磨砂设计](docs/REGION-OPACITY.md) · [安装说明](docs/INSTALLATION.md) · [故障排查](docs/TROUBLESHOOTING.md)
- [贡献指南](CONTRIBUTING.md) · [安全政策](SECURITY.md)

## ⚠️ 已知限制

- 官方当前没有专用 `shell.background` 插件 Slot；背景依旧使用 `shell.overlay` + Portal。若 DSH 调整布局，部分区域可能需要重新适配。
- Chrome/Electron 视频解码和 IndexedDB 存储配额与平台有关，视频格式并非全部保证可播放。
- `npm run check` 通过不等于 Desktop 实机视觉验证成功。
- 已采用 MIT 开源许可证，仍需完成真机验收与正式发布确认。

## 许可证

代码以 [MIT License](LICENSE) 授权，版权声明 `Copyright (c) 2026 deepseaandhighsky-arch`。本项目是非官方的第三方插件，与 DeepSeek 无隶属或认可关系。详见 [第三方声明](THIRD_PARTY_NOTICES.md)。
