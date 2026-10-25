import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Item, OpType } from '../core/models';
import { parseQty } from '../core/util';
import { IconComponent } from './icon';
import { NumPipe } from './pipes';

export interface CommitEvent { item: Item; type: OpType; qty: number }

/** Один рядок списку: назва + одиниця, «−» зі списанням, «+» з додаванням, залишок. */
@Component({
  selector: 'app-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NumPipe],
  host: { class: 'row' },
  template: `
    <button
      class="rowhead"
      (click)="open.emit(item().id)"
      [attr.aria-label]="'Відкрити ' + item().name"
    >
      <span class="nm">{{ item().name }}</span>
      <span class="un">{{ item().unit }}</span>
    </button>
    <div class="ctrl">
      <div class="grp add" [class.bad]="bad() === 'add'">
        <input
          class="qin"
          inputmode="decimal"
          enterkeyhint="done"
          autocomplete="off"
          [placeholder]="item().unit"
          [value]="a()"
          (input)="type('add', $event)"
          (focus)="sel($event)"
          (keydown.enter)="go('add')"
          [attr.aria-label]="'Кількість додавання, ' + item().unit"
        />
        <button class="qb" (click)="go('add')" [attr.aria-label]="'Додати ' + item().name">
          <app-icon n="plus" [s]="18" [w]="2.4" />
        </button>
      </div>
      <button
        class="bal"
        [class.neg]="bal() < 0"
        [class.zero]="bal() === 0"
        (click)="open.emit(item().id)"
        [attr.aria-label]="'Залишок ' + (bal() | num) + ' ' + item().unit"
      >
        <b>{{ bal() | num }}</b
        ><small>{{ item().unit }}</small>
      </button>
    </div>
  `,
})
export class ItemRowComponent {
  readonly item = input.required<Item>();
  readonly bal = input.required<number>();
  readonly open = output<number>();
  readonly commit = output<CommitEvent>();

  protected readonly a = signal('');
  protected readonly s = signal('');
  protected readonly bad = signal<'' | OpType>('');

  protected sel(e: Event) {
    (e.target as HTMLInputElement).select();
  }
  protected type(t: OpType, e: Event) {
    (t === 'add' ? this.a : this.s).set((e.target as HTMLInputElement).value);
    this.bad.set('');
  }
  protected go(t: OpType) {
    const v = parseQty(t === 'add' ? this.a() : this.s());
    if (v === null) {
      this.bad.set(t);
      return;
    }
    this.commit.emit({ item: this.item(), type: t, qty: v });
    (t === 'add' ? this.a : this.s).set('');
    this.bad.set('');
  }
}
