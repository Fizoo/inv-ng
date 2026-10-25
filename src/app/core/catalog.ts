import { Injectable, computed, inject, signal } from '@angular/core';
import { CATEGORIES, catOf } from './categories';
import { ITEMS } from './items';
import { PREMIX_ITEMS } from './premix';
import { Item, Unsub } from './models';
import { Repo } from './repo';
import { ToastService } from './toast.service';
import { norm } from './util';

export const UNITS = ['шт', 'л', 'кг', 'пак'] as const;

/** Усі позиції: список з Excel + додані вручну (спільні для всіх подій і всіх учасників). */
@Injectable({ providedIn: 'root' })
export class Catalog {
  private readonly repo = inject(Repo);
  private readonly toast = inject(ToastService);
  private un: Unsub | null = null;

  readonly custom = signal<Item[]>([]);
  readonly items = computed(() => [...ITEMS, ...this.custom()]);
  /** Позиції плюс віртуальні премікси (вони є лише у фільтрі «Коктейлі») */
  readonly all = computed(() => [...this.items(), ...PREMIX_ITEMS]);
  readonly byId = computed(() => new Map(this.all().map((i) => [i.id, i])));
  readonly byName = computed(() => new Map(this.items().map((i) => [i.name, i])));
  readonly names = computed(() => new Map(this.all().map((i) => [i.id, norm(i.name)])));
  readonly category = computed(() => new Map(this.all().map((i) => [i.id, i.id < 0 ? 'cocktail' : catOf(i)])));
  readonly categoryCount = computed(() => {
    const m = new Map<string, number>(CATEGORIES.map((c) => [c.k, 0]));
    this.category().forEach((k) => k && m.set(k, (m.get(k) ?? 0) + 1));
    return m;
  });

  start() {
    this.un?.();
    this.un = this.repo.watchItems(
      (list) => this.custom.set(list),
      (e) => console.error('Не вдалося завантажити додані позиції', e),
    );
  }
  stop() {
    this.un?.();
    this.un = null;
    this.custom.set([]);
  }

  isCustom(id: number) { return this.custom().some((i) => i.id === id); }
  find(name: string) { const n = norm(name.trim()); return this.items().find((i) => norm(i.name) === n); }

  /** Створює позицію. Повертає її одразу (запис у базу йде у фоні). */
  add(name: string, unit: string): Item {
    const item: Item = { id: Date.now(), code: null, name: name.trim().replace(/\s+/g, ' '), unit };
    this.custom.update((l) => [...l, item]); // одразу видно в списку
    this.repo.saveItem(item).catch((e) => {
      console.error(e);
      this.custom.update((l) => l.filter((i) => i.id !== item.id));
      this.toast.show('Не вдалося зберегти позицію. Перевірте інтернет і правила бази', 'err');
    });
    return item;
  }

  remove(id: number) {
    this.repo.deleteItem(id).catch((e) => { console.error(e); this.toast.show('Не вдалося видалити позицію', 'err'); });
  }
}
