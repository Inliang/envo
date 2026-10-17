import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address, PrintRecord, AppSettings, TabKey, EnvelopeSettings, SenderInfo } from './types';
import { CANVAS_FONT_STACK } from './types';
import { encrypt, decrypt } from '../utils/encryption';

interface AppState {
  activeTab: TabKey;
  addresses: Address[];
  printHistory: PrintRecord[];
  settings: AppSettings;
  currentRecipient: Address | null;
  currentEnvelope: EnvelopeSettings;

  setActiveTab: (tab: TabKey) => void;
  addAddress: (addr: Omit<Address, 'id' | 'createdAt'>) => void;
  addAddresses: (addrs: Omit<Address, 'id' | 'createdAt'>[]) => void;
  updateAddress: (id: string, updates: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  addPrintRecord: (record: Omit<PrintRecord, 'id' | 'printedAt'>) => void;
  deletePrintRecord: (id: string) => void;
  clearHistory: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setAmapKey: (key: string) => void;
  getAmapKey: () => string;
  setCurrentRecipient: (addr: Address | null) => void;
  setCurrentEnvelope: (s: Partial<EnvelopeSettings>) => void;
}

/** persist 落盘的数据形态（site-spec §5.2.4：排除 activeTab / currentRecipient） */
interface PersistedShape {
  addresses: Address[];
  printHistory: PrintRecord[];
  settings: AppSettings;
  currentEnvelope: EnvelopeSettings;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DEFAULT_SENDER: SenderInfo = {
  name: '',
  address: '',
  phone: '',
  postcode: '',
};

const DEFAULT_ENVELOPE: EnvelopeSettings = {
  size: 'DL',
  fontSize: 14,
  fontFamily: CANVAS_FONT_STACK,
  showReturnAddress: true,
  showLogo: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultSender: DEFAULT_SENDER,
  defaultEnvelope: DEFAULT_ENVELOPE,
  amapKey: '',
};

/* ═══════════════════════════════════════════════════════════════
 * 迁移辅助（site-spec §5.2.4 冻结契约）
 * 铁律：任何异常都不能抛出 —— 迁移失败回退默认值，绝不能白屏。
 * ═══════════════════════════════════════════════════════════════ */

/** 老 v1 数据里的 'Inter, sans-serif' 已废弃；含 Inter 或为空的字体栈一律替换为新栈 */
function fixFontFamily(value: unknown): string {
  if (typeof value === 'string' && value.trim() && !value.includes('Inter')) {
    return value;
  }
  return CANVAS_FONT_STACK;
}

function mergeEnvelope(persisted: unknown): EnvelopeSettings {
  const base = persisted && typeof persisted === 'object' ? (persisted as Partial<EnvelopeSettings>) : {};
  const fontSize = typeof base.fontSize === 'number' && Number.isFinite(base.fontSize) ? base.fontSize : DEFAULT_ENVELOPE.fontSize;
  return {
    ...DEFAULT_ENVELOPE,
    ...base,
    fontSize,
    fontFamily: fixFontFamily(base.fontFamily),
    showReturnAddress: typeof base.showReturnAddress === 'boolean' ? base.showReturnAddress : DEFAULT_ENVELOPE.showReturnAddress,
    showLogo: typeof base.showLogo === 'boolean' ? base.showLogo : DEFAULT_ENVELOPE.showLogo,
  };
}

function mergeSettings(persisted: unknown): AppSettings {
  const base = persisted && typeof persisted === 'object' ? (persisted as Partial<AppSettings>) : {};
  const sender = base.defaultSender && typeof base.defaultSender === 'object' ? base.defaultSender : {};
  return {
    defaultSender: { ...DEFAULT_SENDER, ...sender },
    defaultEnvelope: mergeEnvelope(base.defaultEnvelope),
    amapKey: typeof base.amapKey === 'string' ? base.amapKey : '',
  };
}

/**
 * v2 → v3 单条收件人合并（B10）。
 *
 * 老数据里 name（姓名）与 recipient（单位）是两个字段，但打印主行从来只取一个值
 * （envelopeCanvas：recipient.recipient || recipient.name），填了姓名再填单位，姓名直接不显示。
 * 合并后唯一真源是 name，recipient 字段删除。
 *
 * 取值顺序 old.recipient || old.name —— 与原主行逻辑「单位优先」完全一致：
 * 两者都有时取单位，姓名本来也不会被打印出来，因此**没有信息损失**。
 *
 * 该函数必须幂等：zustand 从任意历史版本（1 / 2 / 3）调入 migrate 都只会跑一次，
 * 但对已迁移过的 v3 数据再跑一遍结果必须不变（recipient 已删 → 取到的是原 name）。
 */
function mergeRecipient(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { name: '', address: '' };
  const r = raw as Record<string, unknown>;
  const asString = (v: unknown) => (typeof v === 'string' ? v : '');
  const merged: Record<string, unknown> = { ...r };
  merged.name = asString(r.recipient) || asString(r.name);
  merged.address = asString(r.address);
  // 主键与时间戳顺手兜底：脏数据进入 UI 后会造成 React key 冲突 / new Date(undefined)
  merged.id = asString(r.id) || genId();
  merged.createdAt = asString(r.createdAt) || new Date().toISOString();
  delete merged.recipient;
  return merged;
}

function migrateAddresses(raw: unknown): Address[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => mergeRecipient(a) as unknown as Address);
}

/** printHistory 里的 recipient 是一整个 Address 对象，要对它内部做同样的合并 */
function migrateHistory(raw: unknown): PrintRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((rec) => {
    if (!rec || typeof rec !== 'object') return { recipient: { name: '', address: '' } } as unknown as PrintRecord;
    const r = rec as Record<string, unknown>;
    return { ...r, recipient: mergeRecipient(r.recipient) } as unknown as PrintRecord;
  });
}

