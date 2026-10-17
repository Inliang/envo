# Envo v1.0.1 上线前检查清单

> 检查人：郝收录（部署与 SEO 工程师）｜任务 ID：T5-DEPLOY
> 检查时间：2026-10-17 18:07–18:20（本地时区）
> 检查对象：`E:\GitHub\envo` @ master ｜ 目标 URL：**https://inliang.github.io/envo/**
> 判定口径：**每一项必须有可验证依据**（实际 grep 到了什么、文件是否存在、URL 实际返回什么）。没有「基本没问题」。

**检查环境**：Node v22.22.2 / npm 10.9.7 / Windows / 本机安装的 Google Chrome（`--headless=new`，版本号未取到，故不写）
**本次我执行的操作**：`npm run build`（1 次，允许项）、只读检查 `dist/` `public/`、本地 `vite preview` + 无头 Chrome 冒烟、对线上 URL 只读探测。
**本次我没有执行的操作**：`git commit` / `git push`、`deploy.yml` 修改、`vite.config.ts` 修改、`src/` 修改、任何前端产出文件修改。

---

## 0. 结论速览

| 组 | 项数 | PASS | FAIL | 已知限制/待裁决 |
|---|---|---|---|---|
| A 部署链路 | 11 | 10 | 0 | 1（A10 需用户肉眼确认） |
| B 静态产物 | 18 | 17 | 0 | 1（B7 `og:image:type` 契约内不含，清单要求有冲突，待裁决） |
| C SEO 与收录 | 10 | 8 | 0 | 2（C3 robots 子路径、C8 国内可访问性，均为如实记录的限制） |
| D 构建 | 5 | 5 | 0 | 0 |
| E 性能 | 5 | 5 | 0 | 0 |
| **合计** | **49** | **45** | **0** | **4** |

**代码侧零 FAIL。** 4 项未决中，2 项是已知且已如实的工程限制，1 项是契约与清单要求冲突（非缺陷），1 项是必须由用户在 GitHub 网页端完成的一次性确认。

---

## A. 部署链路

### A1 触发条件 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `.github/workflows/deploy.yml` L3–6 | `on: push: branches: [master]` + `workflow_dispatch:` |

- 推 master 触发 ✓；支持手动触发 ✓（上线后若 Actions 抽风，可在 Actions 页手动 Run workflow，不必再造一次空提交）
- **不通过的后果**：触发条件写错则推送后 Actions 完全不跑，页面静默停留在旧版，最难排查的一类故障。

### A2 权限块 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L8–11 | `contents: read` / `pages: write` / `id-token: write` 三行齐全 |

- `pages: write` 与 `id-token: write` 缺任一 → `actions/deploy-pages` 直接 403。

### A3 concurrency —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L13–15 | `group: "pages"` + `cancel-in-progress: false` |

- 部署类 job 必须 `cancel-in-progress: false`（取消进行中的 Pages 部署会留下半部署状态）。这里是对的。

### A4 Node 版本 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L28–31 + 本地 `node -v` | 工作流 `node-version: 22`；本地实测 **v22.22.2**，同为 22.x |

- 版本漂移会导致本地能过、CI 挂掉。此处一致。

### A5 依赖安装命令与 lockfile 同步 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 隔离目录实测 | 把 `package.json` + `package-lock.json` 单独拷到空目录，执行 `npm ci --dry-run` → **exit 0，added 219 packages** |

- 这是本次最该查的一项：`npm ci` 遇到 lockfile 与 package.json 不同步会直接失败，**且不产生任何构建产物**，Actions 会在第一步就红掉。
- 实测 exit 0 → 依赖树完全同步，**CI 不会在 `npm ci` 挂掉**。
- **附带发现（不影响 CI，记录备查）**：`package-lock.json` 根 `"version": "1.0.0"`，`package.json` 为 `"version": "1.0.1"`。实测 `npm ci` 不校验根 version 字段（exit 0 已证明）。副作用仅在于：日后谁跑一次 `npm install`，lock 里的根 version 会被回写成 1.0.1 并产生一次无关 diff。**不建议为此动 lockfile。**

### A6 构建命令 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L37 + 本地实测 `npm run build` | 命令为 `npm run build`，即 `tsc -b && vite build`；本地实测 **exit 0** |

- `tsc -b` 会做类型检查，本地过了就说明 CI 里也能过（同一 Node 22 + 同一 lockfile）。

### A7 产物路径 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L43–45 + `.gitignore` L2 | 上传 `path: './dist'`；`.gitignore` 第 2 行已忽略 `dist` |

- 两点都对：CI 从源码现构建，不依赖开发者本地 `dist/`；本地 `dist/` 也不会被误提交污染仓库。

### A8 Actions 版本 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L24–49 | `checkout@v4`、`setup-node@v4`、`configure-pages@v5`、`upload-pages-artifact@v3`、`deploy-pages@v4` |

- 全部是当前推荐大版本。老版本（尤其 `deploy-pages@v1`）会因 Node 16 运行时被 GitHub 强制失败。

### A9 environment 与 URL 输出 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `deploy.yml` L20–22、L47–48 | `environment: name: github-pages` + `url: ${{ steps.deployment.outputs.page_url }}`，且 job id `deployment` 与 L48 的 `id: deployment` 对得上 |

