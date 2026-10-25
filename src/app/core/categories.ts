import { Item } from './models';
import { norm } from './util';

/**
 * Категорії для фільтра (в такому порядку, скорочені назви).
 * Позиція потрапляє в категорію, якщо її назва починається з prefix.
 * Щоб додати або прибрати фільтр, змініть цей список.
 */
export const CATEGORIES = [
  { k: 'wine', label: 'Вино', prefix: 'вино' },
  { k: 'liqueur', label: 'Лік', prefix: 'ликер' },
  { k: 'whisky', label: 'Віскі', prefix: 'виски' },
  { k: 'vodka', label: 'Горіл', prefix: 'водка' },
  { k: 'rum', label: 'Ром', prefix: 'ром' },
  { k: 'gin', label: 'Джин', prefix: 'джин' },
  { k: 'cognac', label: 'Конь', prefix: 'коньяк' },
  { k: 'tequila', label: 'Текіла', prefix: 'текила' },
] as const;

/** Об’єм однієї пляшки вина, л */
export const BOTTLE_L = 0.75;
export const KEG_L = 24;
/** Скільки літрів додає одна одиниця. 0 означає, що групи в рядка немає. */
export function packSize(it: Item): number {
  if (it.unit !== 'л') return 0;
  const n = norm(it.name);
  if (n.includes('кега')) return KEG_L;
  if (!n.startsWith('вино') || /тетра|домашн/.test(n)) return 0;
  return BOTTLE_L;
}

export const catOf = (it: Item) => CATEGORIES.find((c) => norm(it.name).startsWith(c.prefix))?.k ?? '';
