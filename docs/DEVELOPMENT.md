# 开发与维护

## 目录

- `src/`：标签渲染、正则、动态 JS、配置界面与宿主适配。
- `native/ScriptRunnerV230.java`：QuickJS 执行器、watchdog 超时与并发限制。
- `resources/rp-js-runner-v230.dex`：预编译执行器，名称沿用 v230，不是插件版本号。
- `examples/`、`export-examples.cjs`：10 个可复制示例与导出源。
- `probes/ui.js`：动态配置导航、四预设和错误恢复的只读宿主探针。
- `probes/rendering.js`：经典布局与正则配置树探针，不保存用户配置。
- `docs/`：玩法、外观、维护和 Bug 记录。

Android 手机开发时，Git 工作树建议放在 Ubuntu/proot 的 `/root`；共享存储只作交付和备份，不作为 Git 工作树。项目无外部 `../types` 依赖。

## 构建

验证环境：Python 3、Node.js 24.22.0、TypeScript 5.9.3、OpenJDK 17。`node`、`tsc`、`java`、`javac` 必须在 PATH。没有 Node 生产依赖。

TypeScript 可通过 `npm install --global typescript@5.9.3` 安装。

Google R8 8.3.37 放入 `build-tools/r8-8.3.37.jar`（构建依赖，不提交 Git）：

- 下载：https://storage.googleapis.com/r8-releases/raw/8.3.37/r8.jar
- 本项目使用文件的 SHA-256：`59753e70a74f918389cc87f1b7d66b5c0862932559167425708ded159e3de439`

在项目根执行：

    python3 build.py </dev/null

构建先编译 Java/DEX 和 TS，再导出示例、运行全部测试，最后打包；失败即中止，各子进程有超时。构建本身不联网。

输出 `com.operit.rp_xml_renderer-v2.3.2.toolpkg`，仅含 manifest、dist JS 与 DEX，不打包测试、文档和个人配置。ZIP 时间戳可能令重新构建后的整包哈希不同；正式附件以 Release 的 SHA256SUMS 为准。

## 测试与宿主验证

本地门禁：`test.cjs`、`test-v21.cjs`、`test-v23.cjs`、`test-v231.cjs`、`test-examples.cjs`、`test-v232.cjs`。旧版本编号表示回归覆盖来源，不表示仍要求安装旧版。147 项测试包括新安装不绑定、已保存配置不被覆盖、输出原样保留、去重、作用域、迁移、示例运行和导航生命周期。

安装工具包后，使用 Operit `debug_run_sandbox_script` 的 source_path 执行 Android 可访问的 `probes/ui.js` 与 `probes/rendering.js`。它们操作独立配置树，不保存、不向真实模型发送消息；使用后核对 preferencesUnchanged/settingsUnchanged。Node VM 不能替代真实 QuickJS 探针，探针也不能替代屏幕像素或真实聊天效果验收。

不要使用个人消息或角色 ID 作为公开测试 fixture。旧设备专用探针和原始开发日志仅本地归档。

## 配置与升级

- 标签存储：SharedPreferences `toolpkg_rp_xml_renderer_v2`。
- 动态存储：独立 SharedPreferences `toolpkg_rp_dynamic_injection_v1`，schema 为 version 2。
- v2.3.2 只改变无已保存配置时的默认角色列表，已有绑定、脚本、开关、revision、主题与正则走原加载路径。
- v1 JSON 指令仍可迁移为等价 JS；旧三套 JS 配置只补缺失 daily 槽位，读取不自动持久化。
- 如果旧版从未保存过标签设置，则升级后按公开版空绑定默认值处理，需手动选择角色。

安装使用 `debug_install_toolpkg`，保持 package ID，`reset_subpackage_states=false`。核对包哈希、运行版本与配置；不要靠改版本文本假装已安装，也不要擅自重启应用。

回滚前备份用户配置。源码 ZIP 不包含 SharedPreferences；旧包也不必然识别新预设。不要盲目将 previous 当作升级前备份。

## 公开发布规则

仅推送已脱敏的 main 和明确的发布标签，禁止 `git push --all`、`--mirror` 或推送本地私有归档分支。首次公开历史使用无父提交的新根，旧提交不成为公开 main 的祖先。

发布前检查源码、Git 可达对象、归档成员和 PNG 元数据；不上传个人配置、日志、缓存、下载依赖、私有 Git bundle。截图展示内容经提供者同意用于 README。

使用 gh 创建公开仓库和 Release，附件仅放正式 `.toolpkg` 与 SHA256SUMS；先创建带附件的草稿，核验附件后再发布。网络失败时停止，不自动重复创建或切换工具重试。

许可证未选择。公开仓库不等于已采用 MIT/Apache 等许可证，也不替代各依赖自己的许可要求。

## 已知限制

没有硬堆内存配额；只运行可信 JS。正则没有硬超时；只用可信表达式。不能读取聊天、联网或维护跨轮变量；微事件没有每天一次的持久化计数。正则只作用于已匹配标签的显示正文，不是整条 AI 输出过滤器。新增标签仍可能需要用户手动重启宿主。
