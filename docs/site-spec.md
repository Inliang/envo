# Envo 信封打印助手 · 站点规格卡

> 版本：v1.0.1 · 上线交付
> 作者：文构间（信息架构）
> 状态：**已冻结，前端与部署阶段照此执行**
> 事实来源：G0 确认行 + Phase 0 代码复核（仓库 `Inliang/envo`，master @ `a550a78`，工作区干净）

---

## 0. 一页速览

| 项 | 结论 |
|---|---|
| 站点类型 | **工具站（Tool Site）· 本地优先 / 纯客户端** |
| 真实 URL 数量 | **1 个**（`https://inliang.github.io/envo/`），四个视图共用 |
| 核心转化动作 | **首次成功产出一份可打印信封（打印或导出 PDF）** |
| sitemap 条目数 | **1 条**（不是 4 条，理由见 §2.3） |
| 后端 | 无。全部数据在 localStorage |
| 上线阻塞项 | **3 条**（见 §9.0） |
| 最大单点风险 | Zustand persist 升版本无 `migrate` → 老用户数据被清空 |

---

## 1. 站点定位

### 1.1 站点类型判定

**主类别：工具站（Tool Site）。**

判定依据：访客带着一个**待完成的物理任务**（"我要把这封信的信封印出来"）进来，用完即走。没有品牌叙事需求、没有销售漏斗、没有内容沉淀需求。企业官网那套"首页-关于-产品-联系"在这里全是负资产。

**附加模块：无。** 地址簿 / 打印历史 / 设置不是"附加模块"，它们是**主工具的输入输出端**，属于工具站本体的必要组成。

### 1.2 目标访客画像

不写"所有人"。本工具的实际访客只有两类，且行为模式完全不同：

| 画像 | 场景 | 设备 | 诉求 | 对本项目的权重 |
|---|---|---|---|---|
| **A. 低频个人寄信者**（主） | 搬家季/春节/寄材料，一年几次，一次几封到十几封 | **桌面浏览器**（必须有打印机） | 地址别填错、邮编别填错、打印出来位置对 | **80%** |
| **B. 批量寄件者**（次） | 中小企业/社团批量发函，一次几十上百封 | 桌面浏览器 | 批量导入地址 → 批量打印 | 20% |
| C. 移动端浏览者 | 手机上看一眼、收藏、或临时查地址簿 | 手机 | **不打印** | 不计入转化 |

**明确排除**：移动端不承载转化。手机浏览器无法完成"把 220×110mm 的信封准确送进打印机"这件事（移动端打印链路在 iOS/Android 上都不可靠）。**移动端改造的目标不是让打印可用，而是让"不报错、能看清、能管地址簿"。** 这一点决定了 §7 的响应式验收标准。

### 1.3 核心转化动作（只定义一个）

> **转化 = 访客在首次会话内，成功完成 1 次「打印」或「导出 PDF」，且信封预览已正确渲染出收件人信息。**

我把它命名为 **TTFE（Time-to-First-Envelope，第一封信封耗时）**。这是本项目唯一值得优化的转化指标。

**为什么不是别的：**

- ❌ **不是注册/留资** —— 这是本地工具，用户数据不离开浏览器，要账号是纯粹的摩擦。
- ❌ **不是访问量/PV** —— 单 URL 工具站，PV 无意义，回访次数也没意义（用户书签直达）。
- ❌ **不是分享** —— 信封打印是无社交属性的私人任务，分享率低且不可控。
- ✅ **是 TTFE** —— 用户来的唯一目的就是产出信封。产出了 = 工具成功；没产出 = 工具失败，无论页面多好看。

**次级留存信号**（不叫转化，只做观测）：
1. 二次访问时地址簿 ≥1 条（说明用户把数据托付给了这个工具 —— 这是本地工具站唯一的"留存"形态）
2. 发生过 JSON/Excel 导出（说明进入了真实工作流，而非试用）

### 1.4 本次 v1.0.1 的定位边界

**保留现有四 Tab 单页结构与全部功能不动。** 本次是"上线准备 + 加固"版本，不是重构版本：

- 不新增业务功能
- 不引入路由、不引入后端、不改变数据去向
- 只做四件事：**可被发现（SEO/OG）**、**可被打开（性能/字体）**、**可被使用（移动端/无障碍）**、**可被部署（静态资源/CI）**

---

## 2. 站点地图

### 2.1 结构定性

这不是传统的页面树，是 **「1 个 URL + 4 个互斥视图」** 的单页状态机：

```
https://inliang.github.io/envo/          ← 唯一真实 URL（canonical）
│
└── App.tsx（无 react-router，靠 Zustand activeTab 切换）
    ├── [Header] 站点标识 + 四 Tab 导航（全局常驻）
    │
    ├── View 1  editor      ✉ 信封编辑      ← 默认视图 / 转化发生地
    ├── View 2  addressbook 📖 地址簿       ← 输入端（供给 View 1）
    ├── View 3  history     🖨 打印历史     ← 输出端（View 1 的产出记录）
    ├── View 4  settings    ⚙ 设置         ← 配置端（供给 View 1）
    │
    └── [Footer] 版本号 + 外链（GitHub / FMO / QSL），全局常驻
```

### 2.2 导航关系（不是层级，是数据流）

四个 Tab 在 UI 上是**平级并列**的，但在功能上是**星型依赖 View 1**：

```
                 ┌──────────────────────────┐
                 │  View 1  信封编辑（中心） │
                 │  ← 转化动作发生地        │
                 └──────────────────────────┘
                    ▲        ▲           ▲
        填入收件人  │        │ 默认寄件人 │ 记录产出
        (currentRecipient)  │ (defaultSender) │ (addPrintRecord)
                    │        │           │
        ┌───────────┘        │           └───────────┐
   View 2 地址簿        View 4 设置            View 3 打印历史
   （数据供给）          （配置供给）           （产出沉淀）
        │                                            │
        └──────── 导出 Excel ◄── xlsx ──► 导出 Excel ─┘
```

**架构含义（前端阶段必须理解）**：
- **View 1 是唯一不可降级的主视图**。其余三个视图即使全部消失，工具仍能完成转化（手动填地址 → 打印）。
- View 3（打印历史）**不是独立功能**，它是 View 1 的副产品。它的价值是"重印"和"导出台账"，不做独立入口设计。
- View 4（设置）里的高德 Key 是**唯一的可选增强开关**，缺失不影响主流程（见 §5.1 降级契约）。

### 2.3 对外可索引性判定（**sitemap 只收 1 条**）

| 对象 | 是否独立 URL | 是否进 sitemap | 判定理由 |
|---|---|---|---|
| `https://inliang.github.io/envo/` | ✅ 是 | **✅ 收录（唯一一条）** | 站点根，唯一真实入口 |
| View 1 信封编辑 | ❌ 否（同 URL，靠 state） | ❌ 不收录 | 无独立 URL，爬虫无法区分 |
| View 2 地址簿 | ❌ 否 | ❌ 不收录 | 同上，且内容为**用户私有 localStorage 数据**，空态无索引价值 |
| View 3 打印历史 | ❌ 否 | ❌ 不收录 | 同上，**纯私有数据**，索引等于泄露意图 |
| View 4 设置 | ❌ 否 | ❌ 不收录 | 配置界面，零索引价值 |
| `/envo/og-image.png` 等资源 | ✅ 是（静态文件） | ❌ 不收录 | sitemap.xml 只声明 HTML 页面，不声明图片资源 |

**为什么坚决不做 4 条 sitemap（即使可以用 hash 造出来）**：

用 `#/addressbook` 之类的 hash 造 4 条 URL 是**有害的**：
1. 本项目没有 router，爬虫请求 `https://inliang.github.io/envo/#/addressbook` 拿到的 HTML **与根 URL 完全相同**（hash 不发送到服务端）→ 4 条 URL 内容 100% 重复 → 搜索引擎判定为**重复内容/软 404**，可能连带拉低根 URL 的评级。
2. 即使加了 router，SPA 首屏是空 `<div id="root">`，需要预渲染/SSR 才有内容可索引 —— 这套成本对一个单页打印工具站是纯浪费。

**结论：sitemap.xml 只有 1 条 `<url>`。** 若未来确有视图级索引需求，属于 v2 范围（需先引入 router + 预渲染，再讨论）。

### 2.4 robots.txt 的现实约束（**部署阶段必读**）

**`robots.txt` 只在「主机根路径」生效（RFC 9309）。** 本项目部署在子路径 `/envo/`，因此：

- `https://inliang.github.io/envo/robots.txt` **会正常返回文件，但主流爬虫不会去读它**。子路径 robots.txt 不是规范位置。
- 要让 robots 真正生效，文件必须放在 `https://inliang.github.io/robots.txt`，即 **`Inliang/Inliang.github.io` 根仓库** —— 那是另一个项目，跨仓影响，本次不擅自处理。

**本项目的实际影响：零。** 理由：robots.txt 不存在 = 默认全部允许，而我们要的策略**恰好就是全部允许**。所以不做根 robots.txt 不会有任何负面后果。

**执行决策：**
- `/envo/robots.txt` **照做**（作为工程规范、人类可读性、以及未来迁到自定义域名/根路径时的现成资产）。
- 但 **不要指望它生效**，也不要在它里面写任何 `Disallow` 后以为生效了。
- **`sitemap.xml` 的有效性不依赖 robots.txt** —— 在 Google Search Console 手动提交 `https://inliang.github.io/envo/sitemap.xml` 即可（同主机，符合规范）。这一点要写进 §9 部署清单。

---

## 3. 页面清单

> 说明：本节"页面"指视图（View）。四个视图共用 URL `https://inliang.github.io/envo/`，靠 `activeTab` state 切换，`document.title` 不随视图变化（v1.0.1 不做动态 title，理由见 §3.5）。

### 3.1 View 1 · 信封编辑（editor）

| 项 | 内容 |
|---|---|
| **URL** | `https://inliang.github.io/envo/`（`activeTab='editor'`） |
| **用途** | **转化发生地。** 填寄件人/收件人 → **信封排版实时预览** → 打印或导出 PDF |
| **关键区块** | ① 寄件人卡片（姓名/地址/电话/邮编 4 字段）<br>② 收件人卡片（姓名/单位/地址/邮编/电话 + 高德联想下拉）<br>③ 信封设置（**尺寸**：国内 ZL/DL/C5/C4 + 国际 B6/C6 + 自定义，共 7 种，**B6/C6 为国际规格，非国产**，见 §5.5；**书写格式**：「国内信封格式」/「国际信封格式」两项，**与尺寸解耦，任意组合**，见 §5.2.5；字号、字体、回信地址开关、Logo 开关）<br>④ 信封实时预览区（UI 文案用「信封预览」，**不得出现「Canvas」**，见 §5.4 术语契约）<br>⑤ 操作区（打印 / 导出 PDF / 存为地址 / 清空）<br>⑥ 地址簿快捷载入列表 |
| **数据来源** | `currentEnvelope`（localStorage）、`settings.defaultSender`（localStorage）、`currentRecipient`（localStorage）、`addresses`（localStorage）、高德 API（运行时，可选） |
| **是否需后端** | 否 |
| **可索引性** | ❌ 不单独索引（同 URL） |
| **移动端策略** | 单列堆叠；信封预览保持可读；**打印按钮保留但不作为移动端 KPI**（弹窗在移动端几乎必被拦截） |

### 3.2 View 2 · 地址簿（addressbook）

| 项 | 内容 |
|---|---|
| **URL** | `https://inliang.github.io/envo/`（`activeTab='addressbook'`） |
| **用途** | 收件人数据的**输入端**。增删改查 + 标签分类 + 批量导入 + 批量打印 + 一键填入 View 1 |
| **关键区块** | ① 工具栏（导入 / 导出 Excel / 新增）<br>② 导入预览确认面板（CSV/XLSX/JSON，列名自动映射）<br>③ 搜索框 + 标签筛选（全部/家/公司/亲友/其他）<br>④ 全选 + 批量打印<br>⑤ 地址卡片列表（姓名/单位/地址/邮编/电话/标签，卡片内原位编辑）<br>⑥ 每个卡片：「填入编辑页」「编辑」「删除」 |
| **数据来源** | `addresses`（localStorage） |
| **是否需后端** | 否 |
| **可索引性** | ❌ 不单独索引（同 URL + 私有数据） |
| **移动端策略** | 工具栏换行不溢出；卡片单列；批量打印 checkbox 触控目标 ≥44×44px |

### 3.3 View 3 · 打印历史（history）

| 项 | 内容 |
|---|---|
| **URL** | `https://inliang.github.io/envo/`（`activeTab='history'`） |
| **用途** | 产出台账 + 重印入口。View 1 的副产品，非独立功能 |
| **关键区块** | ① 时间筛选（全部/今天/本周/本月）<br>② 导出 Excel<br>③ 清空历史（二次确认）<br>④ 记录列表（收件人/地址/寄件人/规格/方式/时间 + 重印 + 删除） |
| **数据来源** | `printHistory`（localStorage），每条含 `recipient`/`sender`/`settings` 完整快照 |
| **是否需后端** | 否 |
| **可索引性** | ❌ 不单独索引（同 URL + 私有数据） |
| **移动端策略** | 记录卡片单列；操作按钮组不换行溢出 |

### 3.4 View 4 · 设置（settings）

| 项 | 内容 |
|---|---|
| **URL** | `https://inliang.github.io/envo/`（`activeTab='settings'`） |
| **用途** | 配置端。默认寄件人、高德 Key、数据导入导出备份 |
| **关键区块** | ① 默认寄件人（姓名/电话/地址/邮编）<br>② 高德地图 API Key（密码框 + 显示切换 + 保存）<br>③ 数据管理（导出地址簿 Excel / 导出历史 Excel / 导出 JSON 备份 / 导入 JSON 备份）<br>④ 关于（版本、数据量统计） |
| **数据来源** | `settings`（localStorage，含 AES 加密后的 `amapKey`） |
| **是否需后端** | 否 |
| **可索引性** | ❌ 不单独索引 |
| **移动端策略** | 单列；Key 输入框不缩窄到不可用 |

### 3.5 关于动态 title / meta 的决定

**决定：不做。** 所有 meta 静态写死在 `index.html`，不引入 `react-helmet` 或任何 Head 管理库。

