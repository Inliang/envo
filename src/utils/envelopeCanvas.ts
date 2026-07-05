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
  settings: EnvelopeSettings,
  forPrint = false
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sizeConfig = ENVELOPE_SIZES[settings.size];
  const w = Math.round(sizeConfig.width * MM_TO_PX);
  const h = Math.round(sizeConfig.height * MM_TO_PX);

  canvas.width = w;
  canvas.height = h;

  if (isDomestic(settings)) {
    drawDomesticEnvelope(ctx, sender, recipient, settings, w, h, forPrint);
  } else {
    drawInternationalEnvelope(ctx, sender, recipient, settings, w, h, forPrint);
  }
}

/* ============ 国内信封格式（参考 docx DL 打印模板） ============ */
function drawDomesticEnvelope(
  ctx: CanvasRenderingContext2D,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings,
  w: number,
  h: number,
  forPrint = false
): void {
  // Scale: relative to DL reference (220×110mm, 832×416px)
  const REF_H = ENVELOPE_SIZES['DL'].height * MM_TO_PX; // 416
  const scale = h / REF_H;

  // User font-size acts as fine-tuning multiplier (default 14 = 1×)
  const userMul = settings.fontSize / 14;

  // Convert reference pt → canvas px (96dpi: 1pt = 1.333px)
  const ptPx = (pt: number) => Math.round(pt * 1.333 * scale * userMul);

  // Font sizes from docx DL reference template
  const F = {
    postcode: ptPx(18),       // 邮编格内数字
    address: ptPx(11),        // 收件人地址
    name: ptPx(24),           // 收件人姓名（醒目）
    phone: ptPx(14),          // 收件人电话
    sender: ptPx(10),         // 寄件人信息
    senderPostcode: ptPx(12), // 寄件人邮编
    stamp: ptPx(8),           // 贴邮票处标注
  };

  // Position as ratio of envelope w/h (from docx DL reference)
  // Recipient postcode grid
  const rZipCellW = Math.round(w * 0.045); // ~10mm each
  const rZipCellH = Math.round(h * 0.109); // ~12mm each
  const rZipX = Math.round(w * 0.09);      // ~20mm from left
  const rZipY = Math.round(h * 0.10);      // ~11mm from top

  // Stamp area (top-right)
  const stampW = Math.round(w * 0.136);     // ~30mm
  const stampH = Math.round(h * 0.182);     // ~20mm
  const stampX = w - Math.round(w * 0.07) - stampW;
  const stampY = Math.round(h * 0.08);

  // Recipient address area
  const recipX = Math.round(w * 0.16);      // moved left by 2 cells (0.25 - 2*0.045)
  const recipAddrY = Math.round(h * 0.30);  // ~33mm from top

  // Recipient name area
  const nameY = Math.round(h * 0.48);       // ~53mm from top

  // Sender info area (bottom-right, above postal code)
  const senderX = Math.round(w * 0.90);     // right-aligned near right edge
  const senderBaseY = Math.round(h * 0.72); // bottom area, above postal code

  // Sender postcode grid (bottom-right, moved left from docx)
  const sZipCellW = Math.round(w * 0.03);   // ~6.6mm each
  const sZipCellH = Math.round(h * 0.08);   // ~8.8mm each
  const sZipX = Math.round(w * 0.74);       // ~163mm from left
  const sZipY = Math.round(h * 0.82);       // ~90mm from top

  // ── Background ──
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // ── Envelope border ──
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  /* ═══════════════════════════════════════
   *  左上角：收件人邮政编码（6 格红框）
   * ═══════════════════════════════════════ */
  if (!forPrint) {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.strokeRect(rZipX + i * rZipCellW, rZipY, rZipCellW, rZipCellH);
    }
  }
  if (recipient.postcode) {
    ctx.fillStyle = forPrint ? '#1F2937' : '#DC2626';
    ctx.font = `600 ${F.postcode}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = recipient.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], rZipX + i * rZipCellW + rZipCellW / 2, rZipY + rZipCellH / 2 + 1);
    }
  }

  /* ═══════════════════════════════════════
   *  右上角：贴邮票处
   * ═══════════════════════════════════════ */
  if (!forPrint) {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 1;
    ctx.strokeRect(stampX, stampY, stampW, stampH);
    ctx.fillStyle = '#DC2626';
    ctx.font = `${F.stamp}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('贴邮票处', stampX + stampW / 2, stampY + stampH / 2);
  }

  /* ═══════════════════════════════════════
   *  收件人地址区
   * ═══════════════════════════════════════ */
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const addrLines = recipient.address.split('\n').filter(Boolean);
  if (addrLines.length > 0) {
    ctx.font = `${F.address}px ${settings.fontFamily}`;
    ctx.fillStyle = '#1F2937';
    const lineSpacing = F.address * 1.5;
    addrLines.forEach((line, i) => {
      ctx.fillText(line, recipX, recipAddrY + i * lineSpacing);
    });
  }

  /* ═══════════════════════════════════════
   *  收件人姓名 + 电话（同行，docx 风格）
   * ═══════════════════════════════════════ */
  const displayName = recipient.recipient || recipient.name || '';
  const fullName = displayName + (displayName ? '（收）' : '');

  ctx.fillStyle = '#134E4A';
  ctx.font = `700 ${F.name}px ${settings.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fullName, recipX, nameY);

  // Phone on the same line, offset to the right of name
  if (recipient.phone && displayName) {
    const nameWidth = ctx.measureText(fullName).width;
    ctx.font = `${F.phone}px ${settings.fontFamily}`;
    ctx.fillStyle = '#6B7280';
    ctx.fillText(recipient.phone, recipX + nameWidth + Math.round(w * 0.06), nameY);
  }

  /* ═══════════════════════════════════════
   *  空状态提示
   * ═══════════════════════════════════════ */
  if (!recipient.name && !recipient.address) {
    ctx.fillStyle = '#D1D5DB';
    ctx.font = `${F.address}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('请填写收件人信息', w * 0.5, h * 0.45);
  }

  /* ═══════════════════════════════════════
   *  寄件人信息区（右下角，邮编上方，右对齐）
   * ═══════════════════════════════════════ */
  if (settings.showReturnAddress && (sender.name || sender.address)) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = `${F.sender}px ${settings.fontFamily}`;
    ctx.fillStyle = '#6B7280';

    const senderLines: string[] = [];
    if (sender.address) senderLines.push(sender.address);
    if (sender.name) senderLines.push(sender.name);
    if (sender.phone) senderLines.push(sender.phone);

    const lineSpacing = F.sender * 1.4;
    senderLines.forEach((line, i) => {
      ctx.fillText(line, senderX, senderBaseY + i * lineSpacing);
    });
  }

  /* ═══════════════════════════════════════
   *  右下角：寄件人邮政编码（6 格红框）
   * ═══════════════════════════════════════ */
  if (!forPrint) {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.strokeRect(sZipX + i * sZipCellW, sZipY, sZipCellW, sZipCellH);
    }
  }
  if (sender.postcode) {
    ctx.fillStyle = forPrint ? '#1F2937' : '#DC2626';
    ctx.font = `600 ${F.senderPostcode}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = sender.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      ctx.fillText(digits[i], sZipX + i * sZipCellW + sZipCellW / 2, sZipY + sZipCellH / 2 + 1);
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
  h: number,
  forPrint = false
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
  if (!forPrint) {
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
