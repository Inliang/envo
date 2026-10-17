# Envo v1.0.1 · 交付清单与养护说明

> 交付日期：2026-10-17
> 上线 commit：`d7361fb`（master 分支）
> 本次交付主题：**补全上线套件，不做功能扩张**

---

## 一、五项交付物

| # | 交付物 | 位置 / 地址 |
|---|---|---|
| 1 | **可访问的站** | https://inliang.github.io/envo/ |
| 2 | **代码仓** | https://github.com/Inliang/envo |
| 3 | **部署配置** | `.github/workflows/deploy.yml`（push master 自动触发，Node 22 + `npm ci` + `vite build` + `actions/deploy-pages`） |
| 4 | **上线检查表** | `docs/prelaunch-checklist.md`（49 项逐条判定） |
| 5 | **养护与更新说明** | 本文档 |

配套文档（供后续维护查阅）：

- `docs/site-spec.md` — 站点规格卡 v1.4（信息架构、接口契约、静态资源契约、B1–B8 清单）
- `docs/content-plan.md` — 内容策划书（TDK、关键词地图、JSON-LD、微文案 41 条）
- `docs/design-spec.md` — 设计规范（色板映射表、字体阶梯、响应式断点、组件样式）
- `docs/assets/favicon.svg` / `og-image.svg` — 图片母版（改图先改母版，勿直接改 PNG）

---

## 二、本次 v1.0.1 改了什么

### 上线套件
- favicon 全套 7 个（ico 含 16/32/48 三帧、svg、16×16、32×32、180 apple-touch、192、512）
- OG 图 1200×630 PNG（253 KB）+ OG/Twitter 全套 meta
- `sitemap.xml`（1 条 URL）、`robots.txt`、`site.webmanifest`
- JSON-LD `WebApplication`（16 键，无编造评分 / 作者）
- 完整 `<head>`：TDK / canonical / OG / Twitter Card / theme-color / `<noscript>` 兜底

### 字体本地化
- 移除 Google Fonts 的 3 个外链（2 preconnect + 1 stylesheet）
- **Canvas 字体栈独立于 UI 栈**：`ctx.font` 走 CSS font shorthand 严格解析，UI 栈里的 `-apple-system`/`BlinkMacSystemFont` 塞进去会被整条判为无效并静默忽略 → 信封回落到 10px 默认字体 → **预览正常但打印整批报废、控制台零报错**
- 已加「赋值后读回校验」，不一致则 `console.warn`

### 数据保护（最高优先级）
- `persist` 补 `migrate`（v1→v2）：保留 addresses / printHistory / settings / currentEnvelope，settings 深合并，失败回退默认值不抛错
- `partialize` 排除 `currentRecipient`（防误印旧地址）
- 老数据里的 `'Inter, sans-serif'` 全部替换为新字体栈

### 缺陷修复
- **R2**：导入 JSON 时对已加密的 amapKey 二次加密 → 导入后 Key 乱码、联想静默失效
- **R5**：用 11 位 `towncode` 冒充邮编 → 改为联想留空、邮编手填
  - 附带收益：联想不再触发第二次 API，**配额消耗减半**
  - 配套 **B6-B**：手填邮编可存入地址簿（否则 B6 会让邮编每次都要重填）

### 体验与无障碍
- 41 条微文案订正（必改 25 条），含 5 处「邮编自动补全」虚假承诺清理
- 次要文字对比度 `brand-400`（1.9:1）→ `brand-700`（5.0:1）达 WCAG AA
- 主/强调按钮加深一档（白字 cta-500 上原仅 2.80:1）
- 移动端响应式：四个 Tab 顶部等分 4 格，375px 实测零横向滚动
- 无障碍：`<nav aria-label="主导航">` + `aria-current="page"`（明确不做半套 `role="tablist"`）、触摸目标 44×44、移动端 input ≥16px 防 iOS 缩放、焦点可见态
- 新增内联二次确认组件，打印历史与地址簿两处共用

---

## 三、上线后验证结果（实测，非推断）

| 检查项 | 结果 |
|---|---|
| `/sitemap.xml` | 404 → **200**（`application/xml`） |
| `/og-image.png` | 404 → **200**（`image/png`，259,483 B，与本地 md5 一致） |
| `/favicon.ico`、`/site.webmanifest`、`/robots.txt` | 404 → **200** |
| 线上 `<head>` | title/description/canonical/og:image:type 全部在位 |
| Google Fonts 残留 | **0 处**（线上 v1.0.0 原有 3 条外链，已消失） |
| 资源引用前缀 | 全部 `/envo/` 绝对路径 |
| 首屏第三方请求 | **0 个**（高德 API 只在用户真正输入时才发起） |
| 首页 Last-Modified | 2026-10-17（本次部署） |