理由：单 URL 站点，切 Tab 不改 URL，改 `document.title` 对 SEO 零收益（搜索引擎看到的是根 URL 的静态 HTML），只对"用户在浏览器标签页上看到什么"有影响 —— 而这价值极低，不值得为此加一个运行时依赖。**若将来加了 router，这条要重新评估。**

---

## 4. 功能清单

优先级定义：**P0 = 上线前必办（不做就不能上线）** / **P1 = 首发可做（本次做，但砍掉也能上线）** / **P2 = 上线后迭代**。

### 4.1 现状功能盘点（v1.0.0 已有，本次不动或仅加固）

| # | 功能 | 所属视图 | 优先级 | 验收标准 |
|---|---|---|---|---|
| F-01 | 寄件人信息填写 | V1 | 现状 | 4 字段可填，预览区右下角实时渲染 |
| F-02 | 收件人信息填写 | V1 | 现状 | 5 字段可填，预览区左半区实时渲染 |
| F-03 | 高德地址联想 | V1 | 现状 | 输入 ≥2 字触发，300ms 防抖，↑↓/Enter/Esc 键盘可选 |
| F-04 | 逆地理编码补邮编 | V1 | 现状 | 联想项无邮编且有 location 时触发，回填空则静默 |
| F-05 | 信封排版实时预览 | V1 | 现状 | 任一输入变化即重绘（`useEffect` 依赖 sender/recipient/currentEnvelope） |
| F-06 | 信封尺寸选择 | V1 | 现状 | 7 种规格切换后预览区尺寸变化：**国内 4 种（ZL/DL/C5/C4）+ 国际 2 种（B6/C6）+ 自定义 1 种**。⚠️ B6/C6 是国际规格，不得写作国产（§5.5） |
| **F-20** | **书写格式选择（尺寸 × 格式解耦）** | V1 | **新增（本次）** | ① 「国内信封格式」/「国际信封格式」两项独立可选；② **任意尺寸 × 两种格式**（7×2 = 14 组合），不再由 `category` 绑死；③ 切换尺寸时格式**自动跟随**该尺寸 `category`，用户可随后手动覆盖；④ 字段 `format?` 缺失时回退为「跟随 `category`」，**不 bump version**（§5.2.5） |
| F-07 | 浏览器打印 | V1 | 现状 | `window.open` 新窗口 + `@page size` 精确尺寸 + 6× DPR 高清 Canvas |
| F-08 | PDF 导出 | V1 | 现状（⚠️ 见 R4） | jsPDF 按信封 mm 尺寸生成并下载 |
| F-09 | 存为地址簿 | V1 | 现状 | 收件人+地址非空才可存，写入 `addresses` |
| F-10 | 四 Tab 切换 | 全局 | 现状 | 点击切换，状态存 localStorage |
| F-11 | 地址簿 CRUD | V2 | 现状 | 新增/卡片内原位编辑/删除 |
| F-12 | 地址搜索与标签筛选 | V2 | 现状 | 按姓名/地址/电话模糊搜索；四类标签筛选 |
| F-13 | 批量导入（CSV/XLSX/JSON） | V2 | 现状 | 列名中英文自动映射，预览确认后写入 |
| F-14 | 批量打印 | V2 | 现状 | 勾选多条后逐个渲染触发打印 |
| F-15 | Excel 导出（地址簿/历史） | V2/V3 | 现状 | xlsx 生成下载，列宽 24 |
| F-16 | 打印历史（筛选/重印/删除/清空） | V3 | 现状 | 时间筛选、重印、单删、清空（二次确认） |
| F-17 | 默认寄件人配置 | V4 | 现状 | 保存后 V1 挂载时读取 |
| F-18 | 高德 Key 配置（AES 存储） | V4 | 现状（⚠️ 见 R7） | 密码框输入、显示切换、保存后加密落盘 |
| F-19 | JSON 备份导出/导入 | V4 | 现状（⚠️ 见 R2） | 导出全量数据；导入恢复 |

### 4.2 v1.0.1 新增 / 加固项

| # | 功能 | 所属 | 优先级 | 验收标准 |
|---|---|---|---|---|
| **N-01** | **Zustand persist 加 `migrate` + `partialize`** | store | **P0** | ① 升到 `version: 2` 时老用户 `addresses`/`printHistory`/`settings` 完整保留；② `activeTab` 不持久化（每次落地回 V1）；③ `currentRecipient` 不持久化（防误印旧地址）；④ `currentEnvelope` 保留（信封规格是用户偏好） |
| **N-02** | **移除 Google Fonts 全部外链** | index.html | **P0** | `index.html` 中 3 个 `fonts.googleapis.com` / `fonts.gstatic.com` 相关 `<link>` 全部删除；构建产物 HTML 中不再出现 `fonts.g` 字样 |
| **N-03** | **favicon / apple-touch-icon / webmanifest** | public | **P0** | 浏览器标签页显示图标；iOS 添加到主屏幕有图标；`site.webmanifest` 可被解析 |
| **N-04** | **完整 meta（description / canonical / OG / Twitter / theme-color）** | index.html | **P0** | 用任意 OG 预览工具（如 socialsharepreview）能读到标题、描述、1200×630 图 |
| **N-05** | **sitemap.xml（1 条 URL）** | public | **P0** | 浏览器访问 `https://inliang.github.io/envo/sitemap.xml` 返回合法 XML；`<loc>` 为绝对 URL |
| **N-06** | **robots.txt** | public | **P0** | 返回 200（⚠️ 子路径下爬虫不读，见 §2.4，这是规范项不是效果项） |
| **N-07** | **移动端响应式加固** | 全局 | **P0** | 375px 宽下：无横向滚动条；Header 导航不溢出（可横向滚动或换行）；四视图内容单列可读；触控目标 ≥44×44px |
| **N-08** | **无障碍加固（a11y）** | 全局 | **P0** | ① 所有 `<input>` 有 `<label for>` 或 `aria-label`；② 所有图标按钮有 `aria-label`；③ Tab 导航用 `<nav>` + `aria-current`；④ 焦点可见（`:focus-visible` 有明确样式，`input-field` 已有 focus ring，需覆盖到按钮）；⑤ `<html lang="zh-CN">`（已有）；⑥ 信封预览的 `<canvas>` 元素有 `role="img"` + `aria-label` 文字替代 |
| **N-09** | **无高德 Key 时的显式引导** | V1 | **P0** | 未配置 Key 时，地址输入框下方有一行提示 + 跳转设置页的入口（现状完全静默，用户不知道功能存在 —— 见 §6 摩擦点 F4） |
| **N-10** | **打印/PDF 操作的 loading 态与按钮禁用** | V1 | **P0** | 点击后按钮进入 disabled + "生成中…"，完成后恢复。防重复点击（6× DPR canvas 在低端机会卡顿 1–3s） |
| **N-11** | **替换 `alert()` / `window.confirm()` 为内联提示** | V4/V3 | P1 | 导入结果、清空历史确认不再用原生弹窗（a11y 差、部分环境被拦截、样式割裂） |
| **N-12** | **jsPDF / xlsx 改动态 import（代码分割）** | V1/V2/V3 | P1 | 首屏 JS 不再包含 jsPDF 与 xlsx；点击导出时按需加载 |
| ~~**N-13**~~ | ~~Canvas 字体就绪检测与重绘~~ | V1 | **❌ 已取消** | **决策 A 已裁决采纳（系统字体栈，无网络字体）→ 不存在字体加载竞态，本项无需实现。`src/utils/fontsReady.ts` 不创建。`public/fonts/` 不创建。** |
| **N-14** | **首屏空态引导（无默认寄件人时）** | V1 | P1 | 寄件人为空时显示一行引导，点击跳 V4 填写 |
| **N-15** | **打印改为 iframe（规避弹窗拦截）** | V1 | P2 | 用隐藏 iframe 承载打印内容，替代 `window.open` |
| **N-16** | **历史记录软上限（如 500 条）** | V3 | P2 | 超出后提示用户导出并清理，防 localStorage 5MB 撑爆 |
| **N-17** | **绑定自定义域名** | 全局 | P2 | canonical / OG / sitemap 全部 URL 需同步改写 |

---

## 5. 接口契约（**冻结，前端与部署阶段照此执行**）

> 契约纪律：字段名、类型、是否必填一次定死。本节**不存在"待定"**。任何需要变更，走文档修订并通知全队。

### 5.1 高德地图 Web API 契约

#### 5.1.1 接口 A · 输入提示（地址联想）

```
GET https://restapi.amap.com/v3/assistant/inputtips
```

**入参（Query String）**

| 字段 | 类型 | 必填 | 说明 | 本项目现值 |
|---|---|---|---|---|
| `key` | string | ✅ | 用户自填的高德 **Web 服务** Key | `getAmapKey()` 解密得到 |
| `keywords` | string | ✅ | 搜索关键词，`encodeURIComponent` 编码 | 地址输入框当前值 |
| `datatype` | string | ❌ | 数据类型 | 固定 `all` |
| `city` | string | ❌ | 限定城市 | **未传**（不限城市） |
| `citylimit` | string | ❌ | 是否严格限制在 city 内 | **未传** |

**出参**

```jsonc
{
  "status": "1",              // "1"=成功，"0"=失败
  "info": "OK",
  "infocode": "10000",
  "count": "10",
  "tips": [
    {
      "id": "B0FFH...",
      "name": "清华大学",
      "district": "北京市海淀区",
      "adcode": "110108",
      "location": "116.326,40.003",
      "address": "双清路30号",
      "typecode": "060101"
    }
  ]
}
```

**⚠️ 契约澄清（必读）**：**v3 输入提示接口的 `tips[]` 元素不包含 `postcode` 字段。** 现有 `AmapTip.postcode` 类型声明与 `s.postcode` 读取是**死代码，永远为 `undefined`**。这意味着：**每一次选中联想项，都会 100% 触发接口 B（逆地理编码）去补邮编**，而不是代码注释设想的"tips 未返回邮编时兜底"。

- **影响**：联想一次 = 2 次 API 调用（配额消耗翻倍）。
- **不改代码的话**：接受这个行为，但**注释必须改正**，否则后续维护者会误判。
- **P2 优化**：改为"用户主动点『补全邮编』按钮才调接口 B"，或地址簿保存时批量补全。

**本项目消费字段**：`name`、`address`、`district`、`location`
**本项目地址拼装规则（契约）**：`full = district.endsWith(detail) ? district : district + detail`，其中 `detail = address || name`。

#### 5.1.2 接口 B · 逆地理编码（补邮编）

```
GET https://restapi.amap.com/v3/geocode/regeo
```

**入参**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `key` | string | ✅ | 同上 |
| `location` | string | ✅ | `"经度,纬度"`，如 `"116.326,40.003"` |
| `extensions` | string | ✅ | 固定 `base`（不返回周边 POI，省流量） |

**出参（本项目消费路径）**

```jsonc
{
  "status": "1",
  "info": "OK",
  "infocode": "10000",
  "regeocode": {
    "formatted_address": "北京市海淀区双清路30号清华大学",
    "addressComponent": {
      "country": "中国",
      "province": "北京市",
      "city": "北京市",
      "district": "海淀区",
      "township": "学院路街道",
      "adcode": "110108",
      "towncode": "110108013000",
      "postcode": "100084"        // ⚠️ base 模式下可能为空字符串
    }
  }
}
```

**本项目取值规则（现状）**：`postcode = ac.postcode || ac.towncode`

**⚠️ 契约缺陷（必须记录）**：`towncode` 是 **9 位乡镇行政编码**（如 `110108013000`），**不是邮编**。当 `postcode` 为空时会把 11 位数字填进邮编格 —— 比留空更糟。

- **契约修订建议（P1，改 1 行）**：`postcode = ac.postcode || ''`（宁可留空也不填错编码）。见 §10 风险 R5。

#### 5.1.3 错误码契约与降级行为（**P0**）

高德 Web 服务用 **`infocode`**（不是 HTTP 状态码）表达业务错误。HTTP 状态码恒为 200。

| `infocode` | 含义 | 本项目降级行为（契约） |
|---|---|---|
| `10000` | 成功 | 正常渲染下拉 |
| `10001` / `INVALID_USER_KEY` | Key 无效或错误 | **显示一次性提示**「高德 Key 无效，请到设置页检查」+ 跳转入口；关闭下拉 |
| `10002` / `SERVICE_NOT_EXIST` | 服务不存在 | 静默关闭下拉 |
| `10003` / `DAILY_QUERY_OVER_LIMIT` | 日调用量超限 | **显示一次性提示**「今日高德调用额度已用完」；关闭下拉 |
| `10021` / `NON_SUPPORTED_SERVICE` | 无此服务权限 | **显示一次性提示**（通常是 Key 类型选错） |
| `USERKEY_PLAT_NOMATCH` | **Key 平台类型不匹配** | **显示一次性提示**「请在控制台选择『Web 服务』类型 Key，而非『Web 端(JS API)』」 |
| `20000-30000` | 其他业务错误 | 静默关闭下拉 |
| 网络层 `fetch` 抛错 | 超时/DNS/断网 | 静默关闭下拉，不弹错 |

**降级行为总契约（3 条铁律）**：

1. **Key 为空 → 零请求。** 不发任何网络请求，不渲染下拉，**必须在地址输入框下方显示一次性引导**（指向设置页）。现状完全静默，这是转化路径上的最大摩擦（§6 F4）。**P0 必办。**
2. **Key 类错误（10001 / 10003 / 10021 / USERKEY_PLAT_NOMATCH）→ 必须让用户看见。** 否则用户以为功能是坏的。
3. **其余错误与网络异常 → 静默。** 地址输入是高频操作，任何弹窗都是噪音。

**补充契约（P1）**：现状 debounce 用裸 `setTimeout` + 序号比对，**无超时、无取消**。加 `AbortController` + 8s 超时，防止慢网络下旧请求覆盖新结果，以及挂起的连接占用资源。

#### 5.1.4 Key 的注入与存储（契约）

```
用户输入（Settings.tsx, type=password）
  → setAmapKey(plainKey)
  → CryptoJS.AES.encrypt(plainKey, SECRET).toString()   // SECRET 硬编码常量
  → localStorage['envelope-printer-storage'].state.settings.amapKey  (密文)
  → 读取：getAmapKey() = CryptoJS.AES.decrypt(cipher, SECRET).toString(Utf8)
  → 注入：URL query `?key=${plainKey}`
```

