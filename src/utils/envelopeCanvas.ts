import type { EnvelopeSettings, SenderInfo, Address } from '../store/types';
import { ENVELOPE_SIZES, CANVAS_FONT_STACK } from '../store/types';

const MM_TO_PX = 3.78;

/**
 * 设置 Canvas 字体（design-spec §3.1② / D1）。
 * 必须用独立的 Canvas 字体栈（system-ui 开头，不含 -apple-system 等非法 shorthand 族名），
 * 并在赋值后立即读回校验：若赋值被静默忽略（ctx.font 仍是哨兵值），
 * 信封会以 10px 默认字体渲染 —— 预览看不出、打印整批报废，这条 warn 是唯一的救命索。
 */
function setFont(ctx: CanvasRenderingContext2D, weight: string | number, sizePx: number): void {
  const size = Math.max(1, Math.round(sizePx));
  const target = `${weight} ${size}px ${CANVAS_FONT_STACK}`;
  ctx.font = '1px sans-serif'; // 哨兵：非法赋值会保持此值不变
  ctx.font = target;
  if (!ctx.font.includes('system-ui')) {
    console.warn('[envo] 信封字体设置未生效，已回退浏览器默认字体：', target);
  }
}

/* ═══════════════════════════════════════════════════════════════
 *  文本自适应缩字号（B12）
 *  信封印出来就是实体、不可逆，所以这条设计得极其保守：
 *  「放得下就一个像素都不动」，只有在真的溢出时才介入。
 * ═══════════════════════════════════════════════════════════════ */

/** 缩字号下限取基准字号的 70%：再小就不是「略缩」而是「换了个字号」，信封上的字会明显偏小 */
const FIT_MIN_RATIO = 0.7;
/** 绝对下限 9px：印刷可读下限（约 6.5pt），低于此宁可让它溢出也不再缩 */
const FIT_MIN_PX = 9;

/**
 * 按可用宽度自适应字号。
 *
 * 关键一步：先按 baseSize 量一次宽度，没超就直接返回 baseSize —— 保证现有所有
 * 正常内容（短姓名 / 短地址）的渲染结果与改动前**逐字节一致**。只有量出来超了，
 * 才 1px 一档往下试，直到放得下或触及下限。
 *
 * @param weight 必须与随后绘制用的字重一致，否则测量宽度 ≠ 实际渲染宽度
 * @param minSize 可选，显式指定下限；缺省为 max(9, round(baseSize × 70%))
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight: string | number = '',
  minSize?: number
): number {
  const base = Math.max(1, Math.round(baseSize));
  if (!text || maxWidth <= 0) return base;
  const floor = Math.max(FIT_MIN_PX, Math.round(base * FIT_MIN_RATIO));
  const min = Math.max(1, Math.min(minSize ?? floor, base));

  setFont(ctx, weight, base);
  if (ctx.measureText(text).width <= maxWidth) return base;

  for (let s = base - 1; s > min; s--) {
    setFont(ctx, weight, s);
    if (ctx.measureText(text).width <= maxWidth) return s;
  }
  // 触底：取下限值（真实宽度仍可能超出，此时如实溢出，交由上层决定是否提示用户）
  setFont(ctx, weight, min);
  return min;
}

/* ═══════════════════════════════════════════════════════════════
 *  折行（B13）：单行缩到下限仍放不下时的兜底
 *  触发顺序固定为「先缩字号 → 缩到底还放不下 → 才折行」：
 *  普通略长地址（30 字上下）缩一点点就看不出来，折行反而把一个地址拆成两半更难看。
 * ═══════════════════════════════════════════════════════════════ */

/**
 * 折行行数上限（按「每条原始行」计，不按整个地址块计）：
 * - 国际格式 3 行：收件人区下方是空白，纵向空间充裕；
 * - 国内格式 2 行：地址区从 0.30h 起排、0.48h 就是姓名行，实测第 3 行底边会贴上/压到
 *   姓名行上沿（各尺寸余量都在 0～1.5px），只给 2 行才能确保不与下方元素重叠。
 */
const MAX_WRAP_LINES_INTL = 3;
const MAX_WRAP_LINES_DOMESTIC = 2;

/** 与 fitFontSize 内部同一套下限口径 */
function fitFloor(baseSize: number): number {
  return Math.max(FIT_MIN_PX, Math.round(Math.max(1, Math.round(baseSize)) * FIT_MIN_RATIO));
}

const CJK_RE = /[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]/;

/**
 * 切词：CJK 逐字可断；拉丁 / 数字连成一个整体，尽量不在词中间断开。
 */
