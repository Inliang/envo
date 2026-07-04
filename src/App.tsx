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
      <footer className="text-center py-4 text-xs text-brand-300">
        Envo v1.0.0 - 数据仅存储在本地浏览器
      </footer>
    </div>
  );
}
