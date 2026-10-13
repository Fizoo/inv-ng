import raw from './items.json';
import { Item } from './models';
import { norm } from './util';

/** Позиції з Excel-файлу «Акт інвентаризації ТМЦ». Назви й одиниці без змін. */
export const ITEMS: Item[] = raw as Item[];
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const NORM_NAMES = new Map(ITEMS.map((i) => [i.id, norm(i.name)]));
