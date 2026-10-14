import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthService } from './auth.service';
import { computeStats } from './calc';
import { OWNER_COLOR, newCode, pickColor } from './colors';
import { ITEM_BY_ID } from './items';
import { validOp } from './local-repo';
import { EventMeta, Item, Member, Op, OpType, Unsub } from './models';
import { Repo } from './repo';
import { ToastService } from './toast.service';
import { fmt, uid } from './util';
import { environment } from '../../environments/environment';

interface State {
  events: EventMeta[]; activeId: string; ops: Op[]; members: Member[];
  loading: boolean; error: string; now: number;
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
  withState<State>({ events: [], activeId: readActive(), ops: [], members: [], loading: true, error: '', now: Date.now() }),
  withComputed(({ events, activeId, ops, members }) => {
    const auth = inject(AuthService);
    const activeEvent = computed(() => events().find((e) => e.id === activeId()));
    const stats = computed(() => computeStats(activeEvent(), ops()));
    const movedCount = computed(() => { let n = 0; stats().forEach((s) => s.n && n++); return n; });
    const memberMap = computed(() => new Map(members().map((m) => [m.uid, m])));
    /** Показуємо кольорові точки лише коли в події більше однієї людини */
    const multi = computed(() => members().length > 1);
    const sortedMembers = computed(() => [...members()].sort((a, b) => a.joinedAt - b.joinedAt));
    return { activeEvent, stats, movedCount, memberMap, multi, sortedMembers, isGuest: auth.isGuest, myUid: auth.uid };
  }),
  withMethods((store, repo = inject(Repo), toast = inject(ToastService), auth = inject(AuthService)) => {
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

    const createEvent = async (name: string, ts: number, fromPrevId: string | null, silent = false) => {
      const opening: Record<string, number> = {};
      if (fromPrevId) {
        const prev = store.events().find((e) => e.id === fromPrevId);
        if (prev) {
          const st = computeStats(prev, await repo.getOps(prev.id));
          st.forEach((s, id) => { if (s.bal !== 0) opening[String(id)] = s.bal; });
        }
      }
      const e: EventMeta = { id: uid(), name: name.trim() || `Подія #${store.events().length + 1}`, ts, opening, joinCode: newCode() };
      repo.saveEvent(e).catch(fail('Не вдалося створити подію'));
      select(e.id);
      if (!silent) toast.show(`Створено «${e.name}»`);
    };

    return {
      start() {
        unEvents?.();
        clearInterval(beat);
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
        unEvents?.(); unOps?.(); unMembers?.();
        unEvents = unOps = unMembers = null;
        clearInterval(beat);
        document.removeEventListener('visibilitychange', heartbeat);
      },
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
        const op: Op = { id: uid(), itemId: item.id, type, qty, ts: Date.now(), by: auth.uid() || undefined };
        repo.addOp(evId, op).catch(fail('Не вдалося зберегти операцію'));
        const after = before + (type === 'add' ? qty : -qty);
        const txt = `${type === 'add' ? 'Додано' : 'Списано'} ${fmt(qty)} ${item.unit} · ${item.name}`;
        const undo = () => repo.removeOp(evId, op.id).catch(fail('Не вдалося скасувати'));
        toast.show(after < 0 ? `${txt}. Залишок став від’ємним` : txt, after < 0 ? 'warn' : 'ok', undo);
      },

      removeOp(opId: string) {
        repo.removeOp(store.activeId(), opId).catch(fail('Не вдалося видалити операцію'));
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
