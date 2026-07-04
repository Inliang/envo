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

export interface EnvelopeSettings {
  size: 'DL' | 'C5' | 'C4' | 'C6' | 'custom';
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

export const ENVELOPE_SIZES: Record<string, { width: number; height: number; label: string }> = {
  DL: { width: 220, height: 110, label: 'DL (220x110mm)' },
  C5: { width: 229, height: 162, label: 'C5 (229x162mm)' },
  C4: { width: 324, height: 229, label: 'C4 (324x229mm)' },
  C6: { width: 162, height: 114, label: 'C6 (162x114mm)' },
  custom: { width: 220, height: 110, label: '自定义' },
};

export const TAG_COLORS: Record<string, string> = {
  home: 'bg-emerald-100 text-emerald-700',
  work: 'bg-blue-100 text-blue-700',
  family: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
};
