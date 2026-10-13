export interface Item { id: number; code: number | null; name: string; unit: string }
export type OpType = 'add' | 'sub';
export interface Op { id: string; itemId: number; type: OpType; qty: number; ts: number }
export interface EventMeta { id: string; name: string; ts: number; opening: Record<string, number> }
export interface Stat { add: number; sub: number; bal: number; n: number }
export type Unsub = () => void;
