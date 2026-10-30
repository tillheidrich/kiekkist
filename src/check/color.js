// Node-side colour helpers (culori). WCAG 2.2 maths is normative text.
import { converter, differenceCiede2000, parse, formatHex } from 'culori';

export const toOklch = converter('oklch');
export const toRgb = converter('rgb');
const de2000 = differenceCiede2000();

/** [r,g,b] 0..255 -> culori rgb object */
export function fromBytes(rgb) {
  return { mode: 'rgb', r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 };
}

export function hex(rgb) {
  return formatHex(fromBytes(rgb));
}

/** OKLCH of a byte triple: {l (0..1), c, h (deg or NaN)} */
export function oklchOf(rgb) {
  const o = toOklch(fromBytes(rgb));
  return { l: o.l, c: o.c || 0, h: o.h === undefined || Number.isNaN(o.h) ? NaN : o.h };
}

export function deltaE(a, b) {
  return de2000(a, b);
}

export function parseColor(str) {
  try { return parse(String(str).trim()) || null; } catch { return null; }
}

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function luminance(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
export function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function hueDistance(a, b) {
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export const inHue = (h, lo, hi) => !Number.isNaN(h) && (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi);
