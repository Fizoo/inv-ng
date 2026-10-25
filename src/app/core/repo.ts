import { EventMeta, Item, Member, Op, PrevSnap, Unsub } from './models';

/**
 * Сховище даних. Дві реалізації:
 *  - FirestoreRepo: спільна база Firebase, синхронізація між телефонами, гості
 *  - LocalRepo: localStorage, коли Firebase ще не налаштовано
 */
export abstract class Repo {
  abstract readonly mode: 'firebase' | 'local';
  /** fromServer=false означає, що знімок прийшов лише з кешу (ще не підтверджений сервером) */
  abstract watchEvents(cb: (events: EventMeta[], fromServer: boolean) => void, err: (e: unknown) => void): Unsub;
  abstract watchOps(eventId: string, cb: (ops: Op[]) => void, err: (e: unknown) => void): Unsub;
  abstract watchMembers(eventId: string, cb: (m: Member[]) => void, err: (e: unknown) => void): Unsub;
  abstract saveEvent(e: EventMeta): Promise<void>;
  abstract deleteEvent(id: string): Promise<void>;
  abstract addOp(eventId: string, op: Op): Promise<void>;
  abstract removeOp(eventId: string, opId: string): Promise<void>;
  abstract getOps(eventId: string): Promise<Op[]>;
  abstract importOps(eventId: string, ops: Op[]): Promise<void>;
  abstract setMember(eventId: string, uid: string, patch: Partial<Member> & { code?: string }): Promise<void>;
  abstract removeMember(eventId: string, uid: string): Promise<void>;
  abstract setJoinCode(eventId: string, code: string): Promise<void>;
  /** Додані вручну позиції (поверх списку з Excel) */
  abstract watchItems(cb: (items: Item[]) => void, err: (e: unknown) => void): Unsub;
  abstract saveItem(item: Item): Promise<void>;
  abstract deleteItem(id: number): Promise<void>;
  /** Підключення минулого переобліку: знімок його залишків (null прибирає) */
  abstract setPrev(eventId: string, prev: PrevSnap | null): Promise<void>;
}