### A10 GitHub Pages Source = "GitHub Actions" —— **PASS（高置信，但必须由用户肉眼确认一次）**

**为什么我不能直接判定**：仓库未授权 API，`GET /repos/Inliang/envo/pages` 匿名返回 **404 Not Found**，我读不到配置本身。

**三条实证（这是我给出高置信判定的依据）**：

1. 远端分支只有 `master`（`GET /repos/Inliang/envo/branches` 只返回 master），**不存在 `gh-pages` 分支** → 排除「从分支部署」。
2. `https://inliang.github.io/envo/` 实际返回 **HTTP 200**，且内容是**构建产物**而非源码：响应体里是 `<script type="module" crossorigin src="/envo/assets/index-BkknIOW0.js">`，**没有** `/src/main.tsx`。若为「从 master 根部署」，看到的应该是未构建的源 `index.html`。
3. 响应头 `Server: GitHub.com`、`Last-Modified: Sat, 01 Aug 2026 03:07:10 GMT`、`Cache-Control: max-age=600` ——站点**确实存在且已在服务**，只是内容还是 2026-08-01 那次的 v1.0.0。

- **不通过的后果**：若 Source 停在「Deploy from a branch」，推 master 后 Actions 全绿但页面**纹丝不动**，且不会有任何报错——这是本次上线最阴的一种失败。
- **必须由用户做**：打开 `https://github.com/Inliang/envo/settings/pages` → **Build and deployment → Source**，确认下拉选中的是 **GitHub Actions**（不是 Deploy from a branch）。若不是，改选后 Save。
- 只有用户账号有权限，我无法代做。

### A11 `base: '/envo/'` 与产物引用路径一致 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `vite.config.ts` L5 + grep `dist/index.html` | `base: '/envo/'`；`dist/index.html` 中 8 处引用**全部**以 `/envo/` 开头，且 `/src/main.tsx` 残留计数 = **0** |

实测 grep 出的 8 条引用：

```
href="/envo/favicon.ico"
href="/envo/favicon-16x16.png"
href="/envo/favicon-32x32.png"
href="/envo/favicon.svg"
href="/envo/apple-touch-icon.png"
href="/envo/site.webmanifest"
href="/envo/assets/index-COuMzPEq.css"
src="/envo/assets/index-4rZJl5bE.js"
```

- 全部绝对路径，无 `./` 相对引用（子路径部署下 `./` 会在深层 URL 崩掉，本项目无路由暂不受影响，但这里是干净的）。

---

## B. 静态产物

### B1 `public/` 11 个契约文件齐全 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| `ls public/` + 逐字节核对 | 11/11 存在，与 `site-spec.md` §5.4 契约表逐行对得上 |

契约表（`site-spec.md` L607–619）共 11 项（不含已作废的字体项），`public/` 实际 11 项，**零缺失、零多余命名**（无 `android-chrome-*`）。

### B2 `dist/` 11 个契约文件齐全且与 `public/` 逐字节一致 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 我执行了一次 `npm run build` 后对 11 个文件做 md5 双向比对 | **11/11 md5 完全相同** |

| 文件 | md5 |
|---|---|
| apple-touch-icon.png | `afef6a309a9e1626eb06094b66e4b09f` |
| favicon-16x16.png | `b66487772b6826480ecc8c8d396e1fb5` |
| favicon-32x32.png | `923a0a090496077306799acb6e3bc04e` |
| favicon.ico | `95ed51bc928b4ca7ec9f7b0fa5839f80` |
| favicon.svg | `fab43b8c08ec2d1a7f8e787ad9767066` |
| icon-192.png | `9799959b5d91fa0eddfa653b3aee39d8` |
| icon-512.png | `4cf0d5823f951a6035d5c9f5aff6c7cf` |
| og-image.png | `8a8aa6fae1d5ba2970cccb6a2ed3be5f` |
| robots.txt | `ec7098fec67929747a90658d1345e404` |
| site.webmanifest | `897b3772543e08bbf84c7762a237cd10` |
| sitemap.xml | `0e3c7646c4fa9d17953e0f639a498332` |

> 我开工时 `dist/og-image.png` 是 17:37 的生成物、`public/og-image.png` 是 18:05 的更新版本（**dist 当时落后于 public**）。我重建后两者 md5 已一致。这提醒一件事：**上线前最后一次构建必须发生在 public/ 资产定稿之后**，否则会把旧图推上去。

### B3–B6 TDK 与 canonical —— **全部 PASS**

| 项 | 检查方法 | 依据 | 判定 |
|---|---|---|---|
| B3 `<title>` | 逐字比对 `content-plan.md` §2.1 与 `dist/index.html` | 两侧字符串完全一致：`信封打印助手 Envo - 在线排版信封，支持 DL/C5/C4 与 PDF 导出` | PASS |
| B4 `description` | 同上 | 逐字一致（89 字符） | PASS |
| B5 `keywords` | 同上 | 逐字一致 | PASS |
| B6 `canonical` | grep `dist/index.html` + 线上实测 | `rel="canonical" href="https://inliang.github.io/envo/"` —— 绝对 URL 且**带尾斜杠**；线上实测 `https://inliang.github.io/envo`（无尾斜杠）→ **HTTP 200 落在 `/envo/`**，证明 canonical 形态与服务器实际行为一致 | PASS |

