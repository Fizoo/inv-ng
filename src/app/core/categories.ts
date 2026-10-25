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

export const catOf = (it: Item) => CATEGORIES.find((c) => norm(it.name).startsWith(c.prefix))?.k ?? '';
