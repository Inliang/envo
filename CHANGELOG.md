# Changelog

## 2026-10-17 · v1.0.1

### Added
- **站点上线基建**：`index.html` 补全 TDK / canonical / Open Graph / Twitter Card / theme-color / JSON-LD（WebApplication）/ `<noscript>` 兜底正文；`public/` 新增 favicon.ico（16/32/48 三帧）、favicon.svg、favicon-16x16.png、favicon-32x32.png、apple-touch-icon.png（180×180 实底）、icon-192.png、icon-512.png、og-image.png（1200×630）、site.webmanifest、robots.txt、sitemap.xml。
- **内联二次确认组件（ConfirmDialog）**：打印历史删除与地址簿删除两处共用同一组件（焦点陷阱 / Esc 关闭 / 焦点还原 / 移动端适配），不再使用 `window.confirm`。

### Changed
- **字体本地化**：删除 `index.html` 中 3 个 Google Fonts 外链（国内访问常超时、阻塞首屏），UI 与信封渲染全部改用系统字体栈；信封渲染字体栈与 UI 栈独立（`system-ui` 开头），并在 Canvas 字体赋值后立即读回校验，避免字体栈非法被静默忽略导致整批信封以默认小字号印出。
- **版本号**：`v1.0.0` → `v1.0.1`（页脚、设置页关于区、package.json）。
- **文案与对比度全面修订**：41 条微文案落地（25 条必改），次要文字对比度修复（A1–A35），主/强调按钮加深一档（白字对比度 3.74/2.80 → 5.47/5.18），输入框焦点环改实色、占位符加深，全站最小字号 12px。
- **移动端响应式**：顶部导航窄屏改为等分 4 格（图标 + 短标签）；四个视图单列布局；信封预览等比缩放（`max-h-[45vh] sm:max-h-[540px]`）；移动端所有输入框 16px（防 iOS 聚焦自动放大）；触控目标 ≥ 44×44；导航 `<nav aria-label>` + `aria-current="page"`。

### Fixed
- **本地数据迁移保护（最高优先级）**：Zustand persist 升级 `version: 2` 并补 `migrate` + `partialize`。老用户（v1）升级后地址簿 / 打印历史 / 设置 / 信封设置完整保留；`settings` 深合并补默认值，迁移失败回退默认值不抛错不白屏；`activeTab` 与 `currentRecipient` 不再持久化（每次落地回到编辑页，且杜绝误印上一次的旧地址）；老数据中已废弃的 `'Inter, sans-serif'` 字体栈在迁移时替换为新栈。
- **导入备份后 Key 失效（R2）**：设置页导入 JSON 备份时不再对已加密的 amapKey 二次加密，修复导入备份后地址联想静默失效的问题。
- **邮编误填 towncode（R5）**：选中高德联想地址后不再自动填邮编（此前用 11 位乡镇码 `towncode` 冒充 6 位邮编，可能造成信件分拣错误，实体不可逆），邮编由用户手填或从地址簿带入。**附带收益：选中联想项不再调用逆地理编码 API，单次选中的 API 配额消耗从 2 次降为 1 次，减半。**
- **手填邮编存不进地址簿（B6-B，R5 的连带缺陷）**：「存入地址簿」构造地址记录时此前不带邮编字段，导致用户输入邮编存入后，下次从地址簿选回来邮编又空了，等于把「只填一次」变成「每次都填」。现已把当前手填的邮编一并写入地址簿记录，闭环为：手填邮编 → 存入地址簿 → 从地址簿选回 → 邮编仍在。
- **打印 / PDF 按钮加载态**：点击后立即禁用并显示「生成中…」，防止低端机 6× 渲染期间重复点击导致打印历史重复入账。
- **README 订正**：修正「国产 B6」错误表述 —— 国内规格为 ZL/DL/C5/C4，B6/C6 属国际规格；技术栈说明与实际依赖对齐。

## 2026-07-05

### Changed
- **收件人邮编位置上移左移**：rZipX 从 0.09w 左移至 0.0w（左移 2 格），rZipY 从 0.10h 上移至 -0.009h（上移 1 格）。
- **收件人地址左移**：recipX 从 0.25w 左移至 0.16w（左移 2 格）。
- **页脚添加外部链接**：页面底部新增 github.com/Inliang/envo 和 inliang.github.io/fmo-secondary 两个链接。

### Added
- **地址簿邮编字段**：新增/编辑地址时增加邮编输入框，地址卡片上展示邮编信息。导出 Excel 同步增加邮编列。
- **地址簿导入功能**：支持 CSV/XLSX/JSON 文件批量导入地址。自动识别中英文列名（姓名/name、地址/address、邮编/postcode、电话/phone、标签/tag），解析后预览确认再写入地址簿。导入按钮位于地址簿顶部工具栏。
- **批量打印**：地址簿每行增加 checkbox，支持全选/取消全选，选中后点击"批量打印"按钮将所有选中地址逐个渲染为信封并触发打印。
- **地址编辑**：地址卡片新增"编辑"按钮，点击后在卡片原位展开编辑表单，预填当前地址所有字段（姓名、单位、地址、邮编、电话、标签），修改后调用 `updateAddress` 保存到 store，支持取消编辑还原。