- **不通过的后果**：canonical 写成 `/envo`（无尾斜杠）会与服务器 301 行为打架；写成相对路径则完全失效。
- 备注：`keywords` 在 `content-plan.md` §2.3 中被标为「本次不加」的契约外可选项，实际按该节给出的可选版加入了。无害（Google 忽略，对百度有微弱正收益），**不是缺陷**。

### B7 Open Graph 全套 —— **PASS**（1 项契约内不含，待裁决）

| 字段 | 是否在 `dist/index.html` | 判定 |
|---|---|---|
| `og:type` | 有（`website`） | PASS |
| `og:site_name` | 有（`Envo 信封打印助手`） | PASS |
| `og:locale` | 有（`zh_CN`） | PASS |
| `og:url` | 有，与 canonical 逐字一致、带尾斜杠 | PASS |
| `og:title` | 有，与 `<title>` 逐字一致 | PASS |
| `og:description` | 有，与 `description` 逐字一致 | PASS |
| `og:image` | 有，**绝对 URL** `https://inliang.github.io/envo/og-image.png` | PASS |
| `og:image:width` | 有（1200） | PASS |
| `og:image:height` | 有（630） | PASS |
| `og:image:alt` | 有（`Envo 信封打印助手预览图`） | PASS |
| **`og:image:type`** | **无** | **见下方裁决说明** |

**关于 `og:image:type` 的裁决说明（请团队-lead 拍板）**

- 任务清单把 `og:image:type` 列为必查项，但 **`content-plan.md` §3.2 L226 明确写了不写**：「未写 `og:image:type`：T1 契约未包含，且 `width`/`height` 已足够；PNG 是唯一格式不会歧义」。
- 我按契约判定为 **PASS（契约内不含）**，不是漏做。
- 客观影响：`og:image:type` 缺失时，主流平台（微信 / 微博 / X / Facebook）都能靠 URL 后缀与 width/height 正常出图，**不会导致卡片降级**。它属于「有则更好」而非「缺则坏」。
- **我的建议**：本次不动。理由：改它要动 `index.html`，而 `index.html` 已按契约冻结；且本次是上线窗口，为一个无实际收益的字段开一次前端改动不划算。**若要补，列 v1.1**，改动是加一行 `<meta property="og:image:type" content="image/png" />`。

### B8 Twitter Card —— **PASS**

| 字段 | 是否在 `dist/index.html` | 判定 |
|---|---|---|
| `twitter:card` | 有（`summary_large_image`） | PASS |
| `twitter:title` | 有，与 `og:title` 逐字一致 | PASS |
| `twitter:description` | 有，逐字取自 `content-plan.md` §3.1 缩短版 | PASS |
| `twitter:image` | 有，绝对 URL | PASS |
| `twitter:site` | 无 | PASS（契约 §3.2 L227：不知 X 账号就不写，**写错比不写更糟**） |
| `twitter:image:alt` | 无 | PASS（非必需，卡片不使用该字段） |

- `summary_large_image` 配 1200×630 → 能出大图卡片。配错成 `summary` 则缩成小方图，本次正确。

### B9 `theme_color` 一致性 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| grep `dist/index.html` 与 `dist/site.webmanifest` | 两侧均为 `#0D9488`，逐字一致 |

### B10 JSON-LD 结构化数据 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| Python `json.loads()` 实际解析 `dist/index.html` 内嵌脚本 | **解析成功**，@type = `WebApplication` |

解析出的 16 个键：`@context, @type, name, alternateName, url, description, applicationCategory, applicationSubCategory, operatingSystem, browserRequirements, inLanguage, softwareVersion, isAccessibleForFree, featureList, offers, screenshot`

| 子项 | 实测结果 | 判定 |
|---|---|---|
| 可解析性 | `json.loads()` 通过 | PASS |
| `aggregateRating` | **False（不存在）** | PASS |
| `review` | **False** | PASS |
| `author` | **False** | PASS |
| `featureList` 条数 | **11 条** | PASS |
| 违禁词「邮编自动补全 / 自动补全邮编」 | **0 处** | PASS |
| B6/C6 标注为国际规格 | 有「国际信封规格」字样 | PASS |
| `softwareVersion` | `1.0.1`，与 `package.json` 一致 | PASS |

- 全文件级违禁词扫描（不是只扫 JSON-LD）：`grep -c "自动补全邮编\|邮编自动补全" dist/index.html` = **0**。
- **不通过的后果**：`aggregateRating` 无真实数据却写上，是 Google 结构化数据**人工处罚**的典型触发项，属于会把整个站拖下水的高危动作。这里三处全是 False，干净。

### B11 favicon 与 manifest 引用 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| grep `dist/index.html` | 7 条引用全部 `/envo/` 绝对路径（ico / 16 / 32 / svg / apple-touch / manifest / css） |

- 子路径部署下若用 `./favicon.ico`，在非根 URL 会 404。这里全部绝对，安全。

### B12 `<noscript>` 兜底正文 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| grep `dist/index.html` L85–89 | 含 1 个 `<h1>` + 2 段 `<p>` + 1 条仓库外链，文案逐字取自 `content-plan.md` §2.4 |

