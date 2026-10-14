import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { randomGuestColor } from '../core/colors';
import { InventoryStore, readName, writeName } from '../core/inventory.store';
import { Repo } from '../core/repo';
import { IconComponent } from './icon';

/** Екран гостя: ім'я й вхід за посиланням від власника. */
@Component({
  selector: 'app-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'login' },
  template: `
    <div class="logo big"><app-icon n="glass" [s]="44" [w]="1.5" /></div>
    <h1>Приєднатися до події</h1>
    <p class="note">Введіть своє ім’я, щоб інші бачили, хто вносить зміни</p>
    <form (submit)="submit($event)">
      <div class="qty"><input id="guest-name" autofocus maxlength="20" autocomplete="nickname" placeholder="Ваше ім’я" [value]="name()" (input)="onName($event)" /></div>
      @if (error()) { <p class="err">{{ error() }}</p> }
      <button class="primary" type="submit" [disabled]="busy() || !name().trim()">Приєднатися</button>
    </form>
  `,
})
export class JoinComponent {
  private readonly auth = inject(AuthService);
  private readonly repo = inject(Repo);
  private readonly store = inject(InventoryStore);
  protected readonly name = signal(readName());
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected onName(e: Event) { this.name.set((e.target as HTMLInputElement).value); }

  protected async submit(e: Event) {
    e.preventDefault();
    const j = this.auth.joinParam();
    const name = this.name().trim();
    if (!j || !name) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const uid = await this.auth.ensureAnonymous();
      const now = Date.now();
      await this.repo.setMember(j.eventId, uid, { name, color: randomGuestColor(), role: 'guest', joinedAt: now, lastSeen: now, code: j.code });
      writeName(name);
      this.store.select(j.eventId);
      this.auth.markJoined(j.eventId);
    } catch (err: any) {
      const c = String(err?.code ?? '');
      this.error.set(c.includes('permission') ? 'Посилання недійсне або застаріле. Попросіть нове у власника' : 'Не вдалося приєднатися. Перевірте інтернет');
    } finally {
      this.busy.set(false);
    }
  }
}

/** Анонімний гість без жодної події. */
@Component({
  selector: 'app-no-access',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'login' },
  template: `
    <h1>Немає доступу</h1>
    <p class="note">Попросіть у власника посилання-запрошення в подію й відкрийте його на цьому телефоні.</p>
    <button class="btn ghostb" style="width:100%" (click)="auth.signOutNow()">Я власник, увійти</button>
  `,
})
export class NoAccessComponent {
  protected readonly auth = inject(AuthService);
}
