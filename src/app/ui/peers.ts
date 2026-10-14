import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { initial } from '../core/colors';
import { InventoryStore } from '../core/inventory.store';

/** Кольорові кружечки учасників події. Видно лише коли в події більше однієї людини. */
@Component({
  selector: 'app-peers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'peers' },
  template: `
    @if (store.multi()) {
      @for (m of store.sortedMembers(); track m.uid) {
        <span class="peer" [class.off]="!store.isOnline(m)" [class.me]="m.uid === store.myUid()" [style.--c]="m.color"
          [title]="m.name" [attr.aria-label]="m.name + (store.isOnline(m) ? ', онлайн' : ', не в мережі')">{{ ini(m.name) }}</span>
      }
    }
  `,
})
export class PeersComponent {
  protected readonly store = inject(InventoryStore);
  protected ini(n: string) { return initial(n); }
}
