import { Injectable, inject } from '@angular/core';
import {
  collection, deleteDoc, deleteField, doc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, setDoc, writeBatch, Firestore,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { fbApp } from './firebase';
import { validOp } from './local-repo';
import { EventMeta, Item, Member, Op, PrevSnap, Unsub } from './models';
import { Repo } from './repo';

/**
 * Структура бази:
 *   events/{eventId}               { name, ts, opening: { "<itemId>": number }, joinCode }
 *   events/{eventId}/members/{uid} { name, color, role: "owner"|"guest", joinedAt, lastSeen, code? }
 *   events/{eventId}/ops/{opId}    { itemId, type, qty, ts, by, pg? }   pg: група операцій одного преміксу
 *   items/{itemId}                 { name, unit, ts }   додані вручну позиції (читають усі, пише власник)
 * Подія може мати prev: { id, name, ts, bal } знімок залишків минулого переобліку.
 * Операції лише додаються й видаляються, залишок рахується з них. Тому кілька телефонів
 * пишуть одночасно й не перезаписують одне одного. Кеш працює офлайн.
 */
@Injectable()
export class FirestoreRepo extends Repo {
  readonly mode = 'firebase' as const;
  private readonly auth = inject(AuthService);
  private db: Firestore = initializeFirestore(fbApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  private opsCol = (id: string) => collection(this.db, 'events', id, 'ops');
  private membersCol = (id: string) => collection(this.db, 'events', id, 'members');

  private parseEvent(id: string, x: Record<string, any>): EventMeta {
    return { id, name: String(x['name'] ?? 'Подія'), ts: Number(x['ts']) || 0, opening: (x['opening'] ?? {}) as Record<string, number>, joinCode: x['joinCode'], prev: this.parsePrev(x['prev']) };
  }

  private parsePrev(p: any): PrevSnap | undefined {
    if (!p || typeof p !== 'object') return undefined;
    return { id: String(p.id ?? ''), name: String(p.name ?? ''), ts: Number(p.ts) || 0, bal: (p.bal ?? {}) as Record<string, number> };
  }

  watchEvents(cb: (e: EventMeta[], s: boolean) => void, err: (e: unknown) => void): Unsub {
    // Гість не може читати всю колекцію, лише події, до яких приєднався
    if (this.auth.isGuest()) return this.watchGuestEvents(cb, err);
    return onSnapshot(
      collection(this.db, 'events'),
      (snap) => {
        const list = snap.docs.map((d) => this.parseEvent(d.id, d.data()));
        cb(list.sort((a, b) => a.ts - b.ts), !snap.metadata.fromCache);
      },
      err,
    );
  }

  private watchGuestEvents(cb: (e: EventMeta[], s: boolean) => void, err: (e: unknown) => void): Unsub {
    const ids = this.auth.joined();
    const events = new Map<string, EventMeta>();
    const server = new Map<string, boolean>();
    const emit = () => cb([...events.values()].sort((a, b) => a.ts - b.ts), ids.every((i) => server.get(i)));
    if (ids.length === 0) { queueMicrotask(emit); return () => undefined; }
    const uns = ids.map((id) =>
      onSnapshot(
        doc(this.db, 'events', id),
        (d) => {
          server.set(id, !d.metadata.fromCache);
          if (d.exists()) events.set(id, this.parseEvent(d.id, d.data()));
          else events.delete(id);
          emit();
        },
        (e) => {
          // Доступ відкликано (відключили від події) або подію видалено
          events.delete(id);
          server.set(id, true);
          this.auth.forgetJoined(id);
          emit();
          err(e);
        },
      ),
    );
    return () => uns.forEach((u) => u());
  }

  watchOps(id: string, cb: (o: Op[]) => void, err: (e: unknown) => void): Unsub {
    return onSnapshot(this.opsCol(id), (snap) => {
      const list: Op[] = [];
      snap.docs.forEach((d) => {
        const x = d.data();
        const op: Op = { id: d.id, itemId: x['itemId'], type: x['type'], qty: x['qty'], ts: x['ts'], by: x['by'], pg: x['pg'] };
        if (validOp(op)) list.push(op);
      });
      cb(list);
    }, err);
  }

  watchMembers(id: string, cb: (m: Member[]) => void, err: (e: unknown) => void): Unsub {
    return onSnapshot(this.membersCol(id), (snap) => {
      cb(snap.docs.map((d) => {
        const x = d.data();
        return { uid: d.id, name: String(x['name'] ?? ''), color: String(x['color'] ?? '#888'), role: x['role'] === 'owner' ? 'owner' : 'guest', joinedAt: Number(x['joinedAt']) || 0, lastSeen: Number(x['lastSeen']) || 0 } as Member;
      }));
    }, err);
  }

  async saveEvent(e: EventMeta) {
    const data: Record<string, unknown> = { name: e.name, ts: e.ts, opening: e.opening };
    if (e.joinCode) data['joinCode'] = e.joinCode;
    if (e.prev) data['prev'] = e.prev;
    await setDoc(doc(this.db, 'events', e.id), data, { merge: true });
  }

  async deleteEvent(id: string) {
    for (const col of [this.opsCol(id), this.membersCol(id)]) {
      const snap = await getDocs(col);
      for (let i = 0; i < snap.docs.length; i += 400) {
        const b = writeBatch(this.db);
        snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    }
    await deleteDoc(doc(this.db, 'events', id));
  }

  private opData(o: Op) {
    const d: Record<string, unknown> = { itemId: o.itemId, type: o.type, qty: o.qty, ts: o.ts };
    if (o.by) d['by'] = o.by;
    if (o.pg) d['pg'] = o.pg;
    return d;
  }
  async addOp(eventId: string, op: Op) { await setDoc(doc(this.opsCol(eventId), op.id), this.opData(op)); }
  async removeOp(eventId: string, opId: string) { await deleteDoc(doc(this.opsCol(eventId), opId)); }

  async getOps(eventId: string) {
    const snap = await getDocs(this.opsCol(eventId));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Op, 'id'>) }) as Op).filter((o) => validOp(o));
  }

  async importOps(eventId: string, ops: Op[]) {
    for (let i = 0; i < ops.length; i += 400) {
      const b = writeBatch(this.db);
      ops.slice(i, i + 400).forEach((o) => b.set(doc(this.opsCol(eventId), o.id), this.opData(o)));
      await b.commit();
    }
  }

  async setMember(eventId: string, uid: string, patch: Partial<Member> & { code?: string }) {
    await setDoc(doc(this.membersCol(eventId), uid), patch, { merge: true });
  }
  async removeMember(eventId: string, uid: string) { await deleteDoc(doc(this.membersCol(eventId), uid)); }
  watchItems(cb: (i: Item[]) => void, err: (e: unknown) => void): Unsub {
    return onSnapshot(collection(this.db, 'items'), (snap) => {
      const list: Item[] = [];
      snap.docs.forEach((d) => {
        const x = d.data();
        const id = Number(d.id);
        if (Number.isFinite(id) && typeof x['name'] === 'string' && typeof x['unit'] === 'string') list.push({ id, code: null, name: x['name'], unit: x['unit'] });
      });
      cb(list.sort((a, b) => a.id - b.id));
    }, err);
  }
  async saveItem(item: Item) { await setDoc(doc(this.db, 'items', String(item.id)), { name: item.name, unit: item.unit, ts: item.id }); }
  async deleteItem(id: number) { await deleteDoc(doc(this.db, 'items', String(id))); }
  async setPrev(eventId: string, prev: PrevSnap | null) {
    await setDoc(doc(this.db, 'events', eventId), { prev: prev ?? deleteField() }, { merge: true });
  }
  async setJoinCode(eventId: string, code: string) { await setDoc(doc(this.db, 'events', eventId), { joinCode: code }, { merge: true }); }
}
