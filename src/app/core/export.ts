import { EventMeta, Item, Op, Stat } from './models';
import { fDate, fTime, isoDate } from './util';

export function fileName(ev: EventMeta, ext: string) {
  const safe = ev.name.replace(/[\\/:*?"<>|#%]+/g, '-').trim().replace(/\s+/g, '_') || 'Подія';
  return `Інвентаризація_${safe}_${isoDate(ev.ts)}.${ext}`;
}

/** SheetJS підвантажується лише при експорті, щоб не збільшувати стартовий бандл. */
export async function makeXlsx(items: Item[], ev: EventMeta, ops: Op[], stats: Map<number, Stat>): Promise<Blob> {
  const XLSX: any = await import('xlsx');
  const head = ['Код', 'Товар', 'Од.', 'Залишок'];
  const rows: unknown[][] = [['Інвентаризація'], [`Подія: ${ev.name}`], [`Дата: ${fDate(ev.ts)} ${fTime(ev.ts)}`], [], head];
  for (const it of items) rows.push([it.code ?? '', it.name, it.unit, stats.get(it.id)!.bal]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 7 }, { wch: 58 }, { wch: 6 }, { wch: 10 }];

  const sorted = [...ops].sort((a, b) => a.ts - b.ts);
  const log: unknown[][] = [['Дата', 'Час', 'Товар', 'Од.', 'Дія', 'Кількість', 'Зміна']];
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const o of sorted) {
    const it = byId.get(o.itemId);
    if (!it) continue;
    log.push([fDate(o.ts), fTime(o.ts), it.name, it.unit, o.type === 'add' ? 'Додано' : 'Списано', o.qty, o.type === 'add' ? o.qty : -o.qty]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(log);
  ws2['!cols'] = [{ wch: 13 }, { wch: 7 }, { wch: 58 }, { wch: 6 }, { wch: 10 }, { wch: 11 }, { wch: 9 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Підсумок');
  XLSX.utils.book_append_sheet(wb, ws2, 'Операції');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function makeCsv(items: Item[], ev: EventMeta, stats: Map<number, Stat>): Blob {
  const q = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const n = (v: number) => String(v).replace('.', ',');
  const lines = [['Код', 'Товар', 'Од.', 'Залишок'].join(';')];
  for (const it of items) {
    lines.push([it.code ?? '', q(it.name), it.unit, n(stats.get(it.id)!.bal)].join(';'));
  }
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

export function saveFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

