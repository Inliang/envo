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
  /**
   * 实际识别到的列名（按文件里的原样）。可选：老调用方 / 老结果对象不带这个字段时，
   * 导入预览会自动降级不显示，不需要升 localStorage version 或写 migrate。
   */
  matchedColumns?: string[];
  /** 未被识别、导入时会被忽略的列名 / JSON 键（原样）。可选，同上。 */
  unmatchedColumns?: string[];
  /** 实际读到的表头 / JSON 键，列没对上时直接摊给用户看，不再让他猜。可选。 */
  headers?: string[];
  /** 解析提示（例如识别到设置页导出的全量备份）。可选。 */
  notice?: string;
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

/** JSON 路径下 parseJSON 真正会去读的键（字段名 + COLUMN_ALIASES 里的别名）。 */
const JSON_FIELD_KEYS: Record<string, string[]> = Object.fromEntries(
  Object.entries(COLUMN_ALIASES).map(([field, aliases]) => [
    field,
    Array.from(new Set([field, ...aliases])),
  ])
);
const JSON_RECOGNIZED_KEYS = new Set<string>(Object.values(JSON_FIELD_KEYS).flat());

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

/** 把真实表头拆成「已识别 / 未识别」两组，供导入预览展示。 */
function analyzeHeaders(headers: string[], mapping: Record<string, number>) {
  const matchedIdx = new Set<number>(Object.values(mapping));
  const matchedColumns: string[] = [];
  const unmatchedColumns: string[] = [];
  headers.forEach((raw, i) => {
    const label = String(raw ?? '').trim();
    if (!label) return;
    if (matchedIdx.has(i)) matchedColumns.push(label);
    else unmatchedColumns.push(label);
  });
  return { matchedColumns, unmatchedColumns };
}

