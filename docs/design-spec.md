# Envo 信封打印助手 · 视觉设计规范（增量）

> 版本：v1.0.1 · 上线交付
> 作者：颜一屏（UI 设计）
> 依据：`docs/site-spec.md` v1.1（文构间）、`docs/content-plan.md`（字有物）、`E:\GitHub\envo` 实际代码复核
> 性质：**增量规范，不是重设计。** 现有四 Tab 单页结构、bento 卡片、teal/cta 色系、@layer components 类名体系**全部保留**。本文件只规定「需要改的那部分」。
> 边界：本阶段只产出文档与图形母版，未修改 `src/`、`index.html`、`tailwind.config.js`、`package.json` 中任何一行。

---

## 0. 一页速览

| 项 | 结论 |
|---|---|
| 视觉方向 | 克制、可信、信息优先 —— 参照 **Linear / Vercel Dashboard 一类开发者工具界面**（低装饰、高信息密度、状态用色块而非文案喊话） |
| 本次最大的一处视觉改动 | 次要文字 `brand-400/300` → **`brand-700 #0F766E`**（1.86:1 → **5.47:1**） |
| 本次最大的一处结构改动 | 移动端 Header 导航：**横排 pill → 等分 4 格（图标在上 + 短标签在下）** |
| 新发现的对比度事故 | `.btn-primary` 白字在 `brand-600` 上仅 **3.74:1**；`.btn-cta` 白字在 `cta-500` 上仅 **2.80:1**；焦点环 `brand-400/60` 仅 **1.48:1**。三处均不达标，见 §2.4 |
| 需要前端特别注意的 Canvas 陷阱 | `ctx.font` 里写 `-apple-system` 会被浏览器**整串判为无效并静默忽略** → 信封以 10px 默认字体打印出来。Canvas 必须用独立字体栈（§3.1） |

---

## 1. 设计原则

1. **工具优先于页面。** 这是工具站，不是品牌官网。任何装饰如果不能帮用户更快填对地址/邮编，就是负资产。**原则落地**：不新增插画、不新增渐变卡片、不新增"欢迎使用"区块；本次唯一新增的视觉元素是「二次确认框」和「无 Key 引导行」，两者都是为了减少误操作。

2. **状态必须被看见，而且不能只靠颜色。** 打印是**不可逆的物理动作**——印错一张信封就是废一张。所以：危险操作必须二次确认（§5.9）；成功/失败提示必须**图标 + 文字 + 颜色**三重通道；按钮 loading 期间必须 `disabled`（否则 jsPDF 分支非幂等，会重复入账打印历史）。

3. **移动端的目标不是"也能打印"，是"不报错"。** 手机打不了信封（site-spec §1.2 已裁决）。移动端的四个验收字：**不横向滚动、能看清、能管地址簿、触控目标够大**。不要在移动端为了"看起来完整"去塞预览区。

4. **可读性优先于轻盈感。** 现有设计用了一大批 `brand-300/400` 做次要文字，视觉上很"轻"，实际在户外/低亮度屏上基本看不见。本规范把次要文字**整体压深一到两档**，代价是页面"变重"，收益是 12px 的邮编、时间戳、统计数字真的能读。**这笔交换必须做。**

5. **桌面端不动，移动端重排。** 桌面端（≥1024px）除对比度与字号修正外，**布局与视觉一律保持现状**——用户已经习惯了编辑器"左表单右预览"的结构。所有布局改造只在 <1024px 生效，且优先用**同一套 DOM 的响应式类**实现，不为移动端另建组件。

---

## 2. 色彩系统

### 2.1 品牌色板（保留现状，不动）

`brand` = teal，`cta` = orange。以下为 `tailwind.config.js` 现值，**一个色值都不改**。

| 阶 | brand（teal） | 对白底对比度 | 正文可用性 | cta（orange） | 对白底对比度 |
|---|---|---|---|---|---|
| 50 | `#F0FDFA` | 1.04 | 仅背景 | `#FFF7ED` | 1.06 |
| 100 | `#CCFBF1` | 1.13 | 仅背景/分隔 | `#FFEDD5` | 1.15 |
| 200 | `#99F6E4` | 1.26 | 仅装饰 | `#FED7AA` | 1.35 |
| 300 | `#5EEAD4` | 1.48 | ❌ 禁止用于任何文字 | `#FDBA74` | 1.69 |
| 400 | `#2DD4BF` | 1.86 | ❌ 禁止用于任何文字 | `#FB923C` | 2.26 |
| 500 | `#14B8A6` | 2.49 | ❌ 禁止用于文字；图标下限 | `#F97316` | 2.80 |
| 600 | `#0D9488` | 3.74 | ⚠️ 仅 ≥24px 大字 / 图标 / 边框 | `#EA580C` | 3.56 |
| 700 | `#0F766E` | **5.47** | ✅ **AA 正文合格** | `#C2410C` | 5.18 |
| 800 | `#115E59` | **7.58** | ✅ AA / AAA(大字) | `#9A3412` | 7.31 |
| 900 | `#134E4A` | **9.48** | ✅ AAA | `#7C2D12` | 9.37 |

### 2.2 中性色（slate，沿用 Tailwind 默认）

| 阶 | 色值 | 对白底 | 用途 |
|---|---|---|---|
| slate-50 | `#F8FAFC` | — | 页面底 / 预览区底 |
| slate-100 | `#F1F5F9` | — | 表格斑马纹 / 次要底 |
| slate-200 | `#E2E8F0` | 1.23 | 卡片边框（装饰，非控件边界） |
| slate-300 | `#CBD5E1` | 1.48 | 占位骨架 / 分隔线 |
| slate-400 | `#94A3B8` | 2.56 | ⚠️ **仅限占位符以外的装饰**；输入框边框用此色（见 §5.3 例外说明） |
| slate-500 | `#64748B` | 4.76 | ✅ 次要说明文字下限 |
| slate-600 | `#475569` | 7.58 | ✅ 正文 / 表单标签 |
| slate-700 | `#334155` | 10.35 | ✅ 强调正文 / 次级按钮文字 |
| slate-900 | `#0F172A` | 17.85 | ✅ 标题 / 主文本 |

### 2.3 语义色（新增，前端照抄）

| 语义 | 底 | 边框 | 文字 | 文字对比度 | AA |
|---|---|---|---|---|---|
| **成功 success** | `#ECFDF5` emerald-50 | `#A7F3D0` emerald-200 | `#065F46` emerald-800 | **7.29:1** | ✅ |
| **警告 warning** | `#FFFBEB` amber-50 | `#FDE68A` amber-200 | `#92400E` amber-800 | **7.09:1** | ✅ |
| **错误 error** | `#FEF2F2` red-50 | `#FECACA` red-200 | `#B91C1C` red-700 | **5.91:1** | ✅ |
| **信息 info** | `#F0FDFA` brand-50 | `#99F6E4` brand-200 | `#115E59` brand-800 | **7.27:1** | ✅ |
| **危险按钮底** | `#B91C1C` red-700 | — | `#FFFFFF` 白字 | **6.47:1** | ✅ |

> 现状 `Settings.tsx` 用 `text-emerald-600`（3.77:1，12px 不合格）报 Key 保存成功 → 改 emerald-800。现状 `EnvelopeEditor.tsx` 提示条用 `text-emerald-700`（5.21:1 合格）→ 一并升到 emerald-800，全站统一。

### 2.4 ★ 颜色使用映射表（本次对比度修复的执行对照表）

> 裁决：**原本用 `brand-400 (#2DD4BF)` 的一律降到 `brand-700 (#0F766E)`**。下表逐处列出代码现状 → 目标值 → 理由。**前端可按此表逐行替换。**

#### A. 必须改（文字对比度不合格）

