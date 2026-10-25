import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { Item, OpType } from '../core/models';
import { parseQty, round3 } from '../core/util';
import { IconComponent } from './icon';
import { NumPipe } from './pipes';
import { KEG_L, packSize } from '../core/categories';

export interface CommitEvent {
  item: Item;
  type: OpType;
  qty: number;
}

/** Один рядок списку: назва, одиниця, додавання, упаковка та залишок. */
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
        <button
          type="button"
          class="qb"
          (click)="go('add')"
          [attr.aria-label]="'Додати ' + item().name"
        >
          <app-icon n="plus" [s]="18" [w]="2.4" />
        </button>
      </div>

      @if (pack() > 0) {
        <div class="grp pack" [class.bad]="bad() === 'pack'">
          <input
            class="qin"
            inputmode="decimal"
            enterkeyhint="done"
            autocomplete="off"
            [placeholder]="packName()"
            [value]="p()"
            (input)="onP($event)"
            (focus)="sel($event)"
            (keydown.enter)="goPack()"
            [attr.aria-label]="'Кількість, ' + packName()"
          />

          <button
            type="button"
            class="qb"
            (click)="goPack()"
            [attr.aria-label]="'Додати ' + packName() + ' ' + item().name"
          >
           <!-- {{ packLabel() }}-->
            <app-icon n="plus" [s]="18" [w]="2.4" />
          </button>
        </div>
      }

      <button
        type="button"
        class="bal"
        [class.neg]="bal() < 0"
        [class.zero]="bal() === 0"
        (click)="open.emit(item().id)"
        [attr.aria-label]="'Залишок ' + (bal() | num) + ' ' + item().unit"
      >
        <b>{{ bal() | num }}</b>
        <small>{{ item().unit }}</small>
      </button>
    </div>
  `,
})
export class ItemRowComponent {
  readonly item = input.required<Item>();
  readonly bal = input.required<number>();
  readonly open = output<number>();
  readonly commit = output<CommitEvent>();

  protected readonly bad = signal<'' | OpType | 'pack'>('');
  protected readonly a = signal('');
  protected readonly s = signal('');

  protected readonly pack = computed(() => packSize(this.item()));
  protected readonly packLabel = computed(() => (this.pack() === KEG_L ? '+24л' : '+0,75'));
  protected readonly packName = computed(() => (this.pack() === KEG_L ? 'кега' : 'шт'));
  protected readonly p = signal('');

  protected onP(e: Event) {
    this.p.set((e.target as HTMLInputElement).value);
    this.bad.set('');
  }

  protected goPack() {
    const v = parseQty(this.p());

    if (v === null) {
      this.bad.set('pack');
      return;
    }

    this.commit.emit({
      item: this.item(),
      type: 'add',
      qty: round3(v * this.pack()),
    });

    this.p.set('');
    this.bad.set('');
  }

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

    this.commit.emit({
      item: this.item(),
      type: t,
      qty: v,
    });

    (t === 'add' ? this.a : this.s).set('');
    this.bad.set('');
  }
}
