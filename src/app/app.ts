import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './core/auth.service';
import { InventoryStore } from './core/inventory.store';
import { Repo } from './core/repo';
import { ToastService } from './core/toast.service';
import { DetailScreenComponent } from './ui/detail-screen';
import { EventsPageComponent } from './ui/events-page';
import { HistoryPageComponent } from './ui/history-page';
import { IconComponent } from './ui/icon';
import { ListPageComponent } from './ui/list-page';
import { JoinComponent, NoAccessComponent } from './ui/join';
import { LoginComponent } from './ui/login';
import { NewEventScreenComponent } from './ui/new-event-screen';
import { NewItemScreenComponent } from './ui/new-item-screen';
import { SummaryScreenComponent } from './ui/summary-screen';
import { TablePageComponent } from './ui/table-page';

type Tab = 'list' | 'history' | 'table' | 'events';
type Screen = { k: 'detail'; id: number } | { k: 'summary' } | { k: 'new' } | { k: 'newitem'; name: string } | null;

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent, JoinComponent, NoAccessComponent, ListPageComponent, HistoryPageComponent, EventsPageComponent, DetailScreenComponent,
    SummaryScreenComponent, NewEventScreenComponent, NewItemScreenComponent, LoginComponent, TablePageComponent,
  ],
  template: `
    @if (auth.state() === 'loading') { <div class="boot">Завантаження…</div> }
    @else if (auth.needsJoin()) { <app-join /> }
    @else if (auth.state() === 'out') { <app-login /> }
    @else if (auth.state() === 'guest-none') { <app-no-access /> }
    @else {
      <div class="app">
        @if (banner(); as b) {
          <div class="banner" role="alert"><span>{{ b }}</span><button (click)="bannerOff.set(true)" aria-label="Закрити"><app-icon n="x" [s]="16" /></button></div>
        }
        @if (store.loading()) { <div class="boot">Завантаження подій…</div> }
        @else {
          <app-list-page [hidden]="tab() !== 'list'" (open)="screen.set({ k: 'detail', id: $event })" (newItem)="screen.set({ k: 'newitem', name: $event })" />
          @if (tab() === 'history') { <app-history-page (open)="screen.set({ k: 'detail', id: $event })" /> }
          @if (tab() === 'table') { <app-table-page /> }
          @if (tab() === 'events') { <app-events-page (newEvent)="screen.set({ k: 'new' })" /> }
        }

        <nav class="nav">
          @for (t of visibleTabs(); track t.k) {
            <button [class.on]="tab() === t.k" (click)="tab.set(t.k)"><app-icon [n]="t.i" [s]="20" /><span>{{ t.l }}</span></button>
          }
          <button class="fin" (click)="screen.set({ k: 'summary' })"><app-icon n="flag" [s]="20" /><span>Завершити</span></button>
        </nav>

        @if (toast.current(); as t) {
          <div class="toast" [class]="'toast ' + t.kind" role="status">
            <span>{{ t.msg }}</span>
            @if (t.undo) { <button (click)="t.undo(); toast.hide()">Скасувати</button> }
          </div>
        }

        @switch (screen()?.k) {
          @case ('detail') { <app-detail-screen [itemId]="detailId()" (back)="screen.set(null)" /> }
          @case ('newitem') { <app-new-item-screen [initialName]="newItemName()" (back)="screen.set(null)" (created)="screen.set({ k: 'detail', id: $event })" /> }
          @case ('summary') { <app-summary-screen (back)="screen.set(null)" /> }
          @case ('new') { <app-new-event-screen (back)="screen.set(null)" (created)="screen.set(null); tab.set('list')" /> }
        }
      </div>
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(InventoryStore);
  protected readonly toast = inject(ToastService);
  private readonly repo = inject(Repo);

  protected readonly tab = signal<Tab>('list');
  protected readonly screen = signal<Screen>(null);
  protected readonly bannerOff = signal(false);
  protected readonly tabs: { k: Tab; i: string; l: string }[] = [
    { k: 'list', i: 'list', l: 'Список' },
    { k: 'history', i: 'clock', l: 'Історія' },
    { k: 'table', i: 'sheet', l: 'Таблиця' },
    { k: 'events', i: 'cal', l: 'Івенти' },
  ];

  /** Гість не бачить розділ «Івенти» */
  protected readonly visibleTabs = computed(() => (this.auth.isGuest() ? this.tabs.filter((t) => t.k !== 'events') : this.tabs));
  protected newItemName() { const s = this.screen(); return s?.k === 'newitem' ? s.name : ''; }
  protected detailId() { const s = this.screen(); return s?.k === 'detail' ? s.id : 0; }
  protected banner() {
    if (this.bannerOff()) return '';
    if (this.store.error()) return this.store.error();
    return this.repo.mode === 'local' ? 'Firebase не налаштовано: дані зберігаються лише в цьому браузері' : '';
  }

  constructor() {
    effect(() => {
      if (this.auth.state() === 'in') untracked(() => this.store.start());
      else untracked(() => this.store.stop());
    });
    // Посилання вже не потрібне, коли користувач у системі
    effect(() => {
      if (this.auth.state() === 'in' && this.auth.joinParam() && !this.auth.needsJoin()) untracked(() => this.auth.clearJoinParam());
    });
  }
}