| # | 位置 | 现状 class | 对比度 | **改为** | 改后 | 依据 |
|---|---|---|---|---|---|---|
| A1 | `App.tsx:29` 页头副标题「信封打印助手」 | `text-brand-400` | 1.86 | **`text-brand-700`** | 5.47 | 12px 正文，需 4.5:1 |
| A2 | `App.tsx:40` Tab 未选中态 | `text-brand-400` | 1.86 | **`text-brand-700`** | 5.47 | 状态指示文字 |
| A3 | `App.tsx:61` 页脚版本行 | `text-brand-300` | 1.48 | **`text-slate-500`**（且 11px→12px） | 4.76 | 全站最低可读阶 |
| A4 | `App.tsx:67/77/87` 页脚三外链 | `text-brand-500` | 2.49 | **`text-brand-700`** | 5.47 | 可点击文字 |
| A5 | `PrintHistory.tsx:65` 筛选 pill 未选中 | `text-brand-400` | 1.86 | **`text-brand-700`** | 5.47 | 同 A2 |
| A6 | `PrintHistory.tsx:75` 空状态文案 | `text-brand-400` | 1.86 | **`text-slate-600`** | 7.58 | 空状态主文案 |
| A7 | `PrintHistory.tsx:94` 记录地址行 | `text-brand-500` | 2.49 | **`text-slate-600`** | 7.58 | 正文 |
| A8 | `PrintHistory.tsx:95` 时间 + 规格行 | `text-brand-300` | 1.48 | **`text-slate-500`** | 4.76 | 12px 元信息 |
| A9 | `PrintHistory.tsx:50` 「清空历史」 | `text-red-400` | 2.77 | **`text-red-700`** | 6.47 | 危险动作文字 |
| A10 | `PrintHistory.tsx:105` 「删除」 | `text-red-400` | 2.77 | **`text-red-700`** | 6.47 | 同上 |
| A11 | `AddressBook.tsx:281` 「正在解析文件…」 | `text-brand-500` | 2.49 | **`text-brand-700`** | 5.47 | 状态文字 |
| A12 | `AddressBook.tsx:310/469` 空状态 | `text-brand-400` | 1.86 | **`text-slate-600`** | 7.58 | 同 A6 |
| A13 | `AddressBook.tsx:317-322` 导入预览表头 | `text-brand-600` | 3.74 | **`text-brand-800`** | 7.58 | 12px 表头 |
| A14 | `AddressBook.tsx:328` 表内「收件人」列 | `text-brand-500` | 2.49 | **`text-slate-600`** | 7.58 | 12px 表格文字 |
| A15 | `AddressBook.tsx:339` 「…还有 N 条记录」 | `text-brand-400` | 1.86 | **`text-slate-500`** | 4.76 | 12px |
| A16 | `AddressBook.tsx:453` 「全选 / 取消全选」 | `text-brand-500` | 2.49 | **`text-brand-700`** | 5.47 | 可点击文字 |
| A17 | `AddressBook.tsx:557` 卡片内单位名 | `text-brand-400` | 1.86 | **`text-slate-600`** | 7.58 | 14px 正文 |
| A18 | `AddressBook.tsx:569` 卡片地址 | `text-brand-600` | 3.74 | **`text-slate-700`** | 10.35 | 14px 正文 |
| A19 | `AddressBook.tsx:572/575` 邮编 / 电话 | `text-brand-400` | 1.86 | **`text-slate-500`** | 4.76 | 12px 元信息 |
| A20 | `AddressBook.tsx:581/586` 「填入信封」「编辑」 | `text-brand-500` | 2.49 | **`text-brand-700`** | 5.47 | 可点击文字 |
| A21 | `AddressBook.tsx:595` 「删除」 | `text-red-400` | 2.77 | **`text-red-700`** | 6.47 | 同 A9 |
| A22 | `Settings.tsx:70` Key 说明文案 | `text-brand-400` | 1.86 | **`text-slate-600`** | 7.58 | 12px 说明 |
| A23 | `Settings.tsx:92` 「显示 / 隐藏」 | `text-brand-400` | 1.86 | **`text-brand-700`** | 5.47 | 可点击文字 |
| A24 | `Settings.tsx:116/129/143/166` 数据管理说明行 | `text-brand-400` | 1.86 | **`text-slate-500`** | 4.76 | 12px 说明 |
| A25 | `Settings.tsx:208` 「信封打印助手 v1.0.1」 | `text-brand-500` | 2.49 | **`text-slate-700`** | 10.35 | 正文 |
| A26 | `Settings.tsx:209/212` 关于说明与统计 | `text-brand-400` | 1.86 | **`text-slate-500`** | 4.76 | 12px |
| A27 | `Settings.tsx:102` 「Key 已加密保存到本机」 | `text-emerald-600` | 3.77 | **`text-emerald-800`** | 7.29 | 12px |
| A28 | `EnvelopeEditor.tsx:505` 尺寸标签 `220 × 110 mm` | `text-slate-400` | 2.56 | **`text-slate-600`** | 7.58 | 12px 功能性信息 |
| A29 | `EnvelopeEditor.tsx:520` 「快捷地址簿」小标题 | `text-slate-400` | 2.56 | **`text-slate-600`** | 7.58 | 12px 标题 |
| A30 | `EnvelopeEditor.tsx:538` 「+N 更多」 | `text-slate-400` | 2.56 | **`text-brand-700`** | 5.47 | 可点击文字 |
| A31 | `index.css` `.input-field` 占位符 | `placeholder-slate-400` | 2.56 | **`placeholder-slate-500`** | 4.76 | 占位符也是文本 |
| A32 | `index.css` `.input-field` 焦点环 | `ring-brand-400/60` | **1.48** | **`ring-brand-700`**（实色 2px） | **5.47** | 非文本需 3:1，现状差一半 |
| A33 | `index.css` `.btn-primary` 渐变 | `from-brand-600 to-brand-700` 白字 | **3.74**（最浅端） | **`from-brand-700 to-brand-800`** | **5.47 / 7.58** | 14px 白字需 4.5:1，**现状不合格** |
| A34 | `index.css` `.btn-cta` 渐变 | `from-cta-500 to-cta-600` 白字 | **2.80**（最浅端） | **`from-cta-700 to-cta-800`** | **5.18 / 7.31** | 同上，**现状严重不合格** |
| A35 | `AddressBook.tsx:481` 卡片选中态 | `ring-2 ring-brand-400` | 1.86 | **`ring-2 ring-brand-600`** | 3.74 | 状态指示，非文本需 3:1 |

#### B. 保留不动（纯装饰 / 非文本，不受 WCAG 1.4.3 与 1.4.11 约束）

依据：WCAG **1.4.3 只约束文本**；**1.4.11 只约束"识别控件及其状态所必需"的图形**。以下元素旁边必有 label 或文字承担识别职责，因此其颜色属纯装饰，可保留浅色。

| 元素 | 现状 | 保留理由 |
|---|---|---|
| `shadow-brand-200/50` 按钮投影 | brand-200 | 投影，纯装饰 |
| `border-brand-100` / `border-brand-100/60` 分隔线 | brand-100 | 分隔线不承载信息 |
| `bg-brand-50` Tab 容器 / 页脚底 | brand-50 | 背景 |
| `::-webkit-scrollbar-thumb` `#99F6E4` | brand-200 | 滚动条装饰（建议 P2 加深到 brand-500 提升可见性） |
| `section-dot`（`bg-slate-400` / `bg-cta-500` / `bg-brand-500` / `bg-emerald-500`） | 各色 | 1.5×16px 纯装饰色块，标题文字已承担识别 |
| `ring-1 ring-cta-200/30` 收件人卡片描边 | cta-200 | 卡片强调装饰，标题「收件人信息」已识别 |
| `bg-slate-50` 输入框底 / 预览区底 | slate-50 | 背景 |
| `border-slate-200/80` 卡片边框 | slate-200 | 卡片不是交互控件 |

#### C. 可放宽到 3:1 的场景（有依据，不是偷懒）

| 场景 | 允许的最低色阶 | 依据 |
|---|---|---|
| 功能性图标（旁边无文字） | `brand-600`（3.74:1） | WCAG 1.4.11 非文本对比度 3:1 |
| 输入框 / 下拉框边框 | `slate-400`（2.56:1）⚠️ | **见 §5.3 的例外说明**——识别职责由上方 12px label（7.58:1）承担 |
| ≥ 24px 的常规字重文字 | `brand-600`（3.74:1） | WCAG 1.4.3「大文本」门槛 = 18pt(24px) 常规 |
| ≥ 18.66px 的粗体（≥700）文字 | `brand-600`（3.74:1） | 大文本门槛 = 14pt(18.66px) 粗体 |
| 开关轨道 / 复选框边界 | `brand-600`（3.74:1） | 1.4.11 |
| OG 图上的大标题（56px 粗体） | 白字 on `brand-700` | 5.47:1，远超门槛 |

**禁止**：`brand-300` / `brand-400` / `brand-500` 出现在任何 ≤ 23px 的文字上，无论深浅底。

---

## 3. 字体阶梯

### 3.1 系统字体栈（最终配置值）

裁决已定：**删除 Google Fonts 外链，改用系统字体栈，禁止引入任何外链字体。** 以下为最终值（与 `site-spec.md` §7.5 契约一致）。

#### ① Tailwind 配置（`tailwind.config.js`）

```js
theme: {
  extend: {
    fontFamily: {
      sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        '"PingFang SC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei"',
        '"Noto Sans CJK SC"',
        '"Source Han Sans SC"',
        'sans-serif',
      ],
    },
  },
}
```

> 无需额外 CSS：Tailwind Preflight 会把 `fontFamily.sans` 应用到 `html`，全站自动继承。

**顺序理由（不要调换）**：
1. `-apple-system` / `BlinkMacSystemFont` 置顶 → macOS/iOS 用 San Francisco，**中文自动落到苹方**，一套族名同时解决中西文；
2. `"Segoe UI"` 第三 → Windows 的**西文**用 Segoe UI（比雅黑的西文更规整）；
3. `"PingFang SC"` 第四 → 装了苹方的非 Mac 环境（如 iOS 上的 Chrome、某些 Linux）；
4. `"Microsoft YaHei"` 第五 → Windows 的**中文**主力；
5. `Noto Sans CJK SC` / `Source Han Sans SC` → Linux 兜底（缺此二者，Linux 上中文会落到衬线或方块）；
6. `sans-serif` 末位兜底。

#### ② Canvas 字体栈（**与 UI 栈不同，必须单独一套**）

