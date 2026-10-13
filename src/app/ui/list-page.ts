import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { ITEMS, NORM_NAMES } from '../core/items';
import { InventoryStore } from '../core/inventory.store';
import { Item } from '../core/models';
import { fDate, norm, unitKey } from '../core/util';
import { IconComponent } from './icon';
import { CommitEvent, ItemRowComponent } from './item-row';

type Filter = 'all' | 'moved' | 'л' | 'кг' | 'шт';

@Component({
  selector: 'app-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ItemRowComponent],
  host: { class: 'page' },
  template: `
    <header class="top">
      <div class="logo"><app-icon n="glass" [s]="26" [w]="1.6" /></div>
      <div class="ttl">
        <h1>Інвентаризація</h1>
        <p>{{ date() }} · {{ total }} позицій</p>
      </div>
      <button class="evchip" (click)="switchEvent.emit()" aria-label="Змінити подію">
        <span>{{ store.activeEvent()?.name ?? '…' }}</span><app-icon n="chev" [s]="16" />
      </button>
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
    <div class="cta">
      <button class="primary" (click)="finish.emit()"><app-icon n="flag" /> Завершити інвентаризацію</button>
    </div>
  `,
})
export class ListPageComponent {
  protected readonly store = inject(InventoryStore);
  readonly open = output<number>();
  readonly finish = output<void>();
  readonly switchEvent = output<void>();

  protected readonly total = ITEMS.length;
  protected readonly q = signal('');
  protected readonly filter = signal<Filter>('all');
  protected readonly date = computed(() => { const e = this.store.activeEvent(); return e ? fDate(e.ts) : ''; });

  protected readonly chips = computed(() => {
    const c: Record<string, number> = { 'л': 0, 'кг': 0, 'шт': 0 };
    ITEMS.forEach((i) => (c[unitKey(i.unit)] = (c[unitKey(i.unit)] ?? 0) + 1));
    return [
      { k: 'all' as Filter, label: `Всі ${ITEMS.length}` },
      { k: 'moved' as Filter, label: `Змінені ${this.store.movedCount()}` },
      { k: 'л' as Filter, label: `л · ${c['л']}` },
      { k: 'кг' as Filter, label: `кг · ${c['кг']}` },
      { k: 'шт' as Filter, label: `шт · ${c['шт']}` },
    ];
  });

  protected readonly filtered = computed(() => {
    const toks = norm(this.q()).split(/\s+/).filter(Boolean);
    const f = this.filter();
    const stats = this.store.stats();
    return ITEMS.filter((it) => {
      if (f === 'moved' && !stats.get(it.id)!.n) return false;
      if ((f === 'л' || f === 'кг' || f === 'шт') && unitKey(it.unit) !== f) return false;
      const n = NORM_NAMES.get(it.id)!;
      return toks.every((t) => n.includes(t));
    });
  });

  /** Ключ включає id події, щоб чернетки в полях скидались при зміні події */
  protected key(it: Item) { return this.store.activeId() + ':' + it.id; }
  protected onQ(e: Event) { this.q.set((e.target as HTMLInputElement).value); }
  protected onCommit(e: CommitEvent) { this.store.commit(e.item, e.type, e.qty); }
}
