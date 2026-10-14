import { Injectable, computed, signal } from '@angular/core';
import { User, getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { fbApp, firebaseConfigured } from './firebase';

/**
 * out        — не увійшли
 * in         — власник (email) або гість, що вже приєднаний до події
 * guest-none — анонімний гість, але ще без жодної події
 */
export type AuthState = 'loading' | 'out' | 'in' | 'guest-none';
export interface JoinParam { eventId: string; code: string }

const JOINED_KEY = 'inv2:joined';
const readJoined = (): string[] => { try { return JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]'); } catch { return []; } };

function readJoinParam(): JoinParam | null {
  const v = new URLSearchParams(location.search).get('join');
  const [eventId, code] = (v ?? '').split('.');
  return eventId && code ? { eventId, code } : null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** У режимі Firebase вхід потрібен завжди. Без Firebase застосунок локальний. */
  readonly needed = firebaseConfigured;
  readonly state = signal<AuthState>(this.needed ? 'loading' : 'in');
  readonly error = signal('');
  readonly uid = signal('');
  readonly isGuest = signal(false);
  readonly joined = signal<string[]>(readJoined());
  readonly joinParam = signal<JoinParam | null>(readJoinParam());
  /** Потрібно показати екран приєднання за посиланням */
  readonly needsJoin = computed(() => {
    const j = this.joinParam();
    if (!j || !this.needed) return false;
    const s = this.state();
    if (s === 'out' || s === 'guest-none') return true;
    return s === 'in' && this.isGuest() && !this.joined().includes(j.eventId);
  });
  private user: User | null = null;

  constructor() {
    if (this.needed) onAuthStateChanged(getAuth(fbApp()), (u) => { this.user = u; this.recompute(); });
  }

  private recompute() {
    const u = this.user;
    this.uid.set(u?.uid ?? '');
    this.isGuest.set(!!u?.isAnonymous);
    if (!u) this.state.set('out');
    else if (!u.isAnonymous) this.state.set('in');
    else this.state.set(this.joined().length ? 'in' : 'guest-none');
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

  /** Гість входить анонімно; якщо вже увійшов, повертає той самий uid */
  async ensureAnonymous(): Promise<string> {
    const auth = getAuth(fbApp());
    if (auth.currentUser) return auth.currentUser.uid;
    return (await signInAnonymously(auth)).user.uid;
  }

  markJoined(eventId: string) {
    const list = [...new Set([...this.joined(), eventId])];
    this.joined.set(list);
    try { localStorage.setItem(JOINED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    this.clearJoinParam();
    this.recompute();
  }
  forgetJoined(eventId: string) {
    const list = this.joined().filter((x) => x !== eventId);
    this.joined.set(list);
    try { localStorage.setItem(JOINED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    this.recompute();
  }
  clearJoinParam() {
    this.joinParam.set(null);
    try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ }
  }

  signOutNow() { if (this.needed) signOut(getAuth(fbApp())); }
}