- 这是 SPA 唯一能被爬虫抓到的静态正文，缺了百度几乎抓不到内容。在，且文案与契约一致。

### B13 Google Fonts 残留 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 全库 grep `fonts.googleapis.com\|fonts.gstatic.com` | **`dist/` 0 处、`src/` 0 处、`index.html` 0 处** |

- 另查 `src/index.css` 内 `@font-face` / `@import` = **0 条**（本次决策 A 为不自托管字体，用系统字体栈，符合契约）。
- **对照线上现状**：当前线上 v1.0.0 页面里还挂着 3 条 Google Fonts 外链（`<link href="https://fonts.googleapis.com/css2?family=Inter...">`）。**本次 v1.0.1 推送后这些会消失** —— 这是国内访问体验改善最大的一项（少一次可能被墙的跨域请求）。

### B14 `sitemap.xml` —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `dist/sitemap.xml`（274 B，与 `public/` md5 一致） | 只有 **1 条 `<url>`**，`<loc>` = `https://inliang.github.io/envo/`（绝对 + 带尾斜杠），`lastmod` = `2026-10-17`（= 今日，正确） |

### B15 `robots.txt` —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `dist/robots.txt`（312 B） | `User-agent: *` / `Allow: /` / `Sitemap: https://inliang.github.io/envo/sitemap.xml` 三行齐全 |

### B16 `og-image.png` 尺寸与体积 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 解析 PNG 头部 IHDR | **1200 × 630** px（1.91:1），**259,483 B = 253 KB** |

- 契约要求 < 300 KB → 达标，留 47 KB 余量。
- 格式 PNG（OG 不支持 SVG）→ 达标。

### B17 图标尺寸与体积 —— **PASS**

| 文件 | 实测尺寸 | 实测体积 | 契约要求 | 判定 |
|---|---|---|---|---|
| `apple-touch-icon.png` | 180 × 180 | 2,329 B | 180×180 | PASS |
| `icon-192.png` | 192 × 192 | 3,953 B | 192×192 | PASS |
| `icon-512.png` | 512 × 512 | 11,506 B | 512×512 | PASS |
| `favicon-32x32.png` | 32 × 32 | 753 B | 32×32 | PASS |
| `favicon-16x16.png` | 16 × 16 | 348 B | 16×16 | PASS |
| `favicon.svg` | 矢量 | 5,309 B | viewBox 0 0 32 32 | PASS |
| `favicon.ico` | — | 2,243 B | 内含 16/32/48 | PASS |

- 7 个图标合计 **26,491 B ≈ 25.9 KB**，对首屏影响可忽略。

### B18 `site.webmanifest` —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 读 `dist/site.webmanifest` | `start_url` 与 `scope` 均为 `/envo/`（带尾斜杠）；`icons` 5 项全部 `/envo/` 绝对路径；命名严格用契约清单，**无 `android-chrome-*`**；`theme_color` = `#0D9488` 与 B9 一致 |

---

## C. SEO 与收录

### C1 TDK 与产物一致性 —— **PASS**
见 B3–B6，title / description / keywords / canonical 逐字一致，无第二套文案。

### C2 JSON-LD 语法可解析性 —— **PASS**
见 B10，`json.loads()` 实测通过。

### C3 `robots.txt` 位于子路径 —— **已知限制（如实记录，非阻塞）**

| 检查方法 | 依据 |
|---|---|
| RFC 9309 规定 + 实测线上 | `robots.txt` 规范位置是**主机根** `https://inliang.github.io/robots.txt`；我们的文件在 `https://inliang.github.io/envo/robots.txt`，**爬虫不会去读它** |

实测主机根：`https://inliang.github.io/robots.txt` 返回 GitHub Pages 的「Site not found」页（该用户无根站点），**即主机根不存在 robots.txt**。

- **实际影响 = 0**：本策略是 `User-agent: * / Allow: /`（全允许），爬虫不去读子路径 robots.txt 的结果就是「视为全部允许」，与文件内容等价。文件本身也已在文件头注释里写明这一点。
- **为什么还留着**：迁移到自定义域名 / 根路径部署时可原样复用，省一次返工。
- **不粉饰的点**：这个文件对本次上线**没有 SEO 作用**，不要对外宣称「已配置 robots.txt」。

### C4 sitemap 需在 Google Search Console 手动提交 —— **记录（上线后动作，非阻塞）**

- 提交地址：`https://inliang.github.io/envo/sitemap.xml`（与站点同主机，符合 sitemap 协议）
- 因为 C3 的 robots.txt 不会被读到，`Sitemap:` 那一行不会自动生效，**只能靠 GSC 手动提交 + 站点被收录后 GSC 自动发现**。
- 列入第 2 节「上线后验证步骤」。

### C5 hreflang —— **PASS（不加）**

| 检查方法 | 依据 |
|---|---|
| 读 `content-plan.md` §4.2 | 站点只有 `zh-CN` 一种语言，无对照页，加 hreflang 会被 Google 忽略且徒增 head 体积 |

- 实测 `dist/index.html` 中无 hreflang 标记 → 与契约一致。
- 触发条件已写成规则（出现独立 `/en/` URL 时），不本次做。

### C6 H1 唯一性 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 无头 Chrome 实际渲染后 dump DOM，统计 `<h1>` | 序列化 DOM 中 **2 个 `<h1>`**，但**其中 1 个位于 `<noscript>` 内** |

