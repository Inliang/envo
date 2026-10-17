import { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { drawEnvelope } from '../utils/envelopeCanvas';
import { ENVELOPE_SIZES } from '../store/types';
import type { SenderInfo, Address, EnvelopeSettings } from '../store/types';
import jsPDF from 'jspdf';

interface AmapTip {
  name: string;
  address: string;
  district?: string;
  adcode?: string;
  location?: string;
}

// 高德 Key 类错误码（site-spec §9.1 交互加固）：出现时提示用户检查 Key，而不是静默失败
const AMAP_KEY_ERRORS = new Set(['10001', '10003', '10021', 'USERKEY_PLAT_NOMATCH']);

export default function EnvelopeEditor() {
  const {
    settings,
    currentRecipient,
    currentEnvelope,
    setCurrentRecipient,
    setCurrentEnvelope,
    addPrintRecord,
    getAmapKey,
    addresses,
    setActiveTab,
  } = useStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sender, setSender] = useState<SenderInfo>(settings.defaultSender);
  const [recipient, setRecipient] = useState<Address>(
    currentRecipient || { id: '', name: '', recipient: '', address: '', phone: '', postcode: '', createdAt: '' }
  );
  const [amapSuggestions, setAmapSuggestions] = useState<AmapTip[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);
  const [printMode, setPrintMode] = useState<'none' | 'print' | 'pdf'>('none');
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const sizeConfig = ENVELOPE_SIZES[currentEnvelope.size];
  const hasAmapKey = Boolean(settings.amapKey);

  // Draw canvas on changes
  useEffect(() => {
    if (!canvasRef.current) return;
    drawEnvelope(canvasRef.current, sender, recipient, currentEnvelope);
  }, [sender, recipient, currentEnvelope]);

  // AMap autocomplete with debounce
  const amapFetchRef = useRef(0);
  const handleAddressInput = useCallback(
    (value: string) => {
      setRecipient((r) => ({ ...r, address: value }));
      const amapKey = getAmapKey();
      if (!amapKey || value.length < 2) {
        setAmapSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const fetchId = ++amapFetchRef.current;
      const keyword = value;
      // Debounce
      setTimeout(() => {
        if (fetchId !== amapFetchRef.current) return;
        fetch(
          `https://restapi.amap.com/v3/assistant/inputtips?key=${amapKey}&keywords=${encodeURIComponent(keyword)}&datatype=all`
        )
          .then((res) => res.json())
          .then((data) => {
            if (fetchId !== amapFetchRef.current) return;
            // Key 类错误一次性提示（10001 / 10003 / 10021 / USERKEY_PLAT_NOMATCH）
            if (data.status !== '1' && AMAP_KEY_ERRORS.has(String(data.infocode ?? ''))) {
              setMsg({ text: '高德 Key 校验未通过，地址联想暂不可用。请到「设置」检查 Key 是否有效或配额是否用尽', type: 'err' });
              setAmapSuggestions([]);
              setShowSuggestions(false);
              return;
            }
            if (data.tips && data.tips.length > 0) {
              const tips: AmapTip[] = data.tips
                .filter((t: { name: string }) => t.name && t.name !== '中华人民共和国')
                .map((t: { name: string; address: string; district?: string; adcode?: string; location?: string }) => ({
                  name: t.name,
                  address: t.address || '',
                  district: t.district || '',
                  adcode: t.adcode,
                  location: t.location,
                }));
              setAmapSuggestions(tips);
              setShowSuggestions(tips.length > 0);
              setSelectedSuggestionIdx(-1);
            } else {
              setAmapSuggestions([]);
              setShowSuggestions(false);
            }
          })
          .catch(() => {});
      }, 300);
    },
    [getAmapKey]
  );

  // B6（R5）裁决：联想选中只填地址，邮编一律留空由用户手填。
  // 高德 inputtips 不返回 postcode，此前用 11 位 towncode 冒充邮编会导致分拣错误（实体不可逆）；
  // 不再调用逆地理编码后，选中联想项的 API 调用从 2 次降为 1 次，配额消耗减半。
  const selectAmapSuggestion = (idx: number) => {
    const s = amapSuggestions[idx];
    if (!s) return;

    // 构建完整地址：district（省市区路径） + (address || name)，去重
    const district = s.district || '';
    const detail = s.address || s.name;
    let full: string;
    if (district) {
      full = district.endsWith(detail) ? district : `${district}${detail}`;
    } else {
      full = detail;
    }

    setRecipient((r) => ({ ...r, address: full }));
    setShowSuggestions(false);
    setAmapSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIdx((i) => Math.min(i + 1, amapSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedSuggestionIdx >= 0) {
      e.preventDefault();
      selectAmapSuggestion(selectedSuggestionIdx);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handlePrint = useCallback(async () => {
    if (printMode !== 'none') return;
    setPrintMode('print');
    try {
      // 让按钮先进入「生成中…」禁用态，再开始 6× 高清渲染，防止低端机上重复点击重复入账
      await new Promise((r) => setTimeout(r, 30));

      const mmW = currentEnvelope.size === 'custom'
        ? (currentEnvelope.customWidth || sizeConfig.width)
        : sizeConfig.width;
      const mmH = currentEnvelope.size === 'custom'
        ? (currentEnvelope.customHeight || sizeConfig.height)
        : sizeConfig.height;

      // 用 6× DPR 临时 Canvas 绘制高清信封
      const printCanvas = document.createElement('canvas');
      drawEnvelope(printCanvas, sender, recipient, currentEnvelope, true, 6);
      const imgData = printCanvas.toDataURL('image/png', 1.0);

      // 打开干净打印窗口，避免 react-to-print iframe 的 CSS 继承问题
      const pw = window.open('', '_blank');
      if (!pw) {
        setMsg({ text: '请允许弹出窗口以打印信封', type: 'err' });
        return;
      }
      const altText = `信封打印预览：${recipient.recipient || recipient.name || '未命名'}，${sizeConfig.label}`;
      pw.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>信封_${recipient.recipient || '打印'}</title>
          <style>
            @page { size: ${mmW}mm ${mmH}mm; margin: 0; }
            * { margin: 0; padding: 0; }
            html, body { width: 100%; height: 100%; }
            img { width: 100%; display: block; }
          </style>
        </head>
        <body>
          <img id="print-img" src="${imgData}" alt="${altText}" />
          <script>
            document.getElementById('print-img').onload = function() {
              setTimeout(function() { window.print(); }, 200);
            };
          </script>
        </body>
        </html>
      `);
      pw.document.close();

      addPrintRecord({ recipient, sender, settings: currentEnvelope, type: 'print' });
      setMsg({ text: '已在新窗口打开打印预览，打印完成后关闭该窗口即可', type: 'ok' });
    } finally {
      setPrintMode('none');
    }
  }, [printMode, sender, recipient, currentEnvelope, sizeConfig, addPrintRecord]);

  const handleExportPDF = async () => {
    if (printMode !== 'none') return;
    setPrintMode('pdf');
    try {
      // 让按钮先进入「生成中…」禁用态，防止 6× 渲染期间重复点击重复入账
      await new Promise((r) => setTimeout(r, 30));
      // 用 6× DPR 创建临时 Canvas，确保 PDF 导出清晰
      const tempCanvas = document.createElement('canvas');
      drawEnvelope(tempCanvas, sender, recipient, currentEnvelope, true, 6);
      const imgData = tempCanvas.toDataURL('image/png', 1.0);
      const mmW = sizeConfig.width;
      const mmH = sizeConfig.height;
      const pdf = new jsPDF({ orientation: mmW > mmH ? 'l' : 'p', unit: 'mm', format: [mmW, mmH] });
      pdf.addImage(imgData, 'PNG', 0, 0, mmW, mmH);
      pdf.save(`信封_${recipient.recipient || '导出'}.pdf`);
      addPrintRecord({ recipient, sender, settings: currentEnvelope, type: 'pdf' });
      setMsg({ text: 'PDF 导出完成，已记录到历史', type: 'ok' });
    } catch {
      setMsg({ text: 'PDF 导出失败，请重试或改用打印', type: 'err' });
    }
    setPrintMode('none');
  };

  const clearForm = () => {
    setRecipient({ id: '', name: '', recipient: '', address: '', phone: '', postcode: '', createdAt: '' });
    setAmapSuggestions([]);
    setShowSuggestions(false);
  };

  const saveAsAddress = () => {
    if (!recipient.recipient || !recipient.address) {
      setMsg({ text: '请填写收件人（或单位）和地址，再存入地址簿', type: 'err' });
      return;
    }
    useStore.getState().addAddress({
      name: recipient.name || recipient.recipient,
      recipient: recipient.recipient,
      address: recipient.address,
      phone: recipient.phone,
      // B6-B：邮编一律由用户手填，这里必须一并把「手填的那个邮编」存进地址簿，
      // 否则下次从地址簿选回来邮编又空了，「只填一次」的前提不成立。
      postcode: recipient.postcode || undefined,
    });
    setMsg({ text: '已保存到地址簿', type: 'ok' });
  };

  const loadFromAddressbook = (addr: Address) => {
    setCurrentRecipient(addr);
    setRecipient(addr);
  };

  const busy = printMode !== 'none';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Panel - Form */}
      <div className="lg:col-span-2 space-y-4">
        {/* Sender Card */}
        <div className="card-bento p-5">
          <h2 className="section-title">
            <span className="section-dot bg-slate-400" />
            寄件人信息
          </h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="sender-name" className="input-label">寄件人姓名</label>
              <input
                id="sender-name"
                className="input-field"
                placeholder="寄件人姓名"
                value={sender.name}
                onChange={(e) => setSender({ ...sender, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="sender-address" className="input-label">寄件人地址</label>
              <textarea
                id="sender-address"
                className="input-field resize-none"
                placeholder="寄件人地址"
                rows={2}
                value={sender.address}
                onChange={(e) => setSender({ ...sender, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sender-phone" className="input-label">寄件人电话</label>
                <input
                  id="sender-phone"
                  className="input-field"
                  placeholder="联系电话"
                  value={sender.phone || ''}
                  onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="sender-postcode" className="input-label">寄件人邮编</label>
                <input
                  id="sender-postcode"
                  className="input-field"
                  placeholder="邮政编码"
                  value={sender.postcode || ''}
                  onChange={(e) => setSender({ ...sender, postcode: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recipient Card */}
        <div className="card-bento p-5 ring-1 ring-cta-200/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title !mb-0">
              <span className="section-dot bg-cta-500" />
              收件人信息
            </h2>
            <button
              onClick={() => { setCurrentRecipient(null); setActiveTab('addressbook'); }}
              aria-label="打开地址簿，选择一个已有收件人"
              className="btn-ghost text-xs"
            >
              从地址簿选择
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="rcpt-name" className="input-label">收件人姓名</label>
              <input
                id="rcpt-name"
                className="input-field"
                placeholder="收件人姓名"
                value={recipient.name}
                onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="rcpt-org" className="input-label">收件人 / 单位 <span className="text-red-700" aria-hidden="true">*</span></label>
              <input
                id="rcpt-org"
                className="input-field"
                placeholder="单位或公司名称"
                aria-required="true"
                value={recipient.recipient}
                onChange={(e) => setRecipient({ ...recipient, recipient: e.target.value })}
              />
            </div>
            <div className="relative">
              <label htmlFor="rcpt-address" className="input-label">收件人地址 <span className="text-red-700" aria-hidden="true">*</span></label>
              <textarea
                id="rcpt-address"
                className="input-field resize-none pr-8"
                placeholder="输入地址关键词，自动联想候选地址"
                rows={3}
                aria-required="true"
                aria-autocomplete="list"
                value={recipient.address}
                onChange={(e) => handleAddressInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => amapSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 sm:max-h-52 overflow-auto">
                  {amapSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 min-h-[44px] text-sm transition-colors border-b border-slate-50 last:border-0 ${
                        i === selectedSuggestionIdx ? 'bg-brand-50 text-brand-800' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      onMouseDown={(e) => { e.preventDefault(); selectAmapSuggestion(i); }}
                    >
                      <div className="font-semibold">{s.name}</div>
                      {s.address && <div className="text-xs text-slate-500 mt-0.5 truncate">{s.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* N-09：未配置高德 Key 时给出可见引导，而不是静默无联想 */}
            {!hasAmapKey && (
              <p className="text-[13px] leading-6 text-slate-500">
                没填高德 Key 时联想不生效，可在
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="mx-1 py-2 -my-2 font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  设置
                </button>
                里填写
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rcpt-phone" className="input-label">收件人电话</label>
                <input
                  id="rcpt-phone"
                  className="input-field"
                  placeholder="联系电话"
                  value={recipient.phone || ''}
                  onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="rcpt-postcode" className="input-label">收件人邮编</label>
                <input
                  id="rcpt-postcode"
                  className="input-field"
                  placeholder="6 位数字，建议手填"
                  value={recipient.postcode || ''}
                  onChange={(e) => setRecipient({ ...recipient, postcode: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Envelope Settings */}
        <div className="card-bento p-5">
          <h2 className="section-title">
            <span className="section-dot bg-brand-500" />
            信封设置
          </h2>
          <p className="text-[13px] leading-6 text-slate-500 mb-3">
            内置 ZL/DL/C5/C4 国内规格与 B6/C6 国际规格，也可以自己填尺寸。
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="env-size" className="input-label">规格</label>
              <select
                id="env-size"
                className="input-field"
                value={currentEnvelope.size}
                onChange={(e) => setCurrentEnvelope({ size: e.target.value as EnvelopeSettings['size'] })}
              >
                <optgroup label="国内信封">
                  {Object.entries(ENVELOPE_SIZES)
                    .filter(([, cfg]) => cfg.category === 'domestic')
                    .map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                </optgroup>
                <optgroup label="国际信封">
                  {Object.entries(ENVELOPE_SIZES)
                    .filter(([k, cfg]) => cfg.category === 'international' && k !== 'custom')
                    .map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                </optgroup>
                <option value="custom">自定义尺寸</option>
              </select>
            </div>
            {currentEnvelope.size === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="env-custom-w" className="input-label">宽度 (mm)</label>
                  <input
                    id="env-custom-w"
                    className="input-field"
                    type="number"
                    placeholder="220"
                    value={currentEnvelope.customWidth || ''}
                    onChange={(e) => setCurrentEnvelope({ customWidth: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label htmlFor="env-custom-h" className="input-label">高度 (mm)</label>
                  <input
                    id="env-custom-h"
                    className="input-field"
                    type="number"
                    placeholder="110"
                    value={currentEnvelope.customHeight || ''}
                    onChange={(e) => setCurrentEnvelope({ customHeight: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between min-h-[44px] sm:min-h-0 sm:py-1">
              <span id="return-addr-label" className="text-sm text-slate-700 font-medium">显示寄件人地址</span>
              <button
                type="button"
                role="switch"
                aria-checked={currentEnvelope.showReturnAddress}
                aria-labelledby="return-addr-label"
                onClick={() => setCurrentEnvelope({ showReturnAddress: !currentEnvelope.showReturnAddress })}
                className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 ${
                  currentEnvelope.showReturnAddress ? 'bg-brand-600' : 'bg-slate-500'
                } relative`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    currentEnvelope.showReturnAddress ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile CTA guidance（content-plan §7.6 #39：移动端不承诺打印，转接「存入地址簿」） */}
        <p className="sm:hidden text-[13px] leading-6 text-slate-500 px-1">
          手机上打印容易错位，弹窗也常被拦截。建议在电脑上打开同一个网址再打印 —— 现在可以先点「存入地址簿」，地址不会丢。
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          <button
            onClick={handlePrint}
            disabled={busy}
            aria-busy={printMode === 'print'}
            className="btn-primary col-span-2 sm:col-span-1"
          >
            {printMode === 'print' && (
              <svg aria-hidden="true" className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            )}
            {printMode === 'print' ? '生成中…' : '打印信封'}
          </button>
          <button onClick={handleExportPDF} disabled={busy} aria-busy={printMode === 'pdf'} className="btn-outline">
            {printMode === 'pdf' ? '生成中…' : '导出 PDF'}
          </button>
          <button onClick={saveAsAddress} className="btn-outline">
            存入地址簿
          </button>
          <button onClick={clearForm} className="btn-ghost col-span-2 sm:col-span-1 sm:ml-auto">
            清空收件人
          </button>
          <p className="sm:hidden col-span-2 text-xs leading-5 text-slate-500 px-1">
            存下地址，到电脑上打开同一个网址就能接着打印
          </p>
        </div>

        {/* Message */}
        {msg && (
          <div
            role={msg.type === 'ok' ? 'status' : 'alert'}
            aria-live={msg.type === 'ok' ? 'polite' : undefined}
            className={`text-sm px-4 py-3 rounded-xl border flex items-center justify-between gap-3 ${
              msg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                {msg.type === 'ok' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.34 3.94c.09-.54.56-.94 1.11-.94h1.1c.55 0 1.02.4 1.11.94l.149.894c.07.424.384.764.78.932.397.168.847.193 1.233.094l.863-.216c.536-.134 1.1.113 1.36.604l.55.964c.275.483.17 1.095-.244 1.456l-.69.6c-.33.287-.497.73-.431 1.17.066.44.36.81.772.98l.813.328c.53.214.86.744.86 1.318 0 .574-.33 1.104-.86 1.318l-.813.328c-.412.17-.706.54-.772.98-.066.44.1.883.43 1.17l.691.6c.414.361.52.973.244 1.456l-.55.964c-.26.49-.824.738-1.36.604l-.863-.216c-.386-.099-.836-.074-1.233.094-.396.168-.71.508-.78.932l-.149.894c-.09.54-.56.94-1.11.94h-1.1c-.55 0-1.02-.4-1.11-.94l-.149-.894c-.07-.424-.384-.764-.78-.932-.397-.168-.847-.193-1.233-.094l-.863.216c-.536.134-1.1-.113-1.36-.604l-.55-.964c-.275-.483-.17-1.095.244-1.456l.69-.6c.33-.287.497-.73.431-1.17a1.226 1.226 0 00-.772-.98l-.813-.328c-.53-.214-.86-.744-.86-1.318 0-.574.33-1.104.86-1.318l.813-.328c.412-.17.706-.54.772-.98.066-.44-.1-.883-.43-1.17l-.691-.6c-.414-.361-.52-.973-.244-1.456l.55-.964c.26-.49.824-.738 1.36-.604l.863.216c.386.099.836.074 1.233-.094.396-.168.71-.508.78-.932l.149-.894z" />
                )}
              </svg>
              {msg.text}
            </span>
            <button
              onClick={() => setMsg(null)}
              aria-label="关闭提示"
              className="shrink-0 -m-2 p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:m-0 sm:p-1 flex items-center justify-center opacity-70 hover:opacity-100"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Canvas Preview */}
      <div className="lg:col-span-3">
        <div className="card-bento p-2 sm:p-5 lg:p-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-5 px-1 sm:px-0">
            <h2 className="section-title !mb-0">
              <span className="section-dot bg-emerald-500" />
              信封预览
            </h2>
            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {sizeConfig.width} × {sizeConfig.height} mm
            </span>
          </div>
          <div className="flex justify-center bg-slate-50/70 rounded-xl p-2 sm:p-5 border border-slate-100 overflow-hidden">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`信封排版预览，${sizeConfig.label}，收件人 ${recipient.recipient || recipient.name || '未填写'}，地址 ${recipient.address || '未填写'}`}
              className="block max-w-full w-auto h-auto max-h-[45vh] sm:max-h-[540px] shadow-md rounded-md"
            />
            <p className="sr-only">
              你的浏览器不支持 Canvas，无法预览信封排版，可以改用导出 PDF 查看效果。
            </p>
          </div>

          {/* Address bar for quick selection */}
          {addresses.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 px-1 sm:px-0">
              <p className="text-xs font-semibold text-slate-600 tracking-normal mb-3">快捷地址簿</p>
              <div className="flex flex-wrap gap-2">
                {addresses.slice(0, 6).map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => loadFromAddressbook(addr)}
                    className={`text-[13px] sm:text-xs px-4 sm:px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border transition-all duration-150 ${
                      currentRecipient?.id === addr.id
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {addr.name || addr.recipient || '(未命名)'}
                  </button>
                ))}
                {addresses.length > 6 && (
                  <button
                    onClick={() => setActiveTab('addressbook')}
                    aria-label={`查看全部 ${addresses.length} 个地址`}
                    className="text-[13px] sm:text-xs px-4 sm:px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-brand-700 hover:text-brand-800 transition-colors"
                  >
                    +{addresses.length - 6} 更多
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
