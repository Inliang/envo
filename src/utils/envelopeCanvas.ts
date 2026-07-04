import type { EnvelopeSettings, SenderInfo, Address } from '../store/types';
import { ENVELOPE_SIZES } from '../store/types';

const MM_TO_PX = 3.78;

export function drawEnvelope(
  canvas: HTMLCanvasElement,
  sender: SenderInfo,
  recipient: Address,
  settings: EnvelopeSettings
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sizeConfig = ENVELOPE_SIZES[settings.size];
  const w = sizeConfig.width * MM_TO_PX;
  const h = sizeConfig.height * MM_TO_PX;
  const padding = 12;

  canvas.width = w;
  canvas.height = h;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Border
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // Postcode grid (top-right)
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

  // Sender info (top-left)
  if (settings.showReturnAddress && sender.name) {
    ctx.fillStyle = '#6B7280';
    ctx.font = `${settings.fontSize * 0.7}px ${settings.fontFamily}`;
    ctx.textAlign = 'left';
    const senderLines = [
      sender.name,
      sender.address,
      sender.phone ? `Tel: ${sender.phone}` : '',
      sender.postcode ? `邮编: ${sender.postcode}` : '',
    ].filter(Boolean);
    senderLines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + 8 + i * (settings.fontSize * 0.9));
    });
  }

  // Recipient address (center-right)
  const recipX = w * 0.55;
  const recipY = h * 0.45;
  ctx.fillStyle = '#134E4A';
  ctx.font = `600 ${settings.fontSize}px ${settings.fontFamily}`;
  ctx.textAlign = 'left';

  // Recipient name
  ctx.fillText(recipient.recipient, recipX, recipY);

  // Address lines
  ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
  const addrLines = recipient.address.split('\n').filter(Boolean);
  addrLines.forEach((line, i) => {
    ctx.fillText(line, recipX, recipY + 24 + i * (settings.fontSize * 1.6));
  });

  // Phone if available
  if (recipient.phone) {
    ctx.font = `${settings.fontSize * 0.8}px ${settings.fontFamily}`;
    ctx.fillText(
      `Tel: ${recipient.phone}`,
      recipX,
      recipY + 24 + addrLines.length * (settings.fontSize * 1.6) + 14
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
