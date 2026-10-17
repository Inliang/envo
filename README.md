# Envo - 信封打印助手

> 在线信封打印工具：填写寄件人与收件人，选择信封规格，信封排版实时预览，一键打印或导出 PDF。

**在线地址**：https://inliang.github.io/envo/

## 功能

- **信封编辑**：寄件人/收件人表单 + 高德地图地址联想 + 信封排版实时预览
- **打印导出**：浏览器打印 + PDF 导出，支持 ZL/DL/C5/C4 国内信封规格、B6/C6 国际规格及自定义尺寸
- **地址簿**：标签分类管理（家/公司/亲友/其他），搜索过滤，批量打印，Excel/CSV/JSON 导入导出
- **打印历史**：时间筛选，一键回填，Excel 导出
- **设置**：默认寄件人、高德 API Key（本地保存）、数据导入/导出（JSON/Excel）
- 数据只存本地浏览器，不上传服务器

## 技术栈

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Zustand（状态管理 + localStorage 持久化）
- 高德地图 Web API（地址联想）
- jsPDF（PDF 导出）
- xlsx（Excel 导出）
- CryptoJS（高德 Key 本地加密存储）

## 启动

双击 `start.bat` 或：

```bash
npm install
npm run dev      # 开发模式
npm run build    # 构建
npm run preview  # 预览构建结果
```

## 信封规格

国内规格：**ZL / DL / C5 / C4**；国际规格：**B6 / C6**；另支持自定义尺寸。
（以 `src/store/types.ts` 的 `ENVELOPE_SIZES` 为准）

## 数据说明

收件人姓名与单位合并为单一「收件人」字段（填姓名或单位名均可）。地址簿、打印历史、信封设置全部保存在浏览器 localStorage，不上传服务器；数据结构升级时通过 `migrate` 自动迁移（v1→v2→v3，幂等），老数据不丢失。

## 项目结构

```
envo/
├── public/                      # 静态资源（favicon / og-image / manifest / robots / sitemap）
├── docs/                        # 交付与维护文档（见下方「文档」）
├── src/
│   ├── components/
│   │   ├── EnvelopeEditor.tsx   # 信封编辑页
│   │   ├── AddressBook.tsx      # 地址簿管理
│   │   ├── PrintHistory.tsx     # 打印历史
│   │   ├── Settings.tsx         # 设置页
│   │   └── ConfirmDialog.tsx    # 内联二次确认框（删除操作共用）
│   ├── store/
│   │   ├── types.ts             # 类型定义
│   │   └── index.ts             # Zustand store（含 v1→v2→v3 数据迁移，幂等）
│   ├── utils/
│   │   ├── encryption.ts        # Key 本地加密存储
│   │   ├── envelopeCanvas.ts    # Canvas 信封渲染
│   │   ├── exportExcel.ts       # Excel 导出
│   │   └── importAddresses.ts   # 地址簿导入解析
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .github/workflows/deploy.yml # GitHub Pages 部署（push master 自动触发）
├── start.bat                    # 一键启动
└── package.json
```

## 文档

| 文件 | 内容 |
|---|---|
| `docs/site-spec.md` | 站点规格卡：信息架构、接口契约、静态资源契约、必办清单 |
| `docs/content-plan.md` | 内容策划书：TDK、关键词地图、JSON-LD、微文案清单 |
| `docs/design-spec.md` | 设计规范：色板映射、字体阶梯、响应式断点、组件样式 |
| `docs/prelaunch-checklist.md` | 上线前检查表（49 项逐条判定） |
| `docs/DELIVERY.md` | 交付清单、上线后实测结果、养护说明、v1.1 待办 |
| `docs/assets/` | `favicon.svg` 与 `og-image.svg` 图片母版 |

> 改图标或分享图时，**先改 `docs/assets/` 里的母版再重新出图**，不要直接改 PNG。

## 维护注意

- `public/` 下的文件不带 content hash，GitHub Pages 也不提供手动刷新：**改了内容必须改文件名**，并同步 `index.html` 的引用，否则用户浏览器会一直用旧图。
- 改 localStorage 持久化结构时：先 `version` +1 → 补 `migrate` → 用真实老数据实测。缺迁移会清空老用户全部数据。
- 信封 Canvas 的字体栈独立于 UI 字体栈，赋值后需读回校验——`ctx.font` 解析失败会静默回落到默认字号，预览看不出异常但打印出来整批报废。
