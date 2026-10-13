import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { InventoryStore } from '../core/inventory.store';
import { ITEMS } from '../core/items';
import { NumPipe } from './pipes';

/** Таблиця результату: Товар і Залишок, як у файлі Excel. */
@Component({
  selector: 'app-result-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumPipe],
  host: { class: 'rt' },
  template: `
    <div class="seg">
      <button [class.on]="all()" (click)="all.set(true)">Усі · {{ total }}</button>
      <button [class.on]="!all()" (click)="all.set(false)">З рухом · {{ store.movedCount() }}</button>
    </div>
    @if (rows().length === 0) {
      <div class="empty">Операцій ще немає. Додайте або спишіть кількість у списку.</div>
    } @else {
      <div class="tbl">
        <div class="th"><span>Товар</span><span>Залишок</span></div>
        @for (it of rows(); track it.id) {
          <div class="tr">
            <h5 class="n">{{ it.name }}</h5>
            <h5 class="f" [class.r]="bal(it.id) < 0" [class.z]="bal(it.id) === 0">{{ bal(it.id) | num }} <i>{{ it.unit }}</i></h5>
          </div>
        }
      </div>
    }
  `,
})
export class ResultTableComponent {
  protected readonly store = inject(InventoryStore);
  protected readonly total = ITEMS.length;
  protected readonly all = signal(true);
  protected readonly rows = computed(() => (this.all() ? ITEMS : ITEMS.filter((i) => this.store.stats().get(i.id)!.n)));
  protected bal(id: number) { return this.store.stats().get(id)!.bal; }
}