```ts
// src/store/types.ts —— EnvelopeSettings.fontFamily 默认值
export const CANVAS_FONT_STACK =
  'system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif';
```

**⚠️ 为什么不能直接用 UI 栈（这是本次最容易印废信封的坑）**：

`ctx.font` 走的是 CSS `font` **shorthand** 解析，规则比 CSS 属性严格得多：

- `-apple-system` / `BlinkMacSystemFont` 带前导连字符，在 shorthand 解析下**不是合法 family 名**，部分引擎会把**整条 `ctx.font` 赋值判为无效并静默忽略**；
- 后果：字体回落到 Canvas 默认的 `10px sans-serif` —— **信封上的收件人姓名和地址会以 10px 渲染，预览看起来"还行"，打印出来是废的**，且控制台无任何报错。
- 用标准关键字 `system-ui` 替代，语义等价且 shorthand 合法。

**前端必须加的 30 秒自检**（`drawEnvelope` 里设置 font 之后）：

```ts
ctx.font = `600 28px ${CANVAS_FONT_STACK}`;
if (!ctx.font) console.warn('[envo] ctx.font 赋值被忽略，字体栈可能非法');
```

> 现状 `src/store/index.ts:43` 的 `fontFamily: 'Inter, sans-serif'` 必须一并改掉，并**在 `migrate` 里对老数据做一次兜底**：若 `fontFamily` 含 `'Inter'` 或为空，替换为上述栈（否则老用户存的信封配置会带着失效的 Inter 栈去渲染 Canvas）。

### 3.2 中西文混排规则

1. **字号统一，不区分中西文。** 中文与拉丁混排时字号保持一致，靠字体族的 **per-character fallback** 自动分配：西文命中前面几个族，中文命中后面几个族。不要试图给中文单独设字号。
2. **中英文之间加空格**（`导出 PDF`，不是 `导出PDF`）—— 已由内容侧统一，前端照抄 `content-plan.md` §1.7。
3. **字重只保留 400 / 600 / 700 三档。** 理由：Windows 的微软雅黑**只有 Regular(400) 与 Bold(700) 两个字面**，`font-weight: 500` 在 Windows 上会被合成或跳到 400/700，与 macOS（苹方有 400/500/600）表现不一致 → 同一段文字在两个平台粗细不同。
   - 现有代码中大量 `font-medium (500)` **不强制全改**（改动面太大，且多数落在西文或短标签上），但**新增样式一律用 600**，不用 500。
4. **中文标签禁止 `uppercase` + `tracking-wider`。** 现状 `.input-label` 带 `uppercase tracking-wider`，对中文字符完全无效，只是把 12px 的「姓名」「地址」字距拉开 0.6px，让小字号发虚。**改为 `tracking-normal`，去掉 `uppercase`。**
5. **数字与拉丁用 `font-mono`。** 尺寸标签 `220 × 110 mm`、邮编、时间戳用 `font-mono` + `tabular-nums`，避免数字跳动。`font-mono` 在 Tailwind 默认配置里是 `ui-monospace` 栈，**不受本次 `sans` 改动影响**，也不含 Inter，可直接用。

### 3.3 字号 / 行高 / 字重阶梯

| 级 | 语义 | 移动端 | 桌面端 | 行高 | 字重 | 字距 | 色 |
|---|---|---|---|---|---|---|---|
| **H1** | 页头站点名 `Envo 信封打印助手` | 18px | 20px | 1.3 | 600 | 0 | `brand-900`（9.48:1） |
| **H2** | 视图标题（打印历史 / 地址簿） | 17px | 18px | 1.35 | 600 | 0 | `brand-900` |
| **H3** | 卡片区块标题（`.section-title`） | 14px | 14px | 1.4 | 600 | 0 | `slate-700`（10.35:1） |
| **H4** | 卡片内小标题（「编辑地址」「导入预览」） | 14px | 14px | 1.4 | 600 | 0 | `brand-800`（7.58:1） |
| **Body-L** | **表单输入值** | **16px** | 14px | 1.6 | 400 | 0 | `slate-800` |
| **Body** | 正文 / 地址 / 收件人 | 14px | 14px | **1.75** | 400 | 0 | `slate-600`（7.58:1） |
| **Body-S** | 次要说明 | 13px | 13px | 1.65 | 400 | 0 | `slate-500`（4.76:1） |
| **Caption** | 时间戳 / 邮编电话 / 统计 | 12px | 12px | 1.5 | 400 | 0 | `slate-500`（4.76:1） |
| **Micro** | 页脚版本行 | **12px** | 12px | 1.5 | 400 | 0 | `slate-500`（4.76:1） |

**硬性下限**：
- **全站最小字号 12px**（现状页脚 `text-[11px]` 违反，改 12px）。
- **中文正文行高 ≥ 1.7**（正文 14px × 1.75 = 24.5px）。中文方块字在小行高下纵向会挤成一团，这是中英文排版最常被忽略的差别。
- **所有 `input` / `textarea` / `select` 在移动端字号 ≥ 16px**。

### 3.4 ★ 移动端 16px 输入硬规则

**iOS Safari 会在用户聚焦 `font-size < 16px` 的输入框时自动放大整个页面**，放大后视口宽度变小 → 触发横向滚动 → 直接违反验收项「375px 下无横向滚动」。

现状 `.input-field` 是 `text-sm`（14px），**必然触发**。改为：

```css
.input-field {
  @apply w-full px-4 py-3 min-h-[44px]
         text-[16px] sm:text-sm sm:py-2.5
         ...;
}
```

> 这一条同时解决三件事：iOS 不缩放、触控目标 44px、桌面端视觉不变。

---

## 4. 间距与栅格

### 4.1 间距刻度（4px 基准）

`2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 96`

禁止出现 4 的非整数倍数值（如 `p-[18px]`、`gap-[14px]`）。

### 4.2 具体间距契约

| 场景 | 移动端 (<640px) | 桌面端 (≥640px) | Tailwind |
|---|---|---|---|
| 页面左右内边距（`main` / `header`） | **16px** | 24px | `px-4 sm:px-6` |
| 页面上下内边距（`main`） | 20px | 24px | `py-5 sm:py-6` |
| 卡片内边距 | **16px** | 20px | `p-4 sm:p-5` |
| 预览区内边距（Canvas 容器） | **8px** | 20px | `p-2 sm:p-5` |
| 卡片之间纵向间距 | 16px | 20px | `space-y-4 sm:space-y-5` |
| 表单字段之间 | 12px | 12px | `space-y-3` |
| 卡片内元素组之间 | 16px | 16px | `space-y-4` |
| 按钮之间 | 8px | 10px | `gap-2 sm:gap-2.5` |
| 视图级区块之间 | 20px | 20px | `space-y-5` |
| 页头上下内边距 | 12px | 16px | `py-3 sm:py-4` |

### 4.3 栅格

| 项 | 值 |
|---|---|
| 列数 | **12 列** |
| gutter | **16px（移动）/ 24px（≥640px）** → `gap-4 sm:gap-6` |
| 内容最大宽 | **1280px**（`max-w-7xl`，保持现状） |
| 设置视图最大宽 | **672px**（`max-w-2xl`，保持现状） |
| 编辑器分栏 | 保持现状的 **5 列 2:3 划分**（`lg:grid-cols-5` + `lg:col-span-2` / `lg:col-span-3`），**不为它引入 12 列改造**——现状已工作，改造收益为零 |
| 地址簿卡片网格 | `grid-cols-1 md:grid-cols-2`（保持现状） |

---

## 5. 组件样式规范

> 所有组件类沿用 `src/index.css` 的 `@layer components` 体系。**下面是可直接替换的完整定义。**

### 5.1 按钮

#### 通用

