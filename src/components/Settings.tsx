import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { exportAddressesToExcel, exportHistoryToExcel } from '../utils/exportExcel';

export default function Settings() {
  const { settings, addresses, printHistory, updateSettings, setAmapKey, getAmapKey } = useStore();
  const [amapKeyInput, setAmapKeyInput] = useState('');
  const [keyShown, setKeyShown] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = getAmapKey();
    setAmapKeyInput(key);
  }, [getAmapKey]);

  const handleSaveKey = () => {
    setAmapKey(amapKeyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const maskedKey = (key: string) => {
    if (!key) return '未设置';
    if (key.length <= 8) return key;
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Default Sender */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
          默认寄件人
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="姓名"
            value={settings.defaultSender.name}
            onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, name: e.target.value } })}
          />
          <input
            className="input-field"
            placeholder="电话"
            value={settings.defaultSender.phone || ''}
            onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, phone: e.target.value } })}
          />
          <input
            className="input-field sm:col-span-2"
            placeholder="地址"
            value={settings.defaultSender.address}
            onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, address: e.target.value } })}
          />
          <input
            className="input-field"
            placeholder="邮编"
            value={settings.defaultSender.postcode || ''}
            onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, postcode: e.target.value } })}
          />
        </div>
      </div>

      {/* AMap API Key */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-cta-500 rounded-full" />
          高德地图 API Key
        </h2>
        <p className="text-xs text-brand-400 mb-3">
          用于地址智能联想。Key 将使用 AES 加密存储。
          <a
            href="https://lbs.amap.com/api/webservice/create-project-and-key"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-500 hover:text-brand-700 ml-1"
          >
            去申请 Key
          </a>
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="input-field pr-16"
              type={keyShown ? 'text' : 'password'}
              placeholder="请输入高德地图 Web服务 Key"
              value={amapKeyInput}
              onChange={(e) => setAmapKeyInput(e.target.value)}
            />
            <button
              onClick={() => setKeyShown(!keyShown)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-400 hover:text-brand-600"
            >
              {keyShown ? '隐藏' : '显示'}
            </button>
          </div>
          <button onClick={handleSaveKey} className="btn-primary text-sm whitespace-nowrap">
            {saved ? '已保存' : '保存'}
          </button>
        </div>
        {saved && (
          <p className="text-xs text-emerald-600 mt-2">Key 已加密保存</p>
        )}
      </div>

      {/* Data Management */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
          数据管理
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-brand-700">导出地址簿</p>
              <p className="text-xs text-brand-400">导出为 Excel (.xlsx) 文件</p>
            </div>
            <button
              onClick={() => exportAddressesToExcel(addresses)}
              className="btn-outline text-sm"
              disabled={addresses.length === 0}
            >
              导出
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-brand-50">
            <div>
              <p className="text-sm text-brand-700">导出打印历史</p>
              <p className="text-xs text-brand-400">导出为 Excel (.xlsx) 文件</p>
            </div>
            <button
              onClick={() => exportHistoryToExcel(printHistory)}
              className="btn-outline text-sm"
              disabled={printHistory.length === 0}
            >
              导出
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-brand-50">
            <div>
              <p className="text-sm text-brand-700">导出所有数据</p>
              <p className="text-xs text-brand-400">导出全部数据为 JSON 备份文件</p>
            </div>
            <button
              onClick={() => {
                const data = {
                  addresses, printHistory, settings,
                  exportedAt: new Date().toISOString(),
                  version: '1.0.0',
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `envelope-printer-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn-outline text-sm"
            >
              导出JSON
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-brand-50">
            <div>
              <p className="text-sm text-brand-700">导入数据备份</p>
              <p className="text-xs text-brand-400">从 JSON 备份文件恢复数据</p>
            </div>
            <label className="btn-outline text-sm cursor-pointer">
              导入
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target?.result as string);
                      if (data.addresses) useStore.setState({ addresses: data.addresses });
                      if (data.printHistory) useStore.setState({ printHistory: data.printHistory });
                      if (data.settings) {
                        const s = data.settings as typeof settings;
                        updateSettings(s);
                        if (s.amapKey) setAmapKey(s.amapKey);
                      }
                      alert('数据导入成功');
                    } catch {
                      alert('导入失败：文件格式不正确');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
          关于
        </h2>
        <p className="text-sm text-brand-500">信封打印助手 v1.0.0</p>
        <p className="text-xs text-brand-400 mt-1">
          支持 DL/C5/C4/C6 标准信封规格及自定义尺寸。所有数据存储于浏览器本地，不会上传至任何服务器。
        </p>
        <div className="mt-3 flex gap-3 text-xs text-brand-400">
          <span>地址簿: {addresses.length} 条</span>
          <span>打印历史: {printHistory.length} 条</span>
        </div>
      </div>
    </div>
  );
}