| 环节 | 值 | 说明 |
|---|---|---|
| 存储位置 | `localStorage` | key `envelope-printer-storage`，路径 `state.settings.amapKey` |
| 存储形态 | AES 密文字符串 | 空 Key 存 `''`（`setAmapKey('')` 走 `key ? encrypt : ''` 分支） |
| 读取时机 | 每次联想请求前实时解密 | 不缓存明文到 store |
| 注入方式 | **URL query string** | 高德 Web 服务 API 的唯一鉴权方式 |
| 申请类型 | **「Web 服务」**（不是「Web 端 JS API」） | 选错类型 → `USERKEY_PLAT_NOMATCH` |

**⚠️ 安全契约声明（必须写进设置页文案）**：
- AES 密钥 `SECRET` 是**前端硬编码常量**（`src/utils/encryption.ts`），任何人 F12 都能拿到 → **这不是加密保护，只是防止明文出现在 localStorage 面板里**。
- **设置页现有文案「Key 将使用 AES 加密存储」属于过度承诺**，易让用户误以为 Key 是安全的。
- **P1 修订为**：「Key 仅保存在本机浏览器，不会上传服务器。请勿在此填写高价值 Key，并在高德控制台为该 Key 设置每日调用上限。」
- **Key 会出现在浏览器地址栏/历史/开发者工具 Network 面板**（query 传参的固有限制，无法规避）。
- **Referer/域名白名单**：若用户在高德控制台配置了域名白名单，必须包含 `inliang.github.io`。站点是 HTTPS，请求 `https://restapi.amap.com` 也是 HTTPS → **无混合内容问题**。

### 5.2 localStorage 数据模型契约

#### 5.2.1 存储键与版本

| 项 | 值 |
|---|---|
| **localStorage key** | `envelope-printer-storage`（唯一，Zustand `persist` 自动管理） |
| **当前 version** | `1` |
| **v1.0.1 目标 version** | **`2`** |
| **migrate 函数** | **现状：无** → **v1.0.1 必须提供**（⚠️ 这是上线阻塞项，见 §10 R1） |
| **存储隔离** | localStorage 按 origin 隔离。`inliang.github.io` 下的 `/envo/` 与其他 GH Pages 项目共享同一 origin，但 key 名唯一 → 不冲突 ✅ |
| **容量上限** | 浏览器限制约 5MB/ origin。`printHistory` 每条含完整收发件人+信封快照，量大时可能撑爆 → P2 加软上限 |

#### 5.2.2 数据结构

```ts
// localStorage['envelope-printer-storage'] 的 JSON 结构
{
  "version": 1,
  "state": {
    "activeTab":        "editor" | "addressbook" | "history" | "settings",
    "addresses":        Address[],
    "printHistory":     PrintRecord[],
    "settings":         AppSettings,
    "currentRecipient": Address | null,
    "currentEnvelope":  EnvelopeSettings
  }
}
```

**字段类型定义（冻结）**

```ts
interface Address {
  id: string;            // 必填，Date.now().toString(36) + 6 位随机
  name: string;          // 必填，联系人姓名
  recipient: string;     // 必填，收件人（单位/公司）
  address: string;       // 必填，地址
  postcode?: string;     // 选填
  phone?: string;        // 选填
  tag?: 'home' | 'work' | 'family' | 'other';
  tagLabel?: string;     // 自定义标签文案
  createdAt: string;     // ISO 8601 字符串
}

interface SenderInfo {
  name: string;          // 必填
  address: string;       // 必填
  phone?: string;
  postcode?: string;
}

type EnvelopeSize = 'DL' | 'ZL' | 'C5' | 'C4' | 'C6' | 'B6' | 'custom';

/** 书写格式：国内格式 / 国际格式。与 size 解耦，可任意组合 */
type EnvelopeFormat = 'domestic' | 'international';

interface EnvelopeSettings {
  size: EnvelopeSize;    // 默认 'DL'
  customWidth?: number;  // 仅 size='custom' 时有意义，单位 mm
  customHeight?: number; // 同上
  /**
   * 书写格式。**可选字段**，详见 §5.2.5「尺寸与格式解耦契约」。
   * 缺失时回退为「跟随该尺寸自身的 category」，不视为数据损坏。
   */
  format?: EnvelopeFormat;
  fontSize: number;      // 默认 14，作为字号微调乘数（userMul = fontSize/14）
  fontFamily: string;    // 默认系统字体栈（决策 A 已裁决），见 §7.5；旧值 'Inter, sans-serif' 已废弃
  showReturnAddress: boolean;  // 默认 true
  showLogo: boolean;           // 默认 false
}

interface PrintRecord {
  id: string;
  recipient: Address;      // 快照，非引用
  sender: SenderInfo;      // 快照
  settings: EnvelopeSettings; // 快照
  printedAt: string;       // ISO 8601
  type: 'print' | 'pdf';
}

interface AppSettings {
  defaultSender: SenderInfo;
  defaultEnvelope: EnvelopeSettings;
  amapKey: string;         // AES 密文，空表示未配置
}
```

**信封尺寸常量（`ENVELOPE_SIZES`，冻结，单位 mm）** —— 详见 §5.5，以代码 `src/store/types.ts` 为准

| 规格 | 宽 | 高 | 分类（代码 category） |
|---|---|---|---|
| ZL | 230 | 120 | **domestic 国内** |
| DL | 220 | 110 | **domestic 国内**（默认） |
| C5 | 229 | 162 | **domestic 国内** |
| C4 | 324 | 229 | **domestic 国内** |
| B6 | 176 | 125 | **international 国际** ⚠️ 非国产 |
| C6 | 162 | 114 | **international 国际** ⚠️ 非国产 |
| custom | 220 | 110 | international（默认占位） |

#### 5.2.3 持久化字段裁决（**N-01，P0**）

现状：`persist` **无 `partialize`**，整个 state 全量落盘，包括 UI 瞬时状态。这在工具站上是错的。

| 字段 | 现状 | **v1.0.1 裁决** | 理由 |
|---|---|---|---|
| `addresses` | 持久化 | ✅ **持久化** | 核心资产，丢了工具就没价值 |
| `printHistory` | 持久化 | ✅ **持久化** | 台账 |
| `settings` | 持久化 | ✅ **持久化** | 含默认寄件人 + amapKey |
| `currentEnvelope` | 持久化 | ✅ **持久化** | 信封规格/字号是用户偏好，续用合理 |
| `activeTab` | 持久化 | ❌ **必须排除** | **落地视图必须是 V1（转化发生地）**。用户上次停在设置页，下次进来还在设置页 = 白白多一步。**这是转化路径摩擦点 F2** |
| `currentRecipient` | 持久化 | ❌ **必须排除** | 残留上次收件人 → **用户极易误印旧地址**（实体信件不可逆，印错就是废一张信封）。宁可每次重填 |

#### 5.2.4 迁移策略（**冻结契约，不允许"开发时再说"**）

```ts
// src/store/index.ts —— persist 配置目标形态
{
  name: 'envelope-printer-storage',
  version: 2,
  partialize: (state) => ({
    addresses: state.addresses,
    printHistory: state.printHistory,
    settings: state.settings,
    currentEnvelope: state.currentEnvelope,
    // 显式排除 activeTab、currentRecipient
  }),
  migrate: (persisted: unknown, from: number) => {
    const p = (persisted ?? {}) as Partial<PersistedShape>;
    if (from < 2) {
      // v1 → v2：保留全部业务数据，丢弃 UI 瞬时态
      return {
        addresses:     Array.isArray(p.addresses) ? p.addresses : [],
        printHistory:  Array.isArray(p.printHistory) ? p.printHistory : [],
        settings:      p.settings ?? DEFAULT_SETTINGS,
        currentEnvelope: p.currentEnvelope ?? DEFAULT_ENVELOPE,
      };
    }
    return p;
  },
}
```

**迁移铁律**：
1. **v1 → v2 不允许丢弃任何 `addresses` / `printHistory` / `settings`。** 丢数据 = 工具对用户失去信任，本地工具站最不能犯的错。
2. `settings` 需做**深合并**（`{...DEFAULT_SETTINGS, ...p.settings, defaultSender: {...DEFAULT_SENDER, ...p.settings?.defaultSender}}`），因为 v1.0.1 若给 `AppSettings` 加了新字段，老数据里没有 → 直接用会导致 `undefined` 解引用崩溃。
3. 迁移失败（JSON 损坏 / 结构异常）→ **不抛错**，回退到 `DEFAULT_*` 初始值，并在 console 留一条 warn。**绝不能让迁移失败导致白屏。**
4. **`format` 字段的引入不 bump version**（详见 §5.2.5）。**version 维持 `2`，禁止升到 3。** 任何"加字段就升版本"的直觉在这里是错的 —— 升版本会触发 `migrate`，而新 `migrate` 若写漏一个字段就是数据丢失事故。**可选字段 + 读取时回退 = 零迁移**，这是本项目的默认做法。

#### 5.2.5 尺寸与格式解耦契约（**新增，v1.5**）

**背景**：原实现把书写格式**绑死**在尺寸的 `category` 上（`envelopeCanvas.ts:24` 写死 `return cfg.category === 'domestic'`）。用户需要「用国内 DL 5 号信封，但按国际格式书写」这类组合，两者必须解耦。

**契约（冻结）**：

| 项 | 契约 |
|---|---|
| **字段** | `EnvelopeSettings.format?: 'domestic' \| 'international'` —— **可选** |
| **组合自由度** | **任意尺寸 × 两种格式**（7 尺寸 × 2 格式 = 14 种组合），不再受 `category` 限制 |
| **默认值 / 回退规则** | **字段缺失时回退为「跟随该尺寸自身的 `category`」** —— 即 `format ?? ENVELOPE_SIZES[size].category`。**缺失不视为数据损坏**，不触发 migrate、不重置 state |
| **切换尺寸时的行为** | 切换尺寸 → `format` **自动跟随新尺寸的 `category`**（选 DL → 国内格式，选 B6 → 国际格式）；**随后用户可随时手动改**，手动值优先并保持，直到下次切换尺寸 |
| **UI 选项命名** | **「国内信封格式」** / **「国际信封格式」** —— 不得用「中式格式 / 西式格式」「国内版式 / 海外版式」等其他叫法 |
| **`category` 字段的新语义** | 由「格式的唯一决定因素」降级为「**该尺寸的推荐默认格式**」。§5.5 表中的 `category` 列含义同步更新 |
| **持久化 version** | **维持 `2`，不升到 3**（见 §5.2.4 铁律 4） |
| **渲染函数约定** | `drawEnvelope` 不再从 `cfg.category` 推导格式，改为读取 `settings.format ?? cfg.category` |

**回退规则的实现约束（易错）**：
- 回退必须发生在**读取时**（`settings.format ?? ENVELOPE_SIZES[size].category`），**不是在写入时批量补默认值**。前者零迁移，后者要么需要 migrate、要么会让"用户从未选过"和"用户主动选了跟随值"这两种状态无法区分。
- `custom` 尺寸的 `category` 是 `international`，因此未指定 `format` 的自定义信封回退为**国际格式**（与现状行为一致，无回归）。

### 5.3 第三方库调用契约

#### 5.3.1 jsPDF（PDF 导出）

| 项 | 契约 |
|---|---|
| **导入** | `import jsPDF from 'jspdf'`（现状）→ P1 改 `const { jsPDF } = await import('jspdf')` |
| **输入 1：构造参数** | `{ orientation: mmW > mmH ? 'l' : 'p', unit: 'mm', format: [mmW, mmH] }` |
| **输入 2：图像** | `canvas.toDataURL('image/png', 1.0)` 返回的 data URL（约数 MB 的 base64） |
| **输入 3：绘制** | `addImage(imgData, 'PNG', 0, 0, mmW, mmH)` |
| **输出** | 浏览器下载文件，文件名 `信封_{recipient.recipient || '导出'}.pdf` |
| **副作用** | 成功后 `addPrintRecord({recipient, sender, settings: currentEnvelope, type: 'pdf'})` |
| **失败行为** | try/catch → 提示「PDF 导出失败」 |
| **幂等性** | ❌ 非幂等。每次调用都新增一条历史记录，重复点击会重复入账 → **必须配 N-10 的按钮禁用** |

**⚠️ 已知契约 bug（R4）**：`handleExportPDF` 取 `mmW/mmH` 时**只用了 `sizeConfig.width/height`，未处理 `size === 'custom'` 的 `customWidth/customHeight`**（而打印分支 `handlePrint` 处理了）。结果：**自定义尺寸信封导出的 PDF 尺寸恒为 220×110mm 的默认占位值，图像被拉伸。** P1 修复，与 `handlePrint` 对齐。

#### 5.3.2 xlsx（Excel 导出 / 导入）

| 项 | 契约 |
|---|---|
| **导入** | `import * as XLSX from 'xlsx'`（现状）→ P1 改 `await import('xlsx')` |
| **导出调用链** | `json_to_sheet(data)` → `book_new()` → `book_append_sheet(wb, ws, name)` → 设 `ws['!cols']` → `writeFile(wb, filename)` |
| **导出输入** | `Address[]` 或 `PrintRecord[]`，内部映射为中文列表头 |
| **导出列（地址簿）** | 姓名、收件人、地址、邮编、电话、标签、创建时间（列宽 `wch: 24`） |
| **导出列（打印历史）** | 收件人、地址、电话、寄件人、信封规格、打印方式、打印时间 |
| **导出文件名** | `地址簿_{YYYY-M-D}.xlsx` / `打印历史_{YYYY-M-D}.xlsx`（`toLocaleDateString('zh-CN')` 后把 `/` 替换为 `-` ✅ 已处理） |
| **导入调用链** | `XLSX.read(buffer, {type:'array'})` → `SheetNames[0]` → `sheet_to_json(sheet, {header:1})` |
| **导入列名映射** | 见 `COLUMN_ALIASES`：name(姓名/name/名字/称呼/联系人)、recipient(收件人/recipient/单位/公司/company/organization/org)、address(地址/address/详细地址/收货地址/addr)、postcode(邮编/postcode/邮政编码/zip/zipcode/zip_code)、phone(电话/phone/手机/mobile/联系电话/tel/telephone)、tag(标签/tag/分组/类型/label/category/group)、tagLabel |
| **导入必填校验** | `name` 与 `address` 均非空才入库，否则跳过并记录错误行号 |
| **空数据行为** | `data[0]` 为 `undefined` → `Object.keys({})` → `!cols = []` → 空 sheet。**不崩溃 ✅** |
| **标签映射** | `TAG_MAP`：家/公司/亲友/其他 ↔ home/work/family/other；无法识别时 `tag=undefined`，`tagLabel=原文` |

