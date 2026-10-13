import { ITEMS } from './items';
import { EventMeta, Op, Stat } from './models';
import { round3 } from './util';

export function computeStats(ev: EventMeta | undefined, ops: Op[]): Map<number, Stat> {
  const m = new Map<number, Stat>();
  for (const it of ITEMS) m.set(it.id, { add: 0, sub: 0, bal: 0, n: 0 });
  for (const op of ops) {
    const s = m.get(op.itemId);
    if (!s) continue;
    if (op.type === 'add') s.add = round3(s.add + op.qty);
    else s.sub = round3(s.sub + op.qty);
    s.n++;
  }
  m.forEach((s, id) => (s.bal = round3((Number(ev?.opening[id]) || 0) + s.add - s.sub)));
  return m;
}

export function totalsByUnit(stats: Map<number, Stat>) {
  const t = new Map<string, { add: number; sub: number; pos: number }>();
  for (const it of ITEMS) {
    const s = stats.get(it.id)!;
    if (!s.n) continue;
    const r = t.get(it.unit) ?? { add: 0, sub: 0, pos: 0 };
    r.add = round3(r.add + s.add);
    r.sub = round3(r.sub + s.sub);
    r.pos++;
    t.set(it.unit, r);
  }
  return [...t.entries()].map(([unit, v]) => ({ unit, ...v }));
}