/** 列匹配失败时，把实际读到的表头列出来，别让用户猜自己写错了哪一列。 */
function missingColumnsError(kind: 'CSV' | 'XLSX', headers: string[]): string {
  const actual = headers.filter(Boolean);
  return `未找到必需的列（收件人、地址）。${kind} 实际读到的表头：${actual.length > 0 ? actual.join('、') : '（没有读到表头）'}。请确保包含「收件人」/「姓名」/「name」之一，以及「地址」/「address」之一，或下载导入模板对照。`;
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

  const headers = (lines[0] !== undefined ? parseLine(lines[0]) : []).map((h) => h.trim());
  const mapping = mapHeaders(headers);
  const columns = analyzeHeaders(headers, mapping);

  if (lines.length < 2) {
    return {
      rows,
      errors: [
        `CSV 文件为空或只有表头${headers.filter(Boolean).length > 0 ? `，实际读到的表头：${headers.filter(Boolean).join('、')}` : ''}`,
      ],
      total: 0,
      ...columns,
      headers,
    };
  }

  // 只认「收件人 / 单位」列也算通过（B10 合并后姓名列不再是硬门槛）
  if ((mapping.name === undefined && mapping.recipient === undefined) || mapping.address === undefined) {
    return {
      rows,
      errors: [missingColumnsError('CSV', headers)],
      total: 0,
      ...columns,
      headers,
    };
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

  return { rows, errors, total: rows.length, ...columns, headers };
}

export function parseXLSX(buffer: ArrayBuffer): ImportResult {
  const errors: string[] = [];
  const rows: ImportRow[] = [];

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows, errors: ['XLSX 文件中没有工作表'], total: 0, matchedColumns: [], unmatchedColumns: [], headers: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  const headers = (data[0] || []).map((h) => String(h ?? '').trim());
  const mapping = mapHeaders(headers);
  const columns = analyzeHeaders(headers, mapping);

  if (data.length < 2) {
    return {
      rows,
      errors: [
        `XLSX 文件为空或只有表头${headers.filter(Boolean).length > 0 ? `，实际读到的表头：${headers.filter(Boolean).join('、')}` : ''}`,
      ],
      total: 0,
      ...columns,
      headers,
    };
  }

  // 只认「收件人 / 单位」列也算通过（B10 合并后姓名列不再是硬门槛）
  if ((mapping.name === undefined && mapping.recipient === undefined) || mapping.address === undefined) {
    return {
      rows,
      errors: [missingColumnsError('XLSX', headers)],
      total: 0,
      ...columns,
      headers,
    };
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

  return { rows, errors, total: rows.length, ...columns, headers };
}

/** 从 JSON 对象里按字段名 + 中文别名取一个非空字符串值。 */
function pickField(item: Record<string, unknown>, field: string): string {
  for (const key of JSON_FIELD_KEYS[field] || [field]) {
    if (item[key] === undefined || item[key] === null) continue;
    const value = String(item[key]).trim();
    if (value) return value;
  }
  return '';
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

  let arr: unknown[];
  let notice: string | undefined;
  const ignoredTopKeys: string[] = [];

  if (Array.isArray(parsed)) {
    // ① 顶层地址数组（原有行为，保持不变）
    arr = parsed;
  } else if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.addresses)) {
      // ③ 设置页导出的全量备份：{ addresses, printHistory, settings, exportedAt, version }
      arr = obj.addresses;
      ignoredTopKeys.push(...Object.keys(obj).filter((k) => k !== 'addresses'));
      notice = `检测到全量备份文件，已提取其中 ${arr.length} 条地址。备份里的打印历史 / 设置 / 版本信息不会在这里导入，请在「设置 → 导入数据备份」恢复完整数据。`;
    } else if (
      obj.name !== undefined || obj['姓名'] !== undefined ||
      obj.recipient !== undefined || obj['收件人'] !== undefined ||
      obj.address !== undefined || obj['地址'] !== undefined
    ) {
      // ② 单个地址对象
      arr = [obj];
    } else if ('printHistory' in obj || 'settings' in obj || 'version' in obj || 'exportedAt' in obj) {
      return {
        rows,
        errors: ['这个全量备份文件里没有可导入的 addresses 数组；如需恢复打印历史与设置，请使用「设置 → 导入数据备份」。'],
        total: 0,
      };
    } else {
      return {
        rows,
        errors: ['不是可识别的 JSON 地址数据：需要顶层地址数组、单个地址对象，或含 addresses 数组的全量备份文件。'],
        total: 0,
      };
    }
  } else {
    return {
      rows,
      errors: ['不是可识别的 JSON 地址数据：文件内容不是数组或对象。'],
      total: 0,
    };
  }

  if (arr.length === 0) {
    return { rows, errors: ['JSON 数据为空'], total: 0, notice };
  }

  const itemKeys: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const raw = arr[i];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`第 ${i + 1} 项：不是地址对象，已跳过`);
      continue;
    }
    const item = raw as Record<string, unknown>;
    for (const k of Object.keys(item)) {
      if (!itemKeys.includes(k)) itemKeys.push(k);
    }

    // 与 CSV/XLSX 同口径：单位列 || 姓名列
    const name = pickField(item, 'recipient') || pickField(item, 'name');
    const address = pickField(item, 'address');
    if (!name || !address) {
      errors.push(`第 ${i + 1} 项：缺少收件人或地址，已跳过`);
      continue;
    }

    const tagRaw = pickField(item, 'tag');
    const tagLabel = pickField(item, 'tagLabel');
    const tag: Address['tag'] | undefined = TAG_MAP[tagRaw] || undefined;

    rows.push({
      name,
      address,
      postcode: pickField(item, 'postcode'),
      phone: pickField(item, 'phone'),
      tag,
      tagLabel: tagLabel || tagRaw,
    });
  }

  const matchedColumns = itemKeys.filter((k) => JSON_RECOGNIZED_KEYS.has(k));
  const unmatchedColumns = itemKeys.filter((k) => !JSON_RECOGNIZED_KEYS.has(k));
  // 全量备份顶层被忽略的键也算「未识别」，让用户一眼看清哪些内容没进地址簿
  for (const k of ignoredTopKeys) {
    if (!unmatchedColumns.includes(k)) unmatchedColumns.push(k);
  }

  return {
    rows,
    errors,
    total: rows.length,
    matchedColumns,
    unmatchedColumns,
    headers: itemKeys,
    notice,
  };
}

export function detectFormat(fileName: string): 'csv' | 'xlsx' | 'json' | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'json') return 'json';
  return null;
}

/**
 * 严格 UTF-8 解出的文本里若成片出现 U+0000，说明它其实是无 BOM 的 UTF-16 字节流：
 * UTF-16LE 的 ASCII 字符是 `XX 00`、BE 是 `00 XX`，这些字节恰好都能通过严格 UTF-8
 * 探测（0x00 是合法单字节），解出来就是「字符 + \u0000」交替的伪文本。
 * 正常 UTF-8 / GBK CSV 里不会出现 U+0000，因此这个校验不会误伤合法文件。
 */
function hasManyNulls(text: string): boolean {
  const sample = text.slice(0, 512);
  if (sample.length < 8) return false;
  let nulls = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) nulls++;
  }
  return nulls / sample.length >= 0.2;
}