**⚠️ 依赖风险（R8）**：`xlsx@0.18.5` 来自 npm registry。SheetJS 官方已停止在 npm 发布新版，`0.18.5` 存在已知 CVE（原型污染 / ReDoS，CVE-2023-30533）。**本项目的实际风险为低**（纯本地工具，处理的都是用户自己上传的文件，无服务端）。**决策：v1.0.1 不升级**（升级需换 CDN 源 `https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz`，会改动 lockfile，属于独立变更），记入技术债。

#### 5.3.3 CryptoJS（AES 加解密）

| 项 | 契约 |
|---|---|
| **导入** | `import CryptoJS from 'crypto-js'` |
| **密钥** | 常量 `SECRET = 'envelope-printer-secret-2024'`（**硬编码，前端可见**） |
| **加密输入** | `plainText: string`；**空串不入加密** —— `setAmapKey('')` 直接存 `''` |
| **加密输出** | `CryptoJS.AES.encrypt(plain, SECRET).toString()` → OpenSSL 格式的 base64 密文字符串 |
| **解密输入** | `cipherText: string`；空串直接返回 `''` |
| **解密输出** | `CryptoJS.AES.decrypt(cipher, SECRET).toString(CryptoJS.enc.Utf8)`；失败/空返回 `''` |
| **失败行为** | try/catch → 返回 `''`（视为"未配置 Key"，触发降级契约 §5.1.3 铁律 1） |
| **安全级别** | **混淆级，非安全级。** 不得用于任何需要真实保密的场景（见 §5.1.4 声明） |

### 5.4 静态资源契约（**部署阶段可直接照抄**）

**统一规则**：
- 所有文件放 **`public/`**（Vite 会原样拷贝到 `dist/` 根，不做 hash、不做处理）
- 站点 `base = '/envo/'`，因此最终 URL 前缀恒为 `https://inliang.github.io/envo/`
- **`public/` 下的文件不带 content hash** → 更新内容后浏览器可能拿旧缓存（GitHub Pages 对非 assets 路径用 `max-age=600`）。**契约：若需强制更新这些文件，必须改文件名**（如 `og-image-v2.png`）**并同步改 `index.html` 引用**，不要指望刷新缓存。

> **⚠️ 命名已统一（主理人裁决 3，v1.2）**：架构侧 `icon-192/512` 与内容侧 `android-chrome-192x192` 曾并存两套命名，现**统一为下面这一套，全队只认本表**。`site.webmanifest` 内引用一律用这里的名字，**不再出现 `android-chrome-*` 命名**。

| 文件名 | 放置路径 | 格式 | 尺寸 / 说明 | **最终 URL（base=/envo/）** |
|---|---|---|---|---|
| `favicon.ico` | `public/favicon.ico` | ICO | 32×32（**内含 16/32/48 三帧**），兼容老浏览器 | `https://inliang.github.io/envo/favicon.ico` |
| `favicon.svg` | `public/favicon.svg` | SVG | viewBox `0 0 32 32`，主题色 `#0D9488`（brand-600），**图标母版**，图形建议为信封轮廓或字母 E | `https://inliang.github.io/envo/favicon.svg` |
| `favicon-16x16.png` | `public/favicon-16x16.png` | PNG | 16×16（由母版导出） | `https://inliang.github.io/envo/favicon-16x16.png` |
| `favicon-32x32.png` | `public/favicon-32x32.png` | PNG | 32×32（由母版导出） | `https://inliang.github.io/envo/favicon-32x32.png` |
| `apple-touch-icon.png` | `public/apple-touch-icon.png` | PNG | **180×180，实底不透明**（iOS 会为透明区域填黑底） | `https://inliang.github.io/envo/apple-touch-icon.png` |
| `icon-192.png` | `public/icon-192.png` | PNG | 192×192 | `https://inliang.github.io/envo/icon-192.png` |
| `icon-512.png` | `public/icon-512.png` | PNG | 512×512 | `https://inliang.github.io/envo/icon-512.png` |
| `og-image.png` | `public/og-image.png` | PNG（OG **不支持 SVG**） | **1200×630**（1.91:1），**< 300KB**，含标题「Envo 信封打印助手」+ 一句副标题 + 信封视觉元素。**图上文字用中文系统字体（黑体类）渲染，不得引入外链字体**（裁决 4） | `https://inliang.github.io/envo/og-image.png` |
| `site.webmanifest` | `public/site.webmanifest` | JSON | 见下方模板 | `https://inliang.github.io/envo/site.webmanifest` |
| `robots.txt` | `public/robots.txt` | TXT | 见下方模板（⚠️ 子路径下爬虫不读，见 §2.4） | `https://inliang.github.io/envo/robots.txt` |
| `sitemap.xml` | `public/sitemap.xml` | XML | 见下方模板（**只有 1 条 `<url>`**） | `https://inliang.github.io/envo/sitemap.xml` |
| ~~`fonts/inter-latin-*.woff2`~~ | — | — | **❌ 不需要**（决策 A 已采纳，无自托管字体） | — |

**`site.webmanifest` 模板**

```json
{
  "name": "Envo 信封打印助手",
  "short_name": "Envo",
  "description": "Envo 是免费的在线信封打印助手：填写寄件人与收件人，选择 ZL/DL/C5/C4 等信封规格，信封排版实时预览，一键打印或导出 PDF；支持批量打印，数据只存本地，不上传服务器。",
  "lang": "zh-CN",
  "start_url": "/envo/",
  "scope": "/envo/",
  "display": "standalone",
  "background_color": "#F0FDFA",
  "theme_color": "#0D9488",
  "icons": [
    { "src": "/envo/favicon-16x16.png", "sizes": "16x16", "type": "image/png" },
    { "src": "/envo/favicon-32x32.png", "sizes": "32x32", "type": "image/png" },
    { "src": "/envo/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" },
    { "src": "/envo/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/envo/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

> `description` 与 §5.4 TDK 同源（内容侧定稿）。`icons` 命名严格用裁决 3 统一清单，**不出现 `android-chrome-*`**。
>
> **⚠️ manifest `description` 属用户可见文案**（会出现在 PWA 安装弹窗），原写「Canvas 实时预览」是内部实现术语，用户看不懂 —— 已改为**「信封排版实时预览」**（归 **B4**）。凡用户可见位置一律不用内部术语，见 §5.4 下方「术语契约」。

**`robots.txt` 模板**

```
# https://inliang.github.io/envo/robots.txt
# 注意：robots.txt 规范位置是主机根路径，子路径下的本文件爬虫不会读取。
# 保留此文件用于工程规范与未来迁移到自定义域名/根路径时复用。
User-agent: *
Allow: /

Sitemap: https://inliang.github.io/envo/sitemap.xml
```

**`sitemap.xml` 模板（只有 1 条）**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://inliang.github.io/envo/</loc>
    <lastmod>2026-08-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

> `lastmod` 取构建日期。上线后若内容有实质更新，手动改这个日期。

**`index.html` 的 `<head>` 目标形态（meta 契约，冻结）**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- TDK：以 content-plan.md 为准（主理人裁决，见下方说明） -->
    <title>信封打印助手 Envo - 在线排版信封，支持 DL/C5/C4 与 PDF 导出</title>
    <meta name="description" content="Envo 是免费的在线信封打印助手：填写寄件人与收件人，选择 ZL/DL/C5/C4 等信封规格，实时预览排版，一键打印或导出 PDF；支持批量打印，数据只存本地，不上传服务器。" />
    <meta name="keywords" content="信封打印,信封打印模板,在线打印信封,信封尺寸,批量打印信封,信封地址打印,导出PDF,地址簿" />
    <link rel="canonical" href="https://inliang.github.io/envo/" />

    <!-- 图标（命名以 裁决 3 统一清单为准） -->
    <link rel="icon" href="/envo/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="16x16" href="/envo/favicon-16x16.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/envo/favicon-32x32.png" />
    <link rel="icon" href="/envo/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/envo/apple-touch-icon.png" />
    <link rel="manifest" href="/envo/site.webmanifest" />
    <meta name="theme-color" content="#0D9488" />

    <!-- Open Graph（title/description 与上方 TDK 同源，不得出现第二套文案） -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Envo 信封打印助手" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:title" content="信封打印助手 Envo - 在线排版信封，支持 DL/C5/C4 与 PDF 导出" />
    <meta property="og:description" content="Envo 是免费的在线信封打印助手：填写寄件人与收件人，选择 ZL/DL/C5/C4 等信封规格，实时预览排版，一键打印或导出 PDF；支持批量打印，数据只存本地，不上传服务器。" />
    <meta property="og:url" content="https://inliang.github.io/envo/" />
    <meta property="og:image" content="https://inliang.github.io/envo/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Envo 信封打印助手预览图" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="信封打印助手 Envo - 在线排版信封，支持 DL/C5/C4 与 PDF 导出" />
    <meta name="twitter:description" content="填写寄件人与收件人，选择 ZL/DL/C5/C4 等信封规格，实时预览排版，一键打印或导出 PDF；支持批量打印，数据只存本地。" />
    <meta name="twitter:image" content="https://inliang.github.io/envo/og-image.png" />
  </head>
  <body class="bg-brand-50 text-brand-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**⚠️ TDK 来源声明（v1.2 起生效）**：本节 title / description / keywords **以 `docs/content-plan.md`（字有物）为准**，已整体覆盖本规格卡 v1.0 的初稿版本。**`canonical`（`https://inliang.github.io/envo/`，带尾斜杠）与 `theme_color`（`#0D9488`）维持架构侧原值，与内容侧一致，无冲突。**

覆盖的两个理由（主理人裁决）：
1. 初稿 description 写了「地址智能联想**自动补全邮编**」—— 但本卡 §10 的 **R5/R6** 已查明：代码用 11 位 `towncode` 冒充邮编、高德 inputtips 官方根本不返回 `postcode`。该描述对外宣称一个实际失效的功能，属**虚假承诺**，必须撤。
2. 内容侧版本做了可验证的长度核算：title 59 半角单位 / 约 490px，**在 Google 600px 截断线内**；description 67 字。且显式覆盖 `ZL/DL/C5/C4` 真实长尾词（初稿写的 `C6` 属国际规格，非国内主力词）。

**契约要点（易错，标红）**：
1. **`og:image` 与 `canonical` 必须是绝对 URL**（`https://inliang.github.io/...`）。Twitter / Facebook 抓不到相对路径。
2. **图标 / manifest 用 `/envo/` 开头的绝对路径**（不是相对路径 `./`，也不是 `public/`）。Vite 在构建时会原样保留 `/envo/...`，与 `base` 一致 ✅
3. **`og:image` 不能是 SVG**，必须 PNG/JPG。
4. **移除全部 Google Fonts 外链**（3 个 `<link>`：2 个 preconnect + 1 个 stylesheet）。这是 render-blocking 资源，国内访问 Google Fonts 常超时 → 首屏白屏时间显著变长（§6 F1）。
5. **OG / Twitter 的 title 与 description 必须与 TDK 同源**，不允许出现第二套文案（社交平台抓取与搜索结果不一致会降低点击率）。
6. **OG 图上的文字使用中文系统字体（黑体类）渲染，不得引入任何外链字体**（主理人裁决 4）。理由：本站已采纳字体本地化（决策 A，删 Google Fonts 走系统字体栈），OG 图若依赖外链字体会与站点策略自相矛盾，且 OG 图是离线渲染产物，外链字体本就不可控。

**用户可见文案的术语契约（归 B4）**

> **规则：凡用户能看到的位置，一律使用用户语言，禁止出现内部实现术语**（`Canvas` / `Zustand` / `localStorage` / `DPR` / `persist` / `migrate` 等）。代码标识符、内部注释、本卡的技术性描述不在其列。

| 内部术语 | 用户语言 | 适用位置 |
|---|---|---|
| Canvas（实时）预览 | **信封排版实时预览** / **信封预览** | manifest `description`、页面区块名与标题、按钮与提示文案、转化路径描述 |
| localStorage | **本机浏览器** / **本地保存** | 设置页文案、隐私说明 |
| 6× DPR 高清渲染 | **高清打印画质** | 仅当必须向用户解释打印清晰度时 |
| Zustand / persist / migrate | **不出现在任何用户文案中** | 仅技术文档 |

**本卡已按此清理**：面向用户或会成为 UI 区块名的位置改用「信封预览 / 信封排版实时预览」；**代码层保留原术语**（`envelopeCanvas.ts`、`canvasRef`、`drawEnvelope`、`6× DPR Canvas`、`html2canvas`、`<canvas>` 元素的 aria 标记、R3 Canvas 竞态、R10 渲染性能）。

---

### 5.5 信封规格枚举（**以代码为准，勿照抄 README**）

`src/store/types.ts` 的 `ENVELOPE_SIZES` 是唯一事实来源。**国内规格 4 种：ZL / DL / C5 / C4；国际规格 2 种：B6 / C6；另加自定义 1 种。**

> **⚠️ `category` 的语义已变更（v1.5 解耦后）**：它不再是"书写格式的唯一决定因素"，而是**该尺寸的推荐默认格式**。格式现由 `EnvelopeSettings.format` 独立控制，可任意组合（§5.2.5）。下表 `category` 列即"未手动选择格式时的回退值"。

| 规格 | 宽(mm) | 高(mm) | category | 代码 label |
|---|---|---|---|---|
| ZL | 230 | 120 | **domestic** | ZL 6号信封 (230×120mm) · 国内 |
| DL | 220 | 110 | **domestic**（默认） | DL 5号信封 (220×110mm) · 国内 |
| C5 | 229 | 162 | **domestic** | C5 7号信封 (229×162mm) · 国内 |
| C4 | 324 | 229 | **domestic** | C4 9号信封 (324×229mm) · 国内 |
| B6 | 176 | 125 | **international** | B6 (176×125mm) · 国际 |
| C6 | 162 | 114 | **international** | C6 (162×114mm) · 国际 |
| custom | 220 | 110 | international（默认占位） | 自定义 |