实测 dump：

```
#root 内:  <h1 class="text-lg ...">Envo 信封打印助手</h1>     ← 真实渲染
<noscript> <h1>Envo 信封打印助手</h1>                         ← JS 启用时不渲染
```

- **有效 H1 = 1**（noscript 内容仅在禁用 JS 时参与渲染，两者互斥，不会同时出现在渲染树里）。
- 且两处文案一致，`<noscript>` 的 H1 正是给爬虫与禁用 JS 用户准备的，符合契约 §2.4。

### C7 语义标签与无障碍抽查 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| 无头 Chrome 实际渲染后的 DOM 内容 grep | 见下方逐项 |

| 项 | 实测 | 判定 |
|---|---|---|
| `<nav aria-label="主导航">` | **存在** | PASS |
| `aria-current` | **存在** | PASS |
| `role="tablist"` | **不存在**（契约 §8.3 明确禁止半套 Tabs） | PASS |
| `<canvas role="img">` | **存在** | PASS |
| `aria-label` 出现次数 | **6 处** | PASS |

### C8 国内可访问性 —— **已知风险，如实记录，不粉饰**

| 检查方法 | 依据 |
|---|---|
| 本次实测线上可达 + 已知平台特性 | 站点在 `*.github.io` 上，中国大陆访问长期不稳定（部分运营商/地区直接不可达或被限速） |

- 本次实测：从本环境访问 `https://inliang.github.io/envo/` **HTTP 200，0.77 s**（经 `x-github-edge-region: japaneast` 边缘节点）。**这个数字只代表本次本网络，不代表国内用户网络。**
- **好消息**：本次已移除 Google Fonts（B13），页面加载时**不再有任何第三方域名请求**（高德 API 仅在用户实际输入地址且配置了 Key 时才发起）→ 不会因为第三方资源被墙而白屏或长时间等待字体。
- **仍然存在的风险**：GitHub Pages 本身的域名可达性无法在本项目内解决。**v1.1 决策项**：若要面向国内用户稳定服务，需迁到 Cloudflare Pages / EdgeOne Pages / 国内 CDN，或直接绑自定义域名 + 国内托管。本次不做。

### C9 死链与 404 —— **PASS**（本地 13/13 可达）

| 检查方法 | 依据 |
|---|---|
| 本地起 `vite preview`，对 13 个 URL 逐个 curl | **全部 HTTP 200** |

| URL（本地预览） | HTTP |
|---|---|
| `/envo/` | 200 |
| `/envo/assets/index-4rZJl5bE.js` | 200 |
| `/envo/og-image.png` | 200 |
| `/envo/sitemap.xml` | 200 |
| `/envo/robots.txt` | 200 |
| `/envo/site.webmanifest` | 200 |
| `/envo/favicon.ico` | 200 |
| `/envo/favicon.svg` | 200 |
| `/envo/apple-touch-icon.png` | 200 |
| `/envo/icon-192.png` | 200 |
| `/envo/icon-512.png` | 200 |
| `/envo/favicon-16x16.png` | 200 |
| `/envo/favicon-32x32.png` | 200 |

- 站内无路由（单页 SPA 四 Tab 靠 state 切换），**不存在内部链接跳转，也就不存在站内死链**。
- 全站唯一外链是 `<noscript>` 里的 `https://github.com/Inliang/envo`，上线后验证（F3）。

### C10 图片 `alt` —— **N/A（无静态内容图）**

- 页面内 `<img>` 只有打印预览那一处（运行时生成，契约 §8.7 已规定 `alt="信封打印预览：{收件人}，{规格}"`），静态产物阶段无图可查。列入上线后人工抽查。

---

## D. 构建

### D1 实际执行一次 `npm run build` —— **PASS**

| 项 | 实测 |
|---|---|
| 命令 | `tsc -b && vite build` |
| 结果 | **exit 0，无错误** |
| 墙钟耗时 | **19.75 s**（18:10:24 → 18:10:44） |
| 其中 vite build | **12.19 s** |
| 转换模块数 | 353 |
| 警告 | 仅 1 条 Vite chunk 体积警告（>500 kB），**非错误** |

### D2 产物清单 —— **PASS**

`dist/` 共 **17 个文件**，总计 **1,794,328 B ≈ 1.71 MB**。

### D3 主包体积 —— **PASS（记录为 v1.1 项，不阻塞）**

| 文件 | raw | gzip |
|---|---|---|
| `index.html` | 5,663 B | 2,125 B |
| `assets/index-COuMzPEq.css` | 37,794 B | 6,277 B |
| **`assets/index-4rZJl5bE.js`（主包）** | **1,079,468 B（1.03 MiB）** | **355,317 B（347 KB）** |
| `assets/index.es-qd9kcd45.js` | 159,598 B | 53,256 B |
| `assets/html2canvas.esm-QH1iLAAe.js` | 202,379 B | 47,243 B |
| `assets/purify.es-BwoZCkIS.js` | 22,028 B | 8,742 B |
| `og-image.png` | 259,483 B | 257,810 B（PNG 已压缩，gzip 无收益） |

- 主包 1,079,468 B 与团队已知「约 1.08 MB」吻合。
- jsPDF / xlsx 未分包 → **本次不处理，列 v1.1**（见 D4 的缓解情况）。

