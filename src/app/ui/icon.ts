import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const P: Record<string, string> = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  back: 'M19 12H5M12 19l-7-7 7-7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  cal: 'M3 5h18v16H3zM3 10h18M8 2v4M16 2v4',
  check: 'M5 12l5 5L20 7',
  down: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  up: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  chev: 'M6 9l6 6 6-6',
  x: 'M18 6L6 18M6 6l12 12',
  flag: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  glass: 'M3 4h18l-9 10zM12 14v7M8 21h8',
  sheet: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6',
  out: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.width]="s()" [attr.height]="s()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    [attr.stroke-width]="w()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d()" /></svg>`,
  styles: ':host{display:inline-grid;place-items:center;line-height:0}',
})
export class IconComponent {
  readonly n = input.required<string>();
  readonly s = input(20);
  readonly w = input(1.8);
  protected readonly d = computed(() => P[this.n()] ?? '');
}
