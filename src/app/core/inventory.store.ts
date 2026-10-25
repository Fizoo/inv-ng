import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { computeStats } from './calc';
import { OWNER_COLOR, newCode, pickColor } from './colors';
import { Catalog } from './catalog';
import { PREMIX_BY_ID, partQty, premixParts } from './premix';
import { validOp } from './local-repo';
import { EventMeta, Item, Member, Op, OpType, PrevSnap, Unsub } from './models';
import { Repo } from './repo';
import { ToastService } from './toast.service';
import { fmt, round3, uid } from './util';

interface State {
  events: EventMeta[]; activeId: string; ops: Op[]; members: Member[];
  loading: boolean; error: string; now: number; commits: number;
}

const ACTIVE_KEY = 'inv2:active';
const NAME_KEY = 'inv2:name';
const readActive = () => { try { return localStorage.getItem(ACTIVE_KEY) ?? ''; } catch { return ''; } };
const writeActive = (id: string) => { try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ } };
export const readName = () => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
export const writeName = (n: string) => { try { localStorage.setItem(NAME_KEY, n); } catch { /* ignore */ } };

const ONLINE_MS = 75_000;
const BEAT_MS = 30_000;

export const InventoryStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ events: [], activeId: readActive(), ops: [], members: [], loading: true, error: '', now: Date.now(), commits: 0 }),
  withComputed(({ events, activeId, ops, members }) => {
    const auth = inject(AuthService);
    const catalog = inject(Catalog);
    const activeEvent = computed(() => events().find((e) => e.id === activeId()));
    const stats = computed(() => computeStats(catalog.all(), activeEvent(), ops()));
    /** Назва преміксу за id групи, щоб підписати розкладені операції */
    const premixOfGroup = computed(() => {
      const m = new Map<string, string>();
      for (const o of ops()) if (o.pg && o.itemId < 0) m.set(o.pg, catalog.byId().get(o.itemId)?.name ?? '');
      return m;
    });
    /** Підключений минулий переоблік: знімок його залишків (є в документі події, тому доступний і гостям) */
    const prev = computed(() => activeEvent()?.prev ?? null);
    const prevBal = computed(() => {
      const p = prev();
      return p ? new Map(Object.entries(p.bal).map(([k, v]) => [Number(k), Number(v) || 0])) : null;
    });
    const movedCount = computed(() => { let n = 0; const st = stats(); for (const it of catalog.items()) if (st.get(it.id)?.n) n++; return n; });
    const memberMap = computed(() => new Map(members().map((m) => [m.uid, m])));
    /** Показуємо кольорові точки лише коли в події більше однієї людини */
    const multi = computed(() => members().length > 1);
    const sortedMembers = computed(() => [...members()].sort((a, b) => a.joinedAt - b.joinedAt));
    return { activeEvent, stats, premixOfGroup, prev, prevBal, movedCount, memberMap, multi, sortedMembers, isGuest: auth.isGuest, myUid: auth.uid };
  }),
  withMethods((store, repo = inject(Repo), toast = inject(ToastService), auth = inject(AuthService), catalog = inject(Catalog)) => {
    let unEvents: Unsub | null = null;
    let unOps: Unsub | null = null;
    let unMembers: Unsub | null = null;
    let beat = 0;
    const fail = (what: string) => (e: unknown) => {
      console.error(what, e);
      toast.show(`${what}. Перевірте інтернет і доступ до бази`, 'err');
    };
    const me = () => store.memberMap().get(auth.uid());

    /** Свій запис учасника: для власника створюється автоматично, для гостя перевіряємо колір */
    const ensureSelf = (eventId: string, members: Member[]) => {
      if (repo.mode !== 'firebase' || !auth.uid()) return;
      const mine = members.find((m) => m.uid === auth.uid());
      const now = Date.now();
      if (!mine) {
        if (!auth.isGuest()) {
          repo.setMember(eventId, auth.uid(), { name: readName() || 'Власник', color: OWNER_COLOR, role: 'owner', joinedAt: now, lastSeen: now }).catch(() => undefined);
        }
        return;
      }
      // Якщо колір збігся з тим, хто приєднався раніше, беремо вільний
      const earlier = members.filter((m) => m.uid !== mine.uid && m.joinedAt <= mine.joinedAt && m.color === mine.color);
      if (earlier.length) {
        repo.setMember(eventId, mine.uid, { color: pickColor(members.map((m) => m.color)) }).catch(() => undefined);
      }
    };

    const watchActive = (id: string) => {
      unOps?.(); unMembers?.();
      unOps = unMembers = null;
      patchState(store, { ops: [], members: [] });
      if (!id) return;
      unOps = repo.watchOps(id, (ops) => patchState(store, { ops }), (e) => { patchState(store, { error: 'Немає доступу до операцій' }); fail('Не вдалося завантажити операції')(e); });
      unMembers = repo.watchMembers(id, (members) => { patchState(store, { members }); ensureSelf(id, members); }, () => undefined);
    };

    const select = (id: string) => {
      writeActive(id);
      patchState(store, { activeId: id });
      watchActive(id);
    };

    const heartbeat = () => {
      patchState(store, { now: Date.now() });
      const id = store.activeId();
      if (repo.mode === 'firebase' && id && me() && !document.hidden) {
        repo.setMember(id, auth.uid(), { lastSeen: Date.now() }).catch(() => undefined);
      }
    };

    /** Знімок підсумкових залишків події: ненульові залишки по позиціях */
    const snapshot = async (src: EventMeta): Promise<PrevSnap> => {
      const st = computeStats(catalog.items(), src, await repo.getOps(src.id));
      const bal: Record<string, number> = {};
      st.forEach((s, id) => { if (s.bal !== 0) bal[String(id)] = s.bal; }); // лише реальні позиції, без преміксів
      return { id: src.id, name: src.name, ts: src.ts, bal };
    };

    const createEvent = async (name: string, ts: number, fromPrevId: string | null, silent = false) => {
      const opening: Record<string, number> = {};
      const events = store.events();
      // Нова подія за замовчуванням порівнюється з останньою попередньою. Змінити можна в «Івентах» чи «Таблиці».
      const src = events.find((e) => e.id === fromPrevId) ?? events[events.length - 1];
      let prevSnap: PrevSnap | undefined;
      if (src) {
        try {
          prevSnap = await snapshot(src);
          if (fromPrevId === src.id) for (const [k, v] of Object.entries(prevSnap.bal)) opening[k] = v;
        } catch (err) { console.error(err); }
      }
      const e: EventMeta = { id: uid(), name: name.trim() || `Подія #${events.length + 1}`, ts, opening, joinCode: newCode() };
      if (prevSnap) e.prev = prevSnap;
      repo.saveEvent(e).catch(fail('Не вдалося створити подію'));
      select(e.id);
      if (!silent) toast.show(`Створено «${e.name}»`);
    };

    /** Премікс: одна «головна» операція (для підсумку по преміксу) і операції по кожному інгредієнту */
    const commitPremix = (evId: string, item: Item, type: OpType, qty: number) => {
      const pm = PREMIX_BY_ID.get(item.id);
      if (!pm) return;
      const { parts, missing, total } = premixParts(pm, catalog.byName());
      if (missing.length) { toast.show(`Немає в списку: ${missing.join(', ')}. Перевірте premix.ts`, 'err'); return; }
      const pg = uid();
      const ts = Date.now();
      const by = auth.uid() || undefined;
      const list: Op[] = [{ id: uid(), itemId: item.id, type, qty, ts, by, pg }];
      for (const p of parts) {
        const q = partQty(qty, p, total);
        if (q > 0) list.push({ id: uid(), itemId: p.item.id, type, qty: q, ts, by, pg });
      }
      for (const o of list) repo.addOp(evId, o).catch(fail('Не вдалося зберегти операцію'));
      patchState(store, { commits: store.commits() + 1 });
      const undo = () => list.forEach((o) => repo.removeOp(evId, o.id).catch(fail('Не вдалося скасувати')));
      toast.show(`${type === 'add' ? 'Додано' : 'Списано'} ${fmt(round3(qty))} л преміксу · ${pm.name}. Інгредієнтів: ${list.length - 1}`, 'ok', undo);
    };

    return {
      start() {
        unEvents?.();
        clearInterval(beat);
        catalog.start();
        patchState(store, { loading: true, error: '' });
        unEvents = repo.watchEvents(
          (events, fromServer) => {
            patchState(store, { events, loading: false });
            if (events.length === 0) {
              // Гість без подій нічого не створює. Власник при першому запуску отримує «Подія #1»
              if (fromServer && !auth.isGuest()) createEvent('Подія #1', Date.now(), null, true);
              return;
            }
            if (!events.some((e) => e.id === store.activeId())) select(events[events.length - 1].id);
            else if (!unOps) watchActive(store.activeId());
          },
          (e) => { patchState(store, { loading: false, error: 'Немає доступу до бази' }); fail('Не вдалося завантажити події')(e); },
        );
        beat = window.setInterval(heartbeat, BEAT_MS);
        document.addEventListener('visibilitychange', heartbeat);
      },
      stop() {
        catalog.stop();
        unEvents?.(); unOps?.(); unMembers?.();
        unEvents = unOps = unMembers = null;
        clearInterval(beat);
        document.removeEventListener('visibilitychange', heartbeat);
      },
      select,
      createEvent,

      /** Підключити минулий переоблік до активної події (prevId порожній: відключити) */
      async setPrev(prevId: string) {
        const ev = store.activeEvent();
        if (!ev || auth.isGuest()) return;
        try {
          const src = store.events().find((e) => e.id === prevId && e.id !== ev.id);
          if (!prevId || !src) { await repo.setPrev(ev.id, null); toast.show('Порівняння вимкнено'); return; }
          await repo.setPrev(ev.id, await snapshot(src));
          toast.show(`Підключено: ${src.name}`);
        } catch (e) { fail('Не вдалося підключити минулий переоблік')(e); }
      },

      async deleteEvent(id: string) {
        if (store.events().length < 2 || id === store.activeId()) return;
        try { await repo.deleteEvent(id); toast.show('Подію видалено'); } catch (e) { fail('Не вдалося видалити подію')(e); }
      },

      commit(item: Item, type: OpType, qty: number) {
        const evId = store.activeId();
        if (!evId) return;
        if (item.id < 0) { commitPremix(evId, item, type, qty); return; }
        const before = store.stats().get(item.id)?.bal ?? 0;
        const op: Op = { id: uid(), itemId: item.id, type, qty, ts: Date.now(), by: auth.uid() || undefined };
        repo.addOp(evId, op).catch(fail('Не вдалося зберегти операцію'));
        patchState(store, { commits: store.commits() + 1 });
        const after = before + (type === 'add' ? qty : -qty);
        const txt = `${type === 'add' ? 'Додано' : 'Списано'} ${fmt(qty)} ${item.unit} · ${item.name}`;
        const undo = () => repo.removeOp(evId, op.id).catch(fail('Не вдалося скасувати'));
        toast.show(after < 0 ? `${txt}. Залишок став від’ємним` : txt, after < 0 ? 'warn' : 'ok', undo);
      },

      /** Операція з групи преміксу видаляється разом з усією групою */
      removeOp(opId: string) {
        const id = store.activeId();
        const op = store.ops().find((o) => o.id === opId);
        const ids = op?.pg ? store.ops().filter((o) => o.pg === op.pg).map((o) => o.id) : [opId];
        for (const i of ids) repo.removeOp(id, i).catch(fail('Не вдалося видалити операцію'));
      },

      /** Власник видаляє будь-яку операцію, гість лише свої */
      canDelete(op: Op) { return !auth.isGuest() || op.by === auth.uid(); },
      isOnline(m: Member) { return store.now() - m.lastSeen < ONLINE_MS; },
      colorOf(by?: string) { return (by && store.memberMap().get(by)?.color) || ''; },
      nameOf(by?: string) { return (by && store.memberMap().get(by)?.name) || ''; },

      /** Посилання-запрошення в поточну подію. Код створюється, якщо його ще немає */
      async inviteLink(): Promise<string> {
        const ev = store.activeEvent();
        if (!ev) throw new Error('Немає події');
        let code = ev.joinCode;
        if (!code) { code = newCode(); await repo.setJoinCode(ev.id, code); }
        const base = environment.publicUrl || `${location.origin}${location.pathname}`;
        return `${base}${base.includes('?') ? '&' : '?'}join=${ev.id}.${code}`;
      },
      /** Нове посилання робить старе недійсним для нових гостей */
      async renewInvite() {
        const ev = store.activeEvent();
        if (!ev) return;
        await repo.setJoinCode(ev.id, newCode());
        toast.show('Нове посилання створено. Старе більше не працює');
      },
      async kick(memberUid: string) {
        const id = store.activeId();
        try { await repo.removeMember(id, memberUid); toast.show('Гостя відключено'); } catch (e) { fail('Не вдалося відключити')(e); }
      },

      async makeBackup(): Promise<Blob> {
        const events = [];
        for (const e of store.events()) events.push({ ...e, ops: await repo.getOps(e.id) });
        return new Blob([JSON.stringify({ app: 'inventory', version: 2, exportedAt: Date.now(), items: catalog.custom(), events })], { type: 'application/json' });
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
        if (Array.isArray(d.items) && !auth.isGuest()) {
          for (const i of d.items) {
            if (i && Number.isFinite(i.id) && typeof i.name === 'string' && typeof i.unit === 'string') await repo.saveItem({ id: i.id, code: null, name: i.name, unit: i.unit });
          }
        }
        for (const e of list as any[]) {
          if (!e.id || typeof e.name !== 'string') continue;
          const meta: EventMeta = { id: String(e.id), name: e.name, ts: Number(e.ts) || Date.now(), opening: e.opening ?? {} };
          if (e.prev && typeof e.prev === 'object') meta.prev = e.prev;
          await repo.saveEvent(meta);
          const ops = (e.ops as Op[]).filter((o) => validOp(o));
          await repo.importOps(String(e.id), ops);
          n++;
        }
        return n;
      },
    };
  }),
);
