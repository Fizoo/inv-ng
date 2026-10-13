import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { totalsByUnit } from '../core/calc';
import { fileName, makeCsv, makeXlsx, saveFile } from '../core/export';
import { InventoryStore } from '../core/inventory.store';
import { ITEMS } from '../core/items';
import { ToastService } from '../core/toast.service';
import { isoDate } from '../core/util';
import { IconComponent } from './icon';
import { FdPipe, FtPipe, NumPipe } from './pipes';

@Component({
  selector: 'app-summary-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NumPipe, FdPipe, FtPipe],
  host: { class: 'screen' },
  template: `
    <header class="top slim">
      <button class="icon" (click)="back.emit()" aria-label="Назад"><app-icon n="back" [s]="22" /></button>
      <div class="ttl">
        <h1 class="h2">Завершення інвентаризації</h1>
        @if (ev(); as e) { <p>{{ e.name }} · {{ e.ts | fd }}, {{ e.ts | ft }}</p> }
      </div>
    </header>
    <div class="scroll pad">
      <div class="card stats">
        <div><strong>{{ store.movedCount() }}</strong><span>з {{ total }} позицій опрацьовано</span></div>
        <div><strong>{{ store.ops().length }}</strong><span>операцій</span></div>
      </div>
      @if (totals().length) {
        <div class="card utable">
          <div class="uh"><span>Од.</span><span>Додано</span><span>Списано</span><span>Позицій</span></div>
          @for (t of totals(); track t.unit) {
            <div class="ur"><b>{{ t.unit }}</b><span class="g">+{{ t.add | num }}</span><span class="r">−{{ t.sub | num }}</span><span>{{ t.pos }}</span></div>
          }
        </div>
      }
      <h3 class="sec">Експорт результатів</h3>
      <div class="exp">
        <button (click)="xlsx()" [disabled]="busy()"><span class="ei g"><app-icon n="sheet" [s]="22" /></span><span><b>Завантажити Excel (.xlsx)</b><small>Підсумок і журнал операцій</small></span></button>
        <button (click)="csv()"><span class="ei b"><app-icon n="list" [s]="22" /></span><span><b>Завантажити CSV</b><small>Для швидкого перегляду</small></span></button>
        <button class="plain" (click)="backup()"><app-icon n="down" /> Зберегти резервну копію</button>
      </div>
      <h3 class="sec">Таблиця</h3>
      <div class="seg">
        <button [class.on]="!all()" (click)="all.set(false)">З рухом · {{ store.movedCount() }}</button>
        <button [class.on]="all()" (click)="all.set(true)">Усі · {{ total }}</button>
      </div>
      @if (rows().length === 0) {
        <div class="empty">Операцій ще немає. Додайте або спишіть кількість у списку.</div>
      } @else {
        <div class="tbl">
          <div class="th"><span>Товар</span><span>Додано</span><span>Списано</span><span>Залишок</span></div>
          @for (it of rows(); track it.id) {
            <div class="tr">
              <span class="n">{{ it.name }}</span>
              <span [class]="stat(it.id).add ? 'g' : 'z'">{{ stat(it.id).add | num }}</span>
              <span [class]="stat(it.id).sub ? 'r' : 'z'">{{ stat(it.id).sub | num }}</span>
              <span class="f" [class.r]="stat(it.id).bal < 0">{{ stat(it.id).bal | num }} <i>{{ it.unit }}</i></span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SummaryScreenComponent {
  protected readonly store = inject(InventoryStore);
  private readonly toast = inject(ToastService);
  readonly back = output<void>();
  protected readonly total = ITEMS.length;
  protected readonly all = signal(false);
  protected readonly busy = signal(false);
  protected readonly ev = this.store.activeEvent;
  protected readonly totals = computed(() => totalsByUnit(this.store.stats()));
  protected readonly rows = computed(() => (this.all() ? ITEMS : ITEMS.filter((i) => this.store.stats().get(i.id)!.n)));
  protected stat(id: number) { return this.store.stats().get(id)!; }

  protected async xlsx() {
    const ev = this.ev();
    if (!ev) return;
    this.busy.set(true);
    try { saveFile(fileName(ev, 'xlsx'), await makeXlsx(ev, this.store.ops(), this.store.stats())); this.toast.show('Excel: файл готовий'); }
    catch { this.toast.show('Не вдалося створити Excel', 'err'); }
    finally { this.busy.set(false); }
  }
  protected csv() {
    const ev = this.ev();
    if (!ev) return;
    try { saveFile(fileName(ev, 'csv'), makeCsv(ev, this.store.stats())); this.toast.show('CSV: файл готовий'); }
    catch { this.toast.show('Не вдалося створити CSV', 'err'); }
  }
  protected async backup() {
    try { saveFile(`Інвентаризація_резервна-копія_${isoDate(Date.now())}.json`, await this.store.makeBackup()); this.toast.show('Резервна копія збережена'); }
    catch { this.toast.show('Не вдалося зробити копію', 'err'); }
  }
}
