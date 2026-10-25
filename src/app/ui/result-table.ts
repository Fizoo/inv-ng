import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Catalog } from '../core/catalog';
import { InventoryStore } from '../core/inventory.store';
import { FdPipe, NumPipe } from './pipes';

/** Таблиця результату: Товар і Залишок, як у файлі Excel. Якщо підключено минулий переоблік, між ними з’являється «Було». */
@Component({
  selector: 'app-result-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumPipe, FdPipe],
  host: { class: 'rt' },
  template: `
    <div class="seg">
      <button [class.on]="all()" (click)="all.set(true)">Усі · {{ catalog.items().length }}</button>
      <button [class.on]="!all()" (click)="all.set(false)">З рухом · {{ store.movedCount() }}</button>
    </div>
    @if (store.prev(); as p) { <p class="note">Було: {{ p.name }} · {{ p.ts | fd }}</p> }
    @if (rows().length === 0) {
      <div class="empty">Операцій ще немає. Додайте або спишіть кількість у списку.</div>
    } @else {
      <div class="tbl" [class.p3]="!!pb()">
        <div class="th"><span>Товар</span>@if (pb()) { <span>Було</span> }<span>Залишок</span></div>
        @for (it of rows(); track it.id) {
          <div class="tr">
            <span class="n">{{ it.name }}</span>
            @if (pb(); as m) { <span class="p" [class.z]="!m.get(it.id)">{{ m.get(it.id) ?? 0 | num }}</span> }
            <span class="f" [class.r]="bal(it.id) < 0" [class.z]="bal(it.id) === 0">{{ bal(it.id) | num }} <i>{{ it.unit }}</i></span>
          </div>
        }
      </div>
    }
  `,
})
export class ResultTableComponent {
  protected readonly store = inject(InventoryStore);
  protected readonly catalog = inject(Catalog);
  protected readonly all = signal(true);
  protected readonly pb = this.store.prevBal;
  protected readonly rows = computed(() => (this.all() ? this.catalog.items() : this.catalog.items().filter((i) => this.store.stats().get(i.id)?.n)));
  protected bal(id: number) { return this.store.stats().get(id)?.bal ?? 0; }
}