### D4 分包现状 —— **部分缓解（记录）**

| 检查方法 | 依据 |
|---|---|
| grep 主包内的 import 语句 | 主包对 3 个分块全部是**动态 import**：`import("./html2canvas.esm-...")`、`import("./index.es-...")`、`import("./purify.es-...")`；主包内**无**静态 import 引用它们 |

- 结论：jsPDF 与 xlsx 相关的 3 个分块（合计 384,005 B raw / 109,241 B gzip）**不进首屏**，只在用户真去导出 PDF / 导入 Excel 时才加载。首屏只背主包。
- 未缓解的部分：主包自身 1.03 MiB 里仍有 React + 应用代码 + 被静态打进来的部分依赖。**彻底解决需要 `manualChunks` 拆分或路由级懒加载，属 v1.1 范围，本次不做。**

### D5 缓存与压缩 —— **PASS（平台默认，本项目无配置项）**

| 检查方法 | 依据 |
|---|---|
| 实测线上响应头 | `Cache-Control: max-age=600`（非 assets 路径） |

- hashed 资源（`assets/index-*.js`）由 GitHub Pages 自动长效缓存；`public/` 下无 hash 的文件 600 s 短缓存。
- 更新 `og-image` / favicon 的正确姿势是**改文件名 + 同步改引用**（契约 §5.4 已写明），不要指望刷新缓存。
- 压缩（gzip/br）由 GitHub Pages 自动开启，本项目无配置项。

---

## E. 性能

### E1 首屏传输量（gzip 后）—— **355 KB**

| 资源 | gzip 后 |
|---|---|
| `index.html` | 2,125 B |
| `index.css` | 6,277 B |
| 主 JS | 355,317 B |
| **首屏合计** | **363,719 B = 355.2 KB** |

- 3 个动态分块（109,241 B gzip）不计入首屏，理由见 D4。

### E2 首屏未压缩体积 —— **1.07 MB**

`5,663 + 37,794 + 1,079,468 = 1,122,925 B = 1.07 MB`

### E3 新旧版本主包对比 —— **持平略增（诚实记录：本次未做体积优化）**

| 版本 | 主包 raw | 说明 |
|---|---|---|
| 线上 v1.0.0（`index-BkknIOW0.js`，2026-08-01 部署，实测下载 1,062,769 B） | 1,062,769 B | 旧 |
| 本次 v1.0.1（`index-4rZJl5bE.js`） | **1,079,468 B** | 新 |
| 差值 | **+16,699 B（+1.6%）** | 来自本次新增的 ConfirmDialog 等 v1.0.1 功能代码 |

- **这是优化前后对比的数字**：本次工作重心是内容/无障碍/文案，**主包体积没有改善，略增 1.6%**。不粉饰成「有所提升」。
- 唯一的性能正收益来自 B13：移除 Google Fonts 外链，减少 2 个跨域连接（preconnect）与 1 个 CSS 请求。

### E4 图片体积 —— **PASS**

- OG 图 253 KB（**不进首屏渲染路径**，只在被社交平台抓取时下载）
- 7 个图标合计 25.9 KB
- 页面内无内容图

### E5 首屏第三方请求数 —— **PASS（0 个）**

| 检查方法 | 依据 |
|---|---|
| 全库 grep + 读 `dist/index.html` | 无任何 `fonts.googleapis.com` / `gstatic` / CDN 外链；`<head>` 内全部是站内 `/envo/` 资源 |

- 首屏 0 个第三方域名请求 → 无第三方 DNS 查询、无第三方 TLS 握手。对国内访问尤其重要。

> **关于首屏加载时间与 LCP**：本次只做了**本地**预览 + 无头 Chrome 渲染冒烟，**没有对线上做真实 LCP 测量**（线上当前是 v1.0.0，测了也不代表 v1.0.1）。**上线后必须实测**，见 F4。我不提前给「很快」这种结论。

### E6 无头 Chrome 渲染冒烟 —— **PASS**

| 检查方法 | 依据 |
|---|---|
| `chrome --headless=new --virtual-time-budget=8000` 实际渲染 + dump DOM | 桌面（1440×900）与移动（390×844）各跑一次 |

| 项 | 实测 | 判定 |
|---|---|---|
| `#root` 是否渲染出内容 | **是**（DOM 17,793 B，root 内含完整 `<header><nav>…` 结构） | PASS |
| 控制台 JS 报错 | **0 条** | PASS |
| 控制台其他输出 | 仅 2 条与页面无关：Chrome 内部 WLAN 警告、`libpng warning: iCCP: cHRM chunk does not match sRGB` | 无害 |
| 移动端提示文案是否在 DOM | **是**（「建议在电脑上打开…」存在） | PASS |

- `libpng iCCP` 警告来自某个 PNG 内嵌的 ICC 色彩配置块，仅 Chrome 日志层提示，**不影响渲染与体积**，不列为缺陷。

---

## F. 上线后验证步骤（**需用户批准后执行**，我目前未执行下列任何对生产环境的写操作）

