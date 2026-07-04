# Changelog

## 2026-07-04

### Fixed
- **地址联想修复**：高德地址联想选中后已输入文字不再消失，保留完整选中地址。选中联想项时若 API 返回邮编数据则自动填入邮编框；手动输入时邮编保持手动可编辑。
- **打印去红框**：打印/导出 PDF 时不再显示收件人邮编红框、寄件人邮编红框及右上角"贴邮票处"红框（屏幕预览保留红框不变）。
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
