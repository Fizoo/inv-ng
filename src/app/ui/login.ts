import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { IconComponent } from './icon';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'login' },
  template: `
    <div class="logo big"><app-icon n="glass" [s]="44" [w]="1.5" /></div>
    <h1>Інвентаризація</h1>
    <p class="note">Увійдіть, щоб працювати зі спільною базою бару</p>
    <form (submit)="submit($event)">
      <div class="qty"><input id="email" type="email" autocomplete="username" placeholder="Email" [value]="email()" (input)="email.set(val($event))" /></div>
      <div class="qty"><input id="password" type="password" autocomplete="current-password" placeholder="Пароль" [value]="pw()" (input)="pw.set(val($event))" /></div>
      @if (auth.error()) { <p class="err">{{ auth.error() }}</p> }
      <button class="primary" type="submit" [disabled]="busy()">Увійти</button>
    </form>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  protected readonly email = signal('');
  protected readonly pw = signal('');
  protected readonly busy = signal(false);
  protected val(e: Event) { return (e.target as HTMLInputElement).value; }
  protected async submit(e: Event) {
    e.preventDefault();
    this.busy.set(true);
    await this.auth.signIn(this.email(), this.pw());
    this.busy.set(false);
  }
}
