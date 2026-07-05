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
      <div className="lg:col-span-2 space-y-5">
        {/* Sender Card */}
        <div className="card-bento p-5">
          <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
            寄件人信息
          </h2>
          <div className="space-y-3">
            <input
              className="input-field"
              placeholder="姓名"
              value={sender.name}
              onChange={(e) => setSender({ ...sender, name: e.target.value })}
            />
            <textarea
              className="input-field resize-none"
              placeholder="地址"
              rows={2}
              value={sender.address}
              onChange={(e) => setSender({ ...sender, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="电话"
                value={sender.phone || ''}
                onChange={(e) => setSender({ ...sender, phone: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="邮编"
                value={sender.postcode || ''}
                onChange={(e) => setSender({ ...sender, postcode: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Recipient Card */}
        <div className="card-bento p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-cta-500 rounded-full" />
              收件人信息
            </h2>
            <button
              onClick={() => { setCurrentRecipient(null); setActiveTab('addressbook'); }}
              className="text-xs text-brand-500 hover:text-brand-700 transition-colors"
            >
              + 从地址簿选择
            </button>
          </div>
          <div className="space-y-3">
            <input
              className="input-field"
              placeholder="姓名"
              value={recipient.name}
              onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="收件人（单位/公司名）"
              value={recipient.recipient}
              onChange={(e) => setRecipient({ ...recipient, recipient: e.target.value })}
            />
            <div className="relative">
              <textarea
                className="input-field resize-none pr-8"
                placeholder="地址（输入关键词自动联想）"
                rows={3}
                value={recipient.address}
                onChange={(e) => handleAddressInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => amapSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-brand-200 rounded-xl shadow-lg z-50 max-h-48 overflow-auto">
                  {amapSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-brand-50 transition-colors ${
                        i === selectedSuggestionIdx ? 'bg-brand-50' : ''
                      }`}
                      onMouseDown={(e) => { e.preventDefault(); selectAmapSuggestion(i); }}
                    >
                      <div className="font-medium text-brand-800">{s.name}</div>
                      {s.address && <div className="text-xs text-brand-400 mt-0.5">{s.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="电话"
                value={recipient.phone || ''}
                onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="邮编"
                value={recipient.postcode || ''}
                onChange={(e) => setRecipient({ ...recipient, postcode: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Envelope Settings */}
        <div className="card-bento p-5">
          <h2 className="text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
            信封设置
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-brand-500 mb-1 block">信封规格</label>
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
                <option value="custom">自定义</option>
              </select>
            </div>
            {currentEnvelope.size === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input-field"
                  type="number"
                  placeholder="宽度(mm)"
                  value={currentEnvelope.customWidth || ''}
                  onChange={(e) => setCurrentEnvelope({ customWidth: Number(e.target.value) })}
                />
                <input
                  className="input-field"
                  type="number"
                  placeholder="高度(mm)"
                  value={currentEnvelope.customHeight || ''}
                  onChange={(e) => setCurrentEnvelope({ customHeight: Number(e.target.value) })}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-600">显示寄件人地址</span>
              <button
                onClick={() => setCurrentEnvelope({ showReturnAddress: !currentEnvelope.showReturnAddress })}
                className={`w-11 h-6 rounded-full transition-colors ${
                  currentEnvelope.showReturnAddress ? 'bg-brand-500' : 'bg-gray-200'
                } relative`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    currentEnvelope.showReturnAddress ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button onClick={handlePrint} className="btn-primary flex-1 min-w-[120px]">
            🖨 打印
          </button>
          <button onClick={handleExportPDF} disabled={printMode === 'pdf'} className="btn-outline flex-1 min-w-[120px]">
            📄 导出PDF
          </button>
          <button onClick={saveAsAddress} className="btn-outline">
            💾 存地址簿
          </button>
          <button onClick={clearForm} className="text-sm text-brand-400 hover:text-brand-600 transition-colors px-2">
            清空
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div
            className={`text-sm px-4 py-2.5 rounded-xl ${
              msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-3 text-sm opacity-60 hover:opacity-100">×</button>
          </div>
        )}
      </div>

      {/* Right Panel - Canvas Preview */}
      <div className="lg:col-span-3">
        <div className="card-bento p-5 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
              实时预览
            </h2>
            <span className="text-xs text-brand-400">
              {sizeConfig.width}×{sizeConfig.height}mm
            </span>
          </div>
          <div className="flex justify-center bg-brand-50/50 rounded-xl p-4 overflow-auto">
            <canvas
              ref={canvasRef}
              className="max-w-full shadow-lg rounded-lg"
              style={{ maxHeight: '520px' }}
            />
          </div>

          {/* Address bar for quick selection */}
          {addresses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-100">
              <p className="text-xs text-brand-400 mb-2">快捷选择地址簿</p>
              <div className="flex flex-wrap gap-2">
                {addresses.slice(0, 6).map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => loadFromAddressbook(addr)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      currentRecipient?.id === addr.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-brand-100 text-brand-600 hover:border-brand-300'
                    }`}
                  >
                    {addr.name}
                  </button>
                ))}
                {addresses.length > 6 && (
                  <button
                    onClick={() => setActiveTab('addressbook')}
                    className="text-xs px-3 py-1.5 text-brand-400 hover:text-brand-600"
                  >
                    +{addresses.length - 6} 更多
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hidden print area — 使用无红框的打印专用 Canvas */}
        <div ref={printRef} className="print-area">
          <canvas ref={printCanvasRef} id="print-canvas" />
        </div>
      </div>
    </div>
  );
}