**构建**：`npm run build` exit 0，19.75s，353 modules。

---

## 四、已知风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| **GitHub Pages 在中国大陆访问长期不稳定** | 🔴 | 实测本次从本环境访问 0.77s（经 japaneast 节点），**该数字不代表国内用户**。好消息是首屏第三方请求已降到 0，不会因第三方被墙而白屏。彻底解决需平台迁移，列 v1.1 |
| **主包 1.08 MB（gzip 355 KB）未改善，反增 1.6%** | 🟡 | 不粉饰。本次重心是内容与无障碍，体积上的实际收益只有移除 Google Fonts 省下的 3 个跨域请求。jsPDF/xlsx 分包列 v1.1 |
| **`robots.txt` 位于子路径，按 RFC 9309 爬虫不读** | 🟢 | 本策略为全 Allow，不存在即等于全允许，**实际影响为 0**。但**不要对外宣称「已配置 robots.txt」**。文件保留是为了迁到根路径时复用 |
| 自定义尺寸 PDF 恒为 220×110mm（R4） | 🟡 | 列 v1.1，本次未修 |
| 导入 JSON 无结构校验 | 🟡 | 列 v1.1 加白名单校验 |
| `xlsx@0.18.5` 已知 CVE | 🟢 | 纯本地处理、不接收外部文件，实际风险低；换 CDN 源会动 lockfile，本次不升级 |

---

## 五、养护与更新说明

### ⚠️ 缓存陷阱（最容易踩的一个）

`public/` 下的文件**不带 content hash**，GitHub Pages 也**不提供手动 purge**。

**改了 `public/` 里的任何文件内容后，必须改文件名**（如 `og-image-v2.png`），并同步改 `index.html` 里的引用。只覆盖同名文件 → 用户浏览器会继续用旧的。

`assets/*` 带 hash，自动失效，无需操作。

### 更新 OG 图 / 图标的标准流程

1. 改母版 `docs/assets/og-image.svg`（或 `favicon.svg`），**不要直接改 PNG**
2. 母版改注释时**禁止用连续两个 ASCII 连字符 `---`**（违反 XML 规范会让整个文件渲染成报错页）——用 `=` 或 `─`(U+2500)
3. 用无头 Chrome 渲染成 PNG，**必须在装有中文字体的机器上渲染并逐字目视检查**（否则中文变豆腐块）
4. 如需强制刷新，改用新文件名并同步 `index.html`

### 日常更新

```bash
npm run dev      # 本地开发
npm run build    # 构建（含 tsc -b 类型检查）
npm run preview  # 预览构建结果
```

推 master 即自动部署，**无需手动操作 Actions**。也可在 Actions 页面手动 Run workflow。

生效时间：Actions 全绿后通常 1–3 分钟，最长 10 分钟。

### 回滚

- **推荐**：`git revert` 上线 commit 后重新推送，1–2 分钟生效
- 或：Actions 里 Re-run 历史成功运行
- 或：Pages Source 改 None 紧急下线
- ✅ **用户 localStorage 里的地址簿 / 打印历史 / Key 不受回滚影响**

### 收录操作（需你本人完成）

在 Google Search Console 手动提交：
```
https://inliang.github.io/envo/sitemap.xml
```
`robots.txt` 里的 Sitemap 指向在子路径下不生效，GSC 手动提交是唯一有效途径。

### 改 localStorage 数据结构时（⚠️ 最危险的操作）

本项目数据全在用户浏览器本地，改错了不可恢复。改持久化结构时：

1. 先改 `src/store/index.ts` 的 `version`（+1）
2. 同步补 `migrate`，保证老数据能迁过来
3. 用真实老数据实测，不能只看代码

---

## 六、v1.1 待办清单

按建议优先级排序：

1. **主包分包**：jsPDF / xlsx 改动态 import（当前主包 1.08 MB，gzip 355 KB）
2. **R4**：PDF 导出补自定义尺寸处理
3. **邮编补全按钮**：显式按钮触发，用户点了才调 regeo，拿不到就留空（永不回落 towncode）
4. **导入结构校验白名单**：防脏备份直接 setState
5. **首屏加载骨架屏**
6. **视图级 URL 索引**：需先引入 router + 预渲染，否则四个 Tab 共用一个 URL 无法分别收录
7. **平台迁移**：解决国内访问不稳定
8. **Lighthouse 实测**：本次未跑（线上当时还是 v1.0.0，测了不代表 v1.0.1）
9. 输入框边框 `slate-400`（2.56:1）从严审计时改 `slate-500`
10. 移动端一次性提示条（content-plan #41）
11. 其余 `alert`/`confirm` 内联化（含设置页导入结果与清空历史）