| 项 | 值 |
|---|---|
| 圆角 | `rounded-xl`（12px） |
| 字号 / 字重 | 15px / 600（移动端）→ 14px / 600（sm+） |
| **最小高度** | **44px**（移动端）→ `py-2.5`（桌面，约 40px，鼠标操作可接受） |
| 内边距 | `px-5`；移动端图标按钮 `px-4` |
| 按下 | `active:scale-[0.98]` |
| 过渡 | `transition-all duration-200` |
| 减动效 | `@media (prefers-reduced-motion: reduce) { transition: none; transform: none; }` |
| 焦点 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white`（5.47:1） |

#### 主按钮 `.btn-primary`

```css
.btn-primary {
  @apply inline-flex items-center justify-center gap-2
         bg-gradient-to-br from-brand-700 to-brand-800 text-white
         px-5 py-3 min-h-[44px] sm:py-2.5 sm:min-h-0
         rounded-xl font-semibold text-[15px] sm:text-sm
         shadow-sm shadow-brand-200/50
         hover:from-brand-800 hover:to-brand-900 hover:shadow-md
         active:scale-[0.98] transition-all duration-200
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed
         disabled:hover:from-brand-700 disabled:hover:to-brand-800;
}
```
> **改动说明（A33）**：渐变从 `brand-600→700` 加深到 `brand-700→800`。白字对比度 3.74:1 → **5.47:1 / 7.58:1**。视觉上只是 teal 深了一档，品牌识别不变。

#### 强调按钮 `.btn-cta`（新增地址 / 批量打印）

```css
.btn-cta {
  @apply inline-flex items-center justify-center gap-2
         bg-gradient-to-br from-cta-700 to-cta-800 text-white
         px-5 py-3 min-h-[44px] sm:py-2.5 sm:min-h-0
         rounded-xl font-semibold text-[15px] sm:text-sm
         shadow-sm shadow-cta-200/50
         hover:from-cta-800 hover:to-cta-900 hover:shadow-md
         active:scale-[0.98] transition-all duration-200
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-700 focus-visible:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed;
}
```
> **改动说明（A34）**：`cta-500→600` → `cta-700→800`。白字 2.80:1 → **5.18:1 / 7.31:1**。橙色从"亮橙"变"砖橙"，仍是唯一强调色。

#### 次级按钮 `.btn-outline`

```css
.btn-outline {
  @apply inline-flex items-center justify-center gap-2
         border border-slate-300 bg-white text-slate-700
         px-5 py-3 min-h-[44px] sm:py-2.5 sm:min-h-0
         rounded-xl font-medium text-[15px] sm:text-sm
         hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900
         active:scale-[0.98] transition-all duration-200
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed;
}
```
（`slate-700` on white = 10.35:1 ✅）

#### 危险按钮 `.btn-danger`（新增，二次确认框的确认键）

```css
.btn-danger {
  @apply inline-flex items-center justify-center gap-2
         bg-red-700 text-white
         px-5 py-3 min-h-[44px] sm:py-2.5 sm:min-h-0
         rounded-xl font-semibold text-[15px] sm:text-sm
         hover:bg-red-800 active:scale-[0.98] transition-all duration-200
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed;
}
```
（白字 on `red-700` = 6.47:1 ✅）

#### 文字按钮 `.btn-ghost`

```css
.btn-ghost {
  @apply inline-flex items-center justify-center
         px-3 py-3 min-h-[44px] sm:py-1.5 sm:min-h-0
         rounded-lg text-[15px] sm:text-sm font-medium
         text-slate-600 hover:bg-slate-100 hover:text-slate-900
         transition-colors duration-150
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2;
}
```

#### 危险文字按钮（「删除」「清空历史」）

```css
.btn-text-danger {
  @apply inline-flex items-center justify-center
         px-2 py-3 min-h-[44px] sm:py-1.5 sm:min-h-0
         text-[15px] sm:text-xs font-medium
         text-red-700 hover:text-red-800 hover:bg-red-50 rounded-lg
         transition-colors duration-150
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2;
}
```
（`red-700` on white = 6.47:1 ✅，现状 `red-400` 2.77:1 ❌）

### 5.2 卡片 `.card-bento`

```css
.card-bento {
  @apply bg-white rounded-2xl border border-slate-200/80 shadow-sm
         p-4 sm:p-5
         hover:shadow-md transition-shadow duration-300;
}
```

- 选中态：`ring-2 ring-brand-600 ring-offset-0`（3.74:1，非文本 3:1 达标；现状 `ring-brand-400` 1.86:1 ❌）
- 强调态（收件人卡片）：保留 `ring-1 ring-cta-200/30`，改为 `ring-1 ring-cta-300/50` 让强调更可见一点（可选）
- 卡片不是交互控件，边框 `slate-200/80` 不参与 1.4.11

### 5.3 表单

#### 标签 `.input-label`

```css
.input-label {
  @apply block mb-1.5
         text-xs font-semibold text-slate-600
         tracking-normal;            /* ← 去掉 uppercase 与 tracking-wider */
}
```
（`slate-600` on white = 7.58:1 ✅）

**必填标记**：`<label>收件人 / 单位 <span class="text-red-700" aria-hidden="true">*</span></label>` + 输入框 `aria-required="true"`。**颜色不是唯一载体**——`*` 符号本身也是信息，且 `aria-required` 供读屏。

#### 输入框 `.input-field`

```css
.input-field {
  @apply w-full px-4 py-3 min-h-[44px]
         text-[16px] sm:text-sm          /* ← 移动端 16px，防 iOS 缩放 */
         sm:py-2.5 sm:min-h-0
         bg-slate-50 border border-slate-400 rounded-xl
         text-slate-800 placeholder-slate-500
         transition-all duration-200
         focus:bg-white focus:outline-none
         focus:border-brand-700 focus:ring-2 focus:ring-brand-700 focus:ring-offset-1 focus:ring-offset-white
         disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed;
}
```

| 项 | 值 | 说明 |
|---|---|---|
| 默认值文字色 | `slate-800` | 15.6:1 ✅ |
| 占位符 | **`placeholder-slate-500`** | 4.76:1 ✅（现状 `slate-400` 2.56:1 ❌） |
| 边框 | **`slate-400`** | 2.56:1 —— **见下方例外说明** |
| 焦点边框 | `brand-700` | 5.47:1 ✅ |
| 焦点环 | **`ring-2 ring-brand-700` 实色** | 5.47:1 ✅（现状 `ring-brand-400/60` 1.48:1 ❌） |

> **关于输入框边框 2.56:1 的例外说明（有意为之，不是疏漏）**
> WCAG 1.4.11 要求的是**「识别控件所必需」的视觉信息**达 3:1。本项目每个输入框上方都有一个 12px / 7.58:1 的 `<label>`（如「寄件人姓名」），**识别职责由 label 承担**，边框只是视觉强化。因此按 1.4.11 的例外处理，用 `slate-400` 保持轻盈感。
> **如果审计口径从严**：把边框升到 `slate-500`（4.76:1）即可，视觉代价是输入框变重。这是可选项，本规范默认取 `slate-400`。

#### 错误态

```html
<div>
  <label for="rcpt-postcode" class="input-label">邮编</label>
  <input id="rcpt-postcode" class="input-field border-red-600 bg-red-50/40"
         aria-invalid="true" aria-describedby="rcpt-postcode-err" />
  <p id="rcpt-postcode-err" class="mt-1.5 flex items-center gap-1.5 text-xs text-red-700">
    <svg aria-hidden="true" class="w-3.5 h-3.5" …>…</svg>
    邮编应为 6 位数字
  </p>
</div>
```
- 边框 `red-600`（4.83:1，非文本 3:1 达标）
- 文案 `text-red-700`（6.47:1 ✅）
- **图标 + 文字双通道**，`svg` 加 `aria-hidden="true"`
- `aria-describedby` 指向错误文案 id

#### 密码框显示 / 隐藏（设置页 Key）

```html
<button type="button" aria-pressed={keyShown} aria-label={keyShown ? '隐藏高德 Key' : '显示高德 Key'}
        class="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] text-brand-700 hover:text-brand-800">
```
- 触控区 **44×44**（现状 `text-xs` 按钮约 24×20 ❌）
- `aria-pressed` 表达状态，`aria-label` 说明作用

#### 复选框（地址簿批量选择）

```html
<label class="inline-flex items-center justify-center -m-3 p-3 cursor-pointer">
  <input type="checkbox" class="h-5 w-5 rounded border-slate-400 text-brand-700 focus:ring-2 focus:ring-brand-700" />
  <span class="sr-only">选择「{姓名}」用于批量打印</span>
</label>
```
- 视觉 20×20，但外层 `label` 用 `-m-3 p-3` 把可点区扩到 **44×44**，且不改变布局（负 margin 抵消）
- 现状 `h-4 w-4`（16×16）**远不达标**

### 5.4 ★ 导航 Tab（本次头号结构问题）

#### 桌面端（≥640px）— 保持现状

```html
<nav aria-label="主导航" class="flex gap-1 bg-brand-50 rounded-xl p-1">
  <button aria-current="page" class="px-4 py-2 rounded-lg text-sm font-medium bg-white text-brand-800 shadow-sm">
    <span class="mr-1.5">✉</span>信封编辑
  </button>
  <button class="px-4 py-2 rounded-lg text-sm font-medium text-brand-700 hover:text-brand-800 hover:bg-white/60">
    <span class="mr-1.5">📖</span>地址簿
  </button>
  …
</nav>
```

| 态 | 类 | 对比度 |
|---|---|---|
| 选中 | `bg-white text-brand-800 shadow-sm` | 7.58:1 ✅ |
| 未选 | `text-brand-700` hover `text-brand-800 hover:bg-white/60` | 5.47:1 ✅（现状 `brand-400` 1.86:1 ❌） |
| 焦点 | `focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2` | 5.47:1 ✅ |

#### 移动端（<640px）— **等分 4 格，图标在上 + 短标签在下**

```html
<nav aria-label="主导航"
     class="grid grid-cols-4 gap-0.5 bg-brand-50 rounded-xl p-1
            sm:flex sm:gap-1 sm:w-auto">
  <button aria-current="page"
          class="flex flex-col items-center justify-center gap-0.5
                 px-1 py-2 min-h-[48px] rounded-lg
                 text-[11px] leading-tight font-medium
                 bg-white text-brand-800 shadow-sm
                 sm:flex-row sm:min-h-0 sm:px-4 sm:py-2 sm:text-sm sm:gap-0">
    <span class="text-base leading-none sm:text-sm sm:mr-1.5">✉</span>
    <span class="sm:hidden">编辑</span>
    <span class="hidden sm:inline">信封编辑</span>
  </button>
  …
