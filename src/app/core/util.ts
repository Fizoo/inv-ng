export const norm = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/[іїиы]/g, 'и').replace(/[єе]/g, 'е').replace(/[ʼ'’`*]/g, '');

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
const nf = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 3 });
export const fmt = (n: number) => nf.format(round3(n) === 0 ? 0 : round3(n));
export const unitKey = (u: string) => (u === 'пак' ? 'шт' : u);

/** "0,5" / "0.5" -> 0.5; null якщо невалідно */
export function parseQty(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const v = Number(t);
  if (!Number.isFinite(v) || v <= 0 || v > 100000) return null;
  return round3(v);
}

const MONTHS = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];
const p2 = (n: number) => String(n).padStart(2, '0');
export const fDate = (ts: number) => { const d = new Date(ts); return `${p2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const fTime = (ts: number) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const isoDate = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const tsFrom = (date: string, time: string) => {
  const t = new Date(`${date}T${time || '00:00'}`).getTime();
  return Number.isFinite(t) ? t : Date.now();
};
