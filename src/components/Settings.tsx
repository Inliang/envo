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

  return (
    <div className="max-w-2xl space-y-5">
      {/* Default Sender */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
          默认寄件人
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cfg-sender-name" className="input-label">姓名</label>
            <input
              id="cfg-sender-name"
              className="input-field"
              placeholder="姓名"
              value={settings.defaultSender.name}
              onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, name: e.target.value } })}
            />
          </div>
          <div>
            <label htmlFor="cfg-sender-phone" className="input-label">电话</label>
            <input
              id="cfg-sender-phone"
              className="input-field"
              placeholder="电话"
              value={settings.defaultSender.phone || ''}
              onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, phone: e.target.value } })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cfg-sender-address" className="input-label">地址</label>
            <input
              id="cfg-sender-address"
              className="input-field"
              placeholder="地址"
              value={settings.defaultSender.address}
              onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, address: e.target.value } })}
            />
          </div>
          <div>
            <label htmlFor="cfg-sender-postcode" className="input-label">邮编</label>
            <input
              id="cfg-sender-postcode"
              className="input-field"
              placeholder="邮编"
              value={settings.defaultSender.postcode || ''}
              onChange={(e) => updateSettings({ defaultSender: { ...settings.defaultSender, postcode: e.target.value } })}
            />
          </div>
        </div>
      </div>

      {/* AMap API Key */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-cta-500 rounded-full" />
          高德地图 API Key
        </h2>
        {/* R7：不谎报安全等级 —— SECRET 硬编码在前端，加密只是防明文裸奔 */}
        <div className="text-slate-600 mb-3 space-y-1.5">
          <p className="text-xs leading-5">
            用于地址智能联想，输入地址关键词时自动提示候选地址。Key 只存在这台设备的浏览器里，不会上传服务器，存一次下次打开就不用重填。
            <a
              href="https://lbs.amap.com/api/webservice/create-project-and-key"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:text-brand-800 ml-1 underline underline-offset-2"
            >
              去申请 Key
            </a>
          </p>
          <p className="text-xs leading-5 text-slate-500">
            注意：这只是本地保存，不是加密保险箱。请勿填写高价值 Key，建议在高德控制台设置每日调用上限。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="cfg-amap-key" className="sr-only">高德地图 Web服务 Key</label>
            <input
              id="cfg-amap-key"
              className="input-field pr-16"
              type={keyShown ? 'text' : 'password'}
              placeholder="请输入高德地图 Web服务 Key"
              value={amapKeyInput}
              onChange={(e) => setAmapKeyInput(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setKeyShown(!keyShown)}
              aria-pressed={keyShown}
              aria-label={keyShown ? '隐藏高德 Key' : '显示高德 Key'}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:py-1.5 px-1 text-xs text-brand-700 hover:text-brand-800"
            >
              {keyShown ? '隐藏' : '显示'}
            </button>
          </div>
          <button onClick={handleSaveKey} className="btn-primary whitespace-nowrap">
            {saved ? 'Key 已保存' : '保存 Key'}
          </button>
        </div>
        {saved && (
          <p className="text-xs text-emerald-800 mt-2" role="status" aria-live="polite">Key 已保存到本机</p>
        )}
      </div>

      {/* Data Management */}
      <div className="card-bento p-5">
        <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
          数据管理
        </h2>
        <div className="space-y-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between py-2">
            <div>
              <p className="text-sm text-slate-700">导出地址簿</p>
              <p className="text-xs text-slate-500">导出为 Excel (.xlsx) 文件</p>
            </div>
            <button
              onClick={() => exportAddressesToExcel(addresses)}
              className="btn-outline w-full sm:w-auto"
              disabled={addresses.length === 0}
            >
              导出 Excel
            </button>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between py-2 border-t border-brand-50">
            <div>
              <p className="text-sm text-slate-700">导出打印历史</p>
              <p className="text-xs text-slate-500">导出为 Excel (.xlsx) 文件</p>
            </div>
            <button
              onClick={() => exportHistoryToExcel(printHistory)}
              className="btn-outline w-full sm:w-auto"
              disabled={printHistory.length === 0}
            >
              导出 Excel
            </button>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between py-2 border-t border-brand-50">
            <div>
              <p className="text-sm text-slate-700">导出所有数据</p>
              <p className="text-xs text-slate-500">导出全部数据为 JSON 备份文件</p>
            </div>
            <button
              onClick={() => {
                const data = {
                  addresses, printHistory, settings,
                  exportedAt: new Date().toISOString(),
                  version: '1.0.1',
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `envelope-printer-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn-outline w-full sm:w-auto"
            >
              导出 JSON
            </button>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between py-2 border-t border-brand-50">
            <div>
              <p className="text-sm text-slate-700">导入数据备份</p>
              <p className="text-xs text-slate-500">从 JSON 备份文件恢复数据</p>
            </div>
            <label className="btn-outline w-full sm:w-auto cursor-pointer">
              导入 JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
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
                        // R2 修复：备份里的 amapKey 已是密文，直接随 updateSettings 写入即可。
                        // 此前再调一次 setAmapKey 会把密文二次加密，导入后 Key 解密出乱码，联想静默失效。
                      }
                      alert('数据导入成功，地址簿与打印历史已更新');
                    } catch {
                      alert('导入失败：这不是 Envo 导出的 JSON 备份文件');
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
        <p className="text-sm text-slate-700">信封打印助手 v1.0.1</p>
        <p className="text-xs text-slate-500 mt-1">
          支持 ZL/DL/C5/C4 国内信封与 B6/C6 国际信封规格，也可以自己填尺寸。所有数据存储于浏览器本地，不会上传至任何服务器。
        </p>
        <div className="mt-3 flex gap-3 text-xs text-slate-500">
          <span>地址簿 {addresses.length} 条</span>
          <span>打印历史 {printHistory.length} 条</span>
        </div>
      </div>
    </div>
  );
}
