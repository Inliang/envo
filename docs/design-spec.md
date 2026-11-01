# Envo 信封打印助手 · 视觉设计规范 v2.0（深色优先基线）

> **版本**：v2.0 ｜ **性质**：重设计（Redesign）深色基线，非增量 ｜ **作者**：颜一屏（UI 设计师）
> **依据**：team-lead 对标结论（2026 主流审美 = 中性灰底 + 单一强调色 + 细边框 + 少阴影 + 线性图标，Linear / Vercel / Stripe / calm-ui / shadcn 同构）；现有 `src/` 结构、业务逻辑、Canvas 绘制、`EnvelopeEditor.tsx` 打印窗口、本地存储一律不动。
> **边界**：本次只动视觉层。不新增后端、不加路由、不加构建重依赖（含 **不引入 lucide-react**，图标内联 SVG）。不改 `src/` 任何文件、不 commit；实现交给前端工程师。
> **硬约束**（不可突破）：① WCAG AA 双主题达标（正文 ≥4.5:1 / 大文本 ≥3:1 / 非文本 ≥3:1）；② 功能与结构零改动；③ Canvas 信封打印是独立层，UI 主题切换**绝不影响**打印产物；④ 移动端横向零滚动、触控 ≥44×44、输入框移动端 ≥16px 等验收项继续有效；⑤ 无障碍结构（`<nav aria-label>` + `aria-current`、表单 label/id、对话框焦点陷阱、状态双通道、`role="img"` 信封预览）不得退化。

---

## 0. 一页速览

| 项 | 结论 |
|---|---|
| 视觉方向 | 克制、工程师感、可信 —— 像 **Linear / Vercel 暗色官网** |
| 默认主题 | **深色（dark）**，`<html class="dark">` 默认挂载 |
| 强调色 | **teal 单一强调**（弃用旧版橙色 `cta`），报错/危险用红，成功/警告/信息用语义色 |
| 色彩体系 | shadcn 式 CSS 变量语义令牌，深色 + 浅色两套全量取值 |
| 最大改动 | 整体换肤为深色；导航/页脚弃用 emoji 改线性图标；弃用橙色 cta；页头 logo 重做字标 |
| 保留项 | 四 Tab 结构、所有业务逻辑、Canvas 绘制与打印窗口、本地数据、移动端验收口径、浅色主题（作为可切换第二主题） |
| 图标方案 | 内联 lucide 风格 SVG（stroke 1.5、currentColor、圆角端帽），约 16 个，零新依赖 |
| 阴影策略 | 深色：几乎不用投影，改用**发丝边框 + 背景抬升**表达层级；浅色：保留 `shadow-sm` |

---

## 1. 设计原则

1. **深色优先，浅色回退。** 深色是默认主题（工具站用户多在桌面长时间操作，深色更护眼、更"专业工具"调性）。浅色保留为「设置」里可切换的第二主题，两套共用同一套语义令牌，靠 CSS 变量自动切换。
2. **单一强调色。** 全站只有一个品牌强调色 = teal。旧版橙色 `cta` 退役；"新增地址 / 批量打印"等强动作改为 teal 主按钮或描边次级按钮，靠**字重与填充**而非第二种颜色拉开层级。状态语义（成功绿 / 警告黄 / 错误红 / 信息 teal）不属于"品牌强调"，可并存。
3. **层级靠字重、间距、发丝边框，不靠彩色块和投影。** 这是 2026 主流审美的共识（calm-ui 明确反对 loud shadow）。深色下几乎不用 `box-shadow`，改用 `#121214 → #1A1B1E` 的背景抬升 + `#27272A` 级发丝边。
4. **工具站属性不变。** 信息密度优先于装饰；字号阶梯、间距刻度、栅格沿用 v1 已验证的契约，不为了"好看"牺牲可读性。
5. **打印产物神圣不可侵犯。** 信封在白底上用黑/teal 墨绘制，打印窗口自带独立样式（`EnvelopeEditor.tsx:170-216` 的 `window.open` + 内联 `<style>`，不引用任何应用 CSS / 主题变量）。**UI 主题切换对打印出来的信封零影响**，这是验收红线。

---

## 2. 主题令牌表（深色 + 浅色，含核算对比度）

> 所有令牌定义在 `index.css`：`:root` 放浅色值，`.dark` 放深色值（详见 §9）。
> 对比度列标注「对各自背景」的 WCAG 比值，浅色背景取 `#FFFFFF`，深色背景取 `--card #121214`（控件多落在其上）。

### 2.1 基础令牌（两套全量取值）

