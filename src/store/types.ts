export interface Address {
  id: string;
  /**
   * 收件人（唯一真源）。姓名或单位都填这里 —— B10 起不再区分 name / recipient 两个字段：
   * 信封主行只有一个位置，两个框必然互相覆盖（老逻辑「单位优先」直接把姓名丢弃）。
   */
  name: string;
  address: string;
  postcode?: string;
  phone?: string;
  tag?: 'home' | 'work' | 'family' | 'other';
  tagLabel?: string;
  createdAt: string;
}

export interface SenderInfo {
  name: string;
  address: string;
  phone?: string;
  postcode?: string;
}

export type EnvelopeSize = 'DL' | 'ZL' | 'C5' | 'C4' | 'C6' | 'B6' | 'custom';

export interface EnvelopeSettings {
  size: EnvelopeSize;
  /**
   * 书写格式（B11：与尺寸解耦）。任意尺寸都能套国内格式或国际格式。
   * 必须保持可选：老数据没有这个字段，缺失时回退「按尺寸 category 判断」，零迁移风险。
   */
  format?: 'domestic' | 'international';
  customWidth?: number;
  customHeight?: number;
  fontSize: number;
  fontFamily: string;
  showReturnAddress: boolean;
  showLogo: boolean;
}

// Canvas 字体栈（design-spec §3.1②：与 UI 栈不同，必须独立一套）。
// ⚠️ 绝不能把 UI 栈（含 -apple-system / BlinkMacSystemFont）塞进 ctx.font：
// CSS font shorthand 解析会把带前导连字符的族名判为非法，整条赋值被静默忽略，
// 信封回落到 10px 默认字体 —— 预览正常、打印整批报废、控制台零报错。
export const CANVAS_FONT_STACK =
  'system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif';

export interface PrintRecord {
  id: string;
  recipient: Address;
  sender: SenderInfo;
  settings: EnvelopeSettings;
  printedAt: string;
  type: 'print' | 'pdf';
}

export interface AppSettings {
  defaultSender: SenderInfo;
  defaultEnvelope: EnvelopeSettings;
  amapKey: string;
}

export type TabKey = 'editor' | 'addressbook' | 'history' | 'settings';

export interface EnvelopeSizeConfig {
  width: number;
  height: number;
  label: string;
  category: 'domestic' | 'international';
}

export const ENVELOPE_SIZES: Record<string, EnvelopeSizeConfig> = {
  ZL:  { width: 230, height: 120, label: 'ZL 6号信封 (230×120mm) · 国内', category: 'domestic' },
  DL:  { width: 220, height: 110, label: 'DL 5号信封 (220×110mm) · 国内', category: 'domestic' },
  B6:  { width: 176, height: 125, label: 'B6 (176×125mm) · 国际', category: 'international' },
  C6:  { width: 162, height: 114, label: 'C6 (162×114mm) · 国际', category: 'international' },
  C5:  { width: 229, height: 162, label: 'C5 7号信封 (229×162mm) · 国内', category: 'domestic' },
  C4:  { width: 324, height: 229, label: 'C4 9号信封 (324×229mm) · 国内', category: 'domestic' },
  custom: { width: 220, height: 110, label: '自定义', category: 'international' },
};

export const TAG_COLORS: Record<string, string> = {
  home: 'bg-emerald-100 text-emerald-800',
  work: 'bg-blue-100 text-blue-800',
  family: 'bg-purple-100 text-purple-800',
  other: 'bg-slate-100 text-slate-700',
};
