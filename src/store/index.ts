import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address, PrintRecord, AppSettings, TabKey, EnvelopeSettings, SenderInfo } from './types';
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
  fontFamily: 'Inter, sans-serif',
  showReturnAddress: true,
  showLogo: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultSender: DEFAULT_SENDER,
  defaultEnvelope: DEFAULT_ENVELOPE,
  amapKey: '',
};

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
      version: 1,
    }
  )
);
