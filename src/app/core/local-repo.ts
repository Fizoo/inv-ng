import { Injectable } from '@angular/core';
import { ITEM_BY_ID } from './items';
import { EventMeta, Member, Op, Unsub } from './models';
import { Repo } from './repo';

const EV = 'inv2:events';
const OPS = (id: string) => `inv2:ops:${id}`;

export const validOp = (o: any): o is Op =>
  !!o && typeof o.id === 'string' && ITEM_BY_ID.has(o.itemId) && (o.type === 'add' || o.type === 'sub') &&
  Number.isFinite(o.qty) && o.qty > 0 && Number.isFinite(o.ts);

@Injectable()
export class LocalRepo extends Repo {
  readonly mode = 'local' as const;
  private mem: Record<string, string> = {};
  private listeners = new Set<() => void>();

  constructor() {
    super();
    addEventListener('storage', () => this.listeners.forEach((f) => f())); // інша вкладка
  }

  private rd<T>(k: string, def: T): T {
    let s: string | null = this.mem[k] ?? null;
    try { s = localStorage.getItem(k) ?? s; } catch { /* приватний режим */ }
    if (!s) return def;
    try { return JSON.parse(s) as T; } catch { return def; }
  }
  private wr(k: string, v: unknown) {
    const s = JSON.stringify(v);
    this.mem[k] = s;
    try { localStorage.setItem(k, s); } catch { /* лишається в пам'яті */ }
    this.listeners.forEach((f) => f());
  }
  private events() { return this.rd<EventMeta[]>(EV, []); }
  private ops(id: string) { return this.rd<Op[]>(OPS(id), []).filter(validOp); }

  watchEvents(cb: (e: EventMeta[], s: boolean) => void): Unsub {
    const f = () => cb(this.events(), true);
    this.listeners.add(f);
    queueMicrotask(f);
    return () => this.listeners.delete(f);
  }
  watchOps(id: string, cb: (o: Op[]) => void): Unsub {
    const f = () => cb(this.ops(id));
    this.listeners.add(f);
    queueMicrotask(f);
    return () => this.listeners.delete(f);
  }
  async saveEvent(e: EventMeta) {
    const list = this.events().filter((x) => x.id !== e.id);
    this.wr(EV, [...list, e].sort((a, b) => a.ts - b.ts));
  }
  async deleteEvent(id: string) {
    this.wr(EV, this.events().filter((x) => x.id !== id));
    try { localStorage.removeItem(OPS(id)); } catch { /* ignore */ }
    delete this.mem[OPS(id)];
  }
  async addOp(id: string, op: Op) { this.wr(OPS(id), [...this.ops(id), op]); }
  async removeOp(id: string, opId: string) { this.wr(OPS(id), this.ops(id).filter((o) => o.id !== opId)); }
  async getOps(id: string) { return this.ops(id); }
  async importOps(id: string, ops: Op[]) {
    const map = new Map(this.ops(id).map((o) => [o.id, o]));
    ops.forEach((o) => map.set(o.id, o));
    this.wr(OPS(id), [...map.values()]);
  }

  // Гостей у локальному режимі немає
  watchMembers(_id: string, cb: (m: Member[]) => void): Unsub { queueMicrotask(() => cb([])); return () => undefined; }
  async setMember() { /* немає */ }
  async removeMember() { /* немає */ }
  async setJoinCode() { /* немає */ }
}