function tokenizeForWrap(text: string): string[] {
  const tokens: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (CJK_RE.test(ch)) {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(ch);
    } else {
      buf += ch;
      // 空格跟着前面的词一起走，避免行首出现空格
      if (ch === ' ') { tokens.push(buf); buf = ''; }
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

/** 按目标宽度把 token 贪心地切成至多 n 行（尽量等宽，最后一行收下所有剩余） */
function splitIntoLines(
  ctx: CanvasRenderingContext2D,
  tokens: string[],
  weight: string | number,
  size: number,
  n: number
): string[] {
  setFont(ctx, weight, size);
  const widths = tokens.map((t) => ctx.measureText(t).width);
  const target = widths.reduce((a, b) => a + b, 0) / n;

  const lines: string[] = [];
  let cur = '';
  let curW = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (n - lines.length <= 1) {
      cur += tokens[i]; // 已是最后一行，剩余全部收下
      continue;
    }
    if (cur && curW + widths[i] > target) {
      lines.push(cur.trimEnd());
      cur = tokens[i];
      curW = widths[i];
    } else {
      cur += tokens[i];
      curW += widths[i];
    }
  }
  if (cur) lines.push(cur.trimEnd());
  return lines;
}

/**
 * 文本排版：单行自适应（B12）优先，缩到下限仍放不下才折行。
 * 返回切好的行数组；单行放得下时原样返回 [text]，一个像素都不变。
 * 到达行数上限仍放不下时返回 [text] —— 保持 B12 的「缩到下限、如实溢出」行为，
 * 绝不偷偷截断（信封上少印半行地址比印出来挤一点危险得多）。
 */
function layoutLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight: string | number,
  maxLines: number
): string[] {
  if (!text || maxWidth <= 0 || maxLines <= 1) return [text];

  // ① 单行（含缩字号）
  const size = fitFontSize(ctx, text, maxWidth, baseSize, weight);
  setFont(ctx, weight, size);
  if (ctx.measureText(text).width <= maxWidth) return [text];

  // ② 缩到下限仍放不下 → 折行：从 2 行试到上限，取第一个「每行缩到下限都能放下」的切法
  const minSize = fitFloor(baseSize);
  const tokens = tokenizeForWrap(text);
  for (let n = 2; n <= maxLines; n++) {
    const lines = splitIntoLines(ctx, tokens, weight, size, n);
    setFont(ctx, weight, minSize);
    if (lines.length <= n && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return lines;
    }
  }

  // ③ 上限内放不下：保持单行缩到下限（可能溢出），如实呈现
  return [text];
}

/**
 * 书写格式（B11）：尺寸与格式解耦，任意尺寸都能套国内 / 国际两种格式。
 * 显式 format 优先；老数据没有该字段（或值非法）时回退到「按尺寸 category 判断」，
 * 与改动前行为逐字节一致，因此不需要 bump persist version。
 */
function resolveFormat(settings: EnvelopeSettings): 'domestic' | 'international' {
  if (settings.format === 'domestic' || settings.format === 'international') {
    return settings.format;
  }
  const cfg = ENVELOPE_SIZES[settings.size];
  return cfg.category === 'domestic' ? 'domestic' : 'international';
}

