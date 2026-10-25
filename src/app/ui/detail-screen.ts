import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Catalog } from '../core/catalog';
import { PREMIX_BY_ID, premixParts } from '../core/premix';
import { InventoryStore } from '../core/inventory.store';
import { Item, OpType } from '../core/models';
import { parseQty } from '../core/util';
import { IconComponent } from './icon';
import { FdPipe, FtPipe, NumPipe } from './pipes';

const QUICK: Record<string, string[]> = {
  л: ['0,05', '0,1', '0,25', '0,5', '0,7', '0,75', '1'],
  кг: ['0,05', '0,1', '0,25', '0,5', '1', '2'],
  шт: ['1', '2', '3', '6', '12', '24'],
  пак: ['1', '2', '5', '10'],
};

@Component({
  selector: 'app-detail-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NumPipe, FdPipe, FtPipe],
  host: { class: 'screen' },
  template: `
    <header class="top slim">
      <button class="icon" (click)="back.emit()" aria-label="Назад"><app-icon n="back" [s]="22" /></button>
      <div class="ttl"><h1 class="h2">{{ item().name }}</h1><p>Одиниця виміру: {{ item().unit }}</p></div>
    </header>
    <div class="scroll pad">
      <div class="card bignum">
        <span>Поточний залишок</span>
        <strong [class.neg]="stat().bal < 0">{{ stat().bal | num }} <small>{{ item().unit }}</small></strong>
        <em>додано {{ stat().add | num }} · списано {{ stat().sub | num }}</em>
      </div>
      @if (store.prev(); as p) {
        <div class="card prevcard">
          <div><span>Минулий переоблік</span><small>{{ p.name }} · {{ p.ts | fd }}</small></div>
          <div class="pv"><strong>{{ prevVal() | num }} <small>{{ item().unit }}</small></strong>
            <em [class.g]="diff() > 0" [class.r]="diff() < 0">{{ diff() > 0 ? '+' : '' }}{{ diff() | num }}</em></div>
        </div>
      }
      @if (comp(); as c) {
        <h3 class="sec">Склад на 1 л</h3>
        <div class="card comp">
          @for (p of c.parts; track p.item.id) {
            <div><span>{{ p.item.name }}</span><b>{{ p.ml / c.total | num }} {{ p.item.unit }}</b></div>
          }
          @for (m of c.missing; track m) { <div class="miss"><span>Немає в списку: {{ m }}</span></div> }
        </div>
      }
      <h3 class="sec">Додати / Списати</h3>
      <div class="qty" [class.bad]="bad()">
        <input id="detail-qty" autofocus inputmode="decimal" autocomplete="off" placeholder="Кількість" aria-label="Кількість"
          [value]="v()" (input)="onV($event)" (focus)="sel($event)" (keydown.enter)="go('add')" />
        <span class="unitbox">{{ item().unit }}</span>
      </div>
      @if (bad()) { <p class="err">Введіть число більше нуля, наприклад 0,5</p> }
      <div class="quick">
        @for (x of quick(); track x) { <button (click)="v.set(x); bad.set(false)">{{ x }}</button> }
      </div>
      <div class="two">
        <button class="btn add" (click)="go('add')"><app-icon n="plus" [w]="2.4" /> Додати</button>
        <button class="btn sub" (click)="go('sub')"><app-icon n="minus" [w]="2.4" /> Списати</button>
      </div>
      <h3 class="sec"><app-icon n="clock" [s]="18" /> Історія операцій</h3>
      <div class="seg">
        @for (t of tabs; track t.k) { <button [class.on]="f() === t.k" (click)="f.set(t.k)">{{ t.l }}</button> }
      </div>
      @if (list().length === 0) {
        <div class="empty">Операцій ще немає</div>
      } @else {
        <ul class="tl">
          @for (o of list(); track o.id) {
            <li [class]="o.type">
              <span class="pin"></span>
              <div class="tlbody">
                <small>{{ o.ts | fd }} · {{ o.ts | ft }}@if (store.multi()) { <i class="udot" [style.background]="store.colorOf(o.by)" [title]="store.nameOf(o.by)"></i> }</small>
                <span>{{ o.type === 'add' ? 'Додано' : 'Списано' }} {{ o.qty | num }} {{ item().unit }}@if (o.pg && o.itemId >= 0) { <i class="pmtag">з преміксу {{ store.premixOfGroup().get(o.pg) }}</i> }</span>
              </div>
              <b>{{ o.type === 'add' ? '+' : '−' }}{{ o.qty | num }}</b>
              @if (store.canDelete(o)) {
                <button class="del" [class.sure]="conf() === o.id" (click)="del(o.id)" (blur)="conf.set('')" aria-label="Видалити операцію">
                  @if (conf() === o.id) { Видалити? } @else { <app-icon n="trash" [s]="16" /> }
                </button>
              }
            </li>
          }
        </ul>
      }
      @if (isCustom() && !store.isGuest()) {
        <button class="btn ghostb rm" [class.sure]="rmSure()" (click)="rm()" (blur)="rmSure.set(false)">
          {{ rmSure() ? 'Точно видалити позицію?' : 'Видалити цю позицію зі списку' }}
        </button>
      }
    </div>
  `,
})
export class DetailScreenComponent {
  protected readonly store = inject(InventoryStore);
  readonly itemId = input.required<number>();
  readonly back = output<void>();

