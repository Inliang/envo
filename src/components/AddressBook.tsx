import { useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { TAG_COLORS, ENVELOPE_SIZES } from '../store/types';
import type { Address } from '../store/types';
import { drawEnvelope, canvasToBlob } from '../utils/envelopeCanvas';
import { exportAddressesToExcel, exportSelectedAddressesToExcel, exportAddressTemplate } from '../utils/exportExcel';
import { parseFile } from '../utils/importAddresses';
import type { ImportRow, ImportResult } from '../utils/importAddresses';
import ConfirmDialog from './ConfirmDialog';
import { Upload, Download, Plus, Printer, Search, Pencil, Copy } from './icons';
import jsPDF from 'jspdf';

/**
 * 批量打印窗口 HTML 中插入用户可控文本（收件人姓名）前做最小转义，
 * 防止姓名里的引号 / 尖括号破坏 img 的 alt 属性或注入脚本。纯字符串处理，零依赖。
 */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  ));
}

/** canvasToBlob 产的 PNG blob → jsPDF.addImage 需要的 data URL（FileReader，零定时器） */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('blob to data URL failed'));
    reader.readAsDataURL(blob);
  });
}

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
    addPrintRecord,
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
  const [importNotice, setImportNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm state（B7：与打印历史共用同一内联确认组件）
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  // 批量打印二次确认（与删除确认各自独立 state；打印是实体不可逆动作）
  const [pendingBatchPrint, setPendingBatchPrint] = useState(false);

  // 批量打印并发守卫：ref 用于同步拦截（state 更新是异步的，拦不住同一帧内第二次点击），
  // state 只用于驱动按钮禁用态 / aria-busy 视觉反馈。
  const [batchPrinting, setBatchPrinting] = useState(false);
  const batchPrintingRef = useRef(false);

  // 批量导出 PDF 的独立并发守卫（与打印各自一个 ref，按钮侧互斥防止同时跑重活）
  const [batchExporting, setBatchExporting] = useState(false);
  const batchExportingRef = useRef(false);

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

  // 以「当前地址簿里真实存在的选中项」为准，避免选中集中残留已删除 / 已被备份替换的脏 id，
  // 让按钮张数、确认框张数与实际打印张数三者一致。
  const selectedAddresses = addresses.filter((a) => selectedIds.has(a.id));
  const selectedCount = selectedAddresses.length;

  // --- Import ---
  const handleImportClick = () => {
    setImportNotice('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImporting(true);
    setImportNotice('');
    setImportResult(null);

    const rows: ImportRow[] = [];
    const errors: string[] = [];
    const matchedColumns: string[] = [];
    const unmatchedColumns: string[] = [];
    const headers: string[] = [];
    const notices: string[] = [];

    try {
      for (const file of files) {
        try {
          const result = await parseFile(file);
          rows.push(...result.rows);
          // 多文件时每条错误都带文件名前缀，用户能定位到具体是哪个文件
          errors.push(...result.errors.map((err) => `${file.name} ${err}`));
          for (const col of result.matchedColumns || []) {
            if (!matchedColumns.includes(col)) matchedColumns.push(col);
          }
          for (const col of result.unmatchedColumns || []) {
            if (!unmatchedColumns.includes(col)) unmatchedColumns.push(col);
          }
          for (const h of result.headers || []) {
            if (!headers.includes(h)) headers.push(h);
          }
          if (result.notice) notices.push(`${file.name}：${result.notice}`);
        } catch (err) {
          errors.push(`${file.name}：文件解析失败，${(err as Error).message || '请检查文件是否损坏'}`);
        }
      }

      const merged: ImportResult = {
        rows,
        errors,
        total: rows.length,
        matchedColumns,
        unmatchedColumns,
        headers,
        notice: notices.length > 0 ? notices.join('；') : undefined,
      };

      // 全部失败时给一句人话，不要只留一堆零散行号
      if (rows.length === 0) {
        merged.errors.push('所有文件都没有解析出可导入的地址，请检查表头是否包含「收件人」和「地址」，或先下载导入模板对照。');
      }

      // 单个文件解析失败不影响其他文件，合并结果照常进预览
      setImportResult(merged);
    } finally {
      setImporting(false);
      // 不清空的话，连续选同一个文件不会再触发 change
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

    // addAddresses 返回 void，但它内部是 zustand 的同步 set，调用返回后 getState() 立刻
    // 能读到最新数组；以调用前的长度做尾部切片，就是本批新增的 N 条（id 由 store 的
    // genId() 生成，只能从这里取）。不能用 React 闭包里的 addresses —— 那是本次渲染的旧快照。
    const beforeCount = useStore.getState().addresses.length;
    addAddresses(addrs);
    const newest = useStore.getState().addresses;
    const newIds = newest.slice(beforeCount).map((a) => a.id);

    // 覆盖而不是追加：只选本批，绝不把历史地址带进批量打印
    setSelectedIds(new Set(newIds));
    setImportResult(null);
    setImportNotice(`已导入 ${newIds.length} 条并自动选中本批，可直接点「批量打印」；「全选」会连同历史地址一起选中，请核对确认框里的张数。`);
  };

  const handleImportCancel = () => {
    setImportResult(null);
  };

  // --- Batch Print ---
  // 独立打印窗口方案，与从不出问题的单张打印（EnvelopeEditor.handlePrint）同构。
  // 废弃上一版「往主页面动态注入 @media print style + 用 container 变量把 canvas 以
  // position: static 塞进 body」的脆弱路径：
  // 那条路在真实打印对话框默认设置下（纸张 A4、页眉页脚开）挡不住浏览器页眉页脚，
  // 纸上会印出 1/N 页码；且注入 / 清理时机稍偏就多出一张空白页。
  // 新方案：每张 4× DPR 绘制 → blob → objectURL，一个干净 window.open 预览窗装 N 张
  // <img>，精确 mm @page + margin:0 + 每张独占一页（末张不强制分页）。
  const runBatchPrint = useCallback(async () => {
    // 同步并发守卫：ref 拦同一帧第二次点击（state 更新异步拦不住），state 驱动按钮禁用态。
    if (batchPrintingRef.current) return;
    batchPrintingRef.current = true;
    setBatchPrinting(true);

    const resetGuard = () => {
      batchPrintingRef.current = false;
      setBatchPrinting(false);
    };
    // 守卫复位幂等：预览窗关闭事件与 catch / finally 可能都触发，只第一次生效。
    let guardReleased = false;
    const releaseGuardOnce = () => {
      if (guardReleased) return;
      guardReleased = true;
      resetGuard();
    };

    // printArmed：预览窗是否完整建立。为 false 时 catch / finally 兜底释放 blob、复位守卫；
    // 为 true 后 blob 与守卫都交给预览窗关闭事件，catch 不再抢着 revoke（防图裂）。
    let printArmed = false;
    let pw: Window | null = null;
    let releaseAllBlobs: () => void = () => {};

    try {
      const selected = addresses.filter((a) => selectedIds.has(a.id));
      if (selected.length === 0) return;

      const sender = settings.defaultSender;
      // mmW/mmH 与单张打印同口径：custom 用自定义尺寸（缺省回退 220×110），否则取规格表。
      const sizeConfig = ENVELOPE_SIZES[currentEnvelope.size];
      const mmW = currentEnvelope.size === 'custom'
        ? (currentEnvelope.customWidth || sizeConfig.width)
        : sizeConfig.width;
      const mmH = currentEnvelope.size === 'custom'
        ? (currentEnvelope.customHeight || sizeConfig.height)
        : sizeConfig.height;
      const envSettings = {
        ...currentEnvelope,
        fontSize: settings.defaultEnvelope.fontSize,
        fontFamily: settings.defaultEnvelope.fontFamily,
        showReturnAddress: settings.defaultEnvelope.showReturnAddress,
        showLogo: settings.defaultEnvelope.showLogo,
      };

      // 等字体度量稳定后再绘制（Canvas measureText 依赖最终字体），沿用原链路，不用固定延时。
      await document.fonts.ready;

      // 每张信封独立 4× DPR 绘制 → PNG blob → objectURL，与单张打印同口径。
      const blobUrls: string[] = [];
      for (const addr of selected) {
        const canvas = document.createElement('canvas');
        drawEnvelope(canvas, sender, addr, envSettings, true, 4);
        blobUrls.push(URL.createObjectURL(await canvasToBlob(canvas)));
      }

      // 幂等批量释放：所有 blob 绑定「预览窗关闭」统一 revoke，
      // 绝不在 img.onload / decode 里 revoke（打印子系统可能尚未读完整张位图）。
      let blobsReleased = false;
      releaseAllBlobs = () => {
        if (blobsReleased) return;
        blobsReleased = true;
        blobUrls.forEach((url) => URL.revokeObjectURL(url));
      };

      pw = window.open('', '_blank');
      if (!pw) {
        releaseAllBlobs(); // 弹窗被拦截：没有窗口会用到这些 blob，立即释放
        setImportNotice('请允许弹出窗口，才能批量打印信封');
        return;
      }

      // blob 创建方（主窗口）持有释放函数；预览窗关闭的所有路径统一回调它。
      // 同时挂上守卫复位通道：跨窗口 beforeunload/pagehide 在部分内核不可靠，
      // 预览窗改为直接函数调用通知主窗口复位，事件监听只作冗余兜底。
      const pwHooks = pw as Window & {
        __envoReleasePrintBlob?: () => void;
        __envoReleaseGuard?: () => void;
      };
      pwHooks.__envoReleasePrintBlob = releaseAllBlobs;
      pwHooks.__envoReleaseGuard = releaseGuardOnce;
      // 主窗口侧冗余兜底：预览窗关闭（打印完成 / 取消 / 用户直接关窗）即释放 blob + 复位守卫，
      // 覆盖 beforeunload / pagehide。打印对话框停留期间 afterprint 不派发，故绝不用定时器复位。
      const onPreviewClosed = () => {
        releaseAllBlobs();
        releaseGuardOnce();
      };
      pw.addEventListener('beforeunload', onPreviewClosed);
      pw.addEventListener('pagehide', onPreviewClosed);

      const blobUrlsJs = blobUrls.map((u) => `'${u}'`).join(',');
      const imgsHtml = blobUrls.map((url, i) => {
        const last = i === blobUrls.length - 1;
        const name = escapeHtml(selected[i].name || `第${i + 1}张`);
        return `<img class="envelope-page${last ? ' last' : ''}" src="${url}" alt="信封打印预览：${name}" />`;
      }).join('\n');

      pw.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>信封批量打印</title>
          <style>
            @page { size: ${mmW}mm ${mmH}mm; margin: 0; }
            * { margin: 0; padding: 0; }
            /* B14：html/body 锁精确 mm 宽度。批量 N 张不能像单张那样固定一页高 +
               overflow:hidden —— 那会把第 2..N 张直接裁掉；分页交给下方 img 的 break-after。 */
            html, body {
              width: ${mmW}mm;
              overflow-x: hidden;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* 每张信封独占一页；末张不强制分页，杜绝尾部空白页 */
            .envelope-page {
              width: ${mmW}mm;
              height: ${mmH}mm;
              display: block;
              break-inside: avoid;
              page-break-inside: avoid;
              break-after: page;
              page-break-after: always;
            }
            .envelope-page.last {
              break-after: auto;
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          ${imgsHtml}
          <script>
            // B15：打印对话框关闭后（打印或取消都会触发）自动关闭预览窗口
            window.onafterprint = function() { window.close(); };
            // blob 释放：优先回调主窗口（在创建 blob 的上下文里 revoke），
            // 退回 opener 的 URL，最后才是本窗口 URL（同源按 origin 共享）。幂等。
            var blobUrls = [${blobUrlsJs}];
            var releaseBlob = function() {
              try {
                // 打印结束 / 关窗信号：先直接回调主窗口复位并发守卫（幂等），再释放 blob。
                // 顺序不能反 —— 守卫卡住会让「批量打印」按钮永久禁用。
                if (typeof window.__envoReleaseGuard === 'function') window.__envoReleaseGuard();
                if (typeof window.__envoReleasePrintBlob === 'function') {
                  window.__envoReleasePrintBlob();
                  return;
                }
                var u = (window.opener && window.opener.URL) ? window.opener.URL : URL;
                for (var i = 0; i < blobUrls.length; i++) u.revokeObjectURL(blobUrls[i]);
              } catch (e) {}
            };
            window.addEventListener('afterprint', releaseBlob);
            window.addEventListener('beforeunload', releaseBlob);
            window.addEventListener('pagehide', releaseBlob);

            // 等全部图可绘制后再 print，零 setTimeout：
            //   onload 计数（每张图数据就绪）+ 双 rAF（完成一帧布局）为兜底信号；
            //   Promise.all(decode()) 为精确信号；doPrint 幂等，只打印一次。
            var imgs = Array.prototype.slice.call(document.querySelectorAll('.envelope-page'));
            var printed = false;
            var doPrint = function() {
              if (printed) return;
              printed = true;
              window.print();
            };
            var onAllReady = function() {
              requestAnimationFrame(function() { requestAnimationFrame(doPrint); });
              Promise.all(imgs.map(function(img) {
                return (typeof img.decode === 'function') ? img.decode().catch(function() {}) : Promise.resolve();
              })).then(doPrint).catch(function() {});
            };
            var loaded = 0;
            var onOneLoaded = function() {
              loaded++;
              if (loaded >= imgs.length) onAllReady();
            };
            imgs.forEach(function(img) {
              img.onerror = doPrint; // 图裂也拉起对话框，避免预览窗永久无响应
              if (img.complete && img.naturalWidth > 0) onOneLoaded();
              else img.onload = onOneLoaded;
            });
          <\/script>
        </body>
        </html>
      `);
      pw.document.close();
      printArmed = true;

      // 每个地址一条打印记录（对齐单张打印的 type:'print' 语义）
      selected.forEach((addr) => {
        addPrintRecord({ recipient: addr, sender, settings: envSettings, type: 'print' });
      });
      setImportNotice(`已打开 ${selected.length} 张信封的打印预览，打印完成后窗口将自动关闭`);
    } catch {
      // 预览窗尚未完整建立时兜底：释放 blob、关掉半开窗、复位守卫；
      // 已 printArmed 时 blob / 守卫都交给预览窗关闭事件，此刻 revoke 会图裂。
      if (!printArmed) {
        releaseAllBlobs();
        if (pw) { try { pw.close(); } catch { /* 窗口已关闭 */ } }
        releaseGuardOnce();
      }
      setImportNotice('批量打印内容生成失败，请重试或改用单张打印');
    } finally {
      // 提前 return（未选中 / 弹窗被拦截）/ 预览窗建立前抛错：守卫未交棒，兜底复位。
      if (!printArmed) releaseGuardOnce();
    }
  }, [addresses, selectedIds, settings, currentEnvelope, addPrintRecord]);

  // 批量导出 PDF：多页，每页一个选中地址，页面尺寸锁死为当前信封 mm。
  // 从 PDF 阅读器打印时页面尺寸不受浏览器「页眉和页脚」设置影响，是直接打印之外的第二条路。
  const handleBatchExportPDF = async () => {
    if (batchExportingRef.current || batchPrintingRef.current) return;
    batchExportingRef.current = true;
    setBatchExporting(true);
    try {
      const selected = addresses.filter((a) => selectedIds.has(a.id));
      if (selected.length === 0) return;

      const sender = settings.defaultSender;
      // 与直接打印同口径取 mm，custom 回退 220×110，绝不写死规格。
      const sizeConfig = ENVELOPE_SIZES[currentEnvelope.size];
      const mmW = currentEnvelope.size === 'custom'
        ? (currentEnvelope.customWidth || sizeConfig.width)
        : sizeConfig.width;
      const mmH = currentEnvelope.size === 'custom'
        ? (currentEnvelope.customHeight || sizeConfig.height)
        : sizeConfig.height;
      const envSettings = {
        ...currentEnvelope,
        fontSize: settings.defaultEnvelope.fontSize,
        fontFamily: settings.defaultEnvelope.fontFamily,
        showReturnAddress: settings.defaultEnvelope.showReturnAddress,
        showLogo: settings.defaultEnvelope.showLogo,
      };
      await document.fonts.ready;

      const orientation: 'l' | 'p' = mmW > mmH ? 'l' : 'p';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [mmW, mmH] });
      for (let i = 0; i < selected.length; i++) {
        // 4× DPR 高清绘制 → blob → dataURL；第一页也要 addImage，后续页先 addPage。
        const canvas = document.createElement('canvas');
        drawEnvelope(canvas, sender, selected[i], envSettings, true, 4);
        const imgData = await blobToDataUrl(await canvasToBlob(canvas));
        if (i > 0) pdf.addPage([mmW, mmH], orientation);
        pdf.addImage(imgData, 'PNG', 0, 0, mmW, mmH);
      }

      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      pdf.save(`信封批量_${selected.length}张_${dateStr}.pdf`);

      selected.forEach((addr) => {
        addPrintRecord({ recipient: addr, sender, settings: envSettings, type: 'pdf' });
      });
      setImportNotice(`已导出 ${selected.length} 张信封的 PDF，可从 PDF 阅读器直接打印`);
    } catch {
      setImportNotice('批量导出 PDF 失败，请重试或改用直接打印');
    } finally {
      batchExportingRef.current = false;
      setBatchExporting(false);
    }
  };

  // 二次确认入口：只负责打开确认框，不碰打印链路、不改动选中集。
  // 取消时 ConfirmDialog 只把 pendingBatchPrint 置回 false，不触发任何打印。
  const requestBatchPrint = () => {
    if (selectedCount === 0 || batchPrintingRef.current) return;
    setImportNotice('');
    setPendingBatchPrint(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">地址簿</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleImportClick}
            title="可一次选择多个 CSV / XLSX / JSON 文件"
            className="btn-outline"
          >
            <Upload className="w-4 h-4" />
            导入地址
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button onClick={exportAddressTemplate} className="btn-outline">
            <Download className="w-4 h-4" />
            下载模板
          </button>
          <button
            onClick={() => exportAddressesToExcel(addresses)}
            className="btn-outline"
            disabled={addresses.length === 0}
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
          {selectedCount > 0 && (
            <button
              onClick={() => exportSelectedAddressesToExcel(selectedAddresses)}
              className="btn-outline"
            >
              <Download className="w-4 h-4" />
              导出选中（{selectedCount}）
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            aria-label="新建一条地址"
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            添加地址
          </button>
        </div>
      </div>

      {/* Importing indicator */}
      {importing && (
        <div className="card-bento p-4 text-center text-[var(--accent-foreground)] text-sm" role="status" aria-live="polite">
          正在解析文件…
        </div>
      )}

      {/* 导入成功反馈：导入预览关闭后仍可见，说明本批已自动选中、可直接批量打印 */}
      {importNotice && (
        <div className="card-bento p-4 flex flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
          <p className="text-sm text-[var(--accent-foreground)]">{importNotice}</p>
          <button type="button" onClick={() => setImportNotice('')} className="btn-outline">
            知道了
          </button>
        </div>
      )}

      {/* Import Preview Modal */}
      {importResult && (
        <div className="card-bento p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--foreground)]">导入预览</h3>
            <span className="text-sm text-[var(--accent-foreground)]">
              共解析 {importResult.total} 条记录
              {importResult.errors.length > 0 && (
                <span className="text-[var(--warning-fg)] ml-2">
                  （{importResult.errors.length} 条跳过）
                </span>
              )}
            </span>
          </div>

          {importResult.notice && (
            <p className="text-xs text-[var(--accent-foreground)]" role="status">
              {importResult.notice}
            </p>
          )}

          {/* 列匹配结果：可选字段，老结果对象不带时自动降级不显示 */}
          {(importResult.matchedColumns?.length || importResult.unmatchedColumns?.length) ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              已识别列：<span className="text-[var(--foreground)]">{(importResult.matchedColumns || []).join('、') || '无'}</span>
              <br />
              未识别（将忽略）：<span className="text-[var(--warning-fg)]">{(importResult.unmatchedColumns || []).join('、') || '无'}</span>
            </p>
          ) : null}

          {importResult.errors.length > 0 && (
            <div className="bg-warning border-warning text-warning rounded-lg p-3 text-xs max-h-24 overflow-y-auto">
              {importResult.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          {importResult.rows.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              没有识别到可导入的地址。
              {(importResult.headers || []).filter(Boolean).length > 0 &&
                `实际读到的表头：${(importResult.headers || []).filter(Boolean).join('、')}。`}
              请检查文件里是否有「收件人」（或「姓名」）和「地址」两列，或下载导入模板对照。
            </p>
          ) : (
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 max-h-64 overflow-y-auto border border-[var(--border)] rounded-lg">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="bg-[var(--muted)] sticky top-0">
                  <tr>
                    <th scope="col" className="p-2 text-left text-[var(--foreground)] font-semibold whitespace-nowrap">收件人</th>
                    <th scope="col" className="p-2 text-left text-[var(--foreground)] font-semibold whitespace-nowrap">地址</th>
                    <th scope="col" className="p-2 text-left text-[var(--foreground)] font-semibold whitespace-nowrap">邮编</th>
                    <th scope="col" className="p-2 text-left text-[var(--foreground)] font-semibold whitespace-nowrap">电话</th>
                    <th scope="col" className="p-2 text-left text-[var(--foreground)] font-semibold whitespace-nowrap">标签</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--secondary)]">
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
                      <td colSpan={5} className="p-2 text-center text-[var(--muted-foreground)]">
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
            <label htmlFor="addr-new-name" className="input-label">收件人 <span className="text-[var(--error-fg)]" aria-hidden="true">*</span></label>
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
            <label htmlFor="addr-new-addr" className="input-label">地址 <span className="text-[var(--error-fg)]" aria-hidden="true">*</span></label>
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
        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <label htmlFor="addr-search" className="sr-only">搜索收件人或地址</label>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="addr-search"
            className="input-field pl-9"
            placeholder="搜索收件人或地址…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 bg-[var(--muted)] rounded-xl p-1">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              aria-pressed={tagFilter === t}
              className={`px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg text-xs font-medium transition-all ${
                tagFilter === t
                  ? 'bg-[var(--primary-tint)] text-[var(--accent-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              {tagLabels[t]}
            </button>
          ))}
        </div>

        {/* Batch actions */}
        {addresses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs text-[var(--accent-foreground)] hover:opacity-80 py-2 min-h-[44px] sm:min-h-0"
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
            {selectedCount > 0 && (
              <>
                <button
                  onClick={requestBatchPrint}
                  disabled={batchPrinting || batchExporting}
                  aria-busy={batchPrinting}
                  className="btn-primary"
                >
                  <Printer className="w-4 h-4" />
                  批量打印（{selectedCount}）
                </button>
                <button
                  onClick={handleBatchExportPDF}
                  disabled={batchExporting || batchPrinting}
                  aria-busy={batchExporting}
                  title="批量导出多页 PDF，页面尺寸锁定为当前信封规格，可从 PDF 阅读器直接打印"
                  className="btn-outline"
                >
                  <Download className="w-4 h-4" />
                  {batchExporting ? '生成中…' : `批量导出 PDF（${selectedCount}）`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Address Grid */}
      {filtered.length === 0 ? (
        <div className="card-bento p-8 sm:p-12 text-center">
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            {addresses.length === 0
              ? '地址簿还是空的。'
              : '没有匹配的地址，换个关键词，或把标签切回「全部」'}
          </p>
          {addresses.length === 0 && (
            <p className="mt-1.5 text-[13px] leading-6 text-[var(--muted-foreground)]">
              点上方「添加地址」新建，或用「导入地址」一次选多个 Excel / CSV 文件导入；不确定表头可以先「下载模板」。
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((addr) => (
            <div
              key={addr.id}
              className={`card-bento ${
                selectedIds.has(addr.id) ? 'ring-2 ring-[var(--accent-foreground)]' : ''
              }`}
            >
              {editingId === addr.id ? (
                /* --- Edit Form --- */
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">编辑地址</h4>
                  {/* B10：编辑态同样只有单一「收件人」字段 */}
                  <div>
                    <label htmlFor={`addr-edit-name-${addr.id}`} className="input-label">收件人 <span className="text-[var(--error-fg)]" aria-hidden="true">*</span></label>
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
                    <label htmlFor={`addr-edit-addr-${addr.id}`} className="input-label">地址 <span className="text-[var(--error-fg)]" aria-hidden="true">*</span></label>
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
                        className="h-5 w-5 rounded border-[var(--input)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] cursor-pointer"
                      />
                      <span className="sr-only">选择「{addr.name}」用于批量打印</span>
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold text-[var(--foreground)]">{addr.name}</span>
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
                  <p className="text-sm text-[var(--foreground)] mb-2 ml-6">{addr.address}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6 mb-2">
                    {addr.postcode && (
                      <span className="text-xs text-[var(--muted-foreground)]">邮编：{addr.postcode}</span>
                    )}
                    {addr.phone && (
                      <span className="text-xs text-[var(--muted-foreground)]">电话：{addr.phone}</span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-[var(--border)] ml-6">
                    <button
                      onClick={() => handleUseAddress(addr)}
                      className="text-[13px] sm:text-xs text-[var(--accent-foreground)] hover:opacity-80 font-medium min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      填入信封
                    </button>
                    <button
                      onClick={() => startEdit(addr)}
                      className="text-[13px] sm:text-xs text-[var(--accent-foreground)] hover:opacity-80 font-medium min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
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
            <span className="text-[var(--error-fg)] font-medium">删除后无法恢复。</span>
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

      {/* 批量打印二次确认：打印是实体不可逆动作，默认焦点落「取消」，Esc 可取消 */}
      <ConfirmDialog
        open={pendingBatchPrint}
        title={`确认批量打印（${selectedCount} 张）`}
        description={
          <>
            将打印 <span className="font-medium text-[var(--foreground)]">{selectedCount}</span> 张信封，请确认打印机已放好 {selectedCount} 张信封。
            <br />
            <span className="text-[var(--foreground)]">本批收件人：</span>
            <br />
            {selectedAddresses.slice(0, 5).map((a) => (
              <span key={a.id} className="text-[var(--foreground)]">
                · {a.name}
                <br />
              </span>
            ))}
            {selectedCount > 5 ? `… 等共 ${selectedCount} 条` : `共 ${selectedCount} 条`}
            <br />
            <span className="text-[var(--warning-fg)] font-medium">打印为实体操作，确认后无法撤销，请先核对张数与收件人。</span>
            <br />
            <span className="text-[var(--accent-foreground)] font-medium">
              若打印预览出现页码 / 日期 / 网址：请在打印对话框点「更多设置」→ 取消勾选「页眉和页脚」（Chrome 会记住，之后不再出现）。也可改用「批量导出 PDF」直接打印。
            </span>
          </>
        }
        confirmText="确认打印"
        cancelText="取消"
        onConfirm={() => {
          setPendingBatchPrint(false);
          runBatchPrint();
        }}
        onCancel={() => setPendingBatchPrint(false)}
      />
    </div>
  );
}
