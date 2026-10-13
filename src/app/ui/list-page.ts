import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CATEGORIES, CATEGORY_COUNT, ITEM_CATEGORY } from '../core/categories';
import { ITEMS, NORM_NAMES } from '../core/items';
import { InventoryStore } from '../core/inventory.store';
import { Item } from '../core/models';
import { norm } from '../core/util';
import { IconComponent } from './icon';
import { CommitEvent, ItemRowComponent } from './item-row';

type Filter = string; // 'all' | 'unch' | ключ категорії

@Component({
  selector: 'app-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ItemRowComponent],
  host: { class: 'page' },
  template: `
    <header class="top">
    <!--  <div class="logo"><app-icon n="glass" [s]="22" [w]="1.8" /></div>
      <h1>Інвентаризація</h1>-->
    </header>
    <div class="searchwrap">
      <div class="search">
        <app-icon n="search" />
        <input id="search" type="search" inputmode="search" autocomplete="off" autocorrect="off" spellcheck="false"
          placeholder="Пошук по всьому…" [value]="q()" (input)="onQ($event)" aria-label="Пошук товару" />
        @if (q()) { <button (click)="q.set('')" aria-label="Очистити пошук"><app-icon n="x" [s]="16" /></button> }
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
      } @else {
        <div class="card list">
          @for (it of filtered(); track key(it)) {
            <app-item-row [item]="it" [bal]="store.stats().get(it.id)!.bal" (open)="open.emit($event)" (commit)="onCommit($event)" />
          }
        </div>
      }
    </div>
  `,
})
export class ListPageComponent {
  protected readonly store = inject(InventoryStore);
  readonly open = output<number>();

  protected readonly q = signal('');
  protected readonly filter = signal<Filter>('all');

  /** Всі → категорії алкоголю з кількістю → Не змінені */
  protected readonly chips = computed(() => [
    { k: 'all', label: `Всі ${ITEMS.length}` },
    ...CATEGORIES.map((c) => ({ k: c.k as string, label: `${c.label} ${CATEGORY_COUNT.get(c.k)}` })),
    { k: 'unch', label: `Не змінені ${ITEMS.length - this.store.movedCount()}` },
  ]);

  protected readonly filtered = computed(() => {
    const toks = norm(this.q()).split(/\s+/).filter(Boolean);
    const f = this.filter();
    const stats = this.store.stats();
    return ITEMS.filter((it) => {
      if (f === 'unch' && stats.get(it.id)!.n) return false;
      if (f !== 'all' && f !== 'unch' && ITEM_CATEGORY.get(it.id) !== f) return false;
      const n = NORM_NAMES.get(it.id)!;
      return toks.every((t) => n.includes(t));
    });
  });

  /** Ключ включає id події, щоб чернетки в полях скидались при зміні події */
  protected key(it: Item) { return this.store.activeId() + ':' + it.id; }
  protected onQ(e: Event) { this.q.set((e.target as HTMLInputElement).value); }
  protected onCommit(e: CommitEvent) { this.store.commit(e.item, e.type, e.qty); }
}
