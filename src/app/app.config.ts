import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { FirestoreRepo } from './core/firestore-repo';
import { firebaseConfigured } from './core/firebase';
import { LocalRepo } from './core/local-repo';
import { Repo } from './core/repo';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Firebase налаштовано → спільна база. Інакше локальне сховище браузера.
    { provide: Repo, useClass: firebaseConfigured ? FirestoreRepo : LocalRepo },
  ],
};
