/** Formatage français des montants budgétaires. */

export function fmtEUR(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Md€';
  if (abs >= 1e6) return (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M€';
  if (abs >= 1e3) return (n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' k€';
  return n.toLocaleString('fr-FR') + ' €';
}

export function fmtMd(n: number): string {
  return (n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function fmtPct(n: number, digits = 1): string {
  const s = n.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return (n > 0 ? '+' : '') + s + ' %';
}

export function evolutionPct(prev: number, curr: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

export function evolutionLabel(prev: number, curr: number): string {
  const pct = evolutionPct(prev, curr);
  if (pct === null) return curr ? 'Nouveau — sans crédits en 2026' : 'Sans crédits';
  if (pct === 0) return '→ Stable (0 %)';
  return `${pct > 0 ? '↑ Hausse' : '↓ Baisse'} de ${Math.abs(pct).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

/** Palette qualitative (Tableau 10) — lisible en treemap, stable par mission. */
const PALETTE = [
  '#4E79A7',
  '#F28E2B',
  '#59A14F',
  '#E15759',
  '#76B7B2',
  '#EDC948',
  '#B07AA1',
  '#D37295',
  '#9C755F',
  '#BAB0AC',
];

export function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function labelColorFor(bg: string): string {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(bg.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return 1.05 / (luminance + 0.05) >= 4.5 ? '#ffffff' : '#000000';
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
