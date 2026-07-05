import * as XLSX from 'xlsx';
import type { Address, PrintRecord } from '../store/types';

export function exportAddressesToExcel(addresses: Address[]): void {
  const data = addresses.map((a) => ({
    '姓名': a.name,
    '收件人': a.recipient,
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

  XLSX.writeFile(wb, `地址簿_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`);
}

export function exportHistoryToExcel(records: PrintRecord[]): void {
  const data = records.map((r) => ({
    '收件人': r.recipient.recipient,
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

  XLSX.writeFile(wb, `打印历史_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`);
}
