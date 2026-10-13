import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { ITEM_BY_ID } from '../core/items';
import { InventoryStore } from '../core/inventory.store';
import { IconComponent } from './icon';
import { FdPipe, FtPipe, NumPipe } from './pipes';

@Component({
  selector: 'app-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NumPipe, FdPipe, FtPipe],
  host: { class: 'page' },
  template: `
    <header class="top">
      <div class="logo"><app-icon n="clock" [s]="24" /></div>
      <div class="ttl"><h1>Історія</h1><p>{{ store.activeEvent()?.name }} · {{ store.ops().length }} операцій</p></div>
    </header>
    <div class="scroll pad">
      @if (rows().length === 0) {
        <div class="empty">Операцій у цій події ще немає</div>
      } @else {
        <ul class="tl flat">
          @for (o of shown(); track o.id) {
            <li [class]="o.type" (click)="open.emit(o.itemId)">
              <span class="pin"></span>
              <div class="tlbody">
                <small>{{ o.ts | fd }} · {{ o.ts | ft }}</small>
                <span class="clamp1">{{ name(o.itemId) }}</span>
              </div>
              <b>{{ o.type === 'add' ? '+' : '−' }}{{ o.qty | num }} <i>{{ unit(o.itemId) }}</i></b>
            </li>
          }
        </ul>
        @if (rows().length > lim()) { <button class="ghost" (click)="lim.set(lim() + 150)">Показати ще</button> }
      }
    </div>
  `,
})
export class HistoryPageComponent {
  protected readonly store = inject(InventoryStore);
  readonly open = output<number>();
  protected readonly lim = signal(120);
  protected readonly rows = computed(() => [...this.store.ops()].sort((a, b) => b.ts - a.ts));
  protected readonly shown = computed(() => this.rows().slice(0, this.lim()));
  protected name(id: number) { return ITEM_BY_ID.get(id)?.name ?? ''; }
  protected unit(id: number) { return ITEM_BY_ID.get(id)?.unit ?? ''; }
}