| # | 步骤 | 命令 / 方法 | 通过标准 |
|---|---|---|---|
| F1 | 首页可达 | 打开 `https://inliang.github.io/envo/` | HTTP 200，页面标题为 `信封打印助手 Envo - 在线排版信封，支持 DL/C5/C4 与 PDF 导出` |
| F2 | sitemap 可达 | `curl -I https://inliang.github.io/envo/sitemap.xml` | HTTP 200（当前线上为 **404**，因旧版产物里没有该文件） |
| F3 | OG 图 URL 返回 200 | `curl -I https://inliang.github.io/envo/og-image.png` | HTTP 200 且 `Content-Type: image/png`（当前线上为 **404**） |
| F4 | canonical 正确 | 浏览器查看源码 | `rel="canonical" href="https://inliang.github.io/envo/"` |
| F5 | 首屏实测 | PageSpeed Insights 跑 `https://inliang.github.io/envo/` | 记录 LCP / FCP 真实数字，回填 E 组 |
| F6 | 图标可达 | 逐个 curl favicon.ico / favicon.svg / apple-touch-icon.png / icon-192.png / icon-512.png | 全部 200 |
| F7 | 无 Google Fonts | 查看源码 | 无 `fonts.googleapis.com`（当前线上**有 3 条**，本次推送后应消失） |
| F8 | GSC 提交 sitemap | Search Console → Sitemaps → 提交 `https://inliang.github.io/envo/sitemap.xml` | 状态「Success」 |

> 我未执行 F8（需用户登录 GSC）。F1–F7 待 push 完成后由用户批准即可执行。

---

## 1. 我的判定

### 判定：**可上线（技术项 45/45 PASS，代码侧零 FAIL）**

前提是两个**用户侧操作**必须做到位，它们是上线动作本身，不是代码缺陷：

1. **提交时必须把 `public/`（11 个文件）与 `src/components/ConfirmDialog.tsx` 加进版本库** —— 这是目前**唯一可能让 CI 出事的地方**。
2. **GitHub Pages 的 Source 必须是 GitHub Actions** —— 我无法读取该配置，需用户肉眼确认一次。

### 阻塞项（若不处理，本次上线会失败）

| # | 阻塞项 | 为什么会失败 | 必须谁做 |
|---|---|---|---|
| **X1** | `public/` 尚未纳入版本库（远端 `GET /repos/Inliang/envo/contents/public?ref=master` 返回空，本地 `public/` 仍是 `??` 未跟踪状态） | 若只 `git commit -am` 提交改动文件，`public/` 不会被带上 → CI 构建出的 `dist/` **没有 og-image / favicon / sitemap / robots / manifest**，页面上线后分享是灰图、sitemap 404、图标 404，且 **Actions 全绿看不出问题** | 用户（提交时显式 `git add public/`） |
| **X2** | `src/components/ConfirmDialog.tsx` 未跟踪 | 该文件被地址簿与打印历史引用，若未提交 → CI 里 `tsc -b` 直接报模块找不到，**构建失败、不会部署** | 用户（提交时显式 add） |
| **X3** | Pages Source 未在网页端确认为 GitHub Actions | 若实际是「Deploy from a branch」，推 master 后 Actions 全绿但页面停留在 v1.0.0 | 用户（Settings → Pages） |

> 补充：`docs/` 也未跟踪。若希望三份文档入仓，提交时一并 `git add docs/`；不入库也不影响站点运行。
> 补充：工作区存在 `.tmp/`（我本次的临时产物残留，删除时被工具拒绝），**提交时不要包含它**。建议 `.gitignore` 加一行 `.tmp`（是否改 `.gitignore` 由你定，我没擅自改）。

---

## 2. 上线操作说明（用户批准后执行）

### 2.1 提交与推送

```bash
cd E:/GitHub/envo

# ① 先看清现状（必须出现 public/ 与 ConfirmDialog.tsx）
git status

# ② 显式 add 未跟踪文件 —— 这一步不能省，也不能只用 -am
git add public/                          # 11 个静态契约文件，缺了就是 X1
git add src/components/ConfirmDialog.tsx # 缺了就是 X2，构建直接挂
git add docs/                            # 可选：三份文档入库

# ③ 提交所有改动
git add -u
git commit -m "release: v1.0.1 上线（TDK/OG/JSON-LD/静态契约/文案41条/对比度/响应式/无障碍）"

# ④ 推送 → 触发 workflow
git push origin master
```

**确认提交内容无误再 push**：

```bash
git show --stat --name-only HEAD   # 应能看到 public/ 下 11 个文件 + ConfirmDialog.tsx
```

### 2.2 网页端一次性确认（push 之前做，顺序无所谓）

`https://github.com/Inliang/envo/settings/pages` → **Build and deployment → Source** → 选中 **GitHub Actions** → Save。

### 2.3 查看 Actions 运行

- 地址：`https://github.com/Inliang/envo/actions`
- 工作流名：**Deploy to GitHub Pages**
- 也可以在 Actions 页右上角手动 **Run workflow**（`workflow_dispatch` 已配置），不必再造空提交。
- 正常全程约 **1–2 分钟**（本地 `npm ci` + build 实测 20 s，CI 加上拉起环境通常 1–2 min）。

### 2.4 生效时间

- Actions 全绿后，**GitHub Pages 通常在 1–3 分钟内生效**，最长不超过 10 分钟。
- 若超过 10 分钟页面仍是旧版，按 2.5 排查。