</nav>
```

**短标签映射**：`信封编辑 → 编辑` / `地址簿 → 地址簿`（3 字，仍放得下）/ `打印历史 → 历史` / `设置 → 设置`

**页头容器配合改造**：

```html
<div class="max-w-7xl mx-auto flex flex-col gap-3
            sm:flex-row sm:items-center sm:justify-between">
```

**宽度核算（375px 屏）**：`375 − 16×2(main px-4) − 4×2(nav p-1) − 0.5×3(gap)` = 341.5 → 每格 ≈ 84px。3 字 × 11px = 33px，绰绰有余；触控区 48px 高 × 84px 宽，**双维度超 44px**。

#### ★ 三个方案的取舍（为什么选等分 4 格，而不是底栏或横滚）

| 方案 | 评价 |
|---|---|
| **A. 底部固定 Tab 栏** | ❌ **否决**。看着最"移动端"，但代价不匹配：(1) 需为移动端另建一套导航 DOM 或用 `fixed` 定位切换，桌面/移动两套形态；(2) 必须处理 iOS `env(safe-area-inset-bottom)`；(3) 必须给 `main` 加 `padding-bottom`，否则页脚被永久遮挡，且这个值与 `fixed` 高度耦合，改一次导航就要改一次；(4) 底部栏与现有 `<header>` 结构分离，桌面端用户换到手机会"找不到导航"。**收益（拇指可达）在本项目不成立**——这是低频桌面工具，移动端用户切 Tab 的次数是个位数。 |
| **B. 顶部等分 4 格（图标 + 短标签）** | ✅ **采纳**。(1) **单套 DOM**，只靠 `sm:` 断点切换 `flex`/`grid` 与 `flex-row`/`flex-col`，没有第二套组件、没有定位切换、没有 safe-area；(2) 导航位置在桌面与移动一致，心智模型不割裂；(3) 页头可随页面 `sticky`，地址簿长列表滚动时仍可切 Tab；(4) 48px 高的格子触控达标。 |
| **C. 横向滚动** | ❌ **否决**。第 4 个 Tab（设置）默认不可见 → **发现性为零**。而"无高德 Key 引导要跳设置页"（N-09）是本次 P0，导航里藏一个看不见的设置入口会直接破坏这条转化路径。 |

### 5.5 页脚

```html
<footer class="text-center py-6 border-t border-brand-100/60 bg-gradient-to-t from-brand-50/30 px-4">
  <span class="block mb-4 text-xs tracking-normal text-slate-500">
    Envo v1.0.1 · 数据只存在你的浏览器里，不上传服务器
  </span>
  <span class="inline-flex items-center gap-2 flex-wrap justify-center">
    <a href="…" aria-label="Envo 项目源码（GitHub）"
       class="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-0 sm:py-2
              rounded-full bg-white/70 text-brand-700 hover:bg-white hover:text-brand-800
              hover:shadow-sm transition-all duration-200 text-xs leading-none
              border border-brand-100/60">
      <svg aria-hidden="true" class="w-3.5 h-3.5" …>…</svg>Envo
    </a>
    …
  </span>
</footer>
```

| 项 | 现状 → 目标 |
|---|---|
| 版本行色 | `text-brand-300`（1.48:1）→ **`text-slate-500`**（4.76:1） |
| 版本行字号 | `text-[11px]` → **`text-xs`（12px）** |
| 外链文字色 | `text-brand-500`（2.49:1）→ **`text-brand-700`**（5.47:1） |
| 外链触控区 | 约 30px → **`min-h-[44px]`** |
| 外链无障碍 | 仅 `title` → 补 **`aria-label`** |

### 5.6 空状态

```html
<div class="card-bento p-8 sm:p-12 text-center">
  <div class="mx-auto mb-4 w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
    <svg aria-hidden="true" class="w-6 h-6 text-brand-600" …>…</svg>   <!-- 装饰，3.74:1 -->
  </div>
  <p class="text-sm leading-7 text-slate-600">还没有打印记录。</p>
  <p class="mt-1.5 text-[13px] leading-6 text-slate-500">
    在「信封编辑」里打印或导出 PDF 后，记录会出现在这里。
  </p>
  <!-- 可选主行动 -->
  <button class="btn-primary mt-4">去信封编辑</button>
</div>
```

规范：容器 `p-8 sm:p-12`；图标 48px 容器 + 24px 图形；主文案 14px/1.75 `slate-600`；次文案 13px/1.65 `slate-500`；可选按钮 `mt-4`。

### 5.7 加载态

#### ① 按钮内联（打印 / 导出 PDF，P0）

```html
<button class="btn-primary w-full sm:w-auto" disabled aria-busy="true">
  <svg class="w-4 h-4 animate-spin" aria-hidden="true" …>…</svg>
  生成中…
</button>
```
规则：
- 点击后**立即** `disabled` + `aria-busy="true"` + 文案换「生成中…」
- **按钮宽度锁定**（`w-full` 移动端 / 桌面用 `min-w-[...]`），防止文案变短后布局跳动
- spinner 16px，`animate-spin`；`prefers-reduced-motion` 下改为静态圆点 + 文案「生成中…」
- 完成后恢复，并弹出 `role="status"` 提示
- **这条是 P0**：6× DPR Canvas（约 5200×2600px）在低端机渲染 1–3s，无反馈会导致重复点击 → jsPDF 分支非幂等 → 打印历史重复入账

#### ② 区域骨架（导入解析、首屏）

```html
<div class="space-y-3" aria-hidden="true">
  <div class="h-4 w-32 rounded bg-slate-200 animate-pulse"></div>
  <div class="h-10 rounded-xl bg-slate-100 animate-pulse"></div>
</div>
<p class="sr-only" role="status">正在解析文件…</p>
```

#### ③ 首屏骨架（P1）

`<div id="root">` 内写静态 HTML 骨架（页头条 + 两张卡片轮廓 + 预览区块），随 React 挂载被替换。零 JS 依赖。

### 5.8 提示条（msg）

```html
<!-- 成功 -->
<div role="status" aria-live="polite"
     class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
            bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
  <span class="flex items-center gap-2">
    <svg aria-hidden="true" class="w-4 h-4 shrink-0" …>…</svg>
    PDF 导出完成，已记录到历史
  </span>
  <button aria-label="关闭提示"
          class="shrink-0 -m-2 p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1
                 text-emerald-700 hover:text-emerald-900 opacity-70 hover:opacity-100">
    <svg aria-hidden="true" class="w-4 h-4" …>×</svg>
  </button>
</div>

<!-- 失败：role 改为 alert，配色换红 -->
```

| 态 | 底 | 边框 | 文字 | 对比度 | role |
|---|---|---|---|---|---|
| 成功 | `emerald-50` | `emerald-200` | `emerald-800` | 7.29:1 ✅ | `role="status" aria-live="polite"` |
| 失败 | `red-50` | `red-200` | `red-800` | ~7.4:1 ✅ | `role="alert"` |
| 警告 | `amber-50` | `amber-200` | `amber-800` | 7.09:1 ✅ | `role="status" aria-live="polite"` |
| 信息 | `brand-50` | `brand-200` | `brand-800` | 7.27:1 ✅ | `role="status" aria-live="polite"` |

关闭按钮触控区 44×44（现状 `text-lg` 字符按钮约 24×24 ❌）。

### 5.9 ★ 模态 / 二次确认框（本次新增，重点）

用于：打印历史「删除」单条确认（内容侧决策 B）、「清空历史」、地址簿「删除地址」。

#### 结构

```html
<!-- 挂载到 body 末尾，或用 portal -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4
            bg-slate-900/50 backdrop-blur-[2px]"
     onMouseDown={遮罩关闭}>

  <div role="dialog" aria-modal="true"
       aria-labelledby="confirm-title" aria-describedby="confirm-desc"
       class="w-full max-w-[400px] bg-white rounded-2xl shadow-xl
              p-5 sm:p-6">

    <!-- 危险图标 -->
    <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
      <svg aria-hidden="true" class="w-6 h-6 text-red-700" …>…</svg>
    </div>

    <h3 id="confirm-title" class="text-center text-base font-semibold text-slate-900 leading-snug">
      确定删除这条打印记录？
    </h3>
    <!-- 描述里必须带上「是哪一条」，不能只说「此地址」 -->
    <p id="confirm-desc" class="mt-2 text-center text-sm leading-7 text-slate-600">
      收件人「张伟 · 北京市海淀区…」，2026-07-28 14:30 打印。<br />
      <span class="text-red-700 font-medium">删除后无法恢复。</span>
    </p>

    <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <button class="btn-outline w-full sm:w-auto">取消</button>
      <button class="btn-danger w-full sm:w-auto">删除</button>
    </div>
  </div>