/**
 * 无 BOM 的 UTF-16 保守启发式。宁可漏判，绝不误判。
 *
 * 依据：UTF-16 里 ASCII 字符（逗号 / 数字 / 字母 / CRLF）必有一半字节是 0x00 ——
 * LE 落在奇数位 `XX 00`，BE 落在偶数位 `00 XX`；CSV 每行都有逗号和换行，中文地址里
 * 还有大量 ASCII 数字（邮编 / 电话），所以偏态非常明显。而 UTF-8 / GBK / GB18030 的
 * CSV 文本字节里几乎不出现 0x00（ASCII 全 < 0x80，中文双字节都在 0x81–0xFE 区间），
 * 两侧占比都恒为 0，永远进不了判定分支。
 *
 * 阈值：一侧 0x00 占比 >= 0.30（5 列 CSV 光逗号就约 33%，纯 ASCII 的 UTF-16 是 100%），
 * 另一侧 <= 0.05（容忍极少量低字节为 0x00 的 CJK 字符，如 U+4E00）。
 * 另加两道保险：总长度必须为偶数（UTF-16 天然偶数，很多 GBK CSV 是奇数，直接排除）、
 * 采样至少 8 字节（4 个 UTF-16 单元，占比统计才有意义），样本最多取前 512 字节。
 * 只要两侧都不占绝对优势（例如两侧都有 0x00），一律返回 null 交回 GB18030 原路径。
 */
function detectUTF16WithoutBOM(bytes: Uint8Array): 'utf-16le' | 'utf-16be' | null {
  if (bytes.length < 8 || bytes.length % 2 !== 0) return null;
  const sampleLen = Math.min(bytes.length, 512) & ~1;
  if (sampleLen < 8) return null;

  const pairs = sampleLen / 2;
  let evenZeros = 0;
  let oddZeros = 0;
  for (let i = 0; i < sampleLen; i += 2) {
    if (bytes[i] === 0) evenZeros++;
    if (bytes[i + 1] === 0) oddZeros++;
  }
  const evenRatio = evenZeros / pairs;
  const oddRatio = oddZeros / pairs;
  const DOMINANT = 0.30;
  const TOLERANCE = 0.05;
  if (oddRatio >= DOMINANT && evenRatio <= TOLERANCE) return 'utf-16le';
  if (evenRatio >= DOMINANT && oddRatio <= TOLERANCE) return 'utf-16be';
  return null;
}

/**
 * CSV 字节解码（只在 parseFile 里用，parseCSV(text) 仍是纯函数）。
 * 浏览器原生 TextDecoder 支持 gb18030（向下兼容 GBK / GB2312），零新依赖。
 * 优先级：BOM 判定 > 严格 UTF-8 探测 > 无 BOM UTF-16 启发式 > GB18030 回落 > 宽松解码兜底。
 */
function decodeCSVBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const startsWith = (bom: number[]) => bom.every((v, i) => bytes[i] === v);

  let encoding = 'utf-8';
  let offset = 0;
  if (startsWith([0xef, 0xbb, 0xbf])) {
    // UTF-8 BOM：去掉 BOM 再按 UTF-8 解
    offset = 3;
  } else if (startsWith([0xff, 0xfe])) {
    encoding = 'utf-16le';
    offset = 2;
  } else if (startsWith([0xfe, 0xff])) {
    encoding = 'utf-16be';
    offset = 2;
  } else {
    // 无 BOM：优先级「严格 UTF-8 探测 → 无 BOM UTF-16 启发式 → GB18030 → 宽松 UTF-8 兜底」。
    // 严格探测成功且没有成片 U+0000 时立刻返回：正常 UTF-8 / 纯 ASCII CSV 走原路径，零行为变化。
    let strictText: string | null = null;
    try {
      strictText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      strictText = null;
    }
    if (strictText !== null && !hasManyNulls(strictText)) return strictText;

    // 能走到这里只有两种可能：不是合法 UTF-8（Excel 另存的 GBK / GB2312），
    // 或解出的是「字符 + \u0000」交替的伪 UTF-8（无 BOM 的 UTF-16 纯 ASCII 内容）。
    // 先做保守的 UTF-16 偏态判定，命中才按 UTF-16 解码。
    const utf16 = detectUTF16WithoutBOM(bytes);
    if (utf16) {
      try {
        return new TextDecoder(utf16).decode(bytes);
      } catch {
        return new TextDecoder('utf-8').decode(bytes);
      }
    }
    // 启发式没判定：若严格 UTF-8 其实成功过（只是含 NUL），保守保留原结果；
    // 否则按 Excel 另存的中文 CSV 回落 GB18030。
    if (strictText !== null) return strictText;
    encoding = 'gb18030';
  }

  const body = bytes.subarray(offset);
  try {
    return new TextDecoder(encoding).decode(body);
  } catch {
    // 非法字节 / 运行环境不支持该编码：宽松解码兜底，绝不抛未捕获异常
    return new TextDecoder('utf-8').decode(body);
  }
}

export async function parseFile(file: File): Promise<ImportResult> {
  const format = detectFormat(file.name);
  if (!format) {
    return { rows: [], errors: ['不支持的文件格式。请使用 CSV、XLSX 或 JSON 文件。'], total: 0 };
  }

  try {
    if (format === 'csv') {
      const buffer = await file.arrayBuffer();
      return parseCSV(decodeCSVBuffer(buffer));
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
