export interface Item { id: number; code: number | null; name: string; unit: string }
export type OpType = 'add' | 'sub';
/** by: uid того, хто вніс операцію (для кольорової точки) */
export interface Op { id: string; itemId: number; type: OpType; qty: number; ts: number; by?: string }
export interface EventMeta { id: string; name: string; ts: number; opening: Record<string, number>; joinCode?: string }
export interface Member { uid: string; name: string; color: string; role: 'owner' | 'guest'; joinedAt: number; lastSeen: number }
export interface Stat { add: number; sub: number; bal: number; n: number }
export type Unsub = () => void;
