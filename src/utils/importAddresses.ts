import * as XLSX from 'xlsx';
import type { Address } from '../store/types';

export interface ImportRow {
  /** 收件人（B10 起单一字段：姓名或单位都归一到这里） */
  name: string;
  address: string;
  postcode: string;
  phone: string;
  tag: Address['tag'];
  tagLabel: string;
}

export interface ImportResult {
  rows: ImportRow[];
  errors: string[];
  total: number;
}

const TAG_MAP: Record<string, Address['tag']> = {
  '家': 'home',
  '公司': 'work',
  '亲友': 'family',
  '其他': 'other',
  'home': 'home',
  'work': 'work',
  'family': 'family',
  'other': 'other',
};

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['姓名', 'name', '名字', '称呼', '联系人'],
  recipient: ['收件人', 'recipient', '单位', '公司', 'company', 'organization', 'org'],
  address: ['地址', 'address', '详细地址', '收货地址', 'addr'],
  postcode: ['邮编', 'postcode', '邮政编码', 'zip', 'zipcode', 'zip_code'],
  phone: ['电话', 'phone', '手机', 'mobile', '联系电话', 'tel', 'telephone'],
  tag: ['标签', 'tag', '分组', '类型', 'label', 'category', 'group'],
  tagLabel: ['标签名', 'tagLabel', 'tag_label', '自定义标签'],
};

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function mapHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeKey(headers[i]);
    if (!norm) continue;
    let matched = false;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      // 该字段已被前面的列占定，就不再重复占位 —— 注意这里是「跳过」而不是「结束整轮」：
      // 原实现在这里直接 break 掉整个字段循环，导致只要「姓名 / 收件人」先出现，
      // 后面的「地址」列永远匹配不上（导出再导入必然失败）。
      if (mapping[field] !== undefined) continue;
      for (const alias of aliases) {
        if (norm === normalizeKey(alias)) {
          mapping[field] = i;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }
  return mapping;
}

function rowToImportRow(
  row: string[],
  mapping: Record<string, number>
): ImportRow | null {
  const nameCol = mapping.name !== undefined ? (row[mapping.name] || '').trim() : '';
  // 旧版导出的表里有「收件人 / 单位 / 公司」列，B10 合并后一律按「单位列 || 姓名列」归一为 name，
  // 与原打印主行「单位优先」的取值一致；缺该列时不报错，直接用姓名列。
  const unitCol = mapping.recipient !== undefined ? (row[mapping.recipient] || '').trim() : '';
  const name = unitCol || nameCol;
  const address = mapping.address !== undefined ? (row[mapping.address] || '').trim() : '';
  const postcode = mapping.postcode !== undefined ? (row[mapping.postcode] || '').trim() : '';
  const phone = mapping.phone !== undefined ? (row[mapping.phone] || '').trim() : '';
  const tagRaw = mapping.tag !== undefined ? (row[mapping.tag] || '').trim() : '';
  const tagLabel = mapping.tagLabel !== undefined ? (row[mapping.tagLabel] || '').trim() : '';

  if (!name || !address) return null;

  const tag: Address['tag'] | undefined = TAG_MAP[tagRaw] || undefined;

  const label = tagLabel || tagRaw;

  return {
    name,
    address,
    postcode,
    phone,
    tag,
    tagLabel: label,
  };
}

export function parseCSV(text: string): ImportResult {
  const errors: string[] = [];
  const rows: ImportRow[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return { rows, errors: ['CSV 文件为空或只有表头'], total: 0 };
  }

  // Simple CSV parser that handles quoted fields
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  const headerLine = lines[0];
  const headers = parseLine(headerLine);
  const mapping = mapHeaders(headers);

  // 只认「收件人 / 单位」列也算通过（B10 合并后姓名列不再是硬门槛）
  if ((mapping.name === undefined && mapping.recipient === undefined) || mapping.address === undefined) {
    errors.push('未找到必需的列（收件人、地址）。请确保 CSV 文件包含"收件人"、"姓名"或"name"列，以及"地址"或"address"列。');
    return { rows, errors, total: 0 };
  }

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseLine(lines[i]);
      const row = rowToImportRow(fields, mapping);
      if (row) {
        rows.push(row);
      } else {
        errors.push(`第 ${i + 1} 行：缺少收件人或地址，已跳过`);
      }
    } catch {
      errors.push(`第 ${i + 1} 行：解析失败，已跳过`);
    }
  }

  return { rows, errors, total: rows.length };
}

