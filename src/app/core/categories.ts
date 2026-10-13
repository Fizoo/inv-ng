import { ITEMS } from './items';
import { Item } from './models';
import { norm } from './util';

/**
 * Категорії для фільтра (в такому порядку, скорочені назви).
 * Позиція потрапляє в категорію, якщо її назва починається з prefix.
 * Щоб додати або прибрати фільтр, змініть цей список.
 */
export const CATEGORIES = [
  { k: 'wine', label: 'W', prefix: 'вино' },
  { k: 'liqueur', label: 'L', prefix: 'ликер' },
  { k: 'whisky', label: 'Wh', prefix: 'виски' },
  { k: 'vodka', label: 'V', prefix: 'водка' },
  { k: 'rum', label: 'R', prefix: 'ром' },

] as const;

const catOf = (it: Item) => CATEGORIES.find((c) => norm(it.name).startsWith(c.prefix))?.k ?? '';

export const ITEM_CATEGORY = new Map(ITEMS.map((i) => [i.id, catOf(i)]));
export const CATEGORY_COUNT = new Map<string, number>(
  CATEGORIES.map((c) => [c.k, ITEMS.filter((i) => ITEM_CATEGORY.get(i.id) === c.k).length]),
);
