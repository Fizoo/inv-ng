import { Injectable, signal } from '@angular/core';

export interface ToastMsg { msg: string; kind: 'ok' | 'warn' | 'err'; undo?: () => void }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMsg | null>(null);
  private timer = 0;

  show(msg: string, kind: ToastMsg['kind'] = 'ok', undo?: () => void) {
    this.current.set({ msg, kind, undo });
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.current.set(null), undo ? 6000 : 3500);
  }
  hide() { this.current.set(null); }
}
