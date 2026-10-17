# Envo - 信封打印助手

> 在线信封打印工具：填写寄件人与收件人，选择信封规格，信封排版实时预览，一键打印或导出 PDF。

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
- CryptoJS（AES 加密）

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

## 项目结构

```
envo/
├── public/                      # 静态资源（favicon / og-image / manifest / robots / sitemap）
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
│   │   ├── encryption.ts        # AES 加解密
│   │   ├── envelopeCanvas.ts    # Canvas 信封渲染
│   │   ├── exportExcel.ts       # Excel 导出
│   │   └── importAddresses.ts   # 地址簿导入解析
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .github/workflows/deploy.yml # GitHub Pages 部署
├── start.bat                    # 一键启动
└── package.json
```
