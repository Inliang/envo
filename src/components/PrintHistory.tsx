import { useState } from 'react';
import { useStore } from '../store';
import { exportHistoryToExcel } from '../utils/exportExcel';

type FilterKey = 'all' | 'today' | 'week' | 'month';

export default function PrintHistory() {
  const { printHistory, deletePrintRecord, clearHistory, setCurrentRecipient, setCurrentEnvelope, setActiveTab } = useStore();
  const [filter, setFilter] = useState<FilterKey>('all');

  const now = new Date();
  const filterMap: Record<FilterKey, (d: Date) => boolean> = {
    all: () => true,
    today: (d) => d.toDateString() === now.toDateString(),
    week: (d) => {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    },
    month: (d) => {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return d >= monthAgo;
    },
  };

  const filtered = printHistory.filter((r) => filterMap[filter](new Date(r.printedAt)));

  const handleReprint = (record: typeof printHistory[0]) => {
    setCurrentRecipient(record.recipient);
    setCurrentEnvelope(record.settings);
    setActiveTab('editor');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-900">打印历史</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportHistoryToExcel(printHistory)}
            className="btn-outline text-sm"
            disabled={printHistory.length === 0}
          >
            📥 导出Excel
          </button>
          {printHistory.length > 0 && (
            <button
              onClick={() => { if (window.confirm('确定清空所有打印历史？')) clearHistory(); }}
              className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5"
            >
              清空历史
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-brand-50 rounded-xl p-1 w-fit">
        {(['all', 'today', 'week', 'month'] as FilterKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === k ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-400 hover:text-brand-600'
            }`}
          >
            {{ all: '全部', today: '今天', week: '本周', month: '本月' }[k]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-bento p-12 text-center">
          <p className="text-brand-400 text-sm">
            {printHistory.length === 0 ? '暂无打印记录' : '当前筛选条件下无记录'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div key={record.id} className="card-bento p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-brand-800">{record.recipient.recipient}</span>
                  <span className={`tag text-xs ${
                    record.type === 'print'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {record.type === 'print' ? '打印' : 'PDF'}
                  </span>
                </div>
                <p className="text-sm text-brand-500 truncate">{record.recipient.address}</p>
                <p className="text-xs text-brand-300 mt-1">
                  {new Date(record.printedAt).toLocaleString('zh-CN')} · {record.settings.size}规格
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleReprint(record)} className="btn-outline text-xs px-3 py-1.5">
                  重新打印
                </button>
                <button
                  onClick={() => deletePrintRecord(record.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5"
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
