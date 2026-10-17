import { useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { TAG_COLORS } from '../store/types';
import type { Address } from '../store/types';
import { drawEnvelope } from '../utils/envelopeCanvas';
import { exportAddressesToExcel } from '../utils/exportExcel';
import { parseFile } from '../utils/importAddresses';
import type { ImportRow, ImportResult } from '../utils/importAddresses';
import ConfirmDialog from './ConfirmDialog';

export default function AddressBook() {
  const {
    addresses,
    settings,
    currentEnvelope,
    addAddress,
    addAddresses,
    updateAddress,
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
  const [newAddr, setNewAddr] = useState('');
  const [newPostcode, setNewPostcode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTag, setNewTag] = useState<string>('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddr, setEditAddr] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTag, setEditTag] = useState<string>('');

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm state（B7：与打印历史共用同一内联确认组件）
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  const filtered = addresses.filter((a) => {
    if (tagFilter !== 'all' && a.tag !== tagFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(s) ||
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
      address: newAddr,
      postcode: newPostcode,
      phone: newPhone,
      tag: (newTag as Address['tag']) || undefined,
    });
    setNewName('');
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

  // --- Edit ---
  const startEdit = (addr: Address) => {
    setEditingId(addr.id);
    setEditName(addr.name);
    setEditAddr(addr.address);
    setEditPostcode(addr.postcode || '');
    setEditPhone(addr.phone || '');
    setEditTag(addr.tag || '');
  };

  const handleEditSave = () => {
    if (!editingId || !editName || !editAddr) return;
    updateAddress(editingId, {
      name: editName,
      address: editAddr,
      postcode: editPostcode || undefined,
      phone: editPhone || undefined,
      tag: (editTag as Address['tag']) || undefined,
    });
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditAddr('');
    setEditPostcode('');
    setEditPhone('');
    setEditTag('');
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
      drawEnvelope(canvas, sender, addr, envSettings, true, 6);
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
          <button onClick={handleImportClick} className="btn-outline">
            导入地址
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            onClick={() => exportAddressesToExcel(addresses)}
            className="btn-outline"
            disabled={addresses.length === 0}
          >
            导出 Excel
          </button>
          <button onClick={() => setShowAdd(!showAdd)} aria-label="新建一条地址" className="btn-cta">
            + 添加地址
          </button>
        </div>
      </div>

      {/* Importing indicator */}
      {importing && (
        <div className="card-bento p-4 text-center text-brand-700 text-sm" role="status" aria-live="polite">
          正在解析文件…
        </div>
      )}

      {/* Import Preview Modal */}
      {importResult && (
        <div className="card-bento p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-800">导入预览</h3>
            <span className="text-sm text-brand-700">
              共解析 {importResult.total} 条记录
              {importResult.errors.length > 0 && (
                <span className="text-amber-700 ml-2">
                  （{importResult.errors.length} 条跳过）
                </span>
              )}
            </span>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 max-h-24 overflow-y-auto">
              {importResult.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          {importResult.rows.length === 0 ? (
            <p className="text-sm text-slate-600">没有识别到可导入的地址，请检查文件里是否有「收件人」（或「姓名」）和「地址」两列</p>
          ) : (
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 max-h-64 overflow-y-auto border border-brand-100 rounded-lg">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="bg-brand-50 sticky top-0">
                  <tr>
                    <th scope="col" className="p-2 text-left text-brand-800 font-semibold whitespace-nowrap">收件人</th>
                    <th scope="col" className="p-2 text-left text-brand-800 font-semibold whitespace-nowrap">地址</th>
                    <th scope="col" className="p-2 text-left text-brand-800 font-semibold whitespace-nowrap">邮编</th>
                    <th scope="col" className="p-2 text-left text-brand-800 font-semibold whitespace-nowrap">电话</th>
                    <th scope="col" className="p-2 text-left text-brand-800 font-semibold whitespace-nowrap">标签</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-brand-50 hover:bg-brand-50/50">
                      <td className="p-2">{row.name}</td>
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
                      <td colSpan={5} className="p-2 text-center text-slate-500">
                        … 还有 {importResult.rows.length - 50} 条记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              onClick={handleImportConfirm}
              disabled={importResult.rows.length === 0}
              className="btn-primary w-full sm:w-auto"
            >
              确认导入 {importResult.rows.length} 条
            </button>
            <button onClick={handleImportCancel} className="btn-outline w-full sm:w-auto">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="card-bento p-5 space-y-3">
          {/* B10：姓名 / 单位合并为单一「收件人」，与信封编辑页保持一致 */}
          <div>
            <label htmlFor="addr-new-name" className="input-label">收件人 <span className="text-red-700" aria-hidden="true">*</span></label>
            <input
              id="addr-new-name"
              className="input-field"
              placeholder="张三 / XX公司"
              aria-required="true"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="addr-new-addr" className="input-label">地址 <span className="text-red-700" aria-hidden="true">*</span></label>
            <textarea
              id="addr-new-addr"
              className="input-field resize-none"
              placeholder="地址"
              rows={2}
              aria-required="true"
              value={newAddr}
              onChange={(e) => setNewAddr(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="addr-new-postcode" className="input-label">邮编</label>
              <input
                id="addr-new-postcode"
                className="input-field"
                placeholder="如 100000"
                value={newPostcode}
                onChange={(e) => setNewPostcode(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="addr-new-phone" className="input-label">电话</label>
              <input
                id="addr-new-phone"
                className="input-field"
                placeholder="联系电话"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="addr-new-tag" className="input-label">标签</label>
              <select
                id="addr-new-tag"
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
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button onClick={handleAdd} className="btn-primary w-full sm:w-auto">
              保存
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-outline w-full sm:w-auto">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-full sm:w-auto sm:max-w-xs">
          <label htmlFor="addr-search" className="sr-only">搜索收件人或地址</label>
          <input
            id="addr-search"
            className="input-field"
            placeholder="搜索收件人或地址…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 bg-brand-50 rounded-xl p-1">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              aria-pressed={tagFilter === t}
              className={`px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-medium transition-all ${
                tagFilter === t
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-brand-700 hover:text-brand-800 hover:bg-white/60'
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
              className="text-xs text-brand-700 hover:text-brand-800 py-2 min-h-[44px] sm:min-h-0"
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
            {selectedCount > 0 && (
              <button onClick={handleBatchPrint} className="btn-cta">
                批量打印（{selectedCount}）
              </button>
            )}
          </div>
        )}
      </div>

      {/* Address Grid */}
      {filtered.length === 0 ? (
        <div className="card-bento p-8 sm:p-12 text-center">
          <p className="text-sm leading-7 text-slate-600">
            {addresses.length === 0
              ? '地址簿还是空的。'
              : '没有匹配的地址，换个关键词，或把标签切回「全部」'}
          </p>
          {addresses.length === 0 && (
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500">
              点上方「+ 添加地址」新建，或用「导入地址」从 Excel / CSV 一次性导入。
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((addr) => (
            <div
              key={addr.id}
              className={`card-bento hover:shadow-md transition-shadow ${
                selectedIds.has(addr.id) ? 'ring-2 ring-brand-600' : ''
              }`}
            >
              {editingId === addr.id ? (
                /* --- Edit Form --- */
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-brand-800">编辑地址</h4>
                  {/* B10：编辑态同样只有单一「收件人」字段 */}
                  <div>
                    <label htmlFor={`addr-edit-name-${addr.id}`} className="input-label">收件人 <span className="text-red-700" aria-hidden="true">*</span></label>
                    <input
                      id={`addr-edit-name-${addr.id}`}
                      className="input-field"
                      placeholder="张三 / XX公司"
                      aria-required="true"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor={`addr-edit-addr-${addr.id}`} className="input-label">地址 <span className="text-red-700" aria-hidden="true">*</span></label>
                    <textarea
                      id={`addr-edit-addr-${addr.id}`}
                      className="input-field resize-none"
                      placeholder="地址"
                      rows={2}
                      aria-required="true"
                      value={editAddr}
                      onChange={(e) => setEditAddr(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor={`addr-edit-postcode-${addr.id}`} className="input-label">邮编</label>
                      <input
                        id={`addr-edit-postcode-${addr.id}`}
                        className="input-field"
                        placeholder="邮编"
                        value={editPostcode}
                        onChange={(e) => setEditPostcode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`addr-edit-phone-${addr.id}`} className="input-label">电话</label>
                      <input
                        id={`addr-edit-phone-${addr.id}`}
                        className="input-field"
                        placeholder="电话"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`addr-edit-tag-${addr.id}`} className="input-label">标签</label>
                      <select
                        id={`addr-edit-tag-${addr.id}`}
                        className="input-field"
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value)}
                      >
                        <option value="">选择标签</option>
                        <option value="home">家</option>
                        <option value="work">公司</option>
                        <option value="family">亲友</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button onClick={handleEditSave} className="btn-primary w-full sm:w-auto">
                      保存
                    </button>
                    <button onClick={cancelEdit} className="btn-outline w-full sm:w-auto">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* --- Normal Card --- */
                <>
                  <div className="flex items-start gap-2 mb-2">
                    <label className="inline-flex items-center justify-center -m-3 p-3 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(addr.id)}
                        onChange={() => toggleSelect(addr.id)}
                        className="h-5 w-5 rounded border-slate-400 text-brand-700 focus:ring-2 focus:ring-brand-700 cursor-pointer"
                      />
                      <span className="sr-only">选择「{addr.name}」用于批量打印</span>
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold text-brand-800">{addr.name}</span>
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
                  <p className="text-sm text-slate-700 mb-2 ml-6">{addr.address}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6 mb-2">
                    {addr.postcode && (
                      <span className="text-xs text-slate-500">邮编：{addr.postcode}</span>
                    )}
                    {addr.phone && (
                      <span className="text-xs text-slate-500">电话：{addr.phone}</span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-brand-50 ml-6">
                    <button
                      onClick={() => handleUseAddress(addr)}
                      className="text-[13px] sm:text-xs text-brand-700 hover:text-brand-800 font-medium min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5"
                    >
                      填入信封
                    </button>
                    <button
                      onClick={() => startEdit(addr)}
                      className="text-[13px] sm:text-xs text-brand-700 hover:text-brand-800 font-medium min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setPendingDelete(addr)}
                      aria-label={`删除「${addr.name}」这个地址`}
                      className="btn-text-danger ml-auto"
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm（B7：与打印历史共用 ConfirmDialog） */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`确定删除「${pendingDelete?.name || ''}」这个地址？`}
        description={
          <>
            收件人「{pendingDelete?.name || ''}」，{pendingDelete?.address}
            <br />
            <span className="text-red-700 font-medium">删除后无法恢复。</span>
          </>
        }
        confirmText="删除"
        onConfirm={() => {
          if (pendingDelete) deleteAddress(pendingDelete.id);
          setSelectedIds((prev) => {
            if (!pendingDelete) return prev;
            const next = new Set(prev);
            next.delete(pendingDelete.id);
            return next;
          });
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
