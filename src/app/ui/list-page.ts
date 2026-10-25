import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { Catalog } from '../core/catalog';
import { CATEGORIES } from '../core/categories';
import { PREMIX_ITEMS } from '../core/premix';
import { InventoryStore } from '../core/inventory.store';
import { Item } from '../core/models';
import { norm } from '../core/util';
import { IconComponent } from './icon';
import { CommitEvent, ItemRowComponent } from './item-row';
import { PeersComponent } from './peers';

type Filter = string; // 'all' | 'unch' | ключ категорії

@Component({
  selector: 'app-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ItemRowComponent, PeersComponent],
  host: { class: 'page' },
  template: `
    <header class="top">
      <div class="logo"><app-icon n="glass" [s]="22" [w]="1.8" /></div>
      <h1>Інвентаризація</h1>
      <app-peers />
    </header>
    <div class="searchwrap">
      <div class="srow">
        <div class="search">
          <app-icon n="search" />
          <input id="search" type="search" inputmode="search" autocomplete="off" autocorrect="off" spellcheck="false"
            placeholder="Пошук по всьому…" [value]="q()" (input)="onQ($event)" aria-label="Пошук товару" />
          @if (q()) { <button (click)="q.set('')" aria-label="Очистити пошук"><app-icon n="x" [s]="16" /></button> }
        </div>
        @if (!store.isGuest()) {
          <button class="addit" (click)="newItem.emit('')" aria-label="Нова позиція" title="Нова позиція"><app-icon n="plus" [s]="22" [w]="2.2" /></button>
        }
      </div>
      <div class="chips">
        @for (c of chips(); track c.k) {
          <button class="chip" [class.on]="filter() === c.k" (click)="filter.set(c.k)">{{ c.label }}</button>
        }
      </div>
    </div>
    <div class="scroll">
      @if (filtered().length === 0) {
        <div class="empty">{{ q() ? 'Нічого не знайдено за «' + q() + '»' : 'У цьому фільтрі поки порожньо' }}</div>
        @if (q() && !store.isGuest()) {
          <button class="primary" (click)="newItem.emit(q().trim())"><app-icon n="plus" /> Додати «{{ q().trim() }}» як нову позицію</button>
        }
      } @else {
        <div class="card list">
          @for (it of filtered(); track key(it)) {
            <app-item-row [item]="it" [bal]="store.stats().get(it.id)?.bal ?? 0" (open)="open.emit($event)" (commit)="onCommit($event)" />
          }
        </div>
      }
    </div>
  `,
})
export class ListPageComponent {
  protected readonly store = inject(InventoryStore);
  protected readonly catalog = inject(Catalog);
  readonly open = output<number>();
  /** Користувач хоче додати нову позицію; параметр: назва з пошуку */
  readonly newItem = output<string>();

  protected readonly q = signal('');
  protected readonly filter = signal<Filter>('all');

  /** Всі → категорії алкоголю з кількістю → Не змінені */
  protected readonly chips = computed(() => [
    { k: 'all', label: `Всі ${this.catalog.items().length}` },
    ...CATEGORIES.map((c) => ({ k: c.k as string, label: `${c.label} ${this.catalog.categoryCount().get(c.k) ?? 0}` })),
    { k: 'cocktail', label: `Коктейлі ${PREMIX_ITEMS.length}` },
    { k: 'unch', label: `Не змінені ${this.catalog.items().length - this.store.movedCount()}` },
  ]);

  protected readonly filtered = computed(() => {
    const toks = norm(this.q()).split(/\s+/).filter(Boolean);
    const f = this.filter();
    const stats = this.store.stats();
    const cats = this.catalog.category();
    const names = this.catalog.names();
    return (f === 'cocktail' ? PREMIX_ITEMS : this.catalog.items()).filter((it) => {
      if (f === 'unch' && stats.get(it.id)?.n) return false;
      if (f !== 'all' && f !== 'unch' && f !== 'cocktail' && cats.get(it.id) !== f) return false;
      const n = names.get(it.id) ?? '';
      return toks.every((t) => n.includes(t));
    });
  });

  constructor() {
    // Після кожного додавання чи списання пошук очищається, щоб одразу шукати наступну позицію
    effect(() => {
      this.store.commits();
      untracked(() => this.q.set(''));
    });
  }

  /** Ключ включає id події, щоб чернетки в полях скидались при зміні події */
  protected key(it: Item) { return this.store.activeId() + ':' + it.id; }
  protected onQ(e: Event) { this.q.set((e.target as HTMLInputElement).value); }
  protected onCommit(e: CommitEvent) { this.store.commit(e.item, e.type, e.qty); }
}
