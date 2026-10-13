import { EventMeta, Op, Unsub } from './models';

/**
 * Сховище даних. Дві реалізації:
 *  - FirestoreRepo: спільна база Firebase, синхронізація між телефонами
 *  - LocalRepo: localStorage, коли Firebase ще не налаштовано
 * Кожна подія й кожна операція живуть окремо, тому нова подія не чіпає старі.
 */
export abstract class Repo {
  abstract readonly mode: 'firebase' | 'local';
  /** fromServer=false означає, що знімок прийшов лише з кешу (ще не підтверджений сервером) */
  abstract watchEvents(cb: (events: EventMeta[], fromServer: boolean) => void, err: (e: unknown) => void): Unsub;
  abstract watchOps(eventId: string, cb: (ops: Op[]) => void, err: (e: unknown) => void): Unsub;
  abstract saveEvent(e: EventMeta): Promise<void>;
  abstract deleteEvent(id: string): Promise<void>;
  abstract addOp(eventId: string, op: Op): Promise<void>;
  abstract removeOp(eventId: string, opId: string): Promise<void>;
  abstract getOps(eventId: string): Promise<Op[]>;
  abstract importOps(eventId: string, ops: Op[]): Promise<void>;
}
