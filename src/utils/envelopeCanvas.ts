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

/* ============ 国内信封格式（GB/T 1416-2003） ============ */
function drawDomesticEnvelope(
  ctx: CanvasRenderingContext2D,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings,
  w: number,
  h: number
): void {
  const pad = 32; // ~8.5mm
  const midX = w * 0.5;
  const fs = settings.fontSize;

  // 白色信封背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // 信封边框
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  /* ── 左上角：寄件人邮编 ── */
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1;
  const zipCellW = 14;
  const zipCellH = 18;
  const zipX = pad;
  const zipY = pad;

  // 6个邮编方格
  for (let i = 0; i < 6; i++) {
    ctx.strokeRect(zipX + i * zipCellW, zipY, zipCellW, zipCellH);
  }

  // 填入邮编数字
  if (sender.postcode) {
    ctx.fillStyle = '#DC2626';
    ctx.font = `500 ${fs * 0.85}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = sender.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(
        digits[i],
        zipX + i * zipCellW + zipCellW / 2,
        zipY + zipCellH / 2
      );
    }
  }

  /* ── 寄件人地址（邮编下方） ── */
  if (settings.showReturnAddress && (sender.name || sender.address)) {
    ctx.fillStyle = '#6B7280';
    ctx.font = `${fs * 0.75}px ${settings.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const senderY = zipY + zipCellH + 6;
    const lines: string[] = [];
    if (sender.name) lines.push(sender.name);
    if (sender.address) lines.push(sender.address);
    if (sender.phone) lines.push(sender.phone);

    lines.forEach((line, i) => {
      ctx.fillText(line, zipX, senderY + i * (fs * 0.85));
    });
  }

  /* ── 右上角：贴邮票处 ── */
  const stampSize = 60; // ~16mm
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

  /* ── 收件人邮编（右上角、贴邮票处下方） ── */
  if (recipient.postcode) {
    const rZipY = stampY + stampSize + 10;
    const rZipX = stampX + (stampSize - 6 * zipCellW) / 2;
    for (let i = 0; i < 6; i++) {
      ctx.strokeRect(rZipX + i * zipCellW, rZipY, zipCellW, zipCellH);
    }
    ctx.fillStyle = '#DC2626';
    ctx.font = `500 ${fs * 0.85}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rDigits = recipient.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < rDigits.length; i++) {
      ctx.fillText(
        rDigits[i],
        rZipX + i * zipCellW + zipCellW / 2,
        rZipY + zipCellH / 2
      );
    }
  }

  /* ── 收件人地址（中心区域） ── */
  const recipX = w * 0.52;
  const recipY = h * 0.35;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // 收件人姓名
  ctx.fillStyle = '#134E4A';
  ctx.font = `600 ${fs * 1.25}px ${settings.fontFamily}`;
  ctx.fillText(recipient.recipient || recipient.name, recipX, recipY);

  // 收件人地址
  const addrLines = recipient.address.split('\n').filter(Boolean);
  ctx.font = `${fs * 1.05}px ${settings.fontFamily}`;
  ctx.fillStyle = '#1F2937';
  const lineH = fs * 1.8;
  const addrStartY = recipY + 28;

  if (addrLines.length === 0 && !recipient.address) {
    // 空状态提示
    ctx.fillStyle = '#D1D5DB';
    ctx.font = `${fs * 0.9}px ${settings.fontFamily}`;
    ctx.fillText('请填写收件人地址', midX, h * 0.55);
  } else {
    addrLines.forEach((line, i) => {
      ctx.fillText(line, recipX, addrStartY + i * lineH);
    });
  }

  // 收件人电话
  const phoneY = addrStartY + (addrLines.length || 1) * lineH + 4;
  if (recipient.phone) {
    ctx.font = `${fs * 0.85}px ${settings.fontFamily}`;
    ctx.fillStyle = '#6B7280';
    ctx.fillText(recipient.phone, recipX, phoneY);
  }

  /* ── 寄件人姓名（右下角标注：寄） ── */
  if (sender.name) {
    ctx.textAlign = 'right';
    ctx.font = `${fs * 0.7}px ${settings.fontFamily}`;
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(`${sender.name} 寄`, w - pad, h - pad);
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
