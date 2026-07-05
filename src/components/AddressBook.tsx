import { useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { TAG_COLORS } from '../store/types';
import type { Address } from '../store/types';
import { drawEnvelope } from '../utils/envelopeCanvas';
import { exportAddressesToExcel } from '../utils/exportExcel';
import { parseFile } from '../utils/importAddresses';
import type { ImportRow, ImportResult } from '../utils/importAddresses';

export default function AddressBook() {
  const {
    addresses,
    settings,
    currentEnvelope,
    addAddress,
    addAddresses,
    deleteAddress,
    setCurrentRecipient,
    setActiveTab,
  } = useStore();

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // New address form state
  const [newName, setNewName] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTag, setNewTag] = useState<string>('');

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = addresses.filter((a) => {
    if (tagFilter !== 'all' && a.tag !== tagFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(s) ||
      a.recipient.toLowerCase().includes(s) ||
      a.address.toLowerCase().includes(s)
    );
  });

  const tags = ['all', 'home', 'work', 'family', 'other'];
  const tagLabels: Record<string, string> = {
    all: '全部',
    home: '家',
    work: '公司',
    family: '亲友',
    other: '其他',
  };

  const handleAdd = () => {
    if (!newName || !newAddr) return;
    addAddress({
      name: newName,
      recipient: newRecipient || newName,
      address: newAddr,
      postcode: newPostcode,
      phone: newPhone,
      tag: (newTag as Address['tag']) || undefined,
    });
    setNewName('');
    setNewRecipient('');
    setNewAddr('');
    setNewPostcode('');
    setNewPhone('');
    setNewTag('');
    setShowAdd(false);
  };

  const handleUseAddress = (addr: Address) => {
    setCurrentRecipient(addr);
    setActiveTab('editor');
  };

  // --- Selection ---
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  // --- Import ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await parseFile(file);
      setImportResult(result);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = () => {
    if (!importResult || importResult.rows.length === 0) return;
    const addrs = importResult.rows.map((row: ImportRow) => ({
      name: row.name,
      recipient: row.recipient,
      address: row.address,
      postcode: row.postcode || undefined,
      phone: row.phone || undefined,
      tag: row.tag,
      tagLabel: row.tagLabel || undefined,
    }));
    addAddresses(addrs);
    setImportResult(null);
  };

  const handleImportCancel = () => {
    setImportResult(null);
  };

  // --- Batch Print ---
  const handleBatchPrint = useCallback(() => {
    const selected = addresses.filter((a) => selectedIds.has(a.id));
    if (selected.length === 0) return;

    const sender = settings.defaultSender;
    const envSettings = {
      ...currentEnvelope,
      fontSize: settings.defaultEnvelope.fontSize,
      fontFamily: settings.defaultEnvelope.fontFamily,
      showReturnAddress: settings.defaultEnvelope.showReturnAddress,
      showLogo: settings.defaultEnvelope.showLogo,
    };

    const container = document.createElement('div');
    container.id = 'envo-batch-print-area';
    container.style.cssText =
      'position:fixed;left:0;top:0;width:100%;z-index:-1;opacity:0;';

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body > *:not(#envo-batch-print-area) { display: none !important; }
        #envo-batch-print-area {
          position: static !important;
          opacity: 1 !important;
          z-index: auto !important;
        }
        .envo-batch-canvas {
          display: block;
          page-break-after: always;
          max-width: 100%;
          height: auto;
        }
        .envo-batch-canvas:last-child { page-break-after: avoid; }
        @page { margin: 0; }
      }
    `;
    document.head.appendChild(style);

    for (const addr of selected) {
      const canvas = document.createElement('canvas');
      canvas.className = 'envo-batch-canvas';
      drawEnvelope(canvas, sender, addr, envSettings, true);
      container.appendChild(canvas);
    }

    document.body.appendChild(container);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.removeChild(container);
        document.head.removeChild(style);
      }, 500);
    }, 200);
  }, [addresses, selectedIds, settings, currentEnvelope]);

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-900">地址簿</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleImportClick} className="btn-outline text-sm">
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => exportAddressesToExcel(addresses)}
            className="btn-outline text-sm"
            disabled={addresses.length === 0}
          >
            导出Excel
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-cta text-sm">
            + 添加地址
          </button>
        </div>
      </div>

      {/* Importing indicator */}
      {importing && (
        <div className="card-bento p-4 text-center text-brand-500 text-sm">
          正在解析文件...
        </div>
      )}

      {/* Import Preview Modal */}
      {importResult && (
        <div className="card-bento p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-800">导入预览</h3>
            <span className="text-sm text-brand-500">
              共解析 {importResult.total} 条记录
              {importResult.errors.length > 0 && (
                <span className="text-amber-500 ml-2">
                  （{importResult.errors.length} 条跳过）
                </span>
              )}
            </span>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 max-h-24 overflow-y-auto">
              {importResult.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          {importResult.rows.length === 0 ? (
            <p className="text-sm text-brand-400">没有可导入的有效记录</p>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-brand-100 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-brand-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left text-brand-600 font-medium">姓名</th>
                    <th className="p-2 text-left text-brand-600 font-medium">收件人</th>
                    <th className="p-2 text-left text-brand-600 font-medium">地址</th>
                    <th className="p-2 text-left text-brand-600 font-medium">邮编</th>
                    <th className="p-2 text-left text-brand-600 font-medium">电话</th>
                    <th className="p-2 text-left text-brand-600 font-medium">标签</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-brand-50 hover:bg-brand-50/50">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2 text-brand-500">{row.recipient}</td>
                      <td className="p-2 max-w-[200px] truncate" title={row.address}>
                        {row.address}
                      </td>
                      <td className="p-2">{row.postcode}</td>
                      <td className="p-2">{row.phone}</td>
                      <td className="p-2">{tagLabels[row.tag || ''] || row.tagLabel || '-'}</td>
                    </tr>
                  ))}
                  {importResult.rows.length > 50 && (
                    <tr>
                      <td colSpan={6} className="p-2 text-center text-brand-400">
                        ... 还有 {importResult.rows.length - 50} 条记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImportConfirm}
              disabled={importResult.rows.length === 0}
              className="btn-primary text-sm"
            >
              确认导入 {importResult.rows.length} 条
            </button>
            <button onClick={handleImportCancel} className="btn-outline text-sm">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="card-bento p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="姓名 *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="单位/公司"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
            />
          </div>
          <textarea
            className="input-field resize-none"
            placeholder="地址 *"
            rows={2}
            value={newAddr}
            onChange={(e) => setNewAddr(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className="input-field"
              placeholder="邮编（如 100000）"
              value={newPostcode}
              onChange={(e) => setNewPostcode(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="电话"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <select
              className="input-field"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            >
              <option value="">选择标签</option>
              <option value="home">家</option>
              <option value="work">公司</option>
              <option value="family">亲友</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">
              保存
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-outline text-sm">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="input-field max-w-xs"
          placeholder="搜索地址..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1 bg-brand-50 rounded-xl p-1">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tagFilter === t
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-brand-400 hover:text-brand-600'
              }`}
            >
              {tagLabels[t]}
            </button>
          ))}
        </div>

        {/* Batch actions */}
        {addresses.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs text-brand-500 hover:text-brand-700"
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
            {selectedCount > 0 && (
              <button onClick={handleBatchPrint} className="btn-cta text-sm">
                批量打印（{selectedCount}）
              </button>
            )}
          </div>
        )}
      </div>

      {/* Address Grid */}
      {filtered.length === 0 ? (
        <div className="card-bento p-12 text-center">
          <p className="text-brand-400 text-sm">
            {addresses.length === 0
              ? '地址簿为空，点击上方按钮添加'
              : '无匹配结果'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((addr) => (
            <div
              key={addr.id}
              className={`card-bento p-4 hover:shadow-md transition-shadow ${
                selectedIds.has(addr.id) ? 'ring-2 ring-brand-400' : ''
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(addr.id)}
                  onChange={() => toggleSelect(addr.id)}
                  className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-semibold text-brand-800">{addr.name}</span>
                    {addr.recipient !== addr.name && (
                      <span className="text-sm text-brand-400">{addr.recipient}</span>
                    )}
                    {addr.tag && (
                      <span
                        className={`tag text-xs ${TAG_COLORS[addr.tag] || TAG_COLORS.other}`}
                      >
                        {addr.tagLabel || tagLabels[addr.tag]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-brand-600 mb-2 ml-6">{addr.address}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6 mb-2">
                {addr.postcode && (
                  <span className="text-xs text-brand-400">邮编: {addr.postcode}</span>
                )}
                {addr.phone && (
                  <span className="text-xs text-brand-400">电话: {addr.phone}</span>
                )}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-brand-50 ml-6">
                <button
                  onClick={() => handleUseAddress(addr)}
                  className="text-xs text-brand-500 hover:text-brand-700 font-medium"
                >
                  打印此信封
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('确定删除此地址？')) deleteAddress(addr.id);
                  }}
                  className="text-xs text-red-400 hover:text-red-600 ml-auto"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
