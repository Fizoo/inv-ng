import { Item } from './models';
import { round3 } from './util';

/**
 * Премікси (коктейлі, заготовлені наперед).
 *
 * Як це працює: у списку, у фільтрі «Коктейлі», вводиш залишок преміксу в літрах.
 * Застосунок розкладає його за пропорціями рецепта й додає (або списує) кількість
 * у відповідних позиціях інвентаризації.
 *
 * ЯК ЗМІНИТИ:
 *  - інгредієнт у рецепті: змініть рядок у `parts` (назва зі словника INV нижче, мл на 1 порцію);
 *  - яка позиція інвентаризації стоїть за інгредієнтом: змініть назву в INV
 *    (вона має точно збігатися з назвою позиції у списку);
 *  - новий премікс: додайте запис у PREMIXES з наступним номером `n`;
 *  - `n` не змінюйте й не використовуйте повторно: за ним зберігається історія.
 * Лимонний фреш рахується (ПФ Фреш лимонный). Огірковий фреш у преміксах не враховується.
 * Позиції в кг (ПФ манго-маракуя, ПФ обліпиха) рахуються як 1 л = 1 кг.
 */
export const INV = {
  gin: 'Джин Гордонс сч 201 Киев',
  ginPink: 'Джин Гордонс премиум пинк сч 201 Киев',
  rumWhite: 'Ром Капитан Морган Вайт сч 201 Киев',
  rumBlack: 'Ром Капитан Морган Блек сч 201 Киев',
  tequila: 'Текила Трю Сильвер сч 201 Киев',
  tripleSec: 'Ликер Трипл сек сч 201 Киев',
  blueCuracao: 'Ликер Де Кайпер Блю Курасао сч 201 Киев',
  coconutLiqueur: 'Ликер Волар Кокос сч 201 Киев',
  amaretto: 'Ликер Амаретто сч 201 Киев',
  campari: 'Ликер Кампари Биттер л, сч 201 К',
  martiniRosso: 'Мартини Россо л, сч 201 К',
  martiniBianco: 'Мартини бьянко л, сч 201 К',
  raspberryTincture: 'ПФ Настойка Малиновая К',
  juice: 'Сок в ассортименте К',
  syrup: 'Сироп в ассортименте К',
  lemonFresh: 'ПФ Фреш лимонный К',
  pfStrawberry: 'ПФ клубника',
  pfRaspberry: 'ПФ Малина',
  pfSeabuckthorn: 'ПФ Облепиха микс Ол',
  pfMangoPassion: 'ПФ Манго маракуйя',
} as const;

export interface Premix {
  /** Постійний номер. Ідентифікатор позиції в списку: -n */
  n: number;
  name: string;
  /** [назва позиції інвентаризації, мл на 1 порцію] */
  parts: [string, number][];
}

export const PREMIXES: Premix[] = [
  { n: 1, name: 'Garden Party', parts: [[INV.gin, 65], [INV.juice, 50], [INV.tripleSec, 15], [INV.syrup, 15], [INV.lemonFresh, 15]] },
  { n: 2, name: 'Banana Colada', parts: [[INV.rumWhite, 50], [INV.juice, 50], [INV.coconutLiqueur, 20], [INV.syrup, 15], [INV.lemonFresh, 15]] },
  { n: 3, name: 'Ocean Dream', parts: [[INV.gin, 50], [INV.juice, 50], [INV.blueCuracao, 20], [INV.syrup, 10], [INV.lemonFresh, 15]] },
  { n: 4, name: 'Strawberry Negroni Sour', parts: [[INV.gin, 30], [INV.campari, 30], [INV.pfStrawberry, 50], [INV.martiniRosso, 30], [INV.syrup, 15], [INV.syrup, 10], [INV.lemonFresh, 15]] },
  { n: 5, name: 'Blue Mirage', parts: [[INV.tequila, 50], [INV.juice, 50], [INV.blueCuracao, 10], [INV.syrup, 15], [INV.lemonFresh, 15]] },
  { n: 6, name: 'Almond Siciliana', parts: [[INV.rumWhite, 50], [INV.juice, 50], [INV.amaretto, 20], [INV.syrup, 15], [INV.lemonFresh, 15]] },
  { n: 7, name: 'Sweet Siesta', parts: [[INV.raspberryTincture, 50], [INV.gin, 20], [INV.martiniBianco, 15], [INV.syrup, 15], [INV.lemonFresh, 15]] },
  { n: 8, name: 'Dolce Verona', parts: [[INV.rumWhite, 60], [INV.juice, 50], [INV.syrup, 15], [INV.lemonFresh, 15]] },
  { n: 9, name: 'Bubbles обліпиха', parts: [[INV.gin, 60], [INV.juice, 20], [INV.pfSeabuckthorn, 20], [INV.syrup, 25], [INV.lemonFresh, 20]] },
  { n: 10, name: 'Bubbles манго-маракуя', parts: [[INV.rumBlack, 60], [INV.juice, 40], [INV.pfMangoPassion, 20], [INV.syrup, 20], [INV.lemonFresh, 20]] },
  { n: 11, name: 'Bubbles малина-шоколад', parts: [[INV.ginPink, 60], [INV.pfRaspberry, 40], [INV.syrup, 5], [INV.syrup, 10], [INV.lemonFresh, 15]] },
  { n: 12, name: 'Bubbles яблуко-ківі', parts: [[INV.gin, 60], [INV.juice, 30], [INV.syrup, 20], [INV.lemonFresh, 20]] },
];

/** Премікс у списку виглядає як позиція в літрах з від’ємним id */
export const PREMIX_ITEMS: Item[] = PREMIXES.map((p) => ({ id: -p.n, code: null, name: p.name, unit: 'л' }));
export const PREMIX_BY_ID = new Map(PREMIXES.map((p) => [-p.n, p]));
export const isPremixId = (id: number) => id < 0;

export interface PremixPart { item: Item; ml: number }

/** Розкладає рецепт на реальні позиції (однакові склеюються). Не знайдені повертаються в missing. */
export function premixParts(pm: Premix, byName: Map<string, Item>): { parts: PremixPart[]; missing: string[]; total: number } {
  const merged = new Map<number, PremixPart>();
  const missing: string[] = [];
  let total = 0;
  for (const [name, ml] of pm.parts) {
    total += ml;
    const item = byName.get(name);
    if (!item) { if (!missing.includes(name)) missing.push(name); continue; }
    const cur = merged.get(item.id);
    if (cur) cur.ml += ml; else merged.set(item.id, { item, ml });
  }
  return { parts: [...merged.values()], missing, total };
}

/** Скільки позиції дістається з qty літрів преміксу (в одиницях позиції: л або кг) */
export const partQty = (qty: number, part: PremixPart, total: number) => round3((qty * part.ml) / total);