</div>
```

#### 规范表

| 项 | 值 |
|---|---|
| 遮罩 | `fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]`，`flex items-center justify-center p-4` |
| 面板宽度 | `w-full max-w-[400px]`（移动端自动留出 16px 边距） |
| 面板圆角 / 阴影 | `rounded-2xl`（16px）/ `shadow-xl` |
| 面板内边距 | `p-5 sm:p-6` |
| 危险图标 | 48px 圆形容器 `bg-red-50` + 24px 图标 `text-red-700` |
| 标题 | 16px / 1.4 / **600** / `slate-900` / 居中 |
| 描述 | 14px / **1.75** / 400 / `slate-600` / 居中；不可逆后果用 `text-red-700 font-medium` |
| 按钮区 | `mt-5`；**移动端 `flex-col-reverse`**（危险动作在上，符合 iOS 习惯）；桌面 `sm:flex-row sm:justify-end`（取消左、确认右） |
| 按钮 | 移动端 `w-full`，桌面 `sm:w-auto`；均 `min-h-[44px]` |
| 最大高度 | `max-h-[85vh] overflow-y-auto`（长地址不撑破屏幕） |

#### 交互与无障碍（必须）

1. `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`
2. 打开时：焦点移到**「取消」按钮**（安全默认，防误触回车直接删）；`document.body.style.overflow = 'hidden'`
3. 关闭时：焦点**还原到触发它的那个按钮**；恢复 body overflow
4. `Esc` 关闭
5. **焦点陷阱**：Tab / Shift+Tab 在面板内循环（不实现 = 键盘用户会 tab 到遮罩后面的元素）
6. 遮罩 `onMouseDown`（不是 onClick）关闭 —— 避免"在框内按下、拖到框外松开"误关
7. 描述文案**必须包含被删对象的标识**（姓名 + 时间），不许只写「确定删除此地址？」
8. `prefers-reduced-motion` 下不做缩放动画，仅淡入

### 5.10 表格（地址簿导入预览）

```html
<div class="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
  <table class="w-full min-w-[640px] text-xs">
    <thead class="bg-brand-50 sticky top-0">
      <tr>
        <th scope="col" class="p-2 text-left text-brand-800 font-semibold whitespace-nowrap">姓名</th>
        …
```
- 窄屏容器**出血横滚**（`-mx-4 px-4`），`min-w-[640px]` 保证 6 列不挤成一团
- 表头 `scope="col"`，文字 `brand-800`（现状 `brand-600` 3.74:1 ❌ → 7.58:1 ✅）
- 表头 `sticky top-0` + `bg-brand-50`（不透明，否则滚动时透字）
- 单元格最小字号 12px

### 5.11 标签与开关

#### 标签 `.tag`

| 语义 | 底 | 文字 | 对比度 |
|---|---|---|---|
| 家 home | `emerald-100` | **`emerald-800`** | 6.78:1 ✅ |
| 公司 work | `blue-100` | **`blue-800`** | 7.15:1 ✅ |
| 亲友 family | `purple-100` | **`purple-800`** | 7.39:1 ✅ |
| 其他 other | `slate-100` | `slate-700` | 9.45:1 ✅ |
| 打印类型 print | `brand-100` | **`brand-800`** | 6.73:1 ✅（现状 `brand-700` 4.86:1 及格，升级更稳） |
| 打印类型 pdf | `purple-100` | `purple-800` | 7.39:1 ✅ |

`.tag` 基类：`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`

#### 开关（「显示寄件人地址」）

```html
<button type="button" role="switch" aria-checked={showReturnAddress}
        aria-labelledby="return-addr-label"
        class="relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200
               bg-brand-600 aria-checked:bg-brand-600
               data-[off=true]:bg-slate-400
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2">
  <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 …" />
</button>
<span id="return-addr-label" class="text-sm text-slate-700 font-medium">显示寄件人地址</span>
```
- **`role="switch"` + `aria-checked`**（现状是无语义 `<button>`，读屏完全读不出状态）
- 关闭态轨道 `slate-400`（2.56:1）→ **改 `slate-500`（4.76:1）或 `slate-600`**，因为开关轨道是"识别控件状态所必需"的图形，适用 1.4.11 的 3:1
- 开启态轨道 `brand-600`（3.74:1 ✅）
- 触控区：外层包 `min-h-[44px] flex items-center`

---

## 6. 响应式断点策略

### 6.1 断点值（沿用 Tailwind 默认，不改配置）

| 断点 | 宽度 | 设备 | 本规范中的角色 |
|---|---|---|---|
| base | < 640px | 手机 | **主要改造对象** |
| `sm` | ≥ 640px | 大手机横屏 / 小平板 | 表单双列、按钮恢复紧凑 |
| `md` | ≥ 768px | 平板竖屏 | 地址簿卡片 2 列 |
| `lg` | ≥ 1024px | **桌面（主战场）** | 编辑器 2:3 双栏、预览 sticky、导航恢复横排 pill |
| `xl` | ≥ 1280px | 宽屏 | 内容触达 `max-w-7xl` 上限 |

> 现有代码已用 `sm:` / `md:` / `lg:`，本规范不引入任何新断点。

### 6.2 导航形态切换规则

| 断点 | 页头布局 | 导航形态 |
|---|---|---|
| < 640px | `flex-col gap-3`，logo 一行 + 导航一行 | **`grid grid-cols-4`**，图标在上 + 短标签在下，格高 48px |
| ≥ 640px | `flex-row items-center justify-between` | `flex gap-1`，图标 + 全标签横排 pill，`px-4 py-2` |

**只有一套 DOM**，靠 `sm:` 类切换。不引入底部栏、不引入横向滚动（取舍见 §5.4）。

### 6.3 四个视图的布局变化

#### V1 信封编辑（转化发生地）

| 区块 | < 1024px | ≥ 1024px |
|---|---|---|
| 整体 | `grid-cols-1`（现状已是），顺序：**寄件人 → 收件人 → 信封设置 → 操作按钮 → 预览** | `lg:grid-cols-5`，左 `col-span-2` 右 `col-span-3`（现状） |
| 预览卡片 | 去掉 sticky（`lg:sticky lg:top-6`）；`p-2 sm:p-5` | `sticky top-6 p-6` |
| 操作按钮区 | **`grid grid-cols-2 gap-2.5`**：打印信封 `col-span-2`；导出 PDF / 存入地址簿 各半；清空收件人 `col-span-2`（或右对齐 ghost） | 保持现状 `flex flex-wrap gap-2.5` |
| 收件人「从地址簿选择」 | 卡片标题右侧，`min-h-[44px] px-3` | 现状 |
| 联想下拉 | `max-h-40`，每项 `min-h-[44px] px-4` | `max-h-52`, `py-2.5` |
| 快捷地址簿 chips | `flex-wrap gap-2`，chip `min-h-[44px] px-4 text-[13px]` | 现状 `text-xs px-3 py-1.5` |
| 高德无 Key 引导行（N-09） | 地址框下方 13px `slate-500` + `brand-700` 的「去设置」链接 | 同 |

#### V2 地址簿

| 区块 | < 640px | ≥ 640px |
|---|---|---|
| 工具栏 | `flex-wrap gap-2`，三按钮各 `min-h-[44px]`；空间不足时换行（现状已 wrap ✅） | 现状一行 |
| 搜索框 | `w-full max-w-none` | `max-w-xs` |
| 标签筛选 | 容器加 `flex-wrap`；pill `min-h-[44px] px-3.5` | 现状 `px-3 py-1.5` |
| 卡片网格 | `grid-cols-1`（现状 `md:grid-cols-2` ✅ 保持） | `md:grid-cols-2` |
| 复选框 | 外层 label `-m-3 p-3` → 44×44（§5.3） | 视觉 `h-5 w-5` |
| 卡片操作行 | 三按钮 `min-h-[44px] px-3 text-[13px]`，`gap-1` | 现状 `text-xs px-2 py-1.5` |
| 导入预览表格 | `-mx-4 px-4 overflow-x-auto`（出血横滚） | 现状 |
| 新建 / 编辑表单 | `grid-cols-1`（现状 `sm:grid-cols-2` ✅ 保持） | `sm:grid-cols-2` / `sm:grid-cols-3` |

#### V3 打印历史

| 区块 | < 640px | ≥ 640px |
|---|---|---|
| 头部 | `flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between` | 现状 |
| 记录卡片 | **`flex flex-col items-stretch gap-3`**，`sm:flex-row sm:items-center sm:gap-4` | 现状 `flex flex-wrap items-center gap-4` |
| 操作按钮组 | **`grid grid-cols-2 gap-2`**（再用这个地址 / 删除 各半），`min-h-[44px]` | 现状 `flex gap-2 shrink-0` |
| 时间 + 规格行 | 12px `slate-500` | 同 |
| 新增删除确认 | 走 §5.9 二次确认框 | 同 |

#### V4 设置

| 区块 | < 640px | ≥ 640px |
|---|---|---|
| 容器 | `max-w-2xl`（保持） | 同 |
| 默认寄件人 | `grid-cols-1`（现状 `sm:grid-cols-2` ✅） | `sm:grid-cols-2` |
| Key 输入行 | `flex gap-2`，input 加 **`min-w-0`**（否则 `flex-1` 的 `min-width:auto` 会把按钮挤出屏幕） | 现状 |
| Key 保存按钮 | `min-h-[44px]` | `py-2.5` |
| 数据管理行 | **`flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between`** | 现状 |
| 数据管理按钮 | `w-full sm:w-auto min-h-[44px]` | 现状 |

### 6.4 Canvas 预览区在窄屏的处理

**现状诊断**：`drawEnvelope` 把 `canvas.width/height` 设为 `mm × 3.78`（DL = **832 × 416 px**）。375px 屏上，扣掉 `main px-6` + 卡片 `p-5` + 预览区 `p-5` 后可用宽度仅约 **247px**。结果：预览缩到 247×123，**信息量不足**但不是变形（`max-w-full` 对 replaced element 按 CSS 2.1 §10.4 保留比例）。

**处理方案**：

```html
<div class="flex justify-center bg-slate-50/70 rounded-xl p-2 sm:p-5
            border border-slate-100 overflow-hidden">
  <canvas ref={canvasRef} role="img" aria-label="…"
          class="block max-w-full w-auto h-auto max-h-[45vh] sm:max-h-[540px]
                 shadow-md rounded-md" />
