import { Injectable } from '@angular/core';
import {
  collection, deleteDoc, doc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, setDoc, writeBatch, Firestore,
} from 'firebase/firestore';
import { fbApp } from './firebase';
import { ITEM_BY_ID } from './items';
import { EventMeta, Op, Unsub } from './models';
import { Repo } from './repo';
import { validOp } from './local-repo';

/**
 * Структура бази:
 *   events/{eventId}            { name, ts, opening: { "<itemId>": number } }
 *   events/{eventId}/ops/{opId} { itemId, type, qty, ts }
 * Операції лише додаються й видаляються, залишок рахується з них. Тому два телефони
 * можуть писати одночасно й не перезаписують одне одного. Кеш працює офлайн.
 */
@Injectable()
export class FirestoreRepo extends Repo {
  readonly mode = 'firebase' as const;
  private db: Firestore = initializeFirestore(fbApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  private opsCol = (id: string) => collection(this.db, 'events', id, 'ops');

  watchEvents(cb: (e: EventMeta[], s: boolean) => void, err: (e: unknown) => void): Unsub {
    return onSnapshot(
      collection(this.db, 'events'),
      { includeMetadataChanges: false },
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data() as Partial<EventMeta>;
          return { id: d.id, name: String(x.name ?? 'Подія'), ts: Number(x.ts) || 0, opening: (x.opening ?? {}) as Record<string, number> };
        });
        cb(list.sort((a, b) => a.ts - b.ts), !snap.metadata.fromCache);
      },
      err,
    );
  }

  watchOps(id: string, cb: (o: Op[]) => void, err: (e: unknown) => void): Unsub {
    return onSnapshot(this.opsCol(id), (snap) => {
      const list: Op[] = [];
      snap.docs.forEach((d) => {
        const x = d.data();
        const op = { id: d.id, itemId: x['itemId'], type: x['type'], qty: x['qty'], ts: x['ts'] };
        if (validOp(op)) list.push(op);
      });
      cb(list);
    }, err);
  }

  async saveEvent(e: EventMeta) {
    await setDoc(doc(this.db, 'events', e.id), { name: e.name, ts: e.ts, opening: e.opening });
  }

  async deleteEvent(id: string) {
    const snap = await getDocs(this.opsCol(id));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(this.db);
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    await deleteDoc(doc(this.db, 'events', id));
  }

  async addOp(eventId: string, op: Op) {
    await setDoc(doc(this.opsCol(eventId), op.id), { itemId: op.itemId, type: op.type, qty: op.qty, ts: op.ts });
  }
  async removeOp(eventId: string, opId: string) { await deleteDoc(doc(this.opsCol(eventId), opId)); }

  async getOps(eventId: string) {
    const snap = await getDocs(this.opsCol(eventId));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Op, 'id'>) }) as Op)
      .filter((o) => validOp(o) && ITEM_BY_ID.has(o.itemId));
  }

  async importOps(eventId: string, ops: Op[]) {
    for (let i = 0; i < ops.length; i += 400) {
      const b = writeBatch(this.db);
      ops.slice(i, i + 400).forEach((o) => b.set(doc(this.opsCol(eventId), o.id), { itemId: o.itemId, type: o.type, qty: o.qty, ts: o.ts }));
      await b.commit();
    }
  }
}
