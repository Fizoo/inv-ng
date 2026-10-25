import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Catalog } from '../core/catalog';
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
                <small>{{ o.ts | fd }} · {{ o.ts | ft }}@if (store.multi()) { <i class="udot" [style.background]="store.colorOf(o.by)" [title]="store.nameOf(o.by)"></i> }</small>
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
  /** Розкладені операції інгредієнтів не дублюємо: у стрічці лишається один рядок на премікс */
  protected readonly rows = computed(() => this.store.ops().filter((o) => !(o.pg && o.itemId >= 0)).sort((a, b) => b.ts - a.ts));
  protected readonly shown = computed(() => this.rows().slice(0, this.lim()));
  private readonly catalog = inject(Catalog);
  protected name(id: number) { return this.catalog.byId().get(id)?.name ?? 'Видалена позиція'; }
  protected unit(id: number) { return this.catalog.byId().get(id)?.unit ?? ''; }
}
