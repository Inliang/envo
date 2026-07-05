import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { drawEnvelope, canvasToBlob } from '../utils/envelopeCanvas';
import { ENVELOPE_SIZES } from '../store/types';
import type { SenderInfo, Address, EnvelopeSettings } from '../store/types';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AmapTip {
  name: string;
  address: string;
  district?: string;
  postcode?: string;
  adcode?: string;
  location?: string;
}

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
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
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

  // Draw canvas on changes
  useEffect(() => {
    if (!canvasRef.current) return;
    drawEnvelope(canvasRef.current, sender, recipient, currentEnvelope);
  }, [sender, recipient, currentEnvelope]);

  // Draw print canvas without red boxes
  useEffect(() => {
    if (!printCanvasRef.current) return;
    drawEnvelope(printCanvasRef.current, sender, recipient, currentEnvelope, true);
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
            if (data.tips && data.tips.length > 0) {
              const tips: AmapTip[] = data.tips
                .filter((t: { name: string }) => t.name && t.name !== '中华人民共和国')
                .map((t: { name: string; address: string; district?: string; postcode?: string; adcode?: string; location?: string }) => ({
                  name: t.name,
                  address: t.address || '',
                  district: t.district || '',
                  postcode: t.postcode,
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

  const selectAmapSuggestion = async (idx: number) => {
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

    setRecipient((r) => {
      const updates: Partial<Address> = { address: full };
      if (s.postcode && s.postcode.length > 0) {
        updates.postcode = s.postcode;
      }
      return { ...r, ...updates };
    });
    setShowSuggestions(false);
    setAmapSuggestions([]);

    // 如果 tips 未返回邮编，通过逆地理编码 API 查询
    if ((!s.postcode || s.postcode.length === 0) && s.location) {
      const amapKey = getAmapKey();
      if (amapKey) {
        try {
          const regeoRes = await fetch(
            `https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${s.location}&extensions=base`
          );
          const regeoData = await regeoRes.json();
          if (regeoData.status === '1' && regeoData.regeocode?.addressComponent) {
            const ac = regeoData.regeocode.addressComponent;
            const postcode = ac.postcode || ac.towncode || '';
            if (postcode) {
              setRecipient((r) => ({ ...r, postcode }));
            }
          }
        } catch {
          // regeo 失败静默忽略，不影响地址填充
        }
      }
    }
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

  const pageStyle = useMemo(() => {
    const cfg = ENVELOPE_SIZES[currentEnvelope.size];
    const w = currentEnvelope.size === 'custom' ? (currentEnvelope.customWidth || cfg.width) : cfg.width;
    const h = currentEnvelope.size === 'custom' ? (currentEnvelope.customHeight || cfg.height) : cfg.height;
    return `@page { size: ${w}mm ${h}mm; margin: 0; }`;
  }, [currentEnvelope.size, currentEnvelope.customWidth, currentEnvelope.customHeight]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `信封_${recipient.recipient || '打印'}`,
    pageStyle,
    onBeforePrint: () => {
      return new Promise<void>((resolve) => {
        // cloneNode 不复制 canvas 像素缓冲区，先转为 <img> 再打印
        if (printCanvasRef.current && printRef.current) {
          const img = document.createElement('img');
          img.src = printCanvasRef.current.toDataURL('image/png', 1.0);
          img.style.width = '100%';
          img.style.display = 'block';
          printRef.current.innerHTML = '';
          printRef.current.appendChild(img);
        }
        resolve();
      });
    },
    onAfterPrint: () => {
      // 恢复 canvas 到 DOM（像素缓冲区仍保留）
      if (printRef.current && printCanvasRef.current) {
        printRef.current.innerHTML = '';
        printRef.current.appendChild(printCanvasRef.current);
      }
      addPrintRecord({ recipient, sender, settings: currentEnvelope, type: 'print' });
      setMsg({ text: '打印完成，已记录到历史', type: 'ok' });
    },
  });

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    setPrintMode('pdf');
    try {
      const canvas = canvasRef.current;
      const imgData = canvas.toDataURL('image/png', 1.0);
      const mmW = sizeConfig.width;
      const mmH = sizeConfig.height;
      const pdf = new jsPDF({ orientation: mmW > mmH ? 'l' : 'p', unit: 'mm', format: [mmW, mmH] });
      pdf.addImage(imgData, 'PNG', 0, 0, mmW, mmH);
      pdf.save(`信封_${recipient.recipient || '导出'}.pdf`);
      addPrintRecord({ recipient, sender, settings: currentEnvelope, type: 'pdf' });
      setMsg({ text: 'PDF 导出完成，已记录到历史', type: 'ok' });
    } catch {
      setMsg({ text: 'PDF 导出失败', type: 'err' });
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
      setMsg({ text: '请填写收件人和地址', type: 'err' });
      return;
    }
    useStore.getState().addAddress({
      name: recipient.name || recipient.recipient,
      recipient: recipient.recipient,
      address: recipient.address,
      phone: recipient.phone,
    });
    setMsg({ text: '已保存到地址簿', type: 'ok' });
  };

  const loadFromAddressbook = (addr: Address) => {
    setCurrentRecipient(addr);
    setRecipient(addr);
  };

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
              <label className="input-label">姓名</label>
              <input
                className="input-field"
                placeholder="寄件人姓名"
                value={sender.name}
                onChange={(e) => setSender({ ...sender, name: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">地址</label>
              <textarea
                className="input-field resize-none"
                placeholder="寄件人地址"
                rows={2}
                value={sender.address}
                onChange={(e) => setSender({ ...sender, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">电话</label>
                <input
                  className="input-field"
                  placeholder="联系电话"
                  value={sender.phone || ''}
                  onChange={(e) => setSender({ ...sender, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">邮编</label>
                <input
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
              className="btn-ghost text-xs"
            >
              + 地址簿
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="input-label">姓名</label>
              <input
                className="input-field"
                placeholder="收件人姓名"
                value={recipient.name}
                onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">单位 / 公司</label>
              <input
                className="input-field"
                placeholder="单位或公司名称"
                value={recipient.recipient}
                onChange={(e) => setRecipient({ ...recipient, recipient: e.target.value })}
              />
            </div>
            <div className="relative">
              <label className="input-label">地址</label>
              <textarea
                className="input-field resize-none pr-8"
                placeholder="输入地址关键词自动联想…"
                rows={3}
                value={recipient.address}
                onChange={(e) => handleAddressInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => amapSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-auto">
                  {amapSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-50 last:border-0 ${
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">电话</label>
                <input
                  className="input-field"
                  placeholder="联系电话"
                  value={recipient.phone || ''}
                  onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">邮编</label>
                <input
                  className="input-field"
                  placeholder="邮政编码"
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
          <div className="space-y-4">
            <div>
              <label className="input-label">规格</label>
              <select
                className="input-field"
                value={currentEnvelope.size}
                onChange={(e) => setCurrentEnvelope({ size: e.target.value as EnvelopeSettings['size'] })}
              >
                <optgroup label="── 国内信封 ──">
                  {Object.entries(ENVELOPE_SIZES)
                    .filter(([, cfg]) => cfg.category === 'domestic')
                    .map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                </optgroup>
                <optgroup label="── 国际信封 ──">
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
                  <label className="input-label">宽度 (mm)</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="220"
                    value={currentEnvelope.customWidth || ''}
                    onChange={(e) => setCurrentEnvelope({ customWidth: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="input-label">高度 (mm)</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="110"
                    value={currentEnvelope.customHeight || ''}
                    onChange={(e) => setCurrentEnvelope({ customHeight: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-slate-600 font-medium">显示寄件人地址</span>
              <button
                onClick={() => setCurrentEnvelope({ showReturnAddress: !currentEnvelope.showReturnAddress })}
                className={`w-11 h-6 rounded-full transition-all duration-200 ${
                  currentEnvelope.showReturnAddress ? 'bg-brand-500' : 'bg-slate-300'
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

        {/* Actions */}
        <div className="flex flex-wrap gap-2.5">
          <button onClick={handlePrint} className="btn-primary flex-1 min-w-[100px]">
            打印信封
          </button>
          <button onClick={handleExportPDF} disabled={printMode === 'pdf'} className="btn-outline flex-1 min-w-[100px]">
            导出 PDF
          </button>
          <button onClick={saveAsAddress} className="btn-outline">
            存地址簿
          </button>
          <button onClick={clearForm} className="btn-ghost ml-auto">
            清空
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border flex items-center justify-between ${
              msg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="text-lg leading-none opacity-50 hover:opacity-80 ml-3">&times;</button>
          </div>
        )}
      </div>

      {/* Right Panel - Canvas Preview */}
      <div className="lg:col-span-3">
        <div className="card-bento p-6 sticky top-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title !mb-0">
              <span className="section-dot bg-emerald-500" />
              实时预览
            </h2>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              {sizeConfig.width} × {sizeConfig.height} mm
            </span>
          </div>
          <div className="flex justify-center bg-slate-50/70 rounded-xl p-5 overflow-auto border border-slate-100">
            <canvas
              ref={canvasRef}
              className="max-w-full shadow-md rounded-md"
              style={{ maxHeight: '540px' }}
            />
          </div>

          {/* Address bar for quick selection */}
          {addresses.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">快捷地址簿</p>
              <div className="flex flex-wrap gap-2">
                {addresses.slice(0, 6).map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => loadFromAddressbook(addr)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                      currentRecipient?.id === addr.id
                        ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {addr.name || addr.recipient || '(未命名)'}
                  </button>
                ))}
                {addresses.length > 6 && (
                  <button
                    onClick={() => setActiveTab('addressbook')}
                    className="text-xs px-3 py-1.5 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    +{addresses.length - 6} 更多
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hidden print area */}
        <div ref={printRef} className="print-area">
          <canvas ref={printCanvasRef} id="print-canvas" />
        </div>
      </div>
    </div>
  );
}
