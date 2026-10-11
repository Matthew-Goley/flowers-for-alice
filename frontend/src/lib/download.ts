/**
 * "Download as PNG".
 *
 * The bouquet is already an SVG in the DOM, so the export serialises that very
 * node, paints it onto a canvas and saves the result. Two details make the
 * difference between this working and producing a blank or black image:
 *
 *  - The serialised SVG is loaded as a standalone image, which means it gets
 *    none of the page's CSS. Anything the art needs must be inline, which is
 *    why flowers take an explicit `paper` colour rather than reading a CSS
 *    custom property.
 *  - The canvas is filled with the background colour first; SVG transparency
 *    would otherwise export as black in some viewers.
 *
 * Text is drawn with the Canvas API afterwards rather than inside the SVG, so
 * the web font does not have to be embedded as base64.
 */

export interface PngOptions {
  /** Output width in pixels. Height follows from the aspect ratio plus caption. */
  width?: number;
  background: string;
  ink: string;
  /** Optional lines printed under the bouquet. */
  caption?: { recipient?: string; sender?: string; message?: string };
  filename?: string;
}

const CAPTION_FONT = "500 28px 'Nunito Sans', system-ui, sans-serif";
const NAME_FONT = "600 44px 'Fraunces', Georgia, serif";

function serialize(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // The live node is sized by CSS; a standalone image needs real dimensions.
  const box = svg.viewBox.baseVal;
  const width = box && box.width ? box.width : 100;
  const height = box && box.height ? box.height : 100;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  return new XMLSerializer().serializeToString(clone);
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The bouquet image could not be rendered.'));
    image.src = source;
  });
}

function wrapLine(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0] ?? '';

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/** Render the given bouquet SVG to a PNG blob. */
export async function bouquetToPngBlob(svg: SVGSVGElement, options: PngOptions): Promise<Blob> {
  const width = options.width ?? 1200;
  const caption = options.caption;

  // Measure the caption before sizing the canvas.
  const measurer = document.createElement('canvas').getContext('2d');
  let captionHeight = 0;
  let messageLines: string[] = [];

  if (measurer && caption) {
    measurer.font = CAPTION_FONT;
    if (caption.message) {
      messageLines = wrapLine(measurer, caption.message, width - 180, 4);
    }
    captionHeight =
      (caption.recipient ? 72 : 0) + messageLines.length * 42 + (caption.sender ? 48 : 0) + 56;
  }

  const height = width + captionHeight;

  const svgText = serialize(svg);
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  const image = await loadImage(encoded);

  const canvas = document.createElement('canvas');
  // Export at 2x for a crisp image on phone screens.
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot export images.');
  context.scale(dpr, dpr);

  context.fillStyle = options.background;
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, width);

  if (caption) {
    context.textAlign = 'center';
    context.fillStyle = options.ink;
    let y = width + 16;

    if (caption.recipient) {
      context.font = NAME_FONT;
      context.fillText(`For ${caption.recipient}`, width / 2, y + 44);
      y += 72;
    }
    if (messageLines.length > 0) {
      context.font = CAPTION_FONT;
      context.globalAlpha = 0.82;
      for (const line of messageLines) {
        context.fillText(line, width / 2, y + 30);
        y += 42;
      }
      context.globalAlpha = 1;
    }
    if (caption.sender) {
      context.font = CAPTION_FONT;
      context.globalAlpha = 0.6;
      context.fillText(`from ${caption.sender}`, width / 2, y + 34);
      context.globalAlpha = 1;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The export produced no image.'))),
      'image/png',
    );
  });
}

/** Render and save the bouquet, returning once the download has started. */
export async function downloadBouquetPng(
  svg: SVGSVGElement,
  options: PngOptions,
): Promise<void> {
  const blob = await bouquetToPngBlob(svg, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename ?? 'bouquet.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start reading the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Copy text, falling back to a hidden textarea where the API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: try the old way.
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Whether the device offers a native share sheet. */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function nativeShare(data: ShareData): Promise<boolean> {
  if (!canNativeShare()) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    // The user dismissed the sheet, which is not an error worth surfacing.
    return false;
  }
}
