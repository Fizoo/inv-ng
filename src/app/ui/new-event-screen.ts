import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { InventoryStore } from '../core/inventory.store';
import { fTime, isoDate, tsFrom } from '../core/util';
import { IconComponent } from './icon';
import { FdPipe } from './pipes';

@Component({
  selector: 'app-new-event-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FdPipe],
  host: { class: 'screen' },
  template: `
    <header class="top slim">
      <button class="icon" (click)="back.emit()" aria-label="Назад"><app-icon n="back" [s]="22" /></button>
      <div class="ttl"><h1 class="h2">Нова подія</h1></div>
    </header>
    <div class="scroll pad">
      <h3 class="sec">Назва події</h3>
      <div class="qty"><input id="ev-name" autofocus maxlength="60" placeholder="Наприклад: Вечірка 10.10" [value]="name()" (input)="name.set(val($event))" /></div>
      <h3 class="sec">Дата і час</h3>
      <div class="two">
        <div class="qty"><input id="ev-date" type="date" [value]="date()" (input)="date.set(val($event))" /></div>
        <div class="qty"><input id="ev-time" type="time" [value]="time()" (input)="time.set(val($event))" /></div>
      </div>
      <h3 class="sec">Стартові залишки</h3>
      <button class="opt" [class.on]="mode() === 'zero'" (click)="mode.set('zero')">
        <span class="dot">@if (mode() === 'zero') { <app-icon n="check" [s]="14" [w]="3" /> }</span>
        <span class="evt"><b>З нулями</b><small>Усі позиції починаються з 0</small></span>
      </button>
      <button class="opt" [class.on]="mode() === 'prev'" (click)="mode.set('prev')">
        <span class="dot">@if (mode() === 'prev') { <app-icon n="check" [s]="14" [w]="3" /> }</span>
        <span class="evt"><b>З попередньої</b><small>Скопіювати фінальні залишки події</small></span>
      </button>
      @if (mode() === 'prev') {
        <div class="qty">
          <select id="ev-prev" aria-label="Подія-джерело" (change)="prevId.set(val($event))">
            @for (e of store.events(); track e.id) { <option [value]="e.id" [selected]="e.id === prevId()">{{ e.name }} · {{ e.ts | fd }}</option> }
          </select>
        </div>
      }
      <button class="primary" (click)="create()">Створити</button>
    </div>
  `,
})
export class NewEventScreenComponent {
  protected readonly store = inject(InventoryStore);
  readonly back = output<void>();
  readonly created = output<void>();
  private readonly now = Date.now();
  protected readonly name = signal('');
  protected readonly date = signal(isoDate(this.now));
  protected readonly time = signal(fTime(this.now));
  protected readonly mode = signal<'zero' | 'prev'>('zero');
  protected readonly prevId = signal(this.store.activeId());

  protected val(e: Event) { return (e.target as HTMLInputElement).value; }
  protected async create() {
    await this.store.createEvent(this.name(), tsFrom(this.date(), this.time()), this.mode() === 'prev' ? this.prevId() : null);
    this.created.emit();
  }
}