**⚠️ 易错点：B6 是国际规格，不是国产规格。** `README.md` 与早期简报中「国产 B6」的说法与代码不符（源头是 README 照抄错误）。**凡对外文案（TDK、OG 文案、JSON-LD featureList、功能描述）出现规格枚举时，国内一律写 ZL/DL/C5/C4，不得把 B6/C6 写成国产。**

---

## 6. 转化路径（TTFE）

### 6.1 最短路径

```
[0] 访客进入 https://inliang.github.io/envo/
     ↓
[1] 首屏渲染完成，落在「信封编辑」视图
     ↓
[2] 填寄件人（姓名/地址/电话/邮编）
     ↓
[3] 填收件人（姓名/单位/地址/邮编/电话）
     ↓  （可选增强：高德联想一键补全地址+邮编）
[4] 信封排版实时预览确认无误
     ↓
[5] 选信封规格（默认 DL，多数人不用改）
     ↓
[6] 点击「打印」或「导出 PDF」
     ↓
✅ 转化完成：产出一份可打印的信封
```

**最短路径 = 6 步，其中 2 步（填寄件人 / 填收件人）承载 90% 的操作量。**

优化的第一优先级不是"减少步骤"（步骤已经不能再少了 —— 信封上必须有的信息就是这么多），而是**降低每步的填写成本**和**消除静默失败**。

### 6.2 逐步摩擦点与削减建议

| 步 | 摩擦点 | 严重度 | 现状 | **削减建议** | 优先级 |
|---|---|---|---|---|---|
| **[0]→[1]** | **F1 首屏白屏时间长** | 🔴 高 | 主 bundle 约 1.06MB（未压缩，含 React + jsPDF + xlsx），另有 3 个 render-blocking 的 Google Fonts 外链（国内常超时） | ① 删除 Google Fonts 外链（N-02）；② jsPDF / xlsx 改动态 import，首屏只留 React + Zustand（N-12）；③ 加 `<div id="root">` 内的静态加载骨架 | **P0**（①）<br>P1（②③） |
| **[1]** | **F2 落地视图可能不是编辑器** | 🔴 高 | `activeTab` 被持久化 → 上次停在「设置」页，下次进来还在设置页，白白多一次点击才到转化页 | `partialize` 排除 `activeTab`，**每次落地强制回 V1**（N-01） | **P0** |
| **[2]** | **F3 寄件人每次都要重填** | 🟡 中 | `useState(settings.defaultSender)` 只在 V1 **挂载时**读一次。首次进入时 `defaultSender` 全空 → 必填 4 个字段 | 首次进入时显示空态引导「设置一次默认寄件人，以后自动填充」+ 一键跳 V4（N-14） | P1 |
| **[3]** | **F4 高德联想对无 Key 用户完全静默** | 🔴 高 | 未配 Key 时**不发请求、不显示任何提示**。用户不知道有联想功能，也不知道为什么没有 → 只能手打完整地址（最长的一步） | 地址框下方常驻一行提示「未配置高德 Key，无法使用地址联想」+「去设置」链接。配了 Key 后提示自动消失（N-09） | **P0** |
| **[3]** | **F5 邮编补全依赖 2 次 API + 可能填出 towncode** | 🟡 中 | tips 无 postcode（官方不返回）→ 100% 触发逆地理编码；`postcode` 为空时用 `towncode`（11 位乡镇码）冒充邮编 → **填错比不填更糟** | P1 改为 `ac.postcode \|\| ''`，宁可留空（R5） | P1 |
| **[4]** | F6 信封预览在移动端过小 | 🟡 中 | 未做响应式适配，小屏下可能被挤压到看不清 | 预览元素用 `max-width:100%` + `height:auto`，保证窄屏下等比缩放不溢出 | **P0**（并入 B8） |
| **[6]** | **F7 打印/PDF 无 loading 态** | 🟡 中 | 6× DPR Canvas（约 5200×2600 px）在低端机渲染 1–3s，期间界面无任何反馈 → **用户会重复点击**，导致重复入账打印历史（jsPDF 分支非幂等） | 点击后立即 `disabled` + 文案「生成中…」，完成后恢复（N-10） | **P0** |
| **[6]** | **F8 打印依赖 `window.open` 弹窗** | 🟡 中 | 弹窗拦截器是常态。被拦截时虽有提示「请允许弹出窗口以打印信封」，但用户往往不知道去哪允许 | 现状提示已存在 ✅；P2 改为隐藏 iframe 打印彻底规避（N-15） | P2 |
| **[6]** | **F9 移动端无法完成打印** | 🔴 高（移动端） | 移动端打印链路不可靠。若把移动端 KPI 也定为"完成打印"，必然全军覆没 | **重新定义移动端 KPI**：不考核打印转化，只考核「页面可用、无横向滚动、能查看/新增地址簿」。§7 响应式验收按此标准 | **P0**（认知对齐） |

### 6.3 转化路径的结论

**v1.0.1 在转化上真正要做的只有 4 件事**（其余都是噪音）：

1. **让首屏更快到**（删字体外链 + 分包）— 影响步骤 [0]→[1]
2. **让落地页永远是编辑器**（排除 `activeTab` 持久化）— 影响步骤 [1]
3. **让"没有高德 Key"这件事被看见**（显式引导）— 影响步骤 [3]，这是填写成本最高的一步
4. **让下载/打印有反馈**（loading 态）— 影响步骤 [6]，防重复入账

---

## 7. 技术栈与托管选型（**结论，不是选项清单**）

### 7.1 技术栈：保持不变，并明确"不引入什么"

**结论：维持 React 18 + TypeScript + Vite 6 + Tailwind CSS 3 + Zustand 4。不新增任何运行时依赖。**

**明确不引入**（以及为什么）：

| 不引入 | 理由 |
|---|---|
| **react-router** | 单 URL + 4 视图由 state 切换，路由是纯成本。且加了 router 还得配 404 fallback + 预渲染，收益为零（§2.3） |
| **SSR / SSG（Next.js / Vite SSR）** | 站点内容完全是运行时用户数据，服务端没有东西可渲染。引入 SSR 只为一个静态壳，性价比为负 |
| **react-helmet / unhead** | 单页单 URL，meta 静态写死即可（§3.5） |
| **任何后端 / BaaS** | G0 已定：数据仍在 localStorage。加后端会把"数据不出本机"这个**核心卖点**变成负担（还要写隐私政策、做数据合规） |
| **UI 组件库（antd / MUI）** | 现有 Tailwind 原子类 + 少量 `@layer components` 类已够用，引入组件库会让 bundle 增加数百 KB，与"性能优化"目标直接冲突 |
| **PWA / Service Worker** | 打印工具的核心场景是桌面端联网使用，离线能力价值有限，且 SW 缓存失效是常见的线上事故源。只做 `webmanifest` + 图标（可被"添加到主屏幕"），**不做 SW** |

### 7.2 托管：GitHub Pages（子路径）

**结论：GitHub Pages，走现有 `.github/workflows/deploy.yml`（GitHub Actions 部署），canonical 域名用 `https://inliang.github.io/envo/`。**

| 项 | 结论 |
|---|---|
| **托管平台** | GitHub Pages（仓库 `Inliang/envo`，master 分支触发） |
| **Pages Source** | **必须是「GitHub Actions」**（不是 "Deploy from a branch"）。现有 workflow 用 `actions/deploy-pages@v4`，两者必须匹配，否则部署后 404。**这是部署阶段第 1 项检查** |
| **子路径 base** | `vite.config.ts` 已配 `base: '/envo/'` ✅ **不要改**。构建产物中的资源引用已正确输出为 `/envo/assets/index-*.js`（已验证 `dist/index.html`） |
| **HTTPS** | GitHub Pages 对 `*.github.io` 自动签发并强制 HTTPS，无需配置、无需证书。**契约：所有对外 URL（canonical / OG / sitemap / manifest start_url）一律写 `https://`，不写 `http://`** |
| **自定义域名** | **本次不做（P2）。** 若将来绑定，`base` 需改为 `/`，且 canonical / OG / sitemap / manifest 内所有 URL 需全量改写 —— 这是一个独立变更，不在 v1.0.1 范围 |
| **构建命令** | `npm ci` → `npm run build`（= `tsc -b && vite build`）→ 上传 `./dist`。`package-lock.json` 已在仓内且未被 `.gitignore` 忽略 ✅ |

### 7.3 SPA 404 行为

**结论：本项目不需要 history fallback，也不需要 `404.html`。**

理由：**单 URL + 无 router**。所有合法访问都落在 `/envo/`，GitHub Pages 直接返回 `index.html`。不存在"刷新子路由 404"这个经典 SPA 问题。

**未匹配路径**（如有人访问 `/envo/foo`）会返回 GitHub Pages 默认 404 页 —— 但这不是缺陷，因为**没有任何站内链接会指向这样的路径**。

**未来触发条件（记录备查）**：若 v2 引入 hash 路由或 history 路由，则需要：
- history 路由 → 需 `404.html` 复制 `index.html` + 部署端 rewrite（GH Pages 不支持 rewrite，只能用 404 重定向技巧）
- hash 路由 → 无需任何处理（hash 不发送到服务端）

**`.nojekyll`：不需要。** 现有部署走 `actions/deploy-pages`，**不经过 Jekyll 构建**，因此不会被 Jekyll 吞掉下划线目录。（若将来改用「Deploy from a branch」方式，则必须加 `.nojekyll`。）

### 7.4 缓存与缓存失效

| 资源类型 | GitHub Pages 缓存行为 | 失效机制 | **契约** |
|---|---|---|---|
| `index.html` | 短缓存（`max-age=600` 级别） | 时间过期 | 部署后最长约 10 分钟生效。若需立即见效，硬刷新（Ctrl+F5） |
| `/envo/assets/*` （JS/CSS） | **长期缓存（immutable）** | **文件名 content hash** | Vite 已自动加 hash（`index-BkknIOW0.js`）✅ 每次内容变更自动生成新文件名 → **旧缓存自动失效，无需任何操作** |
| `/envo/*` （`public/` 下：favicon、og-image、robots、sitemap、manifest、fonts） | 短缓存，**无 hash** | ⚠️ **内容变了文件名没变 → 浏览器可能拿旧的** | **强制更新必须改文件名**（`og-image-v2.png`）**并同步改引用**。不要指望刷新 CDN 缓存（GH Pages 不提供手动 purge） |

**部署后自检契约**：上线后必须验证 `/envo/index.html` 引用的 assets hash 与 `dist/` 中文件名一致，否则说明 HTML 被缓存了旧版本。

### 7.5 字体本地化：决策与理由

**现状问题**：`index.html` 有 3 个 Google Fonts 外链（2 个 `preconnect` + 1 个 render-blocking `stylesheet`）。`fonts.googleapis.com` 在国内访问不稳定，超时会让首屏白屏时间显著增加。且 `fonts.gstatic.com` 的 woff2 拉取失败时，页面会用 `system-ui` 兜底 —— 但**阻塞已经发生了**。

**关键事实**：本站点 UI 文本 95% 以上是中文，而 **Inter 不包含任何 CJK 字形** —— 中文字符必然回落到系统字体。Inter 只对信封上的拉丁字母、数字、标点生效。

**我的结论：采用决策 A。** —— ✅ **主理人已裁决采纳（见 §12 决策 1）。本条已冻结，不再是待定项。**

| | **决策 A（✅ 已裁决采纳）** | ~~决策 B~~（已否决） |
|---|---|---|
| **做法** | 直接删除全部 Google Fonts 外链，`font-family` 改为系统字体栈 | 自托管 Inter latin 子集 woff2 到 `public/fonts/` |
| **网络请求** | **0** | 4 个 woff2（400/500/600/700） |
| **首屏阻塞** | **无** | 需 `font-display: swap` + 预加载才不阻塞 |
| **Canvas 竞态风险** | **无**（系统字体立即可用） | **有**：`drawEnvelope` 可能在字体加载完成前绘制 → **打印出 fallback 字体的信封**。需额外实现 `document.fonts.ready` 重绘钩子（N-13） |
| **视觉一致性** | 跨平台不完全一致 | 跨平台一致 |
| **实现成本** | 极低（删 3 行 + 改 1 处 fontFamily） | 中（字体子集化 + `@font-face` + canvas 重绘 + 4 个文件） |
| **适用判断** | ✅ **信封打印工具，字体品牌价值 ≈ 0。用户关心的是地址和邮编对不对，不是字型是不是 Inter** | 仅当甲方明确要求"必须有 Inter 的视觉"时才选 |

**决策 A 的系统字体栈（契约）**：

```css
/* tailwind.config.js → theme.extend.fontFamily.sans，与 index.css 保持一致 */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
             "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC",
             "Source Han Sans SC", sans-serif;
```

同时 `EnvelopeSettings.fontFamily` 默认值从 `'Inter, sans-serif'` 改为上述同款栈（保证 Canvas 渲染与 UI 一致）。

**✅ 裁决落地后的连带结论（前端阶段直接执行）**：

1. **N-13（Canvas 字体就绪检测与重绘）取消。** 系统字体立即可用，不存在"字体未加载完就绘制"的竞态。打印出的信封字体 = 预览所见字体，**不会出现印出 fallback 字体的废品**。
2. **`public/fonts/` 目录不创建，`src/utils/fontsReady.ts` 不创建。**
3. 原风险 **R3 降级**：阻塞首屏部分仍成立（P0 必办，N-02）；Canvas 字体竞态部分**已消除**。
4. 前端阶段按系统字体栈渲染即可，**不需要任何字体加载处理逻辑**。

### 7.6 性能与响应式验收标准（可测量，不含糊）

| 指标 | 目标 | 测量方式 |
|---|---|---|
| 首屏 JS（gzip 后） | **≤ 300KB**（P0 后：删字体 + 未分包约 330KB；P1 分包后约 120KB） | `npm run build` 后看 `dist/assets/` 体积 / Lighthouse |
| 首屏阻塞的第三方请求 | **0** | 构建产物 HTML 中无 `fonts.googleapis.com` |
| Lighthouse Performance（桌面） | ≥ 90 | Lighthouse |
| Lighthouse Accessibility | **≥ 95** | Lighthouse（P0 目标，对应 N-08） |
| 移动端无横向滚动 | 375px / 390px 宽下 `document.body.scrollWidth <= clientWidth` | DevTools 设备模拟 |
| 触控目标 | 所有可点击元素 ≥ 44×44px | DevTools 审查 |
| 转化路径可用 | 桌面端 6 步内完成一次打印或 PDF 导出 | 人工冒烟 |

