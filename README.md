# Envo - 信封打印助手

> 智能信封打印工具，支持地址联想、Canvas 实时预览、打印/PDF 导出。

## 功能

- **信封编辑**：寄件人/收件人表单 + 高德地图地址联想 + Canvas 实时预览
- **打印导出**：浏览器打印 + PDF 导出，支持 DL/C5/C4/C6 标准信封规格及自定义尺寸
- **地址簿**：标签分类管理（家/公司/亲友/其他），搜索过滤，一键填入编辑页
- **打印历史**：时间筛选，重新打印，Excel 导出
- **设置**：默认寄件人、高德 API Key（AES 加密）、数据导入/导出（JSON/Excel）

## 技术栈

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Zustand（状态管理 + localStorage 持久化）
- 高德地图 Web API（地址联想）
- jsPDF + html2canvas（PDF 导出）
- react-to-print（浏览器打印）
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

## 项目结构

```
envo/
├── src/
│   ├── components/
│   │   ├── EnvelopeEditor.tsx   # 信封编辑页
│   │   ├── AddressBook.tsx      # 地址簿管理
│   │   ├── PrintHistory.tsx     # 打印历史
│   │   └── Settings.tsx         # 设置页
│   ├── store/
│   │   ├── types.ts             # 类型定义
│   │   └── index.ts             # Zustand store
│   ├── utils/
│   │   ├── encryption.ts        # AES 加解密
│   │   ├── envelopeCanvas.ts    # Canvas 信封渲染
│   │   └── exportExcel.ts       # Excel 导出
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── start.bat                    # 一键启动
└── package.json
```
