import { useState } from 'react';
import { useStore } from '../store';
import { exportHistoryToExcel } from '../utils/exportExcel';
import ConfirmDialog from './ConfirmDialog';

type FilterKey = 'all' | 'today' | 'week' | 'month';

export default function PrintHistory() {
  const { printHistory, deletePrintRecord, clearHistory, setCurrentRecipient, setCurrentEnvelope, setActiveTab } = useStore();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  const pendingRecord = pendingDeleteId
    ? printHistory.find((r) => r.id === pendingDeleteId) ?? null
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-brand-900">打印历史</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportHistoryToExcel(printHistory)}
            className="btn-outline"
            disabled={printHistory.length === 0}
          >
            导出 Excel
          </button>
          {printHistory.length > 0 && (
            <button
              onClick={() => { if (window.confirm('确定清空所有打印历史？')) clearHistory(); }}
              className="btn-text-danger"
            >
              清空历史
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 bg-brand-50 rounded-xl p-1 w-fit">
        {(['all', 'today', 'week', 'month'] as FilterKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`px-3.5 py-2 sm:px-4 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-medium transition-all ${
              filter === k ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-700 hover:text-brand-800 hover:bg-white/60'
            }`}
          >
            {/* 代码是滚动窗口（过去 7 / 30 天），不是自然周 / 自然月 */}
            {{ all: '全部', today: '今天', week: '近 7 天', month: '近 30 天' }[k]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-bento p-8 sm:p-12 text-center">
          <p className="text-sm leading-7 text-slate-600">
            {printHistory.length === 0 ? '还没有打印记录。' : '这段时间没有打印记录，'}
          </p>
          {printHistory.length === 0 ? (
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500">
              在「信封编辑」里打印或导出 PDF 后，记录会出现在这里。
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500">把筛选切回「全部」看看。</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div key={record.id} className="card-bento flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-brand-800">{record.recipient.name}</span>
                  <span className={`tag text-xs ${
                    record.type === 'print'
                      ? 'bg-brand-100 text-brand-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {record.type === 'print' ? '打印' : 'PDF'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 truncate">{record.recipient.address}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(record.printedAt).toLocaleString('zh-CN')} · {record.settings.size} 规格
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button onClick={() => handleReprint(record)} className="btn-outline text-[13px] sm:text-xs">
                  再用这个地址
                </button>
                <button
                  onClick={() => setPendingDeleteId(record.id)}
                  className="btn-text-danger"
                  aria-label={`删除「${record.recipient.name}」的这条打印记录`}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm（B7：与地址簿共用 ConfirmDialog） */}
      <ConfirmDialog
        open={pendingRecord !== null}
        title="确定删除这条打印记录？"
        description={
          <>
            收件人「{pendingRecord?.recipient.name || ''} · {pendingRecord?.recipient.address || ''}」，
            {pendingRecord ? new Date(pendingRecord.printedAt).toLocaleString('zh-CN') : ''}
            {pendingRecord?.type === 'pdf' ? ' 导出 PDF' : ' 打印'}。
            <br />
            <span className="text-red-700 font-medium">删除后无法恢复。</span>
          </>
        }
        confirmText="删除"
        onConfirm={() => {
          if (pendingDeleteId) deletePrintRecord(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