| 令牌 | 浅色值（light / `:root`） | 对白底 | 深色值（dark / `.dark`） | 对深底(#121214) | 用途 |
|---|---|---|---|---|---|
| `--background` | `#FFFFFF` | — | `#0A0A0B` | — | 页面底色（page） |
| `--foreground` | `#0F172A` (slate-900) | 17.85:1 | `#EDEDED` | 18.05:1 | 主文字 / 标题 |
| `--card` | `#FFFFFF` | — | `#121214` | — | 卡片 / 面板底 |
| `--card-foreground` | `#0F172A` | 17.85:1 | `#EDEDED` | 18.05:1 | 卡片内主文字 |
| `--muted` | `#F8FAFC` (slate-50) | — | `#18181B` (zinc-900) | — | 次级底 / 凹陷区 / 斑马纹 |
| `--muted-foreground` | `#64748B` (slate-500) | 4.76:1 ✅ | `#A1A1AA` (zinc-400) | 7.30:1 ✅ | 次要 / 元信息文字 |
| `--popover` | `#FFFFFF` | — | `#161618` (zinc-900+) | — | 下拉 / 联想浮层底 |
| `--border` | `#E2E8F0` (slate-200) | 1.23 | `#27272A` (zinc-800) | 1.26 | 发丝边框（**装饰性**，见 §2.4 注） |
| `--input` | `#94A3B8` (slate-400) | 见 §2.4 | `#6B7280` (gray-500) | **3.87:1** ✅ | 输入 / 控件静止边框（控件边界，达 3:1） |
| `--primary` | `#0F766E` (brand-700) | 5.47:1 | `#0F766E` (brand-700) | 3.42:1 | **主按钮底 / 焦点环**（两套一致） |
| `--primary-foreground` | `#FFFFFF` | 5.47:1 | `#FFFFFF` | 5.47:1 | 主按钮文字 |
| `--secondary` | `#F1F5F9` (slate-100) | — | `#1F1F23` | — | 次级按钮 / ghost 悬浮底 / chip 底 |
| `--secondary-foreground` | `#334155` (slate-700) | 10.35:1 | `#EDEDED` | 18.05:1 | 次级按钮文字 |
| `--accent-foreground` | `#0F766E` (brand-700) | 5.47:1 | `#2DD4BF` (brand-400) | 10.05:1 ✅ | teal 文字 / 链接 / 状态图标（**按主题解析**，见 §2.3 注） |
| `--ring` | `#0F766E` | 5.47:1 | `#0F766E` | 3.42:1 ✅ | 焦点可见环（两套一致，均 ≥3:1） |
| `--destructive` | `#B91C1C` (red-700) | 6.47:1 | `#B91C1C` (red-700) | 6.47:1 | 危险按钮底（两套一致） |
| `--destructive-foreground` | `#FFFFFF` | 6.47:1 | `#FFFFFF` | 6.47:1 | 危险按钮文字 |
| `--radius` | `12px`（card/modal = xl） | — | `12px` | — | 圆角基准（见 §5 半径表） |

### 2.2 语义色令牌（成功 / 警告 / 错误 / 信息，双主题）

> 深色下用 **400 级亮色作文字/图标**（在深底上才够亮达标），底色用该色 12% 透明填充、边框 30% 透明；浅色下沿用 v1 已验证的 50/200/800 取值。

| 语义 | 浅色 fg（对白底） | 浅色 bg / border | 深色 fg（对#121214） | 深色 bg / border |
|---|---|---|---|---|
| **成功 success** | `#065F46` emerald-800 · 7.29:1 ✅ | `#ECFDF5` / `#A7F3D0` | `#34D399` emerald-400 · **9.72:1** ✅ | `rgba(52,211,153,.12)` / `rgba(52,211,153,.30)` |
| **警告 warning** | `#92400E` amber-800 · 7.09:1 ✅ | `#FFFBEB` / `#FDE68A` | `#FBBF24` amber-400 · **11.20:1** ✅ | `rgba(251,191,36,.12)` / `rgba(251,191,36,.30)` |
| **错误 error** | `#B91C1C` red-700 · ~7.4:1 ✅ | `#FEF2F2` / `#FECACA` | `#F87171` red-400 · **6.77:1** ✅ | `rgba(248,113,113,.12)` / `rgba(248,113,113,.30)` |
| **信息 info** | `#115E59` brand-800 · 7.27:1 ✅ | `#F0FDFA` / `#99F6E4` | `#2DD4BF` brand-400 · **10.05:1** ✅ | `rgba(45,212,191,.12)` / `rgba(45,212,191,.30)` |

### 2.3 ★ teal 分工（本次最关键的颜色裁决）

teal 是唯一品牌色，但**同一语义在不同主题下解析到不同 hex 是正确行为，不是漂移**（见 §11 风险 3）：

| 用途 | 浅色取值 | 深色取值 | 理由（对比度） |
|---|---|---|---|
| **主按钮底 `--primary`** | `#0F766E` | `#0F766E`（同） | 白字 5.47:1，两套一致，品牌按钮视觉统一 |
| **焦点环 `--ring`** | `#0F766E` | `#0F766E`（同） | 浅 5.47:1 / 深 3.42:1，均 ≥3:1，两套一致 |
| **teal 文字 / 链接 / 状态图标 `--accent-foreground`** | `#0F766E` | `#2DD4BF` | 浅底用 brand-700 才 5.47:1（brand-400 在白底仅 1.86:1 ❌）；深底用 brand-400 才"跳出来"且 10:1 ✅ |
| **选中态 / 激活态（Tab、选中卡片）** | `bg-brand-50 text-brand-800` | `bg-[#0F766E]/15 text-[#2DD4BF]` + 细 teal 边 | 深底上用 teal 12% 透明底 + brand-400 文字，既可见又不刺眼 |
| **装饰图标 / 空状态图标** | `text-brand-600` | `text-[#2DD4BF]` | 非文本需 ≥3:1；brand-400 在深底 10:1 远超 |

> ⚠️ **白字按钮绝不能用亮 teal（`#2DD4BF`）做底**：白字在其上仅 1.86:1，严重不合格。CTA 按钮底必须用 `#0F766E`（brand-700）。亮 teal 只用于"深色底上的文字/图标/点缀"。

### 2.4 关于边框 3:1 的硬性说明（纠正旧 brief 的一个误判）

旧 brief 认为 `#27272A` 这类发丝边"在深底上 ≥3:1"——**实测不成立**：`#27272A` 对 `#121214` 仅约 **1.26:1**。`#27272A` 作为**装饰性**卡片/分隔边线可以保留（卡片是非交互控件，WCAG 1.4.11 对其边界豁免；且卡片靠 `#0A0A0B→#121214` 的背景抬升 + 此线共同读出边界）。

但**控件边界**（输入框静止边框、开关轨道等"识别控件状态所必需"的图形）必须满足 1.4.11 的 3:1。因此：
- `--input` 静止边框用 `#6B7280`（gray-500），对 `#121214` **3.87:1**、对抬升层 `#1A1B1E` **3.56:1**，均 ≥3:1 达标。
- 输入框仍沿用 v1 的**例外处理**：每个输入框上方有 12px / 7.3:1 的 `<label>` 承担识别职责，边框是强化而非唯一识别；这与 v1 §5.3 口径一致。控件静止边已定为 `#6B7280`（3.87:1，满足 1.4.11 的 3:1），审计若从严可升到 `#82828C`（4.75:1）。
- 开关轨道关闭态用 `#52525B`（对深底 ~3.9:1），开启态用 `--primary`。

---

## 3. 色彩系统（汇总）

- **品牌**：teal（唯一强调）。浅 `#0F766E` 主 / `#2DD4BF` 点缀；深同主、亮 teal 点缀。
- **中性**：浅 = slate 系（沿用 Tailwind 默认，v1 §2.2 已定）；深 = 近黑 `#0A0A0B` / 面板 `#121214` / 抬升 `#1A1B1E` / 发丝边 `#27272A` / 控件边 `#6B7280`。
- **语义**：success / warning / error / info，双主题取值见 §2.2。
- **禁用**：`brand-300/400/500` 出现在任何 ≤23px 文字上（浅深同禁）；深底上禁止用 slate-500(`#64748B`, 3.93:1) 作正文（改用 `#A1A1AA`）；深底上禁止用 `#71717A` 作小字（3.87:1 < 4.5）。
- **强制双通道**：颜色永远不是唯一信息载体（图标 + 文字 + `aria-*`）。

---

## 4. 图标清单与风格约束（内联 SVG，零新依赖）

**风格约束（全部图标统一）**：
- `viewBox="0 0 24 24"`，`fill="none"`，`stroke="currentColor"`，`stroke-width="1.5"`，`stroke-linecap="round"`，`stroke-linejoin="round"`。
- 默认随文字同色（`text-[--foreground]` / `text-[--muted-foreground]`）；**仅在状态语境上色**（错误红、成功绿等）。
- 装饰性图标加 `aria-hidden="true"`；纯图标按钮必须带 `aria-label`。
- 不引入 `lucide-react`（主包已 1.08MB，避免增重）；在 `src/components/icons.tsx` 内联一组必要 SVG 组件，前端照画。

**图标清单（16 个，对应旧 emoji 与功能）**：

| # | 名称 | 替换对象 | 用途 | 路径草案（`d`，单/多 path） |
|---|---|---|---|---|
| 1 | `envelope` | ✉ | 信封编辑 Tab、信封预览 | `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.99 5.73a2 2 0 0 1-2.02 0L2 7"/>` |
| 2 | `book-user` | 📖 | 地址簿 Tab | `<path d="M18 21h-8a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 0 2 2z"/><path d="M15 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/><path d="M15 14h.01"/>` |
| 3 | `printer` | 🖨 | 打印历史 Tab、打印按钮 | `<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>` |
| 4 | `settings` | ⚙ | 设置 Tab | lucide `settings`（齿轮 + 中心圆，见下方整段） |
| 5 | `x` | — | 关闭提示条 / 模态 | `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>` |
| 6 | `check` | ✓ | 成功、勾选 | `<path d="M20 6 9 17l-5-5"/>` |
| 7 | `triangle-alert` | ! | 警告、错误图标 | `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>` |
| 8 | `search` | 🔍 | 地址簿搜索 | `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>` |
| 9 | `upload` | — | 导入地址 | `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>` |
| 10 | `download` | — | 导出 PDF / 导出 | `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>` |
| 11 | `pencil` | — | 编辑地址 | `<path d="M21.17 6.81a1 1 0 0 0-3.99-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>` |
| 12 | `trash-2` | — | 删除地址 / 清空历史 | `<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>` |
| 13 | `eye` / `eye-off` | — | 显示 / 隐藏 Key | eye: `<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>`；eye-off 加 `<path d="m2 2 20 20"/>` 与中段遮断 |
| 14 | `copy` | — | 复制地址 / 记录 | `<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>` |
| 15 | `chevron-down` | — | 下拉 / 折叠 | `<path d="m6 9 6 6 6-6"/>` |
| 16 | `plus` | — | 新增 | `<path d="M5 12h14"/><path d="M12 5v14"/>` |
| 17 | `send`（monogram） | 「E」方块 | **页头 logo 几何标记** | `<path d="M14.54 21.69a.5.5 0 0 0 .94-.02l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.02.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>`（纸飞机 = "寄信"语义） |

> `settings` 完整路径（lucide gear，较长，前端照抄即可）：
> `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>`

**页头 logo 重做**：弃用「E 方块」。改为 **几何 monogram（`send` 纸飞机，teal `currentColor`）+ 字标 "Envo"**：左侧 24×24 内联 SVG（teal 描边纸飞机，深色下用 `--accent-foreground` 即 `#2DD4BF`，浅色下 `--primary` 即 `#0F766E`），右侧 `Envo` 字标（font-semibold，深色 `#EDEDED` / 浅色 `#0F172A`），下方副标题 12px（`--muted-foreground`）。不再用带底色的方块容器。

---

## 5. 排版 / 间距 / 圆角

### 5.1 字体（沿用 v1，不引外链）
系统字体栈（Tailwind `fontFamily.sans`，`tailwind.config.js` 已定，**顺序勿调换**）：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif`。Canvas 字体栈单独一套（`system-ui` 起头，见 v1 §3.1，本次不动）。字重收敛 **400 / 600 / 700**。

### 5.2 字号 / 行高 / 字重阶梯（沿用 v1 §3.3，深色下颜色换令牌）

| 级 | 语义 | 移动端 | 桌面 | 行高 | 字重 | 色（深色 / 浅色） |
|---|---|---|---|---|---|---|
| H1 | 页头站点名 | 18px | 20px | 1.3 | 600 | fg `#EDEDED` / `#0F172A` |
| H2 | 视图标题 | 17px | 18px | 1.35 | 600 | fg |
| H3 | 区块标题 `.section-title` | 14px | 14px | 1.4 | 600 | fg |
| H4 | 卡片内小标题 | 14px | 14px | 1.4 | 600 | fg |
| Body-L | 表单输入值 | 16px | 14px | 1.6 | 400 | fg |
| Body | 正文 / 地址 | 14px | 14px | **1.75** | 400 | `--muted-foreground`（`#A1A1AA` / `#64748B`） |
| Body-S | 次要说明 | 13px | 13px | 1.65 | 400 | `--muted-foreground` |
| Caption | 时间戳 / 邮编电话 | 12px | 12px | 1.5 | 400 | `--muted-foreground` |
| Micro | 页脚版本行 | 12px | 12px | 1.5 | 400 | `--muted-foreground` |

**硬性下限**：全站最小 12px；中文正文行高 ≥1.7（正文 14×1.75）；所有 `input/textarea/select` 移动端 ≥16px；中文标签禁止 `uppercase` + `tracking-wider`（改 `tracking-normal`）。

### 5.3 间距刻度（4px 基准，沿用 v1 §4）
`2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 96`（禁止 4 的非整数倍）。页面左右 `px-4 sm:px-6`；卡片内 `p-4 sm:p-5`；预览区 `p-2 sm:p-5`；字段间 `space-y-3`；卡片间 `space-y-4 sm:space-y-5`；按钮间 `gap-2 sm:gap-2.5`。栅格：内容 `max-w-7xl`(1280)、设置 `max-w-2xl`(672)、编辑器 `lg:grid-cols-5`(2:3)、地址簿 `grid-cols-1 md:grid-cols-2`（均沿用，不改）。

### 5.4 ★ 圆角收敛（半径即层级）

| 元素 | 半径 | Tailwind |
|---|---|---|
| 卡片 / 模态 / 页头 logo 容器 | **12px** | `rounded-xl` |
| 按钮 / 输入框 / 下拉 / 提示条 | **10px** | `rounded-lg` |
| 标签 chips / 页脚外链 pill | 全圆 | `rounded-full` |
| 复选框 / 开关 / 小图标按钮 | **6px** | `rounded-md` |

> 注：v1 卡片用 `rounded-2xl`(16px)，本次收敛为 `rounded-xl`(12px)，与"中间档不要乱"的原则一致。

### 5.5 阴影
- **深色**：`shadow-none`，层级靠 `border` + 背景抬升（`#0A0A0B → #121214 → #1A1B1E`）。仅模态用 `shadow-2xl`（深色下极轻，主要起层级提示）。
- **浅色**：保留 `shadow-sm`（卡片 / 主按钮），模态 `shadow-xl`。

---

## 6. 组件规范（15 类，给出深色态具体 class；浅色态靠变量自动切换）

> 通用：所有组件类从 v1 的硬编码色改为引用 §2 令牌（`var(--...)`）。下方深色态 class 以直接写死 hex 的形式给出（便于前端核对），实现时建议统一改成 `var(--token)`。圆角按 §5.4。

### ① 页头 `<header>`
深色：`bg-[#0A0A0B] border-b border-[#27272A] px-4 sm:px-6 py-3 sm:py-4`；内部 `max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`。
- Logo：`send` monogram（`text-[#2DD4BF]`，24×24）+ 字标 `Envo`（`text-[#EDEDED] font-semibold text-lg leading-tight`）+ 副标题 `text-[12px] text-[#A1A1AA]`。
- 移动端 `flex-col`、桌面 `flex-row`（沿用 v1 §6.2）。

### ② 主导航 `<nav aria-label="主导航">`
深色容器：`bg-[#161618] border border-[#27272A] rounded-xl p-1`；移动端 `grid grid-cols-4 gap-0.5`，桌面 `sm:flex sm:gap-1`。
- 选中：`bg-[#0F766E]/15 text-[#2DD4BF]`（或 `text-[#EDEDED]` + teal 边），`aria-current="page"`。
- 未选：`text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#1F1F23]/60`。
- 焦点：`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0B]`（3.42:1 ✅）。
- 图标：线性 SVG（envelope/book-user/printer/settings），`text-current` 随态变色；短标签映射同 v1（编辑 / 地址簿 / 历史 / 设置）。

### ③ 卡片 `.card-bento`
深色：`bg-[#121214] border border-[#27272A] rounded-xl p-4 sm:p-5 hover:border-[#3F3F46] transition-colors duration-200`（**去 shadow，改 border**）。
- 选中态：`ring-2 ring-[#2DD4BF] ring-offset-2 ring-offset-[#0A0A0B]`（teal 环，非文本 ≥3:1）。
- 强调态（收件人卡片）：`ring-1 ring-[#2DD4BF]/40`。

### ④ 按钮（primary / outline / ghost / danger / text-danger；**cta 退役**）
通用：圆角 `rounded-lg`、字号 `text-[15px] sm:text-sm`、字重 600、移动 `min-h-[44px]`、`active:scale-[0.98]`、`transition`、`focus-visible:ring-2 ring-[#0F766E] ring-offset-2 ring-offset-[#0A0A0B]`。

| 按钮 | 深色态 class | 对比度 |
|---|---|---|
| **primary**（打印信封 / 新增地址 / 批量打印） | `bg-[#0F766E] hover:bg-[#115E59] text-white` | 白字 5.47:1 ✅ |
| **outline**（导出 PDF / 存入地址簿 / 取消） | `border border-[#3F3F46] bg-transparent text-[#EDEDED] hover:bg-[#1F1F23] hover:border-[#52525B]` | fg 18:1 ✅ |
| **ghost**（次要文字按钮） | `text-[#A1A1AA] hover:bg-[#1F1F23] hover:text-[#EDEDED]` | 7.3:1 ✅ |
| **danger**（删除确认） | `bg-[#B91C1C] hover:bg-[#991B1B] text-white` | 白字 6.47:1 ✅ |
| **text-danger**（删除 / 清空历史） | `text-[#F87171] hover:text-[#FCA5A5] hover:bg-[#F87171]/10` | fg 6.77:1 ✅ |

### ⑤ 表单（input / label / 错误态 / 开关）
- `.input-label`：`block mb-1.5 text-xs font-semibold text-[#A1A1AA] tracking-normal`（7.3:1 ✅）。必填：`*` + `aria-required`。
- `.input-field` 深色：`w-full px-4 py-3 min-h-[44px] text-[16px] sm:text-sm sm:py-2.5 sm:min-h-0 bg-[#161618] border border-[#6B7280] rounded-lg text-[#EDEDED] placeholder-[#8A8A94] focus:bg-[#1A1B1E] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/40 disabled:opacity-50`。
  - 占位符 `#8A8A94` 对 `#161618` = **5.29:1** ✅（满足 1.4.3 ≥4.5；更浅的 `#71717A` 仅 3.74:1、`#7C7C86` 4.38:1 均不达标，勿用）。
  - 静止边框 `#6B7280` 3.87:1（控件边界达标）。
- 错误态：`border-[#F87171] bg-[#F87171]/10` + 文案 `text-[#F87171]`（6.77:1）+ 图标 + `aria-invalid` + `aria-describedby`。
- 密码显示/隐藏按钮：`min-w-[44px] min-h-[44px] text-[#2DD4BF]` + `aria-pressed`。
- 复选框：视觉 `h-5 w-5 rounded-md border-[#6B7280] text-[#0F766E]`；外层 label `-m-3 p-3` 扩到 44×44。

### ⑥ 提示条（成功 / 失败 / 警告 / 信息）
深色态（以成功为例）：`flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[rgba(52,211,153,.12)] border border-[rgba(52,211,153,.30)] text-[#34D399] text-sm`；失败换 error 令牌、警告换 warning、信息换 info。`role`：`status/alert` + `aria-live`（沿用 v1 §5.8）。关闭按钮：`shrink-0 -m-2 p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-[#34D399]/70 hover:text-[#34D399]`（44×44 触控）。

### ⑦ 二次确认模态
遮罩：`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]`。
面板：`w-full max-w-[400px] bg-[#121214] border border-[#27272A] rounded-xl shadow-2xl p-5 sm:p-6`（**圆角收敛为 xl**）。
- 危险图标：`bg-[#F87171]/10 text-[#F87171]` 48px 圆。
- 标题 `text-[#EDEDED] text-base font-semibold`；描述 `text-[#A1A1AA] text-sm leading-7`，不可逆后果 `text-[#F87171] font-medium`。
- 按钮区：移动 `flex-col-reverse`、桌面 `sm:flex-row sm:justify-end`；均 `min-h-[44px] w-full sm:w-auto`。
- 无障碍：焦点陷阱、`aria-modal`、`aria-labelledby/describedby`、打开聚焦"取消"、关闭还原触发元素、`Esc`、遮罩 `onMouseDown` 关闭、`max-h-[85vh] overflow-y-auto`（全沿用 v1 §5.9，仅换色）。

### ⑧ 表格（地址簿导入预览）
深色：`table w-full min-w-[640px] text-xs`；表头 `bg-[#161618] text-[#A1A1AA] font-semibold sticky top-0`；单元格 `text-[#EDEDED]` / 元信息 `text-[#A1A1AA]`；斑马 `bg-[#161618]/40`。窄屏容器 `-mx-4 px-4 overflow-x-auto`（出血横滚，页面本身不横滚）。`<th scope="col">`。

### ⑨ 标签 / 分类 chips（家 / 公司 / 亲友 / 其他 / 打印类型 / PDF）
基类：`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`。深色态用「400 亮色字 + 12% 底 + 30% 边」：

| 语义 | 深色 fg / bg / border | 深色对比(fg/#121214) |
|---|---|---|
| 家 home | `#34D399` / `rgba(52,211,153,.12)` / `rgba(52,211,153,.30)` | 9.72:1 ✅ |
| 公司 work | `#60A5FA`(blue-400) / `rgba(96,165,250,.12)` / `.30` | ~9:1 ✅ |
| 亲友 family | `#C084FC`(purple-400) / `rgba(192,132,252,.12)` / `.30` | ~8:1 ✅ |
| 其他 other | `#A1A1AA` / `rgba(161,161,170,.12)` / `.30` | 7.3:1 ✅ |
| 打印 print | `#2DD4BF` / `rgba(45,212,191,.12)` / `.30` | 10.05:1 ✅ |
| PDF | `#C084FC` / `rgba(192,132,252,.12)` / `.30` | ~8:1 ✅ |

（浅色态沿用 v1 §5.11 的 100/800 取值，达标已验证。）

### ⑩ 空状态
容器 `.card-bento` `p-8 sm:p-12 text-center`；图标 `bg-[#1F1F23] text-[#2DD4BF]` 48px 容器 + 24px 图形；主文案 `text-[#A1A1AA] text-sm leading-7`；次文案 `text-[#71717A] text-[13px]`（注意：次文案若用 `#71717A` 在 `#121214` 上仅 3.87:1——**空状态次文案改用 `#A1A1AA` 保险**，或在浅色才用更浅）；可选按钮 `btn-primary mt-4`。

### ⑪ 加载态
- 按钮内联：`disabled aria-busy="true"` + spinner `animate-spin text-[#2DD4BF]`（16px）+ 文案「生成中…」；宽度锁定防跳动；`prefers-reduced-motion` 下改静态点 + 文案（P0，沿用 v1 §5.7）。
- 区域骨架：`bg-[#1F1F23] animate-pulse` 占位块 + `sr-only role="status"` 文案。

### ⑫ 页脚
深色：`border-t border-[#27272A] bg-[#0A0A0B] text-center py-6 px-4`；版本行 `text-[12px] text-[#A1A1AA]`（**不可用 `#71717A`，深底仅 3.87:1 不达标，改用 `#A1A1AA` 7.3:1**）；外链 pill：`rounded-full border border-[#27272A] bg-[#161618] text-[#2DD4BF] hover:bg-[#1F1F23] min-h-[44px] text-xs` + `aria-label`（GitHub / FMO / QSL 图标保持内联 SVG，颜色随 `text-[#2DD4BF]`）。

### ⑬ 地址簿卡片网格与操作行
卡片 = ③；网格 `grid-cols-1 md:grid-cols-2`。操作行：`flex gap-1`，按钮 `min-h-[44px] px-3 text-[13px]`，「填入信封」「编辑」用 `btn-ghost`/`text-[#2DD4BF]`，「删除」用 `btn-text-danger`。复选框 = ⑤。批量选择工具栏按钮 `min-h-[44px]`。

### ⑭ 打印历史记录卡
卡片 = ③；布局移动 `flex flex-col items-stretch gap-3`、桌面 `sm:flex-row`。时间/规格 `text-[#A1A1AA] text-xs`；地址行 `text-[#EDEDED]`。类型 tag = ⑨（打印 brand / PDF purple）。操作「再用这个地址」`btn-outline`、「删除」`btn-text-danger`，移动 `grid grid-cols-2 gap-2 min-h-[44px]`。

### ⑮ 信封预览区（深色背景下"托住"白色信封 canvas）
- 容器：`flex justify-center bg-[#161618] border border-[#27272A] rounded-xl p-2 sm:p-5 overflow-hidden`。
- Canvas：`class="block max-w-full w-auto h-auto max-h-[45vh] sm:max-h-[540px] bg-white rounded-md border border-[#3F3F46]"`。白底信封在深灰容器上**靠明度对比直接"跳出来"**；细边框 + 圆角做"相框"。
- **绝不**给 canvas 加 `w-full`（破坏比例）；删掉内联 `style maxHeight`，改用 class（沿用 v1 §6.4）。
- 浅色态容器：`bg-[#F8FAFC] border-[#E2E8F0]`（白信封在浅底上靠边框区分）。
- `role="img"` + 动态 `aria-label`（收件人/规格）保留（无障碍不退化）。
- **打印产物不受影响**：预览只是屏幕显示；真正打印走 `EnvelopeEditor.tsx` 的独立 `window.open` 窗口（见 §9 / §1 原则 5）。

---

## 7. 响应式与移动端（沿用 v1 §6，确认深色下仍达标）

- **断点**（不改 Tailwind 配置）：base<640 / sm≥640 / md≥768 / lg≥1024 / xl≥1280。导航 <640 `grid-cols-4`（图标+短标签），≥640 `flex` pill。
- **四视图布局变化**沿用 v1 §6.3（编辑器 lg 2:3 双栏 + sticky 预览、地址簿 md 2 列、历史移动纵向、设置 sm 双列），仅颜色换令牌。
- **窄屏 Canvas** 处理沿用 v1 §6.4（等比缩放、`max-h-[45vh]`、移动去 sticky、可用宽 295px）。
- **移动端验收清单**（375/390 逐条过，深色下仍须满足）：
  - [ ] `body.scrollWidth <= clientWidth`（四视图）；
  - [ ] 聚焦任意输入不被 iOS 放大（≥16px）；
  - [ ] Header 4 Tab 全可见；
  - [ ] 所有可点元素实测 ≥44×44（含 checkbox、关闭×、chips、页脚外链、卡片操作按钮）；
  - [ ] Canvas 等比、`w-auto h-auto` 无 `w-full`；
  - [ ] 导入表格横滚只发生在容器内；
  - [ ] 模态小屏完整可见、按钮不挤界；
  - [ ] 长地址多行截断不撑破卡片。

---

## 8. 无障碍（确认不退化，双主题对比度清单）

- **焦点可见态**（全站一条）：`*:focus-visible { outline:none; box-shadow:0 0 0 2px var(--ring); }`，深色 `ring-offset-[#0A0A0B]` / 浅色 `ring-offset-white`。`--ring=#0F766E` 两套均 ≥3:1（浅 5.47 / 深 3.42）。
- **触控目标**：所有可点 ≥44×44（WCAG 2.5.5 / HIG），沿用 v1 §7.2 的扩区手法。
- **ARIA**：`<nav aria-label="主导航">` + `aria-current="page"`（**不采用 `role=tablist`**，理由同 v1 §9 建议 2）；表单 `label htmlFor` + 唯一 `id`；图标按钮 `aria-label`；状态按钮 `aria-pressed`/`role=switch aria-checked`；Canvas `role="img"` + 动态 `aria-label`；提示条 `role=status/alert` + `aria-live`；加载 `aria-busy` + `sr-only role=status`；模态 `role=dialog aria-modal` + 焦点陷阱 + `Esc`；表格 `<th scope=col>`；装饰 SVG `aria-hidden`。
- **颜色非唯一载体**（双通道）：成功/失败 = 图标+文字；表单错误 = 图标+文案+`aria-invalid`+`aria-describedby`；必填 = `*`+`aria-required`；开关 = `role=switch aria-checked`；选中 = ring+勾选态；类型标签 = 文字「打印/PDF」；危险 = 二次确认+图标+「删除后无法恢复」文案。
- **双主题对比度自查清单**（交付前逐项过）：
  ```
  [ ] 深色：所有 ≤23px 文字 ≥4.5:1（fg #EDEDED 18:1 / muted #A1A1AA 7.3:1 达标；禁用 #71717A 作小字）
  [ ] 浅色：所有 ≤23px 文字 ≥4.5:1（fg #0F172A / muted #64748B 4.76:1 达标）
  [ ] 主按钮白字 ≥4.5:1（#0F766E 5.47:1，两套一致）
  [ ] 危险按钮白字 ≥4.5:1（#B91C1C 6.47:1）
  [ ] 焦点环 / 控件边框 / 选中环 / 开关轨道 ≥3:1（--ring #0F766E 深 3.42 / --input #6B7280 深 3.87 / teal 环 深 10:1）
  [ ] 占位符 ≥4.5:1
  [ ] 语义色文字在其底色 ≥4.5:1（深 6.8~11.2:1 / 浅 7~7.4:1）
  [ ] 标签 chips 文字 ≥4.5:1（深 7.3~10:1 / 浅 6.7~9.4:1）
  [ ] 禁用态不参与 AA，但不承载唯一信息
  [ ] Lighthouse Accessibility ≥ 95（双主题各测一次）
  ```

---

## 9. 主题切换实现指引（给前端的硬要求）

1. **令牌定义（`src/index.css`）**：在 `@layer base` 内定义 `:root { --background:#FFFFFF; ... }` 与 `.dark { --background:#0A0A0B; ... }`，把 §2 全量表搬入。组件类（`.btn-primary`、`.card-bento`、`.input-field` 等）的硬编码色改为 `var(--token)`。保留现有 `@media (prefers-reduced-motion)` 与 scrollbar 样式；深色下把 scrollbar-thumb 从 `#99F6E4` 改为 `#52525B`（深底更协调且可见）。
2. **默认深色 + 防闪烁**：`index.html` 的 `<html>` 直接写 `class="dark"` 作为默认；并在 `<head>` 顶部加一段**同步内联脚本**，在首屏绘制前读 `localStorage.getItem('envo-theme')`，无值则保持 `dark`，有值则 `document.documentElement.classList.toggle('dark', theme==='dark')`。这样避免主题闪烁（FOUC）。
3. **切换控件（设置页）**：用分段控件 / 开关，点击即 `document.documentElement.classList.toggle('dark')` 并 `localStorage.setItem('envo-theme', isDark?'dark':'light')`。存储 key 建议 `envo-theme`。
4. **`color-scheme`**：`:root{color-scheme:light} .dark{color-scheme:dark}`，让原生表单控件、滚动条、字数提示跟随主题。
5. **★ Canvas 打印不受影响的保证（必须守住）**：
   - 信封打印走 `EnvelopeEditor.tsx:170-216` 的 `window.open('','_blank')` + `pw.document.write(...)`，**该文档是独立 HTML，自带 `<style>`（html/body 精确 mm + `print-color-adjust:exact`），不引用任何应用 CSS、不挂 `.dark` 类、不含任何主题变量**。
   - `src/utils/envelopeCanvas.ts` 用**写死的墨色**（黑/teal）绘制，不读 `--foreground` 等令牌。
   - **前端切勿**给打印窗口注入主题样式，或在 `envelopeCanvas.ts` 里引入 CSS 变量——否则白信封会变成深色信封。此条为验收红线。
6. **不改构建配置**：无需改 `tailwind.config.js` 断点；`brand` 色板可保留（仍用于令牌映射），`cta` 橙色建议从使用处移除（配置里留不留均可，但不要再用于新样式）。

---

## 10. 已知风险与缓解

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R1 | **深色 teal 按钮白字达标**：亮 teal(`#2DD4BF`)作底白字仅 1.86:1 | 若前端随手用亮 teal 当按钮底，严重不合格 | 主按钮底**锁定 `#0F766E`**，规范 §2.3 明文禁止亮 teal 作底；Code Review 卡这一条 |
| R2 | **浅色回退风险**：双主题两套值，浅色若被忽略会退化 | 切到浅色后出现混色/低对比 | 浅色值全部沿用 v1 已验证结论（§2），QA 双主题各跑一遍 §8 清单 |
| R3 | **双主题 QA 工作量翻倍** | 上线前对比度/布局需各验一次 | 把 §8 清单做成 PR 勾选模板；Lighthouse 双主题各测 |
| R4 | **图标内联维护成本** | 16 个 SVG 手写，后续增改需人工 | 集中放 `src/components/icons.tsx`，统一样式约束（§4）；不引依赖换可维护性 |
| R5 | **边框 3:1 的物理矛盾** | 真·发丝边在深底不可能 ≥3:1 | 区分"装饰边 `#27272A`（豁免）"与"控件边 `#6B7280`（达标）"，§2.4 已厘清口径，审计按此解释 |
| R6 | **橙色 cta 退役的视觉落差** | "新增地址"等强动作失去第二色 | 改用 teal 主按钮 / 描边次级，靠字重填充拉层级；若用户坚持可保留橙色（决策见 §11） |
| R7 | **`--accent-foreground` 双主题异值被误"修正"** | QA 把深色的 `#2DD4BF` 改成 `#0F766E` 反而变差 | §2.3 / §11 明确"按主题解析是正确行为"，并说明浅色必须用深 teal |

---

## 11. 前端最容易做走样的点

1. **令牌没全量替换 → 深浅混色**：v1 大量硬编码 `bg-white` / `text-brand-700` / `border-slate-200` 若只改了一半，深色模式下会冒出白块、浅色文字看不见。必须整站走 `var(--token)`，旧 `brand-*`/`slate-*` 字面色逐处替换。
2. **深色边框对比度没达 3:1**：把控件静止边框也写成 `#27272A`（装饰边值），导致输入框/开关边界在深底仅 1.26:1。控件边必须用 `#6B7280`（§2.4）。
3. **teal 在深浅两套下取值"不一致"被误改**：深色用 `#2DD4BF`、浅色用 `#0F766E` 是**有意的按主题解析**（§2.3），不是漂移。别把深色的点缀 teal 强行改成深 teal（会失去"跳出来"效果），也别把浅色文字 teal 用成亮 teal（白底仅 1.86:1）。
4. **图标仍残留 emoji / 引入 lucide-react**：`✉📖🖨⚙` 必须替换为内联 SVG（§4）；严禁为省事 `npm i lucide-react`（增重主包，违反"零新依赖"）。
5. **主按钮误用亮 teal 底**：`bg-[#2DD4BF] text-white` 白字仅 1.86:1。主按钮底只能是 `#0F766E`。
6. **页脚/空状态次文案在深底用了 `#71717A`**：深底仅 3.87:1，不达标。深色下这类"更浅一级"的文字必须回到 `#A1A1AA`。
7. **给 Canvas 注入主题或改 envelopeCanvas 墨色**：直接破坏"打印产物不受影响"红线（§9.5）。

---

## 12. 交付小结

### 这套规范的关键取舍
- **深色为默认、浅色为可切换回退**，共用 shadcn 式语义令牌；层级靠发丝边 + 背景抬升，不用投影。
- **teal 单一强调**，橙色 cta 退役；白字按钮底锁定 `#0F766E`，亮 teal `#2DD4BF` 只用于深底上的文字/图标/点缀（按主题解析，非漂移）。
- **图标全内联 lucide 风格 SVG**，零新依赖；emoji 全清。
- **打印产物与 UI 主题彻底解耦**（独立 `window.open` 窗口 + 写死墨色），列为验收红线。

### 前端最容易做走样的 3 个点
1. 令牌没全量替换导致深浅混色（旧 `bg-white`/`brand-*` 字面色残留）。
2. 深色控件边框写成 `#27272A`（仅 1.26:1），必须用 `#6B7280`。
3. 主按钮误用亮 teal `#2DD4BF` 作底（白字 1.86:1），或把"深亮 teal 异值"误改成一致。

### 需要用户拍板的 1–2 个决策
1. **橙色 cta 是否彻底退役？** 本规范默认退役（改 teal 主/描边，符合"单一强调色"）。若运营/品牌坚持保留橙色作"新增地址"等强动作，需回退此决定并补一套橙色令牌（深 `#EA580C` 白字 3.56:1 不合格 → 需深到 `#C2410C` 5.18:1）。
2. **默认主题确认**：本规范默认深色。若希望首次访问跟随系统（`prefers-color-scheme`）而非强制深色，需在 §9 的初始化脚本里加系统偏好判断（无 localStorage 时读 `matchMedia`）。请确认"强制深色"还是"跟随系统"。
