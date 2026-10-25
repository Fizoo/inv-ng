import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { saveFile } from '../core/export';
import { InventoryStore } from '../core/inventory.store';
import { Repo } from '../core/repo';
import { ToastService } from '../core/toast.service';
import { isoDate } from '../core/util';
import { IconComponent } from './icon';
import { FdPipe, FtPipe } from './pipes';
import { PrevPickerComponent } from './prev-picker';

@Component({
  selector: 'app-events-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FdPipe, FtPipe, PrevPickerComponent],
  host: { class: 'page' },
  template: `
    <header class="top">
      <div class="logo"><app-icon n="cal" [s]="24" /></div>
      <div class="ttl"><h1>Івенти</h1><p>Кожна подія має власні залишки й історію</p></div>
    </header>
    <div class="scroll pad">
      <h3 class="sec">Активна подія</h3>
      @if (store.activeEvent(); as ev) {
        <div class="evrow on static">
          <span class="dot"><app-icon n="check" [s]="14" [w]="3" /></span>
          <span class="evt"><b>{{ ev.name }}</b><small>{{ ev.ts | fd }} · {{ ev.ts | ft }}</small></span>
        </div>
      }
      <h3 class="sec">Минулий переоблік</h3>
      <p class="note">Його залишки показуються в деталях позиції та в таблиці поруч з поточними.</p>
      <app-prev-picker />
      @if (repo.mode === 'firebase') {
        <h3 class="sec">Учасники події</h3>
        <div class="evlist">
          @for (m of store.sortedMembers(); track m.uid) {
            <div class="evwrap">
              <div class="evrow static">
                <i class="udot big" [style.background]="m.color"></i>
                <span class="evt"><b>{{ m.name }}{{ m.uid === store.myUid() ? ' (ви)' : '' }}</b><small>{{ m.role === 'owner' ? 'Власник' : 'Гість' }} · {{ store.isOnline(m) ? 'онлайн' : 'не в мережі' }}</small></span>
              </div>
              @if (m.role === 'guest') {
                <button class="del" [class.sure]="kconf() === m.uid" (blur)="kconf.set('')" (click)="kick(m.uid)" aria-label="Відключити гостя">
                  @if (kconf() === m.uid) { Відключити? } @else { <app-icon n="trash" [s]="16" /> }
                </button>
              }
            </div>
          }
        </div>
        <div class="two">
          <button class="btn ghostb" (click)="invite()"><app-icon n="plus" [s]="18" /> Запросити</button>
          <button class="btn ghostb" (click)="store.renewInvite()">Нове посилання</button>
        </div>
        @if (link()) { <p class="note link">{{ link() }}</p> }
      }
      <h3 class="sec">Попередні події</h3>
      @if (prev().length === 0) { <div class="empty small">Інших подій ще немає</div> }
      <div class="evlist">
        @for (e of prev(); track e.id) {
          <div class="evwrap">
            <button class="evrow" (click)="store.select(e.id)">
              <span class="dot"></span>
              <span class="evt"><b>{{ e.name }}</b><small>{{ e.ts | fd }} · {{ e.ts | ft }}</small></span>
            </button>
            <button class="del" [class.sure]="conf() === e.id" (blur)="conf.set('')" (click)="del(e.id)" aria-label="Видалити подію">
              @if (conf() === e.id) { Видалити? } @else { <app-icon n="trash" [s]="16" /> }
            </button>
          </div>
        }
      </div>
      <button class="primary" (click)="newEvent.emit()"><app-icon n="plus" /> Нова подія</button>

      <h3 class="sec">Резервна копія</h3>
      <p class="note">Усі події в одному файлі. Відновлення додає дані й нічого не видаляє, тому підходить і для переносу зі старої версії.</p>
      <div class="two">
        <button class="btn ghostb" (click)="backup()"><app-icon n="down" [s]="18" /> Зберегти</button>
        <label class="btn ghostb filebtn" for="restore">
          <app-icon n="up" [s]="18" /> Відновити
          <input id="restore" type="file" accept="application/json,.json" (change)="restore($event)" />
        </label>
      </div>

      <h3 class="sec">Синхронізація</h3>
      <p class="note">
        @if (repo.mode === 'firebase') { Дані зберігаються в Firebase і синхронізуються між усіма телефонами. }
        @else { Firebase не налаштовано, дані лише в цьому браузері. Вкажіть firebaseConfig у environment.ts. }
      </p>
      @if (auth.needed) { <button class="btn ghostb" (click)="auth.signOutNow()"><app-icon n="out" [s]="18" /> Вийти</button> }
    </div>
  `,
})
export class EventsPageComponent {
  protected readonly store = inject(InventoryStore);
  protected readonly auth = inject(AuthService);
  protected readonly repo = inject(Repo);
  private readonly toast = inject(ToastService);
  readonly newEvent = output<void>();
  protected readonly conf = signal('');
  protected readonly kconf = signal('');
  protected readonly link = signal('');
  protected readonly prev = computed(() => this.store.events().filter((e) => e.id !== this.store.activeId()).reverse());

  protected del(id: string) {
    if (this.conf() === id) { this.store.deleteEvent(id); this.conf.set(''); } else this.conf.set(id);
  }
  protected kick(uid: string) {
    if (this.kconf() === uid) { this.store.kick(uid); this.kconf.set(''); } else this.kconf.set(uid);
  }
  protected async invite() {
    try {
      const l = await this.store.inviteLink();
      this.link.set(l);
      if (navigator.share) {
        try { await navigator.share({ title: 'Інвентаризація', text: 'Приєднуйтесь до інвентаризації', url: l }); return; } catch { /* скасовано, копіюємо */ }
      }
      await navigator.clipboard.writeText(l);
      this.toast.show('Посилання скопійовано');
    } catch {
      this.toast.show('Скопіюйте посилання вручну з рядка нижче', 'warn');
    }
  }
  protected async backup() {
    try { saveFile(`Інвентаризація_резервна-копія_${isoDate(Date.now())}.json`, await this.store.makeBackup()); this.toast.show('Резервна копія збережена'); }
    catch { this.toast.show('Не вдалося зробити копію', 'err'); }
  }
  protected async restore(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try { const n = await this.store.restore(await f.text()); this.toast.show(`Відновлено подій: ${n}`); }
    catch (err: any) { this.toast.show(err?.message || 'Не вдалося відновити дані', 'err'); }
  }
}
