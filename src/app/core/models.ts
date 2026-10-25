export interface Item { id: number; code: number | null; name: string; unit: string }
export type OpType = 'add' | 'sub';
/** by: uid того, хто вніс операцію (для кольорової точки) */
/** pg: спільний id групи, якщо операція створена розкладанням преміксу */
export interface Op { id: string; itemId: number; type: OpType; qty: number; ts: number; by?: string; pg?: string }
/** Знімок залишків минулого переобліку: зберігається в документі події, тому його бачать і гості */
export interface PrevSnap { id: string; name: string; ts: number; bal: Record<string, number> }
export interface EventMeta { id: string; name: string; ts: number; opening: Record<string, number>; joinCode?: string; prev?: PrevSnap }
export interface Member { uid: string; name: string; color: string; role: 'owner' | 'guest'; joinedAt: number; lastSeen: number }
export interface Stat { add: number; sub: number; bal: number; n: number }
export type Unsub = () => void;
