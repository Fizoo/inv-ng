import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './core/auth.service';
import { InventoryStore } from './core/inventory.store';
import { Repo } from './core/repo';
import { ToastService } from './core/toast.service';
import { DetailScreenComponent } from './ui/detail-screen';
import { EventsPageComponent } from './ui/events-page';
import { HistoryPageComponent } from './ui/history-page';
import { IconComponent } from './ui/icon';
import { ListPageComponent } from './ui/list-page';
import { LoginComponent } from './ui/login';
import { NewEventScreenComponent } from './ui/new-event-screen';
import { SummaryScreenComponent } from './ui/summary-screen';
import { SwitchSheetComponent } from './ui/switch-sheet';

type Tab = 'list' | 'history' | 'events';
type Screen = { k: 'detail'; id: number } | { k: 'summary' } | { k: 'new' } | { k: 'switch' } | null;

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent, ListPageComponent, HistoryPageComponent, EventsPageComponent, DetailScreenComponent,
    SummaryScreenComponent, NewEventScreenComponent, SwitchSheetComponent, LoginComponent,
  ],
  template: `
    @switch (auth.state()) {
      @case ('loading') { <div class="boot">Завантаження…</div> }
      @case ('out') { <app-login /> }
      @case ('in') {
        <div class="app">
          @if (banner(); as b) {
            <div class="banner" role="alert"><span>{{ b }}</span><button (click)="bannerOff.set(true)" aria-label="Закрити"><app-icon n="x" [s]="16" /></button></div>
          }
          @if (store.loading()) { <div class="boot">Завантаження подій…</div> }
          @else {
            <app-list-page [hidden]="tab() !== 'list'" (open)="screen.set({ k: 'detail', id: $event })"
              (finish)="screen.set({ k: 'summary' })" (switchEvent)="screen.set({ k: 'switch' })" />
            @if (tab() === 'history') { <app-history-page (open)="screen.set({ k: 'detail', id: $event })" /> }
            @if (tab() === 'events') { <app-events-page (newEvent)="screen.set({ k: 'new' })" /> }
          }

          <nav class="nav">
            @for (t of tabs; track t.k) {
              <button [class.on]="tab() === t.k" (click)="tab.set(t.k)"><app-icon [n]="t.i" [s]="22" /><span>{{ t.l }}</span></button>
            }
          </nav>

          @if (toast.current(); as t) {
            <div class="toast" [class]="'toast ' + t.kind" role="status">
              <span>{{ t.msg }}</span>
              @if (t.undo) { <button (click)="t.undo(); toast.hide()">Скасувати</button> }
            </div>
          }

          @switch (screen()?.k) {
            @case ('detail') { <app-detail-screen [itemId]="detailId()" (back)="screen.set(null)" /> }
            @case ('summary') { <app-summary-screen (back)="screen.set(null)" /> }
            @case ('new') { <app-new-event-screen (back)="screen.set(null)" (created)="screen.set(null); tab.set('list')" /> }
            @case ('switch') { <app-switch-sheet (close)="screen.set(null)" (newEvent)="screen.set({ k: 'new' })" /> }
          }
        </div>
      }
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
    { k: 'events', i: 'cal', l: 'Івенти' },
  ];

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
  }
}
