import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computeStats } from './calc';
import { ITEM_BY_ID, ITEMS } from './items';
import { EventMeta, Item, Op, OpType, Unsub } from './models';
import { validOp } from './local-repo';
import { Repo } from './repo';
import { ToastService } from './toast.service';
import { fmt, uid } from './util';

interface State { events: EventMeta[]; activeId: string; ops: Op[]; loading: boolean; error: string }

const ACTIVE_KEY = 'inv2:active';
const readActive = () => { try { return localStorage.getItem(ACTIVE_KEY) ?? ''; } catch { return ''; } };
const writeActive = (id: string) => { try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ } };

export const InventoryStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ events: [], activeId: readActive(), ops: [], loading: true, error: '' }),
  withComputed(({ events, activeId, ops }) => {
    const activeEvent = computed(() => events().find((e) => e.id === activeId()));
    const stats = computed(() => computeStats(activeEvent(), ops()));
    const movedCount = computed(() => { let n = 0; stats().forEach((s) => s.n && n++); return n; });
    return { activeEvent, stats, movedCount };
  }),
  withMethods((store, repo = inject(Repo), toast = inject(ToastService)) => {
    let unEvents: Unsub | null = null;
    let unOps: Unsub | null = null;
    const fail = (what: string) => (e: unknown) => {
      console.error(what, e);
      toast.show(`${what}. Перевірте інтернет і доступ до бази`, 'err');
    };

    const watchActive = (id: string) => {
      unOps?.();
      unOps = null;
      patchState(store, { ops: [] });
      if (id) unOps = repo.watchOps(id, (ops) => patchState(store, { ops }), (e) => { patchState(store, { error: 'Немає доступу до операцій' }); fail('Не вдалося завантажити операції')(e); });
    };

    const select = (id: string) => {
      writeActive(id);
      patchState(store, { activeId: id });
      watchActive(id);
    };

    const createEvent = async (name: string, ts: number, fromPrevId: string | null) => {
      const opening: Record<string, number> = {};
      if (fromPrevId) {
        const prev = store.events().find((e) => e.id === fromPrevId);
        if (prev) {
          const st = computeStats(prev, await repo.getOps(prev.id));
          st.forEach((s, id) => { if (s.bal !== 0) opening[String(id)] = s.bal; });
        }
      }
      const e: EventMeta = { id: uid(), name: name.trim() || `Подія #${store.events().length + 1}`, ts, opening };
      repo.saveEvent(e).catch(fail('Не вдалося створити подію'));
      select(e.id);
      toast.show(`Створено «${e.name}»`);
    };

    return {
      start() {
        unEvents?.();
        patchState(store, { loading: true, error: '' });
        unEvents = repo.watchEvents(
          (events, fromServer) => {
            patchState(store, { events, loading: false });
            if (events.length === 0) {
              if (fromServer) createEvent('Подія #1', Date.now(), null);
              return;
            }
            if (!events.some((e) => e.id === store.activeId())) select(events[events.length - 1].id);
            else if (!unOps) watchActive(store.activeId());
          },
          (e) => { patchState(store, { loading: false, error: 'Немає доступу до бази' }); fail('Не вдалося завантажити події')(e); },
        );
      },
      stop() { unEvents?.(); unOps?.(); unEvents = unOps = null; },
      select,
      createEvent,

      async deleteEvent(id: string) {
        if (store.events().length < 2 || id === store.activeId()) return;
        try { await repo.deleteEvent(id); toast.show('Подію видалено'); } catch (e) { fail('Не вдалося видалити подію')(e); }
      },

      commit(item: Item, type: OpType, qty: number) {
        const evId = store.activeId();
        if (!evId) return;
        const before = store.stats().get(item.id)?.bal ?? 0;
        const op: Op = { id: uid(), itemId: item.id, type, qty, ts: Date.now() };
        repo.addOp(evId, op).catch(fail('Не вдалося зберегти операцію'));
        const after = before + (type === 'add' ? qty : -qty);
        const txt = `${type === 'add' ? 'Додано' : 'Списано'} ${fmt(qty)} ${item.unit} · ${item.name}`;
        const undo = () => repo.removeOp(evId, op.id).catch(fail('Не вдалося скасувати'));
        toast.show(after < 0 ? `${txt}. Залишок став від’ємним` : txt, after < 0 ? 'warn' : 'ok', undo);
      },

      removeOp(opId: string) {
        repo.removeOp(store.activeId(), opId).catch(fail('Не вдалося видалити операцію'));
      },

      async makeBackup(): Promise<Blob> {
        const events = [];
        for (const e of store.events()) events.push({ ...e, ops: await repo.getOps(e.id) });
        return new Blob([JSON.stringify({ app: 'inventory', version: 2, exportedAt: Date.now(), events })], { type: 'application/json' });
      },

      /** Відновлення додає й оновлює записи за id, нічого не видаляючи. Підтримує і стару копію (версія 1). */
      async restore(text: string): Promise<number> {
        let d: any;
        try { d = JSON.parse(text); } catch { throw new Error('Файл не є коректним JSON'); }
        if (!d || d.app !== 'inventory') throw new Error('Це не резервна копія «Інвентаризації»');
        let list: { id: string; name: string; ts: number; opening: Record<string, number>; ops: Op[] }[] = [];
        if (Array.isArray(d.events) && d.version >= 2) {
          list = d.events.map((e: any) => ({ ...e, ops: e.ops ?? [] }));
        } else if (d.meta && Array.isArray(d.meta.events)) {
          list = d.meta.events.map((e: any) => ({ ...e, ops: d.ops?.[e.id] ?? [] }));
        } else throw new Error('Невідомий формат копії');
        let n = 0;
        for (const e of list) {
          if (!e.id || typeof e.name !== 'string') continue;
          await repo.saveEvent({ id: String(e.id), name: e.name, ts: Number(e.ts) || Date.now(), opening: e.opening ?? {} });
          const ops = (e.ops as Op[]).filter((o) => validOp(o) && ITEM_BY_ID.has(o.itemId));
          await repo.importOps(String(e.id), ops);
          n++;
        }
        return n;
      },
    };
  }),
);

export { ITEMS };
