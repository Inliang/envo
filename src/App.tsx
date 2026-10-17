import { useStore } from './store';
import EnvelopeEditor from './components/EnvelopeEditor';
import AddressBook from './components/AddressBook';
import PrintHistory from './components/PrintHistory';
import Settings from './components/Settings';
import type { TabKey } from './store/types';

const TABS: { key: TabKey; label: string; shortLabel: string; icon: string }[] = [
  { key: 'editor', label: '信封编辑', shortLabel: '编辑', icon: '✉' },
  { key: 'addressbook', label: '地址簿', shortLabel: '地址簿', icon: '📖' },
  { key: 'history', label: '打印历史', shortLabel: '历史', icon: '🖨' },
  { key: 'settings', label: '设置', shortLabel: '设置', icon: '⚙' },
];

export default function App() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-brand-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              E
            </div>
            <div>
              <h1 className="text-lg font-semibold text-brand-900 leading-tight">Envo 信封打印助手</h1>
              <p className="text-xs text-brand-700">在线排版信封，一键打印或导出 PDF</p>
            </div>
          </div>
          <nav aria-label="主导航" className="grid grid-cols-4 gap-0.5 bg-brand-50 rounded-xl p-1 sm:flex sm:gap-1 sm:w-auto">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5
                             px-1 py-2 min-h-[48px] rounded-lg text-[11px] leading-tight font-medium
                             transition-all duration-150
                             sm:flex-row sm:min-h-0 sm:px-4 sm:py-2 sm:text-sm sm:gap-0
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-white text-brand-800 shadow-sm'
                      : 'text-brand-700 hover:text-brand-800 hover:bg-white/60'
                  }`}
                >
                  <span className="text-base leading-none sm:text-sm sm:mr-1.5" aria-hidden="true">{tab.icon}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:px-6">
        {activeTab === 'editor' && <EnvelopeEditor />}
        {activeTab === 'addressbook' && <AddressBook />}
        {activeTab === 'history' && <PrintHistory />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-brand-100/60 bg-gradient-to-t from-brand-50/30 px-4">
        <span className="block mb-4 text-xs tracking-normal text-slate-500">Envo v1.0.1 · 数据只存在你的浏览器里，不上传服务器</span>
        <span className="inline-flex items-center gap-2 flex-wrap justify-center">
          <a
            href="https://github.com/Inliang/envo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Envo 项目源码（GitHub）"
            className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-0 sm:py-2 rounded-full bg-white/70 text-brand-700 hover:bg-white hover:text-brand-800 hover:shadow-sm transition-all duration-200 text-xs leading-none border border-brand-100/60"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            Envo
          </a>
          <a
            href="https://inliang.github.io/fmo-secondary/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="FMO Secondary 项目"
            className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-0 sm:py-2 rounded-full bg-white/70 text-brand-700 hover:bg-white hover:text-brand-800 hover:shadow-sm transition-all duration-200 text-xs leading-none border border-brand-100/60"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M2 8h12" strokeLinecap="round"/><path d="M8 1.5A10.5 10.5 0 0111.5 8 10.5 10.5 0 018 14.5 10.5 10.5 0 014.5 8 10.5 10.5 0 018 1.5z" strokeLinecap="round"/></svg>
            FMO
          </a>
          <a
            href="https://qsl.jdbot.top/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="QSL 卡片管理"
            className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-0 sm:py-2 rounded-full bg-white/70 text-brand-700 hover:bg-white hover:text-brand-800 hover:shadow-sm transition-all duration-200 text-xs leading-none border border-brand-100/60"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 5.5l6.2 4.4a1 1 0 001.1 0L14 5.5"/></svg>
            QSL
          </a>
        </span>
      </footer>
    </div>
  );
}
