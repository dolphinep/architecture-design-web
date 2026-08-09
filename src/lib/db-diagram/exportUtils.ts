/**
 * Converts a DOM container element (containing HTML tables and SVG relationship lines)
 * into a PNG or JPEG image for download or clipboard copy.
 */

export async function exportCanvasToImage(
  element: HTMLElement,
  format: 'png' | 'jpeg',
  fileName: string = 'database-diagram'
): Promise<void> {
  const canvas = await renderElementToCanvas(element);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, 0.95);

  const link = document.createElement('a');
  link.download = `${fileName}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  link.href = dataUrl;
  link.click();
}

export async function copyCanvasToClipboard(
  element: HTMLElement,
  format: 'png' | 'jpeg' = 'png'
): Promise<boolean> {
  try {
    const canvas = await renderElementToCanvas(element);
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ [mimeType]: blob })
            ]);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.error('Clipboard copy failed:', err);
          resolve(false);
        }
      }, mimeType, 0.95);
    });
  } catch (err) {
    console.error('Failed rasterizing canvas for clipboard:', err);
    return false;
  }
}

/**
 * High-DPI canvas capture of diagram DOM.
 */
async function renderElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const rect = element.getBoundingClientRect();
  const scale = 2; // High DPI rendering for crisp export

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(800, rect.width) * scale;
  canvas.height = Math.max(600, rect.height) * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  ctx.scale(scale, scale);

  // Dark background fill matching dark design aesthetic
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

  // SVG representation of element
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';

  const serialized = new XMLSerializer().serializeToString(element);
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <style>
            * { box-sizing: border-box; }
          </style>
          ${serialized}
        </div>
      </foreignObject>
    </svg>
  `;

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback rasterizer if SVG foreignObject is restricted
      drawFallbackCanvas(ctx, element);
      resolve(canvas);
    };
    img.src = url;
  });
}

function drawFallbackCanvas(ctx: CanvasRenderingContext2D, element: HTMLElement) {
  // Simple fallback background and watermark if direct SVG inline fails
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, element.offsetWidth, element.offsetHeight);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '16px sans-serif';
  ctx.fillText('DB Diagram Export (arch.design)', 20, 30);
}
