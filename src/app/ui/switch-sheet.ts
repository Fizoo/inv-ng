import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { InventoryStore } from '../core/inventory.store';
import { IconComponent } from './icon';
import { FdPipe, FtPipe } from './pipes';

@Component({
  selector: 'app-switch-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FdPipe, FtPipe],
  host: { class: 'overlay', '(click)': 'close.emit()' },
  template: `
    <div class="sheet" (click)="$event.stopPropagation()" role="dialog" aria-label="Активна подія">
      <div class="grab"></div>
      <h2>Активна подія</h2>
      <div class="evlist">
        @for (e of list(); track e.id) {
          <button class="evrow" [class.on]="e.id === store.activeId()" (click)="pick(e.id)">
            <span class="dot">@if (e.id === store.activeId()) { <app-icon n="check" [s]="14" [w]="3" /> }</span>
            <span class="evt"><b>{{ e.name }}</b><small>{{ e.ts | fd }} · {{ e.ts | ft }}</small></span>
          </button>
        }
      </div>
      <button class="primary" (click)="newEvent.emit()"><app-icon n="plus" /> Нова подія</button>
    </div>
  `,
})
export class SwitchSheetComponent {
  protected readonly store = inject(InventoryStore);
  readonly close = output<void>();
  readonly newEvent = output<void>();
  protected readonly list = computed(() => [...this.store.events()].reverse());
  protected pick(id: string) { this.store.select(id); this.close.emit(); }
}