</div>
```

规则：
1. **删掉内联 `style={{ maxHeight: '540px' }}`**，改用 Tailwind `max-h-[45vh] sm:max-h-[540px]`（内联样式优先级高于 class，不删就改不动）。
2. **绝不给 canvas 加 `w-full`** —— 一旦 `width:100%` 而 `height` 不跟随，比例立刻崩。必须 `w-auto h-auto` + 只用 `max-*` 约束。
3. 同时约束 `max-w-full` 与 `max-h-*` 是安全的：replaced element 的 CSS 2.1 §10.4 约束表**保留固有比例**。
4. 移动端把预览区内边距降到 `p-2`，主区降到 `px-4` → 可用宽度 375−32−32−16 = **295px**（比现状 247px 大 19%）。
5. 移动端取消 `sticky`（`lg:sticky lg:top-6`）—— 小屏 sticky 预览会一直吃掉半屏。
6. **P2 增强**：点预览图进全屏查看（信封一旦印错不可逆，值得给一个放大确认的入口）。

### 6.5 移动端验收清单（375px / 390px 逐条过）

- [ ] `document.body.scrollWidth <= clientWidth`（四个视图逐一验）
- [ ] 聚焦任意 `input` / `textarea` / `select`，页面**不被 iOS 放大**（字号 ≥16px）
- [ ] Header 导航不溢出，4 个 Tab 全部可见
- [ ] 所有可点元素实测 ≥ 44×44（含 checkbox、关闭按钮、chips、页脚外链、卡片操作按钮）
- [ ] Canvas 等比缩放，无 `w-full`
- [ ] 导入预览表格横滚时**页面本身不横滚**（滚动只发生在表格容器内）
- [ ] 二次确认框在小屏完整可见，按钮不挤压出界
- [ ] 长地址（如 40 字）在多行截断处不撑破卡片

---

## 7. 无障碍要点

### 7.1 焦点可见态（统一，全站一条）

```css
/* 全局基线 */
*:focus-visible {
  outline: none;
  ring: 2px solid #0F766E;      /* brand-700，5.47:1 */
  ring-offset: 2px solid #FFFFFF;
}
```
Tailwind 落地：`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white`

- **禁止** `outline: none` 而不给替代。
- 输入框用 `focus:`（鼠标点击也该有反馈）；按钮/链接用 `focus-visible:`。
- 深色底上的元素（如主按钮）把 `ring-offset` 换成 `ring-offset-white` 之外的对比色，或直接用 `ring-white`。

### 7.2 触控目标

**所有可点击元素 ≥ 44×44 CSS px**（WCAG 2.5.5 / Apple HIG）。

| 现状不达标项 | 现状 | 改法 |
|---|---|---|
| 地址簿 checkbox | 16×16 | 外层 label `-m-3 p-3` |
| 提示条关闭 `×` | ~24×24 | `-m-2 p-2 min-w-[44px] min-h-[44px]` |
| 页脚外链 pill | ~30px 高 | `min-h-[44px]`（移动端） |
| 卡片操作文字按钮 | ~26px 高 | `min-h-[44px] px-3` |
| 快捷地址簿 chips | ~26px 高 | `min-h-[44px] px-4` |
| 「显示 / 隐藏」Key | ~24×20 | `min-w-[44px] min-h-[44px]` |
| 联想下拉选项 | ~40px | `min-h-[44px]` |
| 内联文字链接（如「去设置」） | ~20px | 上下 `py-2` 撑到 44px，或做成按钮 |

### 7.3 ARIA 标注规则

| 元素 | 要求 |
|---|---|
| 所有 `input` / `textarea` / `select` | 有唯一 `id` + `<label htmlFor>`；同名不同组用「寄件人姓名」「收件人姓名」区分 |
| 仅图标按钮 | `aria-label` |
| 状态切换按钮（显示/隐藏 Key、开关） | `aria-pressed` / `role="switch" + aria-checked` |
| Tab 导航 | `<nav aria-label="主导航">` + 当前项 `aria-current="page"`（**不采用 `role="tablist"`，理由见 §9 建议 2**） |
| Canvas | `role="img"` + 动态 `aria-label`（`信封排版预览，DL 规格 220×110 毫米，收件人张伟，地址…`）+ 标签内回退文本 |
| 提示条 | 成功 `role="status" aria-live="polite"`；失败 `role="alert"` |
| 加载态 | `aria-busy="true"` + `role="status"` 的 `sr-only` 文案 |
| 模态框 | `role="dialog" aria-modal="true"` + `aria-labelledby` + `aria-describedby` + 焦点陷阱 + Esc |
| 表格 | `<th scope="col">` |
| 装饰性 `svg` / emoji | `aria-hidden="true"` |
| 页脚外链 | `aria-label` 说明去向（内容侧 §8.2 已给文案） |

### 7.4 颜色不是唯一信息载体

| 场景 | 颜色之外必须有的第二通道 |
|---|---|
| 成功 / 失败提示 | 图标（✓ / !）+ 文字本身说明 |
| 表单错误 | 图标 + 错误文案 + `aria-invalid` + `aria-describedby` |
| 必填字段 | `*` 符号 + `aria-required` |
| 开关状态 | `role="switch" aria-checked`（不能只靠轨道颜色） |
| 地址簿选中 | `ring` + checkbox 的勾选态（checkbox 本身就够） |
| 打印 / PDF 类型标签 | 文字「打印」/「PDF」 |
| 危险操作 | 二次确认框 + 图标 + 「删除后无法恢复」文案 |

### 7.5 对比度自查清单（前端交付前逐项过）

```
[ ] 所有 ≤23px 的文字，取色后跑一遍对比度（目标 ≥ 4.5:1）
[ ] brand-300 / brand-400 / brand-500 未出现在任何文字上
[ ] 占位符 ≥ 4.5:1（placeholder-slate-500）
[ ] 主按钮 / 强调按钮白字 ≥ 4.5:1（brand-700→800 / cta-700→800）
[ ] 焦点环 ≥ 3:1（ring-brand-700 实色）
[ ] 图标 / 开关轨道 / 卡片选中环 ≥ 3:1
[ ] 标签文字在其底色上 ≥ 4.5:1（emerald-800 / blue-800 / purple-800 / brand-800）
[ ] 提示条文字在其底色上 ≥ 4.5:1
[ ] 禁用态（disabled:opacity-50）不参与 AA 判定，但不得承载唯一信息
[ ] Lighthouse Accessibility ≥ 95
```

---

## 8. 已知风险与缓解

| ID | 风险 | 等级 | 缓解 |
|---|---|---|---|
| **D1** | **`ctx.font` 字体栈非法会被静默忽略** → 信封以 10px 默认字体渲染，预览看不出、打印出来是废品；且 Canvas 用户（老数据）仍带着 `'Inter, sans-serif'` | 🔴 **高（会印废信封）** | ① Canvas 用独立栈（去掉 `-apple-system`，用 `system-ui`）；② 设完 `ctx.font` 立即读回校验；③ `migrate` 里把含 `Inter` 或为空的 `fontFamily` 替换为新栈 |
| **D2** | **主按钮 / 强调按钮白字对比度不达标**（3.74:1 / 2.80:1），本次已列入映射表修正 | 🟡 中 | 渐变各加深一档（A33 / A34）。**这是唯一会改变现有按钮观感的改动，需主理人知悉** |
| **D3** | **输入框边框 2.56:1 未达 3:1**（1.4.11 从严口径下） | 🟢 低 | 已在 §5.3 写明例外依据（label 承担识别）。审计从严时改 `slate-500`，一行的事 |
| **D4** | **等分 4 格导航在超窄屏（≤320px，iPhone SE 1 代）是否要特殊处理** | 🟢 低 | ✅ **已裁决：不特殊处理，等分 4 格一直用到 320px。** 核算：320 − 16×2（容器 padding）= 288，每格约 72px；最长标签「地址簿」3 字 = 33px，加图标 20px 仍有余量；格高 48px 满足 44×44 |
| **D5** | **Canvas 在移动端仍偏小**（295×147）—— 移动端不承载转化 KPI，属"能看清"级别 | 🟢 低 | 移动端不追求可打印；P2 加"点击放大全屏预览" |
| **D6** | **中文字重跨平台不一致**（雅黑只有 400/700，苹方有 400/500/600） | 🟢 低 | 字重收敛到 400/600/700；既有 `font-medium(500)` 不强制改，新增不用 |
| **D7** | **二次确认框的焦点陷阱需要手写**（无 UI 组件库） | 🟡 中 | 最小实现：panel 内查询 `a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])`，Tab 到末尾回绕到首个。约 25 行代码 |
| **D8** | **`prefers-reduced-motion` 未处理** —— 全站有 `transition-all`、`animate-spin`、`animate-pulse`、`active:scale` | 🟢 低 | ✅ **已裁决：** ① 全局加 `@media (prefers-reduced-motion: reduce)` 关掉 transform / animation；② 按钮 loading 的 spinner 用 `motion-reduce:animate-none` 停转，但**必须保留「生成中…」文字提示** —— 减动效不能把"正在导出"这个状态一起去掉 |
| **D9** | **OG 图的中文字体依赖**（详见 `docs/assets/og-image.svg` 注释） | 🟡 中 | 品牌字标「Envo」已做成**纯路径**零依赖；中文标题仍用 `<text>`，**导出 PNG 前必须在有中文字体的机器上渲染并目视检查** |
| **D10** | **favicon 转 PNG 时的字体缺失** | 🟢 低 | 母版**不含任何 `<text>`**，全矢量几何路径，规避此风险（见 `docs/assets/favicon.svg`） |
| **D11** | **SVG 注释里出现连续 `--` 会违反 XML 规范** → 整个文件被判为非法 XML，浏览器不渲染图形，只显示 XML 解析错误页。本次初版母版就踩了这个坑（`---` 分隔线 + 注释里写 `--screenshot`） | 🟡 中 | 母版注释内**一律用 `=` 或 `─`(U+2500) 做分隔线**，禁止连写两个 ASCII 连字符；改完母版后**在浏览器里打开一次**确认能正常渲染（不只是看 XML 合法性） |

---

## 9. 建议与异议

> 按裁决：**以下为我的专业意见，实现仍按裁决执行。若采纳，请明确回复。**

### 建议 1：OG 图底色与 `content-plan.md` §9.2 冲突，我按 team-lead 的硬约束执行了

- `content-plan.md` §9.2 构图规范写的是 **「`brand-50 #F0FDFA` 到纯白 `#FFFFFF` 的浅渐变」**，标题用 `brand-900`。
- 本次派工给我的硬要求是 **「底色用品牌 teal 系」**。
- 二者矛盾。**我按派工硬要求执行**（teal 实底 `#115E59 → #0F766E`，白字），因为它更"teal 系"、在信息流里更抓眼，且白字对比度 5.47–7.58:1 全部达标。
- 若主理人希望回到内容侧的浅底方案，需重出一版母版。**已在 `og-image.svg` 注释里标注了这个分歧点。**

