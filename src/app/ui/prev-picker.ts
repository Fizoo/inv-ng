import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { InventoryStore } from '../core/inventory.store';
import { FdPipe } from './pipes';

/** Вибір минулого переобліку для порівняння. Власник вибирає, гість лише бачить, що підключено. */
@Component({
  selector: 'app-prev-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FdPipe],
  template: `
    @if (store.isGuest()) {
      @if (store.prev(); as p) { <p class="note">Минулий переоблік: <b>{{ p.name }}</b> · {{ p.ts | fd }}</p> }
    } @else {
      <div class="qty slim">
        <select aria-label="Минулий переоблік" (change)="pick($event)">
          <option value="" [selected]="!store.prev()">Без порівняння</option>
          @if (orphan(); as o) { <option [value]="o.id" selected>{{ o.name }} · {{ o.ts | fd }}</option> }
          @for (e of others(); track e.id) {
            <option [value]="e.id" [selected]="e.id === store.prev()?.id">{{ e.name }} · {{ e.ts | fd }}</option>
          }
        </select>
      </div>
    }
  `,
})
export class PrevPickerComponent {
  protected readonly store = inject(InventoryStore);
  protected readonly others = computed(() => this.store.events().filter((e) => e.id !== this.store.activeId()).reverse());
  /** Підключену подію могли видалити, знімок залишається */
  protected readonly orphan = computed(() => {
    const p = this.store.prev();
    return p && !this.others().some((e) => e.id === p.id) ? p : null;
  });
  protected pick(e: Event) { this.store.setPrev((e.target as HTMLSelectElement).value); }
}