### Fixed
- **寄件人信息右下角右对齐**：将寄件人信息从底部水平居中（0.50w, textAlign='center'）改为右下角右对齐（0.90w, textAlign='right'），位于寄件人邮编格上方，符合 GB/T 22657.1-2008 寄件人名址区位于右下方的要求。
- **字号大幅提升**：参照 docx DL 信封打印模板，将所有 Canvas 元素字号从原来的 `fontSize * N` 相对缩放改为绝对 pt → px 转换（18pt 邮编、11pt 地址、24pt 姓名、10pt 寄件人、12pt 寄件人邮编），解决收件人地址/姓名/寄件人信息字号过小的问题。字号随信封尺寸等比缩放，`fontSize` 设置仍可作为微调乘数。
- **所有元素位置重校准**：参照 docx 模板中各参数的 mm 坐标，将 Canvas 绘制位置从固定像素偏移改为宽高比例定位（收件人邮编 0.09w/0.10h、地址 0.25w/0.30h、姓名 0.48h、寄件人 0.23w/0.73h、寄件人邮编 0.74w/0.82h 等）。
- **寄件人邮编红框左移**：寄件人邮编 6 格红框从 `w - pad - 6*cells`（约 0.86w）左移至 0.74w，解决太靠右的问题。邮编格子尺寸也改为比例计算。
- **收件人姓名与电话同行**：参照 docx 模板，收件人电话不再另起一行，改为与姓名同行右对齐渲染。
- **地址联想完整地址修复**：选中高德联想地址后，现在始终以 `district`（省市区路径，如"浙江省杭州市西湖区"）为前缀拼接详细地址（`address` 或 `name`），确保输入框显示完整地址格式"省+市+区+县+乡+街道+小区/村"。此前当 `address` 有值时直接使用而丢弃了 `district`，导致仅显示小区名等短地址。
- **邮编自动填充增强**：选中联想地址后，若 `inputtips` API 未返回邮编，则自动调用 AMap 逆地理编码 API（`geocode/regeo`）根据经纬度查询邮编，填入收件人邮编框。regeo 失败时静默忽略，不影响地址填充。

### Changed
- **UI 整体美化**：卡片增加 hover 阴影过渡、渐变按钮（brand/cta）、输入框改为 `slate-50` 底色 + white focus 态、新增 `.input-label`/`.section-title`/`.section-dot`/`.btn-ghost` 组件类、select 添加自定义下拉箭头。
- `drawDomesticEnvelope` 坐标系完全重构，改为基于参考模板的比例定位 + 绝对 pt 字号。

## 2026-07-04

### Fixed
- **地址联想修复**：高德地址联想选中后完整替换输入框为用户选中的地址项，不再与手动输入文字混排。修复 `selectAmapSuggestion` 中地址拼接逻辑：address 末尾已含 name 时去重避免冗余（如"浙江省杭州市西湖区文三路100号 文三路100号"），新增 `district` 字段兜底（address 为空时回退到 district+name 拼接）。选中联想项时若 API 返回邮编数据则自动填入邮编框；手动输入时邮编保持手动可编辑。
- **打印去红框**：打印/导出 PDF 时不再显示收件人邮编红框、寄件人邮编红框及右上角"贴邮票处"红框（屏幕预览保留红框不变）。
- **打印全黑修复**：修复点击打印后信封预览全黑的问题。根因：(1) print-area 使用 `style={{ display: 'none' }}` 内联样式，优先级高于 `@media print` 规则，打印时内容未显示；(2) `react-to-print` 用 `cloneNode()` 克隆 DOM 到打印窗口，canvas 像素缓冲区不参与克隆，导致空白/黑块。修复：移除内联 display 样式改用 CSS class 控制显隐；`onBeforePrint` 中将 canvas 转为 `<img dataURL>` 再克隆。
- **自动匹配纸张尺寸**：打印时根据当前信封规格自动设置打印机纸张尺寸。通过 `useMemo` 动态生成 `@page { size: Wmm Hmm; margin: 0 }` 规则传入 `react-to-print` 的 `pageStyle`，支持所有信封规格（ZL/DL/B6/C6/C5/C4/自定义）。
- **收件人名址区位置修正**：按 GB/T 22657.1-2008 §3.2.2，收件人名址区从左上角移至信封中间区域。X=30% 宽度（中间偏左），Y=30% 高度起笔；收件人姓名字号加大至 1.45x。
- **邮编位置对调**：左上角 6 格红框 → 收件人邮编；右下角 → 寄件人邮编（依 GB/T 22657.1-2008）。
- **国内/国际信封分类**：新增 `category: 'domestic' | 'international'` 字段，select 用 `<optgroup>` 分组。国内：ZL/B6/DL/C5/C4；国际：B6/C6/自定义。
- **GitHub Pages 部署修复**：base 路径设为 `/envo/`，新增 `.github/workflows/deploy.yml`。

### Added
- Address 接口增加 `postcode?` 字段
- 收件人表单增加邮编输入框
- 信封规格分类（国内/国际 optgroup 分组）
- GitHub Pages 自动部署 workflow
- `drawEnvelope` 增加 `forPrint` 参数，控制打印时是否绘制红框
- 联想建议存储完整 AMap API 返回数据（`AmapTip` 接口含 `postcode/adcode/location`）

### Changed
- `envelopeCanvas.ts` 拆分为 `drawDomesticEnvelope` / `drawInternationalEnvelope` 两函数
- 收件人信息 X/Y 从固定像素改为比例定位（`w*0.30`, `h*0.30`）
- 打印 Canvas 改为独立 `printCanvasRef`，由 `useEffect` 以 `forPrint=true` 绘制，不再复制预览 Canvas
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