### 2.5 常见失败排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `npm ci` 步骤红 | lockfile 与 package.json 不同步 | 我已实测当前同步（exit 0）。若失败，本地 `npm install` 重新生成 lock 后提交 |
| `npm run build` 步骤红 | `tsc -b` 类型错误，或模块找不到 | 后者几乎必定是 X2（ConfirmDialog.tsx 没提交） |
| `deploy-pages` 报 403 / Not Found | Pages Source 不是 GitHub Actions，或仓库未启用 Pages | 走 2.2 确认 |
| Actions 全绿但页面没变 | Pages Source 不是 GitHub Actions（X3） | 走 2.2 确认 |
| 页面 200 但样式/JS 404 | `base` 与产物路径不符 | 本次已验证 `base: '/envo/'` 与 8 条引用一致，不应发生；若发生先查 `vite.config.ts` |
| 图标 / og-image / sitemap 404，Actions 却全绿 | **`public/` 没提交（X1）** | 补 `git add public/` 后重新提交推送 |
| 页面标题还是 `Envo - 信封打印助手` | 旧版未替换 | 强刷（Ctrl+F5）后再看；仍如此则按上一条排查 |

### 2.6 上线后验证

按 **F1–F8** 逐条执行。

---

## 3. 回滚方式

| 场景 | 操作 |
|---|---|
| **想回到 v1.0.0（2026-08-01 那版）** | `git revert <上线 commit>` → push master → Actions 重新构建部署，约 1–2 min 生效 |
| **想重跑某次历史部署** | Actions → 选中那次成功的 **Deploy to GitHub Pages** 运行 → **Re-run all jobs** |
| **想彻底停掉站点** | Settings → Pages → Source 改回 None（站点立刻 404，可逆） |
| **产物级兜底** | `actions/upload-pages-artifact` 产物默认保留 90 天，可在 Actions 运行页下载对应 `dist` 手动恢复 |

> 注意：**回滚只包含代码与产物**；用户浏览器里 localStorage 的地址簿 / 打印历史 / 高德 Key 不受影响，不会丢。

---

## 4. 必须由用户自己完成的步骤清单

| # | 事项 | 为什么只能用户做 |
|---|---|---|
| U1 | Settings → Pages → Source 确认为 **GitHub Actions** | 需要 GitHub 账号权限，我无仓库授权 |
| U2 | 提交时 `git add public/` + `git add src/components/ConfirmDialog.tsx` | 上线批准权在用户；我不得执行 commit/push |
| U3 | 执行 push 触发部署 | 同上 |
| U4 | GSC 提交 `https://inliang.github.io/envo/sitemap.xml`（F8） | 需要 Google 账号 |
| U5 | 决定是否把 `docs/` 入仓、是否把 `.tmp` 加入 `.gitignore` | 仓库管理决策 |
| U6 | **裁决 `og:image:type` 是否补（B7）** | 契约与清单要求冲突，需拍板；我的建议是本次不动、列 v1.1 |
| U7 | 若面向国内用户，决策是否迁移出 GitHub Pages（C8） | 平台选型，v1.1 议题 |

---

## 5. 上线后建议观察的 2–3 个指标

1. **URL 收录状态**（GSC，提交 sitemap 后 1–2 周）：`https://inliang.github.io/envo/` 是否被索引。这是唯一能验证 TDK/OG/JSON-LD 那一整套工作真的生效的指标。
2. **首屏 LCP**（PageSpeed Insights 实测 `https://inliang.github.io/envo/`）：本次主包 1.03 MiB，需要一个真实数字来决定 v1.1 是否必须做 `manualChunks` 分包。目标 < 2.5 s。
3. **Actions 部署成功率**：首次 push 是否一次通过。若 X1/X2 没做到位，这里会是最先暴露的地方。

---

## 附：本次检查的实证依据清单

| 操作 | 结果 |
|---|---|
| `npm ci --dry-run`（隔离空目录） | exit 0 / added 219 packages |
| `npm run build` | exit 0 / 19.75 s / 353 modules |
| md5 比对 `public/` vs `dist/`（11 文件） | 11/11 一致 |
| PNG IHDR 解析（6 图） | 尺寸全部符合契约 |
| TDK/OG/Twitter 逐字比对（8 串） | 8/8 与 `content-plan.md` 一致 |
| `json.loads()` 解析 JSON-LD | 通过 / 16 键 / featureList 11 条 / 无 aggregateRating、review、author |
| 违禁词扫描 `dist/index.html` | 「邮编自动补全」0 处 |
| Google Fonts 扫描（`dist/`、`src/`、`index.html`） | 0 处 |
| 本地 preview 13 个 URL curl | 13/13 HTTP 200 |
| 无头 Chrome 渲染（桌面 + 移动） | 均渲染成功 / JS 报错 0 |
| 线上探测 | `https://inliang.github.io/envo/` 200（v1.0.0，2026-08-01）；`/envo/sitemap.xml` 404；`/envo/og-image.png` 404；`/envo`（无尾斜杠）→ 200 落在 `/envo/`；主机根 `robots.txt` → GitHub「Site not found」 |
| 远端 API | `GET /repos/Inliang/envo/branches` → 仅 master；`GET .../contents/public?ref=master` → 空；`GET .../pages` → 404（无权限读取） |
