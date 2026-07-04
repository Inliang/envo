export interface Address {
  id: string;
  name: string;
  recipient: string;
  address: string;
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
  customWidth?: number;
  customHeight?: number;
  fontSize: number;
  fontFamily: string;
  showReturnAddress: boolean;
  showLogo: boolean;
}

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
  home: 'bg-emerald-100 text-emerald-700',
  work: 'bg-blue-100 text-blue-700',
  family: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
};