---

## 8. 目录结构约定

### 8.1 本次新增文件（**明确到文件名**）

```
envo/
├── docs/
│   └── site-spec.md                     ★ 本文件（唯一站点规格来源）
│
├── public/                              ★ 新增内容（原为空目录）
│   ├── favicon.ico                      32×32 ICO（含 16/32/48 三帧）
│   ├── favicon.svg                      矢量母版，viewBox 0 0 32 32
│   ├── favicon-16x16.png                16×16（母版导出）
│   ├── favicon-32x32.png                32×32（母版导出）
│   ├── apple-touch-icon.png             180×180，实底不透明
│   ├── icon-192.png                     192×192
│   ├── icon-512.png                     512×512
│   ├── og-image.png                     1200×630，<300KB，系统字体渲染
│   ├── site.webmanifest                 PWA 清单（不做 Service Worker）
│   ├── robots.txt                       规范项（子路径下爬虫不读）
│   └── sitemap.xml                      仅 1 条 URL
│   ❌ 不建 fonts/ 目录（决策 A 已采纳，无自托管字体）
│
└── src/ ❌ 不新增任何文件
```

> **图片资产产出方（主理人裁决 3）**：`og-image.png` 与各尺寸图标**不由架构阶段产出** —— 由 Phase 2 视觉设计师按 §5.4 尺寸契约出视觉稿，Phase 3 前端落地成图。B3（og-image 必须真实存在）挂在 G3 上线前检查项，**不解除不放行**。

### 8.2 本次修改文件（**明确到文件名**）

| 文件 | 修改内容 | 对应项 |
|---|---|---|
| `index.html` | 删除 3 个 Google Fonts `<link>`；补全 title / description / canonical / OG / Twitter / theme-color / favicon / manifest | N-02, N-03, N-04 |
| `src/store/index.ts` | persist 加 `version: 2` + `partialize` + `migrate` | **N-01（P0 阻塞）** |
| `src/store/types.ts` | `EnvelopeSettings.fontFamily` 默认值改系统字体栈（决策 A） | N-02 |
| `tailwind.config.js` | `fontFamily.sans` 改系统字体栈 | N-02 |
| `src/App.tsx` | Header 导航改 `<nav>` + `aria-current`；移动端导航响应式；Footer 版本号 `v1.0.0` → `v1.0.1` | N-07, N-08 |
| `src/components/EnvelopeEditor.tsx` | 无 Key 引导；打印/PDF loading 态 + 按钮禁用；Canvas 响应式；label/aria；PDF 尺寸修 custom（R4） | N-07, N-08, N-09, N-10, R4 |
| `src/components/AddressBook.tsx` | 响应式；label/aria；触控目标 | N-07, N-08 |
| `src/components/PrintHistory.tsx` | 响应式；label/aria；`window.confirm` → 内联确认（N-11） | N-07, N-08, N-11 |
| `src/components/Settings.tsx` | 响应式；label/aria；`alert()` → 内联提示（N-11）；**Key 文案修订（R7）**；导入时 amapKey 二次加密修复（R2） | N-07, N-08, N-11, R2, R7 |
| `src/utils/envelopeCanvas.ts` | Canvas `aria-label` / `role="img"` 由调用方补；字体栈一致性 | N-08 |
| `src/utils/encryption.ts` | **不改**（SECRET 硬编码是既定设计，改了会导致所有老 Key 失效）。仅配套修订文案 | R7 |
| `package.json` | 版本号 `1.0.0` → `1.0.1` | — |
| `CHANGELOG.md` | 追加 v1.0.1 条目 | — |
| `README.md` | 更新：项目结构补 `public/`；技术栈去掉已不用的 `react-to-print`/`html2canvas`（见 R14） | R14 |

### 8.3 明确**不修改**的文件

| 文件 | 原因 |
|---|---|
| `vite.config.ts` | `base: '/envo/'` 已正确。**如需分包，用源码内 `await import()` 实现，不改配置**（N-12） |
| `.github/workflows/deploy.yml` | 已正确配置（Node 22 / `npm ci` / `vite build` / `upload-pages-artifact@v3` / `deploy-pages@v4`）。**本次无需改动** |
| `postcss.config.js`、`tsconfig*.json` | 无需改动 |
| `src/utils/encryption.ts` 的 `SECRET` | 改了会让所有已存的 amapKey 失效 |

### 8.4 目录约定原则

1. **`public/` 只放"不需要构建处理、必须保持原文件名"的文件**（图标、robots、sitemap、manifest、字体）。任何需要 hash 或编译的资源都走 `src/assets/` + import。
2. **`src/components/` 一个视图一个文件**，不新建子目录（当前只有 4 个视图，加子目录是过度设计）。
3. **`src/utils/` 按"副作用领域"划分**：`envelopeCanvas`（渲染）、`exportExcel`（导出）、`importAddresses`（导入）、`encryption`（加解密）。新增工具遵循此划分，不建 `helpers/` 这种杂物抽屉。
4. **不新建 `src/hooks/`**：当前无跨组件复用的自定义 hook。

---

## 9. 上线前必办清单（可勾选）

### 9.0 🚨 上线阻塞项（**8 条，G1 范围裁决；不完不能上线**）

| 编号 | 事项 | 性质 | 不做的后果 / 验收 |
|---|---|---|---|
| **B1** | persist 补 `migrate` + `partialize`（`src/store/index.ts`） | 数据保护 | **后果**：升 `version: 2` 后 Zustand 丢弃全部旧 state，老用户地址簿与打印历史**清空且不可恢复**。**验收见下方死卡项** |
| **B2** | 移除 `index.html:7-9` Google Fonts 全部 3 个外链，改系统字体栈 | 性能 | **后果**：国内首屏被 render-blocking 超时请求卡住。**验收**：`dist/index.html` grep `fonts.g` 无结果 |
| **B3** | `public/og-image.png` 真实存在（1200×630） | 分享 | **后果**：`og:image` 404 → 分享灰图。**验收**：浏览器直开返回 200 且为 1200×630 PNG |
| **B4** | 22 条「文案与实际行为不符」必改 + 次要文字对比度 `brand-400 #2DD4BF` → `brand-700 #0F766E`（1.9:1 → 5.0:1） | 体验 / 无障碍 | **后果**：按钮写「打印此信封」实际只填表单不打印 → **用户预期落空**；次要文字对比度 1.9:1 **远低于 WCAG AA 4.5:1**。**验收**：逐条走查 content-plan 的 22 条清单；对比度用 DevTools 实测 ≥4.5:1 |
| **B5** | 修 R2：`Settings.tsx:187` 导入 JSON 时对已加密 amapKey **二次加密** | 缺陷 | **后果**：导入备份后 Key 解密出乱码，联想静默失效且无任何报错。**验收**：导出→导入→联想仍可用 |
| **B6** | 修 R5：`EnvelopeEditor.tsx:132` 用 11 位 `towncode` 冒充邮编 | 缺陷 | **后果**：填错邮编可能导致信件分拣错误，**实体不可逆**。**修法见下方 B6 专项** |
| **B7** | 删除操作做**内联确认组件**（自定义 UI，**不用 `window.confirm`**），并**同时复用于打印历史与地址簿**两处删除 | 体验 / 一致性 | **后果**：两处同类操作行为不一致；原生 `confirm` 在移动端不可样式化，与 B8 移动端响应式冲突。**验收**：打印历史与地址簿的删除走**同一个**内联确认组件，形态与文案一致 |
| **B8** | 移动端响应式（不报错 / 无横向滚动 / 能看清 / 能管地址簿）+ 焦点可见态 + aria + 触摸目标 44×44 | 响应式 / 无障碍 | **后果**：移动端不可用；键盘与读屏用户不可用。**验收**见 §9.1 B8 分组 |

**B1 死卡项（主理人裁定，不实测不放行）**
1. 造一份 **v1 格式**的真实 localStorage 数据（含 addresses / printHistory / settings / currentEnvelope）→ bump `version` → 刷新页面 → **验证三者全部保留**。
2. 再造一份 **`settings` 字段缺失/结构异常**的脏数据 → 刷新 → **验证能回退默认值且不抛错、不白屏**。
3. 另验：刷新后 `activeTab` 回到 `editor`、`currentRecipient` 为 `null`（`partialize` 生效）。

> **不接受「代码看着没问题」**。B1 是唯一会造成**用户数据永久丢失**的项，必须实测。

**B6 专项：邮编补全的修法（主理人征询，架构侧结论）**

**结论：采纳「留空优于填错」——联想时不自动填邮编，邮编由用户手填或从地址簿带入。** 理由：

1. **填错的代价远大于留空。** 收件人邮编格是邮件分拣依据，11 位 `towncode` 填进去会直接导致分拣异常；而邮编在 `Address.postcode` 里本就是**可选字段**，留空不影响信封正常寄递。
2. **自动补全的实际收益很低。** 现状每次选中联想项都会触发一次逆地理编码（`regeo`），而 `extensions=base` 下 `postcode` 并非稳定返回 —— 花一次 API 配额换一个可能为空、可能错的值，性价比为负。
3. **配额顺带减半。** 不再调 `regeo`，选中联想项的 API 调用从 2 次降为 1 次 —— **这同时把 R6 的配额消耗问题消解了**（见下方 R6 说明）。
4. **用户手填邮编的实际成本接近零。** 邮编只在新增地址时需要填一次，之后从地址簿选就自带；地址簿已支持邮编字段与 Excel 导入导出。

**明确不采纳「调逆地理编码换真 postcode」**：那正是现状，且仍存在"拿不到就留空"的分支，等于用一次 API 换一个不确定的结果，还保留了一条可能出错的通路。

**更好的补全方案（建议列 v1.1，不在本次做）**：邮编格旁加一个显式「补全邮编」按钮，用户点了才调 `regeo` 并只取 `postcode`（拿不到就留空，不回落 `towncode`）。这样默认零额外配额、需要时仍有补全能力。但它属于**功能增强**，会引入新交互，与 v1.0.1「加固止血、不新增业务功能」的定位冲突 —— **本次只做止血，增强放 v1.1 与 R6 合并处理**。

### 9.1 交接给【前端阶段】

**B1 · Store / 数据保护**
- [ ] persist 加 `version: 2`
- [ ] persist 加 `partialize`：排除 `activeTab`、`currentRecipient`（保留 addresses / printHistory / settings / currentEnvelope）
- [ ] persist 加 `migrate`：v1→v2 保留上述四项，`settings` 做**深合并**（`defaultSender` 层级也要合并），失败回退默认值**不抛错**
- [ ] 按上方「B1 死卡项」完成三项实测
- [ ] **version 维持 `2`** —— 引入 `format` 字段**不 bump 到 3**（§5.2.4 铁律 4、§5.2.5）

**F-20 · 书写格式与尺寸解耦（新增）**
- [ ] `EnvelopeSettings` 加可选字段 `format?: 'domestic' | 'international'`
- [ ] 回退规则实现在**读取时**：`settings.format ?? ENVELOPE_SIZES[size].category`（**不得**在写入时批量补默认值）
- [ ] `drawEnvelope` 不再从 `cfg.category` 推导格式，改读 `settings.format ?? cfg.category`
- [ ] 尺寸切换时 `format` 自动跟随新尺寸 `category`，用户随后可手动覆盖
- [ ] UI 选项命名固定为**「国内信封格式」/「国际信封格式」**
- [ ] 实测 14 种组合（7 尺寸 × 2 格式）**不报错、不白屏**（布局美观度问题属 R20，列 v1.1）
- [ ] 老数据（无 `format` 字段）打开后格式表现为"跟随 category"，与升级前一致 —— **无回归**

**B2 · 性能 / 字体**
- [ ] `index.html` 删除 3 个 Google Fonts `<link>`（2 preconnect + 1 stylesheet）
- [ ] `tailwind.config.js` + `src/store/types.ts` 的 `fontFamily` 改为系统字体栈（§7.5）
- [ ] （P1，非阻塞）`jspdf` / `xlsx` 改为 `await import()` 动态加载
- [ ] （P1，非阻塞）`<div id="root">` 内加静态加载骨架

**B3 · 分享图**
- [ ] `public/og-image.png` 由 Phase 2 视觉出稿、Phase 3 落地（架构侧不产出）
- [ ] 图上文字用中文系统字体，**不得引入外链字体**

**B4 · 文案与对比度**
- [ ] 逐条走查 `content-plan.md` 的 **22 条「文案与实际行为不符」**清单并改正
- [ ] 重点项：按钮文案「打印此信封」实际只填表单不打印 → 改为与实际行为一致
- [ ] 次要文字对比度：`brand-400 #2DD4BF` → `brand-700 #0F766E`（1.9:1 → 5.0:1），**全量替换，不留残**
- [ ] 设置页 Key 文案修订（R7：「AES 加密存储」属过度承诺）
- [ ] 对外文案规格枚举：国内写 ZL/DL/C5/C4，B6/C6 不得写成国产（§5.5）
- [ ] `site.webmanifest` 的 `description`：「Canvas 实时预览」→ **「信封排版实时预览」**
- [ ] **术语契约全量走查**（§5.4）：用户可见文案中不得出现 `Canvas` / `localStorage` / `Zustand` / `DPR` 等内部术语，统一改为用户语言

**B5 · 缺陷修复（R2）**
- [ ] `Settings.tsx:187` 导入时改为 `updateSettings({ amapKey: s.amapKey })` 直接写密文，**不调用 `setAmapKey`**

**B6 · 缺陷修复（R5）**
- [ ] `EnvelopeEditor.tsx:132` 改为 `ac.postcode \|\| ''`，**删除 `towncode` 兜底**
- [ ] 按 B6 专项结论：**联想时不再自动触发逆地理编码补邮编**，邮编留空由用户手填
- [ ] 清理 `AmapTip.postcode` 死字段与错误注释（R6 的代码整洁部分）

**B7 · 体验一致性（**G1 裁定做法**）**
- [ ] 新建**内联确认组件**（自定义 UI，**不调用 `window.confirm`**）
- [ ] **打印历史删除**接入该组件
- [ ] **地址簿删除同时接入同一组件**（两处共用，形态与文案一致）
- [ ] 验收：打印历史与地址簿的删除弹层外观、按钮位置、文案完全一致

