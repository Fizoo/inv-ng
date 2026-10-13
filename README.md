# Інвентаризація бару (Angular 21 + Firebase)

Angular 21, standalone-компоненти, signals, NgRx SignalStore, Tailwind 4, Firestore.
174 позиції з файлу «Акт інвентаризації ТМЦ» лежать у `src/app/core/items.json`.

## Запуск

```
npm install
npm start          # http://localhost:4200
npm run build      # dist/inv-ng/browser
```

Без налаштування Firebase застосунок працює локально (дані лише в браузері).

## Спільна база для кількох телефонів

1. Firebase Console → створити проєкт → Build → Firestore Database → Create (production mode).
2. Build → Authentication → Sign-in method → увімкнути Email/Password.
   Users → Add user: один спільний акаунт для бару (email і пароль).
3. Project settings → Your apps → Web app → скопіювати `firebaseConfig`
   у `src/environments/environment.ts`.
   Якщо вхід не потрібен, поставити `requireLogin: false` і відкрити правила в `firestore.rules`.
4. Розгортання:
   ```
   npm i -g firebase-tools
   firebase login
   firebase use --add          # вибрати проєкт
   npm run build
   firebase deploy --only firestore:rules,hosting
   ```
5. Відкрити адресу `https://<project>.web.app` на обох телефонах і увійти.

## Як влаштовано дані

```
events/{eventId}            { name, ts, opening: { "<itemId>": number } }
events/{eventId}/ops/{opId} { itemId, type: "add"|"sub", qty, ts }
```

Операції лише додаються й видаляються, залишок = початковий + додано − списано.
Тому два телефони можуть працювати одночасно й не перезаписують одне одного.
Активна подія запам'ятовується окремо на кожному пристрої.
Firestore кешує дані офлайн і синхронізується, коли з'являється інтернет.

## Резервна копія

«Івенти» → «Резервна копія». Відновлення додає дані за id і нічого не видаляє.
Підтримується і копія зі старої React-версії.
