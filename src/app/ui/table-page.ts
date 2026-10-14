import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InventoryStore } from '../core/inventory.store';
import { IconComponent } from './icon';
import { FdPipe, FtPipe } from './pipes';
import { PeersComponent } from './peers';
import { ResultTableComponent } from './result-table';

/** Поточний результат у будь-який момент, без завантаження файлу. */
@Component({
  selector: 'app-table-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ResultTableComponent, FdPipe, FtPipe, PeersComponent],
  host: { class: 'page' },
  template: `
    <header class="top">
      <div class="logo"><app-icon n="sheet" [s]="22" [w]="1.8" /></div>
      <div class="ttl">
        <h1>Таблиця</h1>
        @if (store.activeEvent(); as e) { <p>{{ e.name }} · {{ e.ts | fd }}, {{ e.ts | ft }}</p> }
      </div>
      <app-peers />
    </header>
    <div class="scroll pad"><app-result-table /></div>
  `,
})
export class TablePageComponent {
  protected readonly store = inject(InventoryStore);
}