  private readonly catalog = inject(Catalog);
  private static readonly NONE: Item = { id: 0, code: null, name: '', unit: 'шт' };
  protected readonly item = computed(() => this.catalog.byId().get(this.itemId()) ?? DetailScreenComponent.NONE);
  protected readonly stat = computed(() => this.store.stats().get(this.itemId()) ?? { add: 0, sub: 0, bal: 0, n: 0 });
  protected readonly prevVal = computed(() => this.store.prevBal()?.get(this.itemId()) ?? 0);
  protected readonly diff = computed(() => Math.round((this.stat().bal - this.prevVal()) * 1000) / 1000);
  /** Для преміксу: з чого він складається (на 1 л) */
  protected readonly comp = computed(() => {
    const pm = PREMIX_BY_ID.get(this.itemId());
    return pm ? premixParts(pm, this.catalog.byName()) : null;
  });
  protected readonly isCustom = computed(() => this.catalog.isCustom(this.itemId()));
  protected readonly rmSure = signal(false);
  protected readonly quick = computed(() => QUICK[this.item().unit] ?? QUICK['шт']);
  protected readonly v = signal('');
  protected readonly bad = signal(false);
  protected readonly f = signal<'all' | OpType>('all');
  protected readonly conf = signal('');
  protected readonly tabs = [{ k: 'all' as const, l: 'Всі' }, { k: 'add' as const, l: 'Додано' }, { k: 'sub' as const, l: 'Списано' }];
  protected readonly list = computed(() => {
    const f = this.f();
    return this.store.ops().filter((o) => o.itemId === this.itemId() && (f === 'all' || o.type === f)).sort((a, b) => b.ts - a.ts);
  });

  protected sel(e: Event) { (e.target as HTMLInputElement).select(); }
  protected onV(e: Event) { this.v.set((e.target as HTMLInputElement).value); this.bad.set(false); }
  protected go(t: OpType) {
    const n = parseQty(this.v());
    if (n === null) { this.bad.set(true); return; }
    this.store.commit(this.item(), t, n);
    this.v.set('');
    this.bad.set(false);
  }
  protected rm() {
    if (!this.rmSure()) { this.rmSure.set(true); return; }
    const id = this.itemId();
    this.back.emit();
    this.catalog.remove(id);
  }
  protected del(id: string) {
    if (this.conf() === id) { this.store.removeOp(id); this.conf.set(''); } else this.conf.set(id);
  }
}
