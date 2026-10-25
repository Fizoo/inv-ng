import raw from './items.json';
import { Item } from './models';

/** Позиції з Excel-файлу «Акт інвентаризації ТМЦ». Назви й одиниці без змін. Додані вручну позиції: див. Catalog. */
export const ITEMS: Item[] = raw as Item[];
