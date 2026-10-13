import { Injectable, signal } from '@angular/core';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { fbApp, firebaseConfigured } from './firebase';

export type AuthState = 'loading' | 'in' | 'out';

/** Вхід потрібен лише з Firebase і requireLogin=true. Локальний режим завжди «in». */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly needed = firebaseConfigured && environment.requireLogin;
  readonly state = signal<AuthState>(this.needed ? 'loading' : 'in');
  readonly error = signal('');

  constructor() {
    if (this.needed) onAuthStateChanged(getAuth(fbApp()), (u) => this.state.set(u ? 'in' : 'out'));
  }

  async signIn(email: string, password: string) {
    this.error.set('');
    try {
      await signInWithEmailAndPassword(getAuth(fbApp()), email.trim(), password);
    } catch (e: any) {
      const c = String(e?.code ?? '');
      this.error.set(
        c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')
          ? 'Невірний email або пароль'
          : c.includes('network') ? 'Немає інтернету' : 'Не вдалося увійти. Спробуйте ще раз',
      );
    }
  }
  signOutNow() { if (this.needed) signOut(getAuth(fbApp())); }
}
