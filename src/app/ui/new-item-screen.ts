import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Catalog, UNITS } from '../core/catalog';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon';

@Component({
  selector: 'app-new-item-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'screen' },
  template: `
    <header class="top slim">
      <button class="icon" (click)="back.emit()" aria-label="Назад"><app-icon n="back" [s]="22" /></button>
      <div class="ttl"><h1 class="h2">Нова позиція</h1><p>З’явиться у списку для всіх подій</p></div>
    </header>
    <div class="scroll pad">
      <h3 class="sec">Назва</h3>
      <div class="qty" [class.bad]="!!err()">
        <input id="item-name" autofocus maxlength="80" autocomplete="off" placeholder="Наприклад: Віскі Jameson 0,7"
          [value]="name()" (input)="onName($event)" (keydown.enter)="save()" aria-label="Назва позиції" />
      </div>
      @if (err()) { <p class="err">{{ err() }}</p> }
      <h3 class="sec">Одиниця виміру</h3>
      <div class="seg">
        @for (u of units; track u) { <button [class.on]="unit() === u" (click)="unit.set(u)">{{ u }}</button> }
      </div>
      <button class="primary" (click)="save()"><app-icon n="plus" /> Додати позицію</button>
    </div>
  `,
})
export class NewItemScreenComponent {
  private readonly catalog = inject(Catalog);
  private readonly toast = inject(ToastService);
  readonly initialName = input('');
  readonly back = output<void>();
  readonly created = output<number>();

  protected readonly units = UNITS;
  protected readonly name = signal('');
  protected readonly unit = signal<string>('шт');
  protected readonly err = signal('');

  constructor() { queueMicrotask(() => this.name.set(this.initialName())); }

  protected onName(e: Event) { this.name.set((e.target as HTMLInputElement).value); this.err.set(''); }
  protected save() {
    const n = this.name().trim();
    if (n.length < 2) { this.err.set('Введіть назву, мінімум 2 символи'); return; }
    const dup = this.catalog.find(n);
    if (dup) { this.err.set(`Така позиція вже є: ${dup.name}`); return; }
    const item = this.catalog.add(n, this.unit());
    this.toast.show(`Додано позицію «${item.name}»`);
    this.created.emit(item.id);
  }
}