export function drawEnvelope(
  canvas: HTMLCanvasElement,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings,
  forPrint = false,
  dpr = 1
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sizeConfig = ENVELOPE_SIZES[settings.size];
  const w = Math.round(sizeConfig.width * MM_TO_PX);
  const h = Math.round(sizeConfig.height * MM_TO_PX);

  canvas.width = w * dpr;
  canvas.height = h * dpr;

  if (dpr !== 1) {
    ctx.scale(dpr, dpr);
  }

  if (resolveFormat(settings) === 'domestic') {
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
    phone: ptPx(16),          // 收件人电话
    sender: ptPx(12),         // 寄件人信息
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

  // 左右安全边距（B12：姓名与电话之间的间隔，同时用作文本可用的右侧留白）
  const sideMargin = Math.round(w * 0.06);

  // Sender info area (bottom-right, above postal code)
  const senderX = Math.round(w * 0.90);     // right-aligned near right edge
  const senderBaseY = Math.round(h * 0.64); // bottom area, above postal code

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
    setFont(ctx, 600, F.postcode);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = recipient.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      // 单格宽度是上限；单个数字永远放得下，这里只是给极端大字号兜底
      setFont(ctx, 600, fitFontSize(ctx, digits[i], rZipCellW - 2, F.postcode, 600));
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
    setFont(ctx, '', F.stamp);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('贴邮票处', stampX + stampW / 2, stampY + stampH / 2);
  }

  /* ═══════════════════════════════════════
   *  收件人地址区
   * ═══════════════════════════════════════ */
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const rawAddrLines = recipient.address.split('\n').filter(Boolean);
  if (rawAddrLines.length > 0) {
    ctx.fillStyle = '#1F2937';
    // 行距仍按基准字号算，缩字号只影响横向宽度，纵向布局与改动前完全一致
    const lineSpacing = F.address * 1.5;
    // 可用宽度：从 recipX 到右安全边距（与电话偏移同一个边距，视觉上统一）
    const addrMax = w - recipX - sideMargin;
    let y = recipAddrY;
    // B13：单行放不下才折行；折出来的每一行再各自走一遍自适应
    for (const raw of rawAddrLines) {
      for (const line of layoutLines(ctx, raw, addrMax, F.address, '', MAX_WRAP_LINES_DOMESTIC)) {
        setFont(ctx, '', fitFontSize(ctx, line, addrMax, F.address, ''));
        ctx.fillText(line, recipX, y);
        y += lineSpacing;
      }
    }
  }

  /* ═══════════════════════════════════════
   *  收件人姓名 + 电话（同行，docx 风格）
   * ═══════════════════════════════════════ */
  // B10：收件人已合并为单一字段 name（姓名或单位都填这里），不再有 name / recipient 二选一
  const displayName = recipient.name || '';
  const fullName = displayName + (displayName ? '（收）' : '');

  ctx.fillStyle = '#134E4A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // B12：姓名与电话同行，必须「整体算」可用宽度 —— 只算名称的话电话仍会被推出画布右缘。
  // 顺序：先按基准字号量出电话宽度 → 姓名可用宽度扣除电话与间隔 → 再用真实姓名宽度反算电话可用宽度。
  const rowMax = w - recipX - sideMargin;
  const hasPhone = Boolean(recipient.phone && displayName);
  setFont(ctx, '', F.phone);
  const phoneWBase = hasPhone ? ctx.measureText(recipient.phone as string).width : 0;
  const nameMax = hasPhone ? rowMax - sideMargin - phoneWBase : rowMax;

  setFont(ctx, 700, fitFontSize(ctx, fullName, nameMax, F.name, 700));
  ctx.fillText(fullName, recipX, nameY);

  // Phone on the same line, offset to the right of name
  if (hasPhone) {
    const nameWidth = ctx.measureText(fullName).width;
    setFont(ctx, '', fitFontSize(ctx, recipient.phone as string, rowMax - nameWidth - sideMargin, F.phone, ''));
    ctx.fillStyle = forPrint ? '#000000' : '#6B7280';
    ctx.fillText(recipient.phone as string, recipX + nameWidth + sideMargin, nameY);
  }

  /* ═══════════════════════════════════════
   *  空状态提示
   * ═══════════════════════════════════════ */
  if (!recipient.name && !recipient.address) {
    ctx.fillStyle = '#D1D5DB';
    setFont(ctx, '', F.address);
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
    ctx.fillStyle = forPrint ? '#000000' : '#6B7280';

    const senderLines: string[] = [];
    if (sender.address) senderLines.push(sender.address);
    if (sender.name) senderLines.push(sender.name);
    if (sender.phone) senderLines.push(sender.phone);

    // 右对齐到 senderX，向左可用的宽度（留出同样的安全边距）
    const senderMax = senderX - sideMargin;
    const lineSpacing = F.sender * 1.4;
    senderLines.forEach((line, i) => {
      setFont(ctx, '', fitFontSize(ctx, line, senderMax, F.sender, ''));
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
    setFont(ctx, 600, F.senderPostcode);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = sender.postcode.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < digits.length; i++) {
      setFont(ctx, 600, fitFontSize(ctx, digits[i], sZipCellW - 2, F.senderPostcode, 600));
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
    ctx.fillStyle = forPrint ? '#000000' : '#6B7280';
    const senderLines = [
      `From: ${sender.name}`,
      sender.address,
      sender.phone ? `Tel: ${sender.phone}` : '',
      sender.postcode ? `ZIP: ${sender.postcode}` : '',
    ].filter(Boolean);
    // 左半幅是寄件人区，越界会压到右侧收件人区，因此以半幅为上限
    const fromMax = w * 0.5 - padding;
    senderLines.forEach((line, i) => {
      setFont(ctx, '', fitFontSize(ctx, line, fromMax, fs * 0.7, ''));
      ctx.fillText(line, padding, padding + 8 + i * (fs * 0.9));
    });
  }

  // 收件人地址（中间偏右）
  const recipX = w * 0.55;
  const recipY = h * 0.4;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#134E4A';
  setFont(ctx, 600, fs);
  ctx.fillText('To:', recipX, recipY - 20); // 固定文案，长度恒定，不做自适应

  // B12：收件人区从 w*0.55 起排，可用宽度只剩右侧不到半幅，长地址最容易在这里被裁
  const recipMax = w - recipX - padding;
  setFont(ctx, 600, fitFontSize(ctx, recipient.name || '', recipMax, fs, 600));
  ctx.fillText(recipient.name || '', recipX, recipY);

  ctx.fillStyle = '#1F2937';
  // B13：单行放不下才折行；行数按「折行后的实际行数」计，Tel 行跟着往下让位
  const addrLines: string[] = [];
  for (const raw of recipient.address.split('\n').filter(Boolean)) {
    for (const line of layoutLines(ctx, raw, recipMax, fs, '', MAX_WRAP_LINES_INTL)) {
      addrLines.push(line);
    }
  }
  addrLines.forEach((line, i) => {
    setFont(ctx, '', fitFontSize(ctx, line, recipMax, fs, ''));
    ctx.fillText(line, recipX, recipY + 24 + i * (fs * 1.6));
  });

  if (recipient.phone) {
    const telText = `Tel: ${recipient.phone}`;
    setFont(ctx, '', fitFontSize(ctx, telText, recipMax, fs * 0.8, ''));
    ctx.fillStyle = forPrint ? '#000000' : '#6B7280';
    ctx.fillText(
      telText,
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