/**
 * v1 / v2 → v3 迁移（site-spec §5.2.4）：
 * 保留 addresses / printHistory / settings / currentEnvelope 四项业务数据，
 * 丢弃 activeTab / currentRecipient 两个 UI 瞬时态；
 * settings 做深合并（缺字段补默认值）；收件人字段合并（见 mergeRecipient）；
 * 失败回退默认值且绝不抛错。
 */
export function migratePersisted(persisted: unknown, _from: number): PersistedShape {
  try {
    const p = (persisted ?? {}) as Partial<PersistedShape>;
    return {
      addresses: migrateAddresses(p.addresses),
      printHistory: migrateHistory(p.printHistory),
      settings: mergeSettings(p.settings),
      currentEnvelope: mergeEnvelope(p.currentEnvelope),
    };
  } catch (e) {
    console.warn('[envo] 本地数据迁移失败，已回退到默认设置', e);
    return {
      addresses: [],
      printHistory: [],
      settings: DEFAULT_SETTINGS,
      currentEnvelope: DEFAULT_ENVELOPE,
    };
  }
}

export { DEFAULT_ENVELOPE, DEFAULT_SETTINGS };

/** 只持久化业务数据；activeTab（落地必须回编辑页）与 currentRecipient（防误印旧地址）显式排除 */
export function partializeState(state: AppState): PersistedShape {
  return {
    addresses: state.addresses,
    printHistory: state.printHistory,
    settings: state.settings,
    currentEnvelope: state.currentEnvelope,
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'editor',
      addresses: [],
      printHistory: [],
      settings: DEFAULT_SETTINGS,
      currentRecipient: null,
      currentEnvelope: DEFAULT_ENVELOPE,

      setActiveTab: (tab) => set({ activeTab: tab }),

      addAddress: (addr) => {
        const newAddr: Address = {
          ...addr,
          id: genId(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ addresses: [...s.addresses, newAddr] }));
      },

      addAddresses: (addrs) => {
        const now = new Date().toISOString();
        const newAddrs: Address[] = addrs.map((addr) => ({
          ...addr,
          id: genId(),
          createdAt: now,
        }));
        set((s) => ({ addresses: [...s.addresses, ...newAddrs] }));
      },

      updateAddress: (id, updates) =>
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAddress: (id) =>
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

      addPrintRecord: (record) => {
        const pr: PrintRecord = {
          ...record,
          id: genId(),
          printedAt: new Date().toISOString(),
        };
        set((s) => ({ printHistory: [pr, ...s.printHistory] }));
      },

      deletePrintRecord: (id) =>
        set((s) => ({ printHistory: s.printHistory.filter((r) => r.id !== id) })),

      clearHistory: () => set({ printHistory: [] }),

      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      setAmapKey: (key) => {
        const encrypted = key ? encrypt(key) : '';
        set((s) => ({
          settings: { ...s.settings, amapKey: encrypted },
        }));
      },

      getAmapKey: () => {
        const encrypted = get().settings.amapKey;
        return encrypted ? decrypt(encrypted) : '';
      },

      setCurrentRecipient: (addr) => set({ currentRecipient: addr }),

      setCurrentEnvelope: (partial) =>
        set((s) => ({ currentEnvelope: { ...s.currentEnvelope, ...partial } })),
    }),
    {
      name: 'envelope-printer-storage',
      version: 3,
      partialize: partializeState,
      migrate: migratePersisted,
    }
  )
);
