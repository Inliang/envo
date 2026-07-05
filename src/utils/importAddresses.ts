import * as XLSX from 'xlsx';
import type { Address } from '../store/types';

export interface ImportRow {
  name: string;
  recipient: string;
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
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      for (const alias of aliases) {
        if (norm === normalizeKey(alias)) {
          mapping[field] = i;
          break;
        }
      }
      if (mapping[field] !== undefined) break;
    }
  }
  return mapping;
}

function rowToImportRow(
  row: string[],
  mapping: Record<string, number>
): ImportRow | null {
  const name = mapping.name !== undefined ? (row[mapping.name] || '').trim() : '';
  let recipient = mapping.recipient !== undefined ? (row[mapping.recipient] || '').trim() : '';
  const address = mapping.address !== undefined ? (row[mapping.address] || '').trim() : '';
  const postcode = mapping.postcode !== undefined ? (row[mapping.postcode] || '').trim() : '';
  const phone = mapping.phone !== undefined ? (row[mapping.phone] || '').trim() : '';
  const tagRaw = mapping.tag !== undefined ? (row[mapping.tag] || '').trim() : '';
  const tagLabel = mapping.tagLabel !== undefined ? (row[mapping.tagLabel] || '').trim() : '';

  if (!name || !address) return null;

  if (!recipient) recipient = name;

  const tag: Address['tag'] | undefined = TAG_MAP[tagRaw] || undefined;

  const label = tagLabel || tagRaw;

  return {
    name,
    recipient,
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

  if (mapping.name === undefined || mapping.address === undefined) {
    errors.push('未找到必要的列（姓名、地址）。请确保 CSV 文件包含"姓名"或"name"列以及"地址"或"address"列。');
    return { rows, errors, total: 0 };
  }

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseLine(lines[i]);
      const row = rowToImportRow(fields, mapping);
      if (row) {
        rows.push(row);
      } else {
        errors.push(`第 ${i + 1} 行：缺少姓名或地址，已跳过`);
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

  if (mapping.name === undefined || mapping.address === undefined) {
    errors.push('未找到必要的列（姓名、地址）。请确保表格包含"姓名"或"name"列以及"地址"或"address"列。');
    return { rows, errors, total: 0 };
  }

  for (let i = 1; i < data.length; i++) {
    try {
      const fields = (data[i] || []).map((f) => String(f ?? ''));
      const row = rowToImportRow(fields, mapping);
      if (row) {
        rows.push(row);
      } else {
        errors.push(`第 ${i + 1} 行：缺少姓名或地址，已跳过`);
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
    const name = String(item.name ?? item['姓名'] ?? '').trim();
    const address = String(item.address ?? item['地址'] ?? '').trim();

    if (!name || !address) {
      errors.push(`第 ${i + 1} 项：缺少姓名或地址，已跳过`);
      continue;
    }

    const recipient = String(item.recipient ?? item['收件人'] ?? item['单位'] ?? item['公司'] ?? name).trim();
    const postcode = String(item.postcode ?? item['邮编'] ?? '').trim();
    const phone = String(item.phone ?? item['电话'] ?? '').trim();
    const tagRaw = String(item.tag ?? item['标签'] ?? '').trim();
    const tagLabel = String(item.tagLabel ?? item['标签名'] ?? item.tag_label ?? '').trim();

    const tag: Address['tag'] | undefined = TAG_MAP[tagRaw] || undefined;

    rows.push({
      name,
      recipient,
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
