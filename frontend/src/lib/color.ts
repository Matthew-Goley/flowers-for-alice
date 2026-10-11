/** Tiny colour helpers. The flowers shade their own petals from one base hex. */

export type Rgb = { r: number; g: number; b: number };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function hexToRgb(hex: string): Rgb {
  const match = HEX.exec(hex.trim());
  if (!match) return { r: 228, g: 135, b: 159 };
  let body = match[1];
  if (body.length === 3) {
    body = body
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const hex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Blend `hex` toward `target` by `amount` (0 = unchanged, 1 = fully target). */
export function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, '#2b1f26', amount);
}

/** Perceived lightness, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * An outline that stays visible on both a pale cream petal and a deep
 * raspberry one: dark colours get a lighter edge, pale ones a darker edge.
 */
export function petalEdge(hex: string): string {
  return luminance(hex) < 0.32 ? lighten(hex, 0.3) : darken(hex, 0.38);
}

export function isValidHex(value: string): boolean {
  return HEX.test(value.trim());
}
