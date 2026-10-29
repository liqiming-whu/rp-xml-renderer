# 图标与主题颜色

核对基准：2026-10-29，本插件 v2.3.1 的 `src/model.ts` 校验规则、`src/view.ts` 实际用色，以及本机宿主 MaterialIconNameResolver。官网是查阅入口，不是本机可用性保证。

## 图标怎么填

字段填英文名称，不填图片 URL、HTML、`Icons.Default.` 前缀或 Emoji。

插件接受格式：`^[a-zA-Z][a-zA-Z0-9_]*$`。宿主将分词转为 PascalCase，并在 **Material Icons Filled** 类中查找：`altRoute`、`AltRoute`、`alt_route` 对应同一图标。大小写并非完全不敏感，`altroute` 不等于 `altRoute`。

以下名称于本机实际调用 `MaterialIconNameResolver.resolveOrNull` 验证为可用（不是仅通过格式校验）：

| 用途 | 可直接填写 |
|---|---|
| 内容/笔记 | `description`、`book`、`menuBook`、`notes`、`autoStories` |
| 思考/灵感 | `psychology`、`lightbulb`、`autoAwesome` |
| 分支/探索/随机 | `altRoute`（也可 `alt_route`）、`explore`、`casino` |
| 聊天/情感 | `chat`、`forum`、`favorite`、`star` |
| 时间/日程 | `schedule`、`event` |
| 技术/设置 | `code`、`extension`、`settings` |
| 操作 | `check`、`chevronRight`、`expandLess`、`expandMore`、`moreHoriz` |

这不是固定白名单；本机所带的 Filled 扩展图标也可以尝试。不存在的图标会回退为 `Info`，例如探针中的 `notARealIcon`。插件只验证名称格式，不验证宿主是否真的包含该图标。

参考链接：

- [Google Material Icons 图库（已指定 Material Icons）](https://fonts.google.com/icons?icon.set=Material+Icons)
- [Android Compose Icon 官方说明](https://developer.android.com/develop/ui/compose/graphics/images/material)

**不要把 Material Symbols 新图标全集当作本插件支持全集。**当前宿主使用旧 Material Icons Filled；在官网搜索时选择 Material Icons。官方文档也区分 Material Symbols 与旧 Material Icons。本插件本次没有升级宿主图标库。

## 主题颜色完整白名单

下列 14 个名称可用于规则的文字色、背景色、边框色，拼写和大小写须保持一致：

| 颜色名 | 推荐用途 |
|---|---|
| `primary` | 强调文字/重点 |
| `onPrimary` | primary 底色上的内容 |
| `primaryContainer` | 主色柔和容器 |
| `onPrimaryContainer` | 主色容器内文字 |
| `secondaryContainer` | 次级色容器 |
| `onSecondaryContainer` | 次级色容器内文字 |
| `surface` | 常规表面底色 |
| `surfaceVariant` | 与主表面有区别的底色 |
| `onSurface` | 表面上的主要文字 |
| `onSurfaceVariant` | 次要文字 |
| `outline` | 较清晰的轮廓线 |
| `outlineVariant` | 更弱的分隔/轮廓线 |
| `errorContainer` | 错误提示底色 |
| `onErrorContainer` | 错误底色上的文字 |

`onX` 是用于 X 背景上的前景颜色，不是开关。主题色随宿主当前主题变化，不代表固定 RGB。宿主或 Material 3 有其他色名，不意味着本插件校验允许；**`secondary`、`tertiary`、`error`、`surfaceContainer`、`transparent` 等当前不在规则颜色白名单内**。

参考：[Material 3 Color roles](https://m3.material.io/styles/color/roles)。该站依赖 JavaScript；若阅读器显示空页请用浏览器打开。白名单以本插件源码为准，而非照抄官网所有角色名。

## 固定十六进制颜色

还支持：

- `#RRGGBB`，例如 `#6750A4`。
- `#AARRGGBB`，例如 `#806750A4`（AA=80，约 50% 不透明度）。

注意 Android 是 **ARGB，透明度在前**，不是网页常见的 RGBA 尾置写法。`#00000000` 可表示完全透明；`#FFF`、`rgb(...)`、`red` 不接受。固定色不会自动适配深浅主题，需分别预览可读性。

## 配色方案

| 风格 | 文字色 | 背景色 | 边框色 |
|---|---|---|---|
| 低干扰经典 | `onSurfaceVariant` | `surfaceVariant` | `outlineVariant` |
| 标准阅读 | `onSurface` | `surface` | `outlineVariant` |
| 主色强调 | `onPrimaryContainer` | `primaryContainer` | `primary` |
| 次级信息 | `onSecondaryContainer` | `secondaryContainer` | `outlineVariant` |
| 警示卡片 | `onErrorContainer` | `errorContainer` | `outline` |

重要：经典布局按模式应用固定透明度/细节样式，某些背景和描边字段不会以完全相同方式呈现；需要更直接控制外观时关闭“经典紧凑布局”并预览。标题图标 tint 当前固定为 `primary`，**文字色字段并不单独改变图标颜色**；本次没有新增图标专用色字段。

入口：标签渲染配置 → 编辑标签规则 → 外观 → 测试规则与样式 → 保存此规则 → 应用设置。