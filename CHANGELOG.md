---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 4d32f127e120f5be24dadce57b263d70_5808be60781b11f1a8895254002afed2
    ReservedCode1: XQfQJn5j670C9SwcDYalVNdzfbksWBqIsNIMD3w3InlXsOi92imBJ0lQDU3jKk7KmTp3rFc4/HI3kzS3uiw4mLZu3l9q2H/QW1eIZqgDTDw60Eezg2QsaXZ5dFSVhXKAgyTo7k1RrQboIuiV+C4uIr6h9ID8wjbHl3Lo9ZN8vAewKX/K8Rkwwf2CLVI=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 4d32f127e120f5be24dadce57b263d70_5808be60781b11f1a8895254002afed2
    ReservedCode2: XQfQJn5j670C9SwcDYalVNdzfbksWBqIsNIMD3w3InlXsOi92imBJ0lQDU3jKk7KmTp3rFc4/HI3kzS3uiw4mLZu3l9q2H/QW1eIZqgDTDw60Eezg2QsaXZ5dFSVhXKAgyTo7k1RrQboIuiV+C4uIr6h9ID8wjbHl3Lo9ZN8vAewKX/K8Rkwwf2CLVI=
---





# Changelog

## 2026-07-05

### Fixed
- **地址联想完整地址修复**：选中高德联想地址后，现在始终以 `district`（省市区路径，如"浙江省杭州市西湖区"）为前缀拼接详细地址（`address` 或 `name`），确保输入框显示完整地址格式"省+市+区+县+乡+街道+小区/村"。此前当 `address` 有值时直接使用而丢弃了 `district`，导致仅显示小区名等短地址。
- **邮编自动填充增强**：选中联想地址后，若 `inputtips` API 未返回邮编，则自动调用 AMap 逆地理编码 API（`geocode/regeo`）根据经纬度查询邮编，填入收件人邮编框。regeo 失败时静默忽略，不影响地址填充。

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
