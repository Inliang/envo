import type { EnvelopeSettings, SenderInfo, Address } from '../store/types';
import { ENVELOPE_SIZES } from '../store/types';

const MM_TO_PX = 3.78;

function isDomestic(settings: EnvelopeSettings): boolean {
  const cfg = ENVELOPE_SIZES[settings.size];
  return cfg.category === 'domestic';
}

export function drawEnvelope(
  canvas: HTMLCanvasElement,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sizeConfig = ENVELOPE_SIZES[settings.size];
  const w = Math.round(sizeConfig.width * MM_TO_PX);
  const h = Math.round(sizeConfig.height * MM_TO_PX);

  canvas.width = w;
  canvas.height = h;

  if (isDomestic(settings)) {
    drawDomesticEnvelope(ctx, sender, recipient, settings, w, h);
  } else {
    drawInternationalEnvelope(ctx, sender, recipient, settings, w, h);
  }
}

/* ============ 国内信封格式（GB/T 22657.1-2008） ============ */
function drawDomesticEnvelope(
  ctx: CanvasRenderingContext2D,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings,
  w: number,
  h: number
): void {
  const pad = 32; // ~8.5mm
  const fs = settings.fontSize;

  // 白色信封背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 信封边框
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  const zipCellW = 14;
  const zipCellH = 18;

  /* ── 左上角：收件人邮政编码 ── */
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1;
  const rZipX = pad;
  const rZipY = pad;
  for (let i = 0; i < 6; i++) {
    ctx.strokeRect(rZipX + i * zipCellW, rZipY, zipCellW, zipCellH);
  }
  if (recipient.postcode) {
    ctx.fillStyle = '#DC2626';
    ctx.font = `500 ${fs * 0.85}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = recipient.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], rZipX + i * zipCellW + zipCellW / 2, rZipY + zipCellH / 2);
    }
  }

  /* ── 右上角：贴邮票处 ── */
  const stampSize = 60;
  const stampX = w - pad - stampSize;
  const stampY = pad;
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1;
  ctx.strokeRect(stampX, stampY, stampSize, stampSize);
  ctx.fillStyle = '#DC2626';
  ctx.font = `${fs * 0.65}px ${settings.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('贴邮票处', stampX + stampSize / 2, stampY + stampSize / 2);

  /* ── 收件人地址（上部偏左） ── */
  const recipX = pad + 10;
  const recipAddrY = rZipY + zipCellH + 18;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const addrLines = recipient.address.split('\n').filter(Boolean);
  if (addrLines.length > 0) {
    ctx.font = `${fs}px ${settings.fontFamily}`;
    ctx.fillStyle = '#1F2937';
    addrLines.forEach((line, i) => {
      ctx.fillText(line, recipX, recipAddrY + i * (fs * 1.5));
    });
  }

  /* ── 收件人姓名（中部偏左，大字号） ── */
  const nameY = recipAddrY + (addrLines.length || 1) * (fs * 1.5) + 12;
  ctx.fillStyle = '#134E4A';
  ctx.font = `600 ${fs * 1.35}px ${settings.fontFamily}`;
  const displayName = recipient.recipient || recipient.name || '';
  ctx.fillText(displayName + (displayName ? '（收）' : ''), recipX, nameY);

  // 收件人电话
  if (recipient.phone) {
    ctx.font = `${fs * 0.8}px ${settings.fontFamily}`;
    ctx.fillStyle = '#6B7280';
    ctx.fillText(recipient.phone, recipX, nameY + fs * 1.8);
  }

  /* ── 空状态提示 ── */
  if (!recipient.name && !recipient.address) {
    ctx.fillStyle = '#D1D5DB';
    ctx.font = `${fs * 0.9}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('请填写收件人信息', w * 0.5, h * 0.55);
  }

  /* ── 寄件人地址（下部偏右） ── */
  if (settings.showReturnAddress && (sender.name || sender.address)) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const senderLines: string[] = [];
    if (sender.address) senderLines.push(sender.address);
    if (sender.name) senderLines.push(sender.name);
    if (sender.phone) senderLines.push(sender.phone);

    const sZipBottom = h - pad - zipCellH - 4;
    let senderY = sZipBottom - 6;
    ctx.font = `${fs * 0.75}px ${settings.fontFamily}`;
    ctx.fillStyle = '#6B7280';

    // 从下往上绘制寄件人信息（最后一行贴近邮编框上方）
    for (let i = senderLines.length - 1; i >= 0; i--) {
      ctx.fillText(senderLines[i], w - pad - zipCellW * 6 - 10, senderY);
      senderY -= fs * 0.95;
    }
  }

  /* ── 右下角：寄件人邮政编码 ── */
  const sZipX = w - pad - zipCellW * 6;
  const sZipY = h - pad - zipCellH;
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.strokeRect(sZipX + i * zipCellW, sZipY, zipCellW, zipCellH);
  }
  if (sender.postcode) {
    ctx.fillStyle = '#DC2626';
    ctx.font = `500 ${fs * 0.85}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = sender.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], sZipX + i * zipCellW + zipCellW / 2, sZipY + zipCellH / 2);
    }
  }
}

/* ============ 国际信封格式 ============ */
function drawInternationalEnvelope(
  ctx: CanvasRenderingContext2D,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings,
  w: number,
  h: number
): void {
  const padding = 12;
  const fs = settings.fontSize;

  // 白色信封背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 信封边框
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // 邮编网格（右上角）
  const gridStartX = w - padding - 100;
  const gridStartY = padding + 8;
  const cellSize = 12;
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 1;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      ctx.strokeRect(
        gridStartX + col * cellSize,
        gridStartY + row * cellSize,
        cellSize,
        cellSize
      );
    }
  }

  // 寄件人信息（左上角）
  if (settings.showReturnAddress && sender.name) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6B7280';
    ctx.font = `${fs * 0.7}px ${settings.fontFamily}`;
    const senderLines = [
      `From: ${sender.name}`,
      sender.address,
      sender.phone ? `Tel: ${sender.phone}` : '',
      sender.postcode ? `ZIP: ${sender.postcode}` : '',
    ].filter(Boolean);
    senderLines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + 8 + i * (fs * 0.9));
    });
  }

  // 收件人地址（中间偏右）
  const recipX = w * 0.55;
  const recipY = h * 0.4;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#134E4A';
  ctx.font = `600 ${fs}px ${settings.fontFamily}`;
  ctx.fillText('To:', recipX, recipY - 20);
  ctx.fillText(recipient.recipient || recipient.name, recipX, recipY);

  const addrLines = recipient.address.split('\n').filter(Boolean);
  ctx.font = `${fs}px ${settings.fontFamily}`;
  ctx.fillStyle = '#1F2937';
  addrLines.forEach((line, i) => {
    ctx.fillText(line, recipX, recipY + 24 + i * (fs * 1.6));
  });

  if (recipient.phone) {
    ctx.font = `${fs * 0.8}px ${settings.fontFamily}`;
    ctx.fillStyle = '#6B7280';
    ctx.fillText(
      `Tel: ${recipient.phone}`,
      recipX,
      recipY + 24 + addrLines.length * (fs * 1.6) + 14
    );
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to blob failed'));
      },
      'image/png',
      1.0
    );
  });
}