export function parseXLSX(buffer: ArrayBuffer): ImportResult {
  const errors: string[] = [];
  const rows: ImportRow[] = [];

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows, errors: ['XLSX 文件中没有工作表'], total: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (data.length < 2) {
    return { rows, errors: ['XLSX 文件为空或只有表头'], total: 0 };
  }

  const headers = data[0].map((h) => String(h ?? ''));
  const mapping = mapHeaders(headers);

  // 只认「收件人 / 单位」列也算通过（B10 合并后姓名列不再是硬门槛）
  if ((mapping.name === undefined && mapping.recipient === undefined) || mapping.address === undefined) {
    errors.push('未找到必需的列（收件人、地址）。请确保表格包含"收件人"、"姓名"或"name"列，以及"地址"或"address"列。');
    return { rows, errors, total: 0 };
  }

  for (let i = 1; i < data.length; i++) {
    try {
      const fields = (data[i] || []).map((f) => String(f ?? ''));
      const row = rowToImportRow(fields, mapping);
      if (row) {
        rows.push(row);
      } else {
        errors.push(`第 ${i + 1} 行：缺少收件人或地址，已跳过`);
      }
    } catch {
      errors.push(`第 ${i + 1} 行：解析失败，已跳过`);
    }
  }

  return { rows, errors, total: rows.length };
}

export function parseJSON(text: string): ImportResult {
  const errors: string[] = [];
  const rows: ImportRow[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { rows, errors: [`JSON 解析失败: ${(e as Error).message}`], total: 0 };
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  if (arr.length === 0) {
    return { rows, errors: ['JSON 数据为空'], total: 0 };
  }

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown>;
    const nameCol = String(item.name ?? item['姓名'] ?? '').trim();
    const address = String(item.address ?? item['地址'] ?? '').trim();
    // 与 CSV/XLSX 同口径：单位列 || 姓名列
    const name = String(item.recipient ?? item['收件人'] ?? item['单位'] ?? item['公司'] ?? '').trim() || nameCol;

    if (!name || !address) {
      errors.push(`第 ${i + 1} 项：缺少收件人或地址，已跳过`);
      continue;
    }

    const postcode = String(item.postcode ?? item['邮编'] ?? '').trim();
    const phone = String(item.phone ?? item['电话'] ?? '').trim();
    const tagRaw = String(item.tag ?? item['标签'] ?? '').trim();
    const tagLabel = String(item.tagLabel ?? item['标签名'] ?? item.tag_label ?? '').trim();

    const tag: Address['tag'] | undefined = TAG_MAP[tagRaw] || undefined;

    rows.push({
      name,
      address,
      postcode,
      phone,
      tag,
      tagLabel: tagLabel || tagRaw,
    });
  }

  return { rows, errors, total: rows.length };
}

export function detectFormat(fileName: string): 'csv' | 'xlsx' | 'json' | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'json') return 'json';
  return null;
}

export async function parseFile(file: File): Promise<ImportResult> {
  const format = detectFormat(file.name);
  if (!format) {
    return { rows: [], errors: ['不支持的文件格式。请使用 CSV、XLSX 或 JSON 文件。'], total: 0 };
  }

  try {
    if (format === 'csv') {
      const text = await file.text();
      return parseCSV(text);
    }
    if (format === 'xlsx') {
      const buffer = await file.arrayBuffer();
      return parseXLSX(buffer);
    }
    if (format === 'json') {
      const text = await file.text();
      return parseJSON(text);
    }
  } catch (e) {
    return { rows: [], errors: [`文件读取失败: ${(e as Error).message}`], total: 0 };
  }

  return { rows: [], errors: ['未知错误'], total: 0 };
}
