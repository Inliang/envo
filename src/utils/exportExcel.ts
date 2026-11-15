import * as XLSX from 'xlsx';
import type { Address, PrintRecord } from '../store/types';

function dateSuffix(): string {
  return new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
}

/** 全量导出与「导出选中」共用同一张表，列结构逐字一致，保证导出的文件能原样导入回来。 */
function buildAddressWorkbook(addresses: Address[]): XLSX.WorkBook {
  const data = addresses.map((a) => ({
    // B10：原「姓名」「单位」两列合并为「收件人」一列，与信封编辑页的单一字段对齐
    '收件人': a.name,
    '地址': a.address,
    '邮编': a.postcode || '',
    '电话': a.phone || '',
    '标签': a.tagLabel || a.tag || '',
    '创建时间': new Date(a.createdAt).toLocaleString('zh-CN'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '地址簿');

  // Auto width
  const cols = Object.keys(data[0] || {}).map(() => ({ wch: 24 }));
  ws['!cols'] = cols;

  return wb;
}

export function exportAddressesToExcel(addresses: Address[]): void {
  XLSX.writeFile(buildAddressWorkbook(addresses), `地址簿_${dateSuffix()}.xlsx`);
}

/**
 * 导出当前选中的地址。文件名带条数，与全量导出的「地址簿_日期.xlsx」区分开，
 * 不会互相覆盖；列结构与全量导出完全一致，可直接再导入。
 */
export function exportSelectedAddressesToExcel(addresses: Address[]): void {
  XLSX.writeFile(buildAddressWorkbook(addresses), `地址簿_选中${addresses.length}条_${dateSuffix()}.xlsx`);
}

/**
 * 下载 Excel 导入模板：表头全部使用 COLUMN_ALIASES 能识别的中文列名，
 * 附 1 行示例数据（标签值取 TAG_MAP 里的合法值「公司」）。
 */
export function exportAddressTemplate(): void {
  const data = [
    {
      '收件人': '张三 / XX公司',
      '地址': '北京市朝阳区XX路1号',
      '邮编': '100000',
      '电话': '13800000000',
      '标签': '公司',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入模板');

  ws['!cols'] = Object.keys(data[0]).map(() => ({ wch: 24 }));

  XLSX.writeFile(wb, '地址簿导入模板.xlsx');
}

export function exportHistoryToExcel(records: PrintRecord[]): void {
  const data = records.map((r) => ({
    '收件人': r.recipient.name,
    '地址': r.recipient.address,
    '电话': r.recipient.phone || '',
    '寄件人': r.sender.name,
    '信封规格': r.settings.size,
    '打印方式': r.type === 'print' ? '打印' : 'PDF导出',
    '打印时间': new Date(r.printedAt).toLocaleString('zh-CN'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '打印历史');

  const cols = Object.keys(data[0] || {}).map(() => ({ wch: 24 }));
  ws['!cols'] = cols;

  XLSX.writeFile(wb, `打印历史_${dateSuffix()}.xlsx`);
}