> **注意做法已变更**：初版写的是「删除历史页的二次确认以对齐地址簿（地址簿本来没有确认）」。G1 裁定改为**双向对齐** —— 两处都配内联确认。理由：① 初衷是「两处行为一致」，只改一处形态仍然不一致；② 原生 `confirm` 在移动端不可样式化，与 B8 冲突。

**P1（非阻塞，本次不做）**
- [ ] `alert()` / `window.confirm()` 的**其余**用法改内联提示（N-11），含**设置页导入结果的 `alert()`**、清空历史的 `window.confirm()`

**B8 · 响应式与无障碍**
- [ ] 375px 宽下无横向滚动（四个视图逐一验证）
- [ ] Header 四 Tab 导航在窄屏不溢出（横向滚动或换行）
- [ ] 四个视图内容单列堆叠
- [ ] 信封预览元素 `max-width:100%; height:auto`（UI 文案不出现「Canvas」）
- [ ] **所有可点击元素触控目标 ≥ 44×44px**（含地址簿批量打印 checkbox）
- [ ] 所有 `<input>` / `<textarea>` / `<select>` 有 `<label for>` 或 `aria-label`
- [ ] 所有纯图标按钮有 `aria-label`
- [ ] Tab 导航包在 `<nav>` 中，当前项有 `aria-current="page"`
- [ ] 所有交互元素有可见的 `:focus-visible` 样式
- [ ] 信封预览 `<canvas>` 元素加 `role="img"` + `aria-label`（此处的 Canvas 指 DOM 元素本身，属代码层，保留术语）
- [ ] 消息提示加 `role="status"` / `aria-live="polite"`

**Meta / SEO（全部静态写入 `index.html`；TDK 逐字取自 `content-plan.md`，不得自行改写）**
- [ ] `title` = `信封打印助手 Envo - 在线排版信封，支持 DL/C5/C4 与 PDF 导出`
- [ ] `meta name="description"`（内容侧定稿 67 字版）
- [ ] `meta name="keywords"`（内容侧定稿 8 词版）
- [ ] 加 `link rel="canonical" href="https://inliang.github.io/envo/"`（带尾斜杠）
- [ ] 加 6 个图标 / manifest 链接（路径用 `/envo/...`，命名用裁决 3 统一清单：`favicon.ico` / `favicon-16x16.png` / `favicon-32x32.png` / `favicon.svg` / `apple-touch-icon.png` / `site.webmanifest`）
- [ ] 加 `meta name="theme-color" content="#0D9488"`
- [ ] 加 OG：`og:type` / `og:site_name` / `og:locale` / `og:title` / `og:description` / `og:url` / `og:image` / `og:image:width` / `og:image:height` / `og:image:alt`
- [ ] 加 Twitter：`twitter:card=summary_large_image` / `twitter:title` / `twitter:description` / `twitter:image`
- [ ] **OG / Twitter 的 title、description 与 TDK 同源**，不得出现第二套文案
- [ ] **对外文案中的信封规格枚举：国内写 ZL/DL/C5/C4，不得把 B6/C6 写成国产**（§5.5）
- [ ] **所有 `og:*` 与 `canonical` 用绝对 URL**（`https://` 开头）

**version 与文档**
- [ ] Footer 版本号 `v1.0.0` → `v1.0.1`；`Settings.tsx`「关于」版本号同步
- [ ] `package.json` version `1.0.0` → `1.0.1`
- [ ] 更新 `CHANGELOG.md` 追加 v1.0.1
- [ ] 更新 `README.md`（项目结构补 `public/`，技术栈去掉 `react-to-print`）
- [ ] 更新 `README.md` 中「国产 B6」的错误表述 → 国内规格为 **ZL/DL/C5/C4**，B6/C6 属国际（§5.5）

**交互加固（保留原 P0 项，未并入 B 编号但同属本次范围）**
- [ ] 未配置高德 Key 时，地址输入框下方显示引导 + 去设置入口（N-09）
- [ ] 高德 Key 类错误（10001 / 10003 / 10021 / USERKEY_PLAT_NOMATCH）显示一次性提示
- [ ] 打印 / 导出 PDF 按钮点击后立即 disabled + "生成中…"（N-10）

### 9.3 v1.1 待办（**明确本次不做**，勿在 v1.0.1 夹带）

| 项 | 内容 | 为什么放 v1.1 |
|---|---|---|
| **R4** | PDF 导出未处理自定义尺寸（`EnvelopeEditor.tsx:216` 用 `sizeConfig` 未读 `customWidth/customHeight`） | 影响面小（仅 custom 规格用户），且需改导出逻辑 + 回归测试 |
| **R20** | **跨组合布局适配（尺寸 × 格式解耦的遗留风险，未验证）** | 渲染函数虽是比例定位，但两套布局参数各自按典型尺寸调过。**国际格式套在窄扁尺寸（如 DL 220×110）、国内格式套在 B6（176×125）时可能出现文字挤压或越界**。前端正在实测；若确认有问题，需回来定「按组合存布局参数表」还是「按宽高比自动切参」的方案 |
| **R6（残留部分）** | 补回邮编补全能力（建议做成显式「补全邮编」按钮）+ 删净 `AmapTip.postcode` 死字段与错误注释 | **配额消耗部分已由 B6 消解**（不再调 `regeo`）；剩余的是功能增强，与「本次不新增业务功能」冲突 |
| **R8** | `xlsx@0.18.5` 已知 CVE 升级 | 需换 SheetJS CDN 源、动 lockfile，属独立变更；本项目纯本地运行，实际风险低 |
| **视图级 URL 索引** | 让四个视图可被单独索引 | **需先引入 router + 预渲染**，是架构级变更（§2.3 已论证当前不可做） |
| **N-15** | 打印改为 iframe 规避弹窗拦截 | 改动打印主链路，回归风险高 |
| **N-16** | 历史记录软上限 500 条 | 当前用户量下不触发 |
| **N-17** | 绑定自定义域名 | 涉及 `base` 与全量 URL 改写 |

### 9.2 交接给【部署阶段】

**静态资源（放入 `public/`，由 Vite 自动拷贝到 `dist/` 根；命名以裁决 3 统一清单为准，共 11 个文件）**
- [ ] `public/favicon.ico`（32×32，内含 16/32/48 三帧）
- [ ] `public/favicon.svg`（母版，viewBox 0 0 32 32）
- [ ] `public/favicon-16x16.png`（16×16）
- [ ] `public/favicon-32x32.png`（32×32）
- [ ] `public/apple-touch-icon.png`（180×180，**实底不透明**）
- [ ] `public/icon-192.png`（192×192）
- [ ] `public/icon-512.png`（512×512）
- [ ] `public/og-image.png`（1200×630，<300KB，**图上文字用中文系统字体渲染，不外链字体**）
- [ ] `public/site.webmanifest`（icons 引用用上述命名，**不出现 `android-chrome-*`**）
- [ ] `public/robots.txt`
- [ ] `public/sitemap.xml`（**只有 1 条 `<url>`**）

**构建与产物验证**
- [ ] `npm ci && npm run build` 本地通过（含 `tsc -b` 类型检查，零错误）
- [ ] `dist/index.html` 中资源引用为 `/envo/assets/...`（验证 `base` 生效）
- [ ] `dist/index.html` 中无 `fonts.googleapis.com` / `fonts.gstatic.com`
- [ ] `dist/` 根目录下存在 favicon / og-image / robots.txt / sitemap.xml / site.webmanifest（逐项 `ls` 确认）
- [ ] 本地 `npx vite preview --base=/envo/` 冒烟：四 Tab 可切换、打印/PDF 各走一次、地址导入导出各一次

**GitHub Pages 配置**
- [ ] 仓库 Settings → Pages → **Source 设为「GitHub Actions」**（不是 "Deploy from a branch"）
- [ ] 首次部署后确认 `https://inliang.github.io/envo/` 返回 200（不是 404）
- [ ] 确认 HTTPS 生效（无混合内容警告）

**上线后验证（逐条打开 URL 确认 200）**
- [ ] `https://inliang.github.io/envo/`
- [ ] `https://inliang.github.io/envo/sitemap.xml`
- [ ] `https://inliang.github.io/envo/robots.txt`
- [ ] `https://inliang.github.io/envo/og-image.png`
- [ ] `https://inliang.github.io/envo/favicon.svg`
- [ ] `https://inliang.github.io/envo/site.webmanifest`
- [ ] 用 OG 预览工具（如 socialsharepreview.com）验证标题/描述/图片正确渲染
- [ ] 浏览器无 Console 报错
- [ ] 浏览器标签页显示 favicon

**SEO 提交（不依赖 robots.txt）**
- [ ] 在 Google Search Console 手动提交 `https://inliang.github.io/envo/sitemap.xml`
  - ⚠️ 注意：`inliang.github.io` 是 GitHub Pages 的**单一主域**，GSC 验证通常需验证整个 `inliang.github.io` 属性（域名验证需 DNS TXT 记录，或 HTML 文件上传到根仓库）。**这一步可能受限于根仓库权限** —— 如果无法验证，sitemap 提交不了，记为已知限制，**不阻塞上线**。
  - 站内链接（Footer 的 GitHub/FMO/QSL 外链）+ README 中的链接是实际带来收录的主要途径，GSC 提交是加分项不是必需项。

**缓存注意事项**
- [ ] 上线后若发现仍是旧页面，`Ctrl+F5` 硬刷新（`index.html` 有短暂缓存）
- [ ] 若需强制更新 favicon / og-image，必须**改文件名**并同步改 `index.html` 引用（GH Pages 无手动 purge）

---

## 10. 已知风险与缓解

> 本节为代码复核发现。**本阶段只记录，不修改代码。**
>
> **「等级」列含归属标记**（G1 范围裁决后）：`B#` = 本次 v1.0.1 必办阻塞项；`v1.1 待办` = 明确本次不做；`P1` = 首发可做但非阻塞。以 §9.0 与 §9.3 为准。