### 建议 2：**不要**给 Tab 导航上 `role="tablist"` / `role="tab"` / `aria-selected`

`content-plan.md` §8.3 建议上完整 tablist。我的意见是**只做最低方案 `<nav>` + `aria-current="page"`**，理由：

1. WAI-ARIA Authoring Practices 的 **Tabs 模式要求配套实现左右方向键漫游**（←/→ 在 tab 间移动焦点）、`aria-controls` 指向 `tabpanel`、非活动 panel 需 `hidden` 或 `tabindex="-1"`。
2. 本项目四个视图是**整页互斥切换**，不是"同一区域内切换面板"。语义上更接近"站内导航"而非"标签页"。
3. **做一半比不做更糟**：只加 `role="tab"` 而不实现键盘漫游，读屏用户会以为能按 ←/→ 切换，实际不能 —— 这是典型的"ARIA 反模式"。
4. `nav + aria-current="page"` 语义正确、零风险、且已被主流读屏正确播报（"当前页"）。

**若主理人坚持 tablist**，请同时批准键盘漫游的实现工时。

### 建议 3：主按钮加深一档（A33 / A34）是本次唯一会改变既有观感的改动

- 裁决说"保留现有视觉骨架"，但**现有主按钮的白字是不达标的**（3.74:1）。
- 我的处理：**继续修**，因为这是 WCAG AA 硬门槛，且只是 teal 深一档，品牌识别不受影响。
- 如果主理人认为"视觉一致性 > AA"，可以不改 —— 但那样 Lighthouse Accessibility 的 contrast 项会持续报错，与 `site-spec.md` §7.6 的「≥95」目标冲突。**我按改了写进规范。**

### 建议 4：页脚 11px 字号建议提到 12px

`content-plan.md` 未涉及字号。我把全站最小字号定为 12px，页脚版本行从 `text-[11px]` 改 `text-xs`。理由：11px 中文在 2x 屏上勉强，在 1x 屏（老 Windows 台式机，正是本工具的目标设备）基本糊。**这条不在裁决范围内，是我作为设计规范的常规取值。**

### 建议 5：`font-mono` 不用改，但要确认没被 `sans` 覆盖

`tailwind.config.js` 只 `extend.fontFamily.sans`，`mono` 仍是 Tailwind 默认（`ui-monospace, SFMono-Regular, Menlo, …`），**不含 Inter**，可直接用于尺寸标签和时间戳。前端无需处理，但**不要顺手把 `mono` 也改成系统栈**（会丢掉等宽特性）。

---

## 10. 交付小结

### 这套规范的关键取舍

1. **可读性压过轻盈感。** 次要文字从 `brand-300/400`（1.48–1.86:1）整体压到 `brand-700`（5.47:1），页面会"变重"一点，但 12px 的邮编、时间戳、统计数字从此真的能读。工具站的用户是在办事，不是在欣赏留白。
2. **移动端用「单套 DOM + 等分 4 格导航」，不用底部 Tab 栏。** 放弃拇指可达性，换取零第二组件、零 safe-area 处理、零 main padding 耦合。对低频桌面工具，这笔交换划算。
3. **桌面端除对比度与字号外一字不改。** 用户已习惯"左表单右预览"，重排是纯负资产。所有布局改造只在 <1024px 生效。
4. **Canvas 字体栈与 UI 字体栈拆成两套。** 多维护一个常量的代价，换掉"整批信封以 10px 字体印出来"的事故概率。

### 前端最容易做走样的 3 个点

1. **Canvas 的 `ctx.font` 字体栈（D1，🔴 上线死卡项）。** 千万不要直接把 UI 栈（含 `-apple-system`）塞进 `ctx.font` —— 浏览器会**静默忽略整条赋值**，没有任何报错，预览看起来"好像还行"，打印出来字体是 10px 的默认 sans-serif，**整批信封报废**。必须用独立的 `system-ui, "PingFang SC", …` 栈，并加一行 `if (!ctx.font) console.warn(...)` 自检。同时 `migrate` 要把老数据里的 `'Inter, sans-serif'` 换掉。**三步缺一不验收。**

2. **移动端导航的 `flex → grid` 切换（§5.4）。** 容易漏掉三处：① 页头容器必须从 `flex-row justify-between` 改成 `flex-col sm:flex-row`；② 每个 Tab 按钮必须从 `flex-row`（图标 + 标签横排）改成 `flex-col sm:flex-row`（图标在上）；③ 短标签与全标签要同时写在 DOM 里用 `sm:hidden` / `hidden sm:inline` 切换，**不要**用 JS 判断断点（会引入 hydration/resize 问题）。漏任何一处，375px 下要么溢出，要么图标和标签挤成一坨。

3. **SVG 注释里不能出现连续两个 ASCII 连字符 `--`（本次已踩坑并修复）。** XML 规范明确禁止，后果不是"注释被忽略"，而是**整个文件解析失败、浏览器直接渲染成报错页**。本文件初版的分隔线 `-----` 与注释里提到的 CLI 参数 `--screenshot` 都触发了这个错误。**后续给 `favicon.svg` / `og-image.svg` 加注释时：分隔线用 `=` 或 `─`（U+2500），不要写 `---`；不要在注释里原样抄带 `--` 前缀的命令行参数。**

### 需要用户拍板的 1–2 个决策

> **✅ 已由 team-lead 裁决完毕（2026 版 v1.0.1 交付），以下两条按「我的方案 + 派工硬约束」执行，不再返工。**

1. **【已裁决】OG 图底色 = teal 实底**（`#115E59 → #0F766E` 渐变 + 白字）。与 `content-plan.md` §9.2 的浅底方案冲突时，**以派工硬约束优先**；内容侧负责同步修订其文档。（原提议见 §9 建议 1）
2. **【已裁决 · 批准】主按钮 / 强调按钮加深一档**（`brand-600→700` 改 `brand-700→800`；`cta-500→600` 改 `cta-700→800`）。理由是白字在 `cta-500` 上 2.80:1 属严重不达标，不修会与 Lighthouse ≥95 目标直接冲突。（原提议见 §9 建议 3）

**附：建议 2 亦已裁决采纳** —— Tab 导航采用 `<nav>` + `aria-current="page"`，**不做 `role="tablist"`**；`content-plan.md` §8.3 的 tablist 建议被驳回。

---

*文档结束 · 变更需通知全队并同步修订本文件*
