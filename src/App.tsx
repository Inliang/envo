import { useStore } from './store';
import EnvelopeEditor from './components/EnvelopeEditor';
import AddressBook from './components/AddressBook';
import PrintHistory from './components/PrintHistory';
import Settings from './components/Settings';
import type { TabKey } from './store/types';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'editor', label: '信封编辑', icon: '✉' },
  { key: 'addressbook', label: '地址簿', icon: '📖' },
  { key: 'history', label: '打印历史', icon: '🖨' },
  { key: 'settings', label: '设置', icon: '⚙' },
];

export default function App() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-brand-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              E
            </div>
            <div>
              <h1 className="text-lg font-semibold text-brand-900 leading-tight">Envo</h1>
              <p className="text-xs text-brand-400">信封打印助手</p>
            </div>
          </div>
          <nav className="flex gap-1 bg-brand-50 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.key
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-brand-400 hover:text-brand-600'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {activeTab === 'editor' && <EnvelopeEditor />}
        {activeTab === 'addressbook' && <AddressBook />}
        {activeTab === 'history' && <PrintHistory />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Footer */}
      <footer className="text-center py-5 text-xs text-brand-300 border-t border-brand-50">
        <span className="block mb-3 text-[11px]">Envo v1.0.0 · 数据仅存储在本地浏览器</span>
        <span className="inline-flex items-center gap-3">
          <a
            href="https://github.com/Inliang/envo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50/60 text-brand-500 hover:bg-brand-100 hover:text-brand-700 transition-all duration-200 text-[11px] leading-none"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            github.com/Inliang/envo
          </a>
          <span className="text-brand-200 select-none">/</span>
          <a
            href="https://inliang.github.io/fmo-secondary/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50/60 text-brand-500 hover:bg-brand-100 hover:text-brand-700 transition-all duration-200 text-[11px] leading-none"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M2 8h12" strokeLinecap="round"/><path d="M8 1.5A10.5 10.5 0 0111.5 8 10.5 10.5 0 018 14.5 10.5 10.5 0 014.5 8 10.5 10.5 0 018 1.5z" strokeLinecap="round"/></svg>
            fmo-secondary
          </a>
        </span>
      </footer>
    </div>
  );
}