| ID | 风险 | 等级 / 归属 | 位置 | 影响 | 缓解建议 |
|---|---|---|---|---|---|
| **R1** | **persist 升版本无 `migrate`** —— `version: 1` 且未定义迁移函数。v1.0.1 一旦改 version 或调持久化字段，Zustand 丢弃全部旧 state | 🔴 **阻塞** · **B1** | `src/store/index.ts:127-130` | **老用户地址簿 + 打印历史全部清空，不可恢复**。本地工具站最严重的事故 | **必须实现 `migrate`（§5.2.4）**。按 §9.0 死卡项做三项实测 |
| **R2** | **导入 JSON 时对已加密的 amapKey 二次加密** —— `setAmapKey(s.amapKey)` 把密文当明文再加密一次 | 🔴 高 · **B5（本次必办）** | `src/components/Settings.tsx:187` | 导入备份后高德 Key 解密出乱码，联想静默失效（无报错，用户不知道为什么） | 改为 `updateSettings({ amapKey: s.amapKey })` 直接写密文，不调 `setAmapKey` |
| **R3** | **Google Fonts 阻塞首屏**（~~+ Canvas 字体竞态~~） —— 3 个外链，1 个 render-blocking | 🔴 高 · **B2（本次必办）**（竞态部分已消除） | `index.html:7-9` | 国内白屏时间不可控 | ✅ **决策 A 已裁决采纳**：删除外链 + 系统字体栈。~~Canvas 竞态~~ → 系统字体立即可用，竞态不存在，**N-13 已取消** |
| **R4** | **PDF 导出不处理 custom 尺寸** —— `handleExportPDF` 用 `sizeConfig.width/height`，未读 `customWidth/customHeight`（打印分支处理了） | 🟡 中 · **v1.1 待办（本次不做）** | `src/components/EnvelopeEditor.tsx:216-217` | 自定义信封导出的 PDF 恒为 220×110mm，图像被拉伸 | 与 `handlePrint:161-166` 对齐，加 custom 分支。**放 v1.1：影响面小且需回归测试** |
| **R5** | **`towncode` 冒充邮编** —— `ac.postcode \|\| ac.towncode` | 🔴 **高（升级）** · **B6（本次必办）** | `src/components/EnvelopeEditor.tsx:132` | `towncode` 是 11 位乡镇行政编码，填进邮编格 → **填错比留空更糟**（**信件分拣错误，实体不可逆**） | 按 §9.0 B6 专项：**联想时不再自动补邮编，留空由用户手填**；`regeo` 调用一并移除 |
| **R6** | **`inputtips` 的 `postcode` 字段是死代码** —— 高德 v3 输入提示不返回 postcode | 🟢 **低（降级）** · **v1.1 待办（残留部分）** | `src/components/EnvelopeEditor.tsx:12, 79, 113` | `s.postcode` 恒为 undefined → 每次联想 100% 触发第二次 API，配额消耗翻倍；注释与实际不符，误导维护 | **配额消耗部分已由 B6 消解**（不再调 `regeo`，选中联想项的调用从 2 次降为 1 次）。**残留的只是代码整洁度**：删死字段 + 改正注释；补全能力放 v1.1 做显式按钮 |
| **R7** | **AES 密钥硬编码，前端可逆** —— `SECRET = 'envelope-printer-secret-2024'` 在前端源码里 | 🟡 中 · **B4（本次必办，文案项）** | `src/utils/encryption.ts:3`、`Settings.tsx:71` | 设置页文案「Key 将使用 AES 加密存储」**过度承诺**，用户可能填入高价值 Key | 文案改为「Key 仅保存在本机浏览器，不会上传服务器。请勿填写高价值 Key，建议在高德控制台设置每日调用上限」 |
| **R8** | **`xlsx@0.18.5` 存在已知 CVE**（原型污染 / ReDoS，CVE-2023-30533）；官方已停止 npm 发布 | 🟢 低 · **v1.1 待办（本次不做）** | `package.json:16` | 理论风险。本项目纯本地运行，处理用户自传文件，无服务端 → **实际风险为低** | **采纳不升级**（需换 CDN 源，改动 lockfile）。记入技术债 |
| **R17** | **次要文字对比度不达标** —— `brand-400 #2DD4BF` 用于次要文字时对比度约 **1.9:1** | 🔴 **高（新增）** · **B4（本次必办）** | 全局（`text-brand-400` 类） | **远低于 WCAG AA 4.5:1**，弱视用户与强光环境下不可读，直接影响 B8 无障碍验收 | 次要文字统一改 `brand-700 #0F766E`（5.0:1），**全量替换不留残** |
| **R18** | **文案与实际行为不符**（22 条） —— 如按钮写「打印此信封」实际只填入表单、不触发打印 | 🔴 **高（新增）** · **B4（本次必办）** | 全局（清单见 `content-plan.md`） | 用户预期落空，属**转化路径上的直接流失点**（§6）；对打印工具而言「点了没反应」= 工具不可信 | 逐条按 `content-plan.md` 清单改正，使文案与实际行为一致 |
| **R19** | **用户可见文案出现内部实现术语** —— 如 manifest `description` 写「Canvas 实时预览」 | 🟡 **中（新增）** · **B4（本次必办）** | `site.webmanifest`、`index.html`、各组件 UI 文案 | 用户看不懂，说了等于没说；manifest description 会直接出现在 **PWA 安装弹窗**里 | 按 §5.4 术语契约全量走查：用户可见位置改用「信封预览 / 信封排版实时预览 / 本机浏览器」等用户语言；代码层术语保留 |
| **R20** | **跨组合布局风险（尺寸 × 格式解耦引入）** —— 解耦后 14 种组合，两套布局参数各自按典型尺寸调过 | 🟡 **中（新增，未验证）** · **v1.1 待办** | `src/utils/envelopeCanvas.ts` | 国际格式套窄扁尺寸（DL 220×110）、国内格式套 B6（176×125）时**可能出现文字挤压或越界**；实体打印不可逆 | 前端实测中。若确认有问题，二选一定方案：① 按组合存布局参数表；② 按宽高比自动切参。**本次不做，但必须列为已知风险** |
| **R9** | **产物含未使用的惰性 chunk** —— `dist/assets/` 有 `html2canvas.esm`（202KB）、`index.es`（159KB）、`purify.es`（22KB） | 🟢 低 | jsPDF 的可选依赖 | 约 383KB 存在于产物但运行时不加载（jsPDF 只用了 `addImage`）。不影响首屏，但占仓库 artifact | 不做处理（惰性 chunk，不影响性能）。若追求干净产物，P2 评估替换 jsPDF 为更轻的方案 |
| **R10** | **6× DPR Canvas 渲染无 loading 态** —— 约 5200×2600 px，低端机 1–3s | 🟡 中 · **本次范围（交互加固 N-10）** | `EnvelopeEditor.tsx:170, 214` | 无反馈 → 用户重复点击 → **打印历史重复入账**（jsPDF 分支非幂等） | N-10：按钮禁用 + "生成中…" |
| **R11** | **`alert()` / `window.confirm()` 原生弹窗** | 🟢 低 · **B7 + P1** | `Settings.tsx:189,191`、`PrintHistory.tsx:49` | a11y 差、样式割裂、部分环境被拦截、移动端不可样式化 | **B7 部分**：新建内联确认组件，**打印历史与地址簿两处删除共用**（G1 裁定做法）。**P1 部分**：其余（设置页导入结果 `alert`、清空历史 `confirm`）改内联提示（N-11） |
| **R12** | **`public/` 资源无 content hash** | 🟢 低 | 全局 | 改了 og-image / favicon 内容但文件名不变 → 浏览器可能拿旧的，且 GH Pages 无手动 purge | 强制更新必须改文件名并同步改引用 |
| **R13** | **无 `.nojekyll`** | 🟢 低 | `dist/` | 现有走 Actions 部署不经 Jekyll → **无实际影响**。若将来改分支部署则需补 | 不做处理，仅记录 |
| **R14** | **README 技术栈过时** —— 写着 `react-to-print` 和 `html2canvas`，但打印实际用 `window.open`，PDF 用 `addImage` | 🟢 低 | `README.md` | 误导后来者 | 更新 README 技术栈与项目结构 |
| **R15** | **localStorage 无容量保护** —— `printHistory` 每条含完整收发件人 + 信封快照，无上限 | 🟢 低 | `src/store/index.ts:99` | 高频用户长期累积后可能接近 5MB 上限 → 写入失败（`QuotaExceededError`，现状未捕获） | N-16（P2）加软上限 500 条 + 写入异常捕获 |
| **R16** | **高德 Key 明文出现在 URL query** | 🟢 低 | 高德 API 固有设计 | Key 会进入浏览器历史 / Network 面板 | 无法规避。通过文案引导用户设置配额上限来限制损失 |

---

## 11. 范围分层与交付节奏

### 11.1 三档划分

| 档位 | 内容 | 砍掉会怎样 |
|---|---|---|
> **G1 范围裁决后，本节以 B 编号为准。** 原 P0/P1/P2 三档与 B 编号的对应关系：P0 ≈ B1–B8 + meta/交互加固；P1 ≈ 分包、骨架屏、去原生弹窗、空态引导；P2 ≈ v1.1 待办。

| 档位 | 内容 | 砍掉会怎样 |
|---|---|---|
| **① 上线阻塞（B1–B8）** | B1 数据保护 / B2 性能 / B3 分享图 / B4 文案与对比度 / B5 修 R2 / B6 修 R5 / B7 体验一致 / B8 响应式与无障碍；另加 meta/SEO 与交互加固（N-09、N-10） | **砍任何一条都不能上线** |
| **② 首发可做（P1，非阻塞）** | N-11（去原生弹窗）、N-12（动态 import 分包）、N-14（空态引导）、加载骨架屏 | **砍掉不影响上线** |
| **③ v1.1 待办（本次不做）** | R4、R6 残留、R8、视图级 URL 索引、N-15、N-16、N-17（详见 §9.3） | 完全不影响本次上线 |

### 11.2 时间与预算不足时的裁剪顺序

**从后往前砍**：先砍 ③（v1.1，零影响）→ 再砍 ②（P1，体验略降）→ **①（B1–B8）一条都不能砍**。

如果连 ① 都做不完，**按此优先级保**：
1. **B1**（防数据永久丢失 —— 唯一不可逆伤害）
2. **B6**（防印错邮编 —— 实体不可逆）
3. **B5**（防导入后 Key 静默失效）
4. **B2**（防首屏卡死）
5. **B3**（防分享灰图）
6. B4 / B7 / B8（体验与无障碍，可放紧跟其后的小版本）

### 11.3 本次明确**不做**的事（防止范围蔓延）

- ❌ 不新增任何业务功能
- ❌ 不引入路由 / SSR / 后端 / UI 组件库 / PWA Service Worker
- ❌ 不做视图级 SEO（不做 4 条 sitemap）
- ❌ 不改 `vite.config.ts` / `deploy.yml`
- ❌ 不绑定自定义域名
- ❌ 不升级 `xlsx`（换源风险大于收益）
- ❌ 不改 `encryption.ts` 的 SECRET（会导致老 Key 全失效）
- ❌ 不做国际化（纯中文工具，无多语言需求）

---

## 12. 结论

### 范围建议（砍到哪层能上线）
**砍掉 v1.1 待办与 P1 后仍能上线；B1–B8 八条是硬底线，缺一不可上线。** 时间紧时按 §11.2 的 6 级优先级从后往前砍，最坏情况保住 B1 → B6 → B5 → B2 → B3 这五条即可发版。

### 最大风险（一句话）
**Zustand persist 当前 `version: 1` 且没有 `migrate` 函数 —— v1.0.1 一旦调整持久化字段，老用户的地址簿和打印历史会被静默清空且不可恢复。**

### 决策裁决结果（✅ 11 项已全部闭环，无遗留待定项）

| # | 决策 | 裁决 | 落地动作 |
|---|---|---|---|
| 1 | 字体方案 | ✅ **采纳决策 A** —— 删除 Google Fonts 三个外链 + 系统字体栈 | N-02 按 P0 执行；**N-13 取消**；`public/fonts/` 与 `src/utils/fontsReady.ts` 不创建；R3 的 Canvas 竞态部分消除 |
| 2 | `currentRecipient` 持久化 | ✅ **不持久化**（防误印旧地址，实体信件不可逆） | N-01 的 `partialize` 按 §5.2.3 裁决执行，与 `activeTab` 一并排除 |
| 3 | 图片资产产出方 | ✅ **架构阶段不产出** —— Phase 2 视觉设计师按 §5.4 尺寸契约出稿，Phase 3 前端落地成图 | B3（og-image 必须真实存在）挂 **G3 上线前检查项，不解除不放行** |
| 4 | **TDK 冲突** | ✅ **以 `content-plan.md` 为准**，架构侧 §5.4 初稿被整体覆盖 | 撤下「自动补全邮编」虚假承诺（与 §10 R5/R6 冲突）；OG/Twitter 文案同步同源；新增 `keywords`。**`canonical`（含尾斜杠）与 `theme_color #0D9488` 两侧一致，无冲突** |
| 5 | **信封规格枚举** | ✅ **以代码 `ENVELOPE_SIZES` 为准** —— 国内 = ZL/DL/C5/C4；B6/C6 = 国际 | 新增 §5.5；§3.1 / §4.1 F-06 / §5.2.2 同步改正；README 的「国产 B6」表述一并订正 |
| 6 | **静态资源命名** | ✅ **两套合并为一套**（11 个文件），弃用 `android-chrome-*` | §5.4 / §8.1 / §9.1 / §9.2 / webmanifest 模板全部同步；新增 `favicon-16x16.png`、`favicon-32x32.png` |
| 7 | **OG 图字体** | ✅ **中文系统字体（黑体类）**，不得引入外链字体 | 与决策 A（删 Google Fonts）保持一致；已写入 §5.4 契约要点 6 与 og-image 行 |
| 8 | **G1 范围** | ✅ **v1.0.1 = B1–B8 八条必办**；R4 / R6 残留 / R8 / 视图级 URL 索引明确列 **v1.1 待办** | §9.0 扩为 8 条、§9.3 列 v1.1 清单、§10 加归属标记。B1 挂 G3 死卡项**不实测不放行** |
| 9 | **R5 修法** | ✅ **「留空优于填错」** —— 联想时不自动补邮编，用户手填 | 不再调 `regeo`，**顺带把 R6 配额消耗消解**（2 次→1 次）。显式「补全邮编」按钮列 v1.1 |
| 10 | **B7 做法** | ✅ **双向对齐** —— 新建内联确认组件，**打印历史 + 地址簿两处删除共用** | 原写法（删历史页确认以对齐地址簿）作废。理由：只改一处形态仍不一致，且原生 `confirm` 移动端不可样式化 |
| 11 | **文案术语** | ✅ 用户可见位置禁用内部实现术语 | manifest `description` 改「信封排版实时预览」；新增 §5.4 术语契约 + R19；归 **B4** |

> 裁决来源：主理人（team-lead）v1.0.1 派工回复 + Phase 1 对账 + G1 范围裁决。本节为规格卡的最终权威状态，**前端与部署阶段以本节为准**，不再存在待拍板项。

---

## 修订记录

| 版本 | 变更 | 来源 |
|---|---|---|
| v1.0（初稿） | 12 节完整规格卡，含 3 项待拍板决策 | 文构间 T1-ARCH |
| v1.1 | 决策 1/2/3 裁决落地：N-13 取消、`public/fonts/` 与 `fontsReady.ts` 不建、R3 降级、§5.4 字体行划除、§11.1 范围分层同步、§12 决策节改为裁决表 | 主理人裁决 |
| v1.2 | **Phase 1 对账冲突消解**：① TDK 整体采用 `content-plan.md`（撤下「自动补全邮编」虚假承诺），OG/Twitter 文案同步同源，新增 `keywords`；② 新增 **§5.5 信封规格枚举**（以代码为准，B6/C6 为国际规格非国产，README 与早期简报的「国产 B6」系照抄错误），§3.1/§4.1 F-06/§5.2.2 同步改正；③ 静态资源命名两套合并为一套（新增 `favicon-16x16/32x32`，弃用 `android-chrome-*`），§5.4、§8.1、§9.1、§9.2、webmanifest 模板同步；④ OG 图文字改用中文系统字体，不得外链字体 | 主理人裁决（对账） |
| v1.3 | **G1 范围裁决落地**：① §9.0 阻塞项由 3 条扩为 **8 条（B1–B8）**，含 B1 死卡项三项实测要求与 **B6 专项修法结论**；② §9.1 按 B 编号重排，新增 **§9.3 v1.1 待办清单**（R4/R6 残留/R8/视图级索引/N-15/N-16/N-17）；③ §10 风险表加**归属标记**，R5 升 🔴 高归 B6、R6 降 🟢 低（配额部分已由 B6 消解）、R4/R8 归 v1.1、**新增 R17 对比度 1.9:1、R18 文案与行为不符 22 条**；④ §11.1 范围分层改以 B 编号为准，§11.2 裁剪优先级细化为 6 级 | 主理人裁决（G1） |
| v1.4 | **文案术语订正 + B7 做法变更**：① 新增 **§5.4「用户可见文案的术语契约」**（B4），manifest `description` 的「Canvas 实时预览」→「**信封排版实时预览**」，全卡用户可见位置的「Canvas」改用户语言（代码层术语保留）；② **B7 做法改为双向对齐** —— 新建内联确认组件，**打印历史与地址簿两处删除共用**（原写法是删历史页确认以对齐地址簿）；③ 新增 **R19**（用户可见文案出现内部术语）；④ P1 边界明确：其余 alert/confirm（含设置页导入结果）本次不做 | 主理人裁决（G1 补充） |
| **v1.5（本次）** | **尺寸与格式解耦**：① 新增 **§5.2.5 尺寸与格式解耦契约** —— `EnvelopeSettings.format?: 'domestic' \| 'international'` 可选字段、任意尺寸×两格式（14 组合）、缺失回退「跟随 `category`」、**不 bump version（维持 2，禁止升 3）**、切换尺寸自动跟随但可手动覆盖、UI 命名固定「国内信封格式」/「国际信封格式」；② §5.2.4 加迁移铁律 4；③ §5.5 的 `category` 语义降级为「推荐默认格式」；④ §3.1 信封设置区块、§4.1 **新增 F-20**、§9.1 新增 F-20 勾选组；⑤ 新增 **R20**（跨组合布局挤压风险，未验证）列入 §9.3 v1.1 待办 | 主理人裁决（用户功能需求） |

---

*文档结束 · 变更需通知全队并同步修订本文件*
