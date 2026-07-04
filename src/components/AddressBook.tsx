import { useState } from 'react';
import { useStore } from '../store';
import { TAG_COLORS } from '../store/types';
import { exportAddressesToExcel } from '../utils/exportExcel';
import type { Address } from '../store/types';

export default function AddressBook() {
  const { addresses, addAddress, updateAddress, deleteAddress, setCurrentRecipient, setActiveTab } = useStore();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // New address form state
  const [newName, setNewName] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTag, setNewTag] = useState<string>('');

  const filtered = addresses
    .filter((a) => {
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
  const tagLabels: Record<string, string> = { all: '全部', home: '家', work: '公司', family: '亲友', other: '其他' };

  const handleAdd = () => {
    if (!newName || !newAddr) return;
    addAddress({
      name: newName,
      recipient: newRecipient || newName,
      address: newAddr,
      phone: newPhone,
      tag: (newTag as Address['tag']) || undefined,
    });
    setNewName('');
    setNewRecipient('');
    setNewAddr('');
    setNewPhone('');
    setNewTag('');
    setShowAdd(false);
  };

  const handleUseAddress = (addr: Address) => {
    setCurrentRecipient(addr);
    setActiveTab('editor');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-900">地址簿</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportAddressesToExcel(addresses)}
            className="btn-outline text-sm"
            disabled={addresses.length === 0}
          >
            📥 导出Excel
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-cta text-sm">
            + 添加地址
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="card-bento p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input-field" placeholder="姓名 *" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="input-field" placeholder="单位/公司" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} />
          </div>
          <textarea className="input-field resize-none" placeholder="地址 *" rows={2} value={newAddr} onChange={(e) => setNewAddr(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input-field" placeholder="电话" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <select className="input-field" value={newTag} onChange={(e) => setNewTag(e.target.value)}>
              <option value="">选择标签</option>
              <option value="home">家</option>
              <option value="work">公司</option>
              <option value="family">亲友</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">保存</button>
            <button onClick={() => setShowAdd(false)} className="btn-outline text-sm">取消</button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
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
                tagFilter === t ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-400 hover:text-brand-600'
              }`}
            >
              {tagLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Address Grid */}
      {filtered.length === 0 ? (
        <div className="card-bento p-12 text-center">
          <p className="text-brand-400 text-sm">
            {addresses.length === 0 ? '地址簿为空，点击上方按钮添加' : '无匹配结果'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((addr) => (
            <div key={addr.id} className="card-bento p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-brand-800">{addr.name}</span>
                  {addr.recipient !== addr.name && (
                    <span className="text-sm text-brand-400 ml-2">{addr.recipient}</span>
                  )}
                </div>
                {addr.tag && (
                  <span className={`tag ${TAG_COLORS[addr.tag] || TAG_COLORS.other}`}>
                    {addr.tagLabel || tagLabels[addr.tag]}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-600 mb-2">{addr.address}</p>
              {addr.phone && <p className="text-xs text-brand-400">{addr.phone}</p>}
              <div className="flex gap-2 mt-3 pt-3 border-t border-brand-50">
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
