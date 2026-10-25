# Інвентаризація

Мобільний вебзастосунок для швидкої інвентаризації бару під час івентів. Кілька людей рахують одночасно, усе синхронізується між телефонами, а результат вивантажується в Excel або CSV.

**Стек:** Angular 21 (standalone, signals, zoneless), NgRx SignalStore, Tailwind CSS 4, Firebase (Cloud Firestore + Authentication), SheetJS для експорту.

## Можливості

- **174 позиції** з файлу «Акт інвентаризації ТМЦ» (назви й одиниці як в оригіналі: л, кг, шт, пак). Нові позиції додаються вручну.
- Швидкий **пошук** по словах у будь-якому порядку та **фільтри** за видом алкоголю, «Коктейлі» і «Не змінені».
- У кожному рядку: «−» зі списанням, «+» з додаванням, поточний залишок. Число вводиться вручну, кома й крапка підходять.
- **Вино пляшками** (× 0,75 л) та **кега просекко** (× 24 л) окремою групою в рядку.
- **Премікси:** вводиш залишок преміксу в літрах, застосунок розкладає його за рецептом по інгредієнтах.
- Деталі позиції з історією операцій (додано зелене, списано червоне), загальна історія, таблиця результату.
- **Незалежні події.** Кожна починається з нулів або з залишків попередньої. До події можна підключити минулий переоблік для порівняння (колонка «Було»).
- **Спільна робота:** власник запрошує гостей за посиланням, кожен учасник має кольорову точку, видно, хто в мережі.
- **Експорт** в Excel (.xlsx) і CSV, назва файлу містить подію та дату. **Резервна копія** й відновлення.
- Працює офлайн (кеш Firestore), синхронізується, коли з'являється інтернет.
- Вбудована інструкція (кнопка «?» зверху у списку).

## Швидкий старт

```bash
npm install
npm start          # http://localhost:4200
npm run build      # результат у dist/inv-ng/browser
```

Якщо `apiKey` у `src/environments/environment.ts` порожній, застосунок працює локально, а дані зберігаються лише в браузері.

## Налаштування Firebase

1. [Firebase Console](https://console.firebase.google.com) → створити проєкт.
2. **Build → Firestore Database → Create database.** Режим production, регіон `eur3`. Цього достатньо для плану Spark (безкоштовного).
3. **Build → Authentication → Sign-in method:** увімкнути **Email/Password** (вхід власника) і **Anonymous** (гості за посиланням).
4. **Authentication → Users → Add user:** створити акаунт власника (email і пароль). Будь-який акаунт з паролем має права власника.
5. **Authentication → Settings → Authorized domains:** додати домен, де розміщено застосунок, наприклад `<логін>.github.io`.
6. **Project settings → Your apps → Web app:** скопіювати `firebaseConfig` у `src/environments/environment.ts`. Там само вкажи `publicUrl`: адресу сайту, з якої будуються посилання-запрошення.
7. **Firestore → Rules:** вставити вміст файлу `firestore.rules` і натиснути **Publish**. Правила потрібно публікувати заново, коли вони змінюються в репозиторії.

> `firebaseConfig` не є секретом: доступ до даних обмежують правила Firestore та вхід. Тому не послаблюй `firestore.rules`.

## Публікація на GitHub Pages

1. Репозиторій → **Settings → Pages → Source: GitHub Actions**.
2. Створи `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx ng build --base-href "/${{ github.event.repository.name }}/"
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/inv-ng/browser
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. Кожен push у гілку `master` оновлює сайт приблизно за 1–2 хвилини: `https://<логін>.github.io/<репозиторій>/`.

## Ролі

| | Власник (email + пароль) | Гість (за посиланням) |
|---|---|---|
| Рахувати: додавати й списувати | так | так |
| Історія, таблиця, експорт | так | так |
| Видаляти операції | будь-які | лише свої |
| Нові події, вибір минулого переобліку | так | ні |
| Додавати й видаляти позиції | так | ні |
| Запрошувати й відключати гостей | так | ні |

Гість бачить лише ту подію, до якої приєднався. Посилання має вигляд `…/?join=<id події>.<код>`. Кнопка «Нове посилання» робить старий код недійсним для нових гостей.

## Структура даних (Firestore)

```
items/{itemId}                  { name, unit, ts }                          додані вручну позиції
events/{eventId}                { name, ts, opening, joinCode, prev? }
events/{eventId}/members/{uid}  { name, color, role, joinedAt, lastSeen, code? }
events/{eventId}/ops/{opId}     { itemId, type: "add"|"sub", qty, ts, by, pg? }
```

- Операції лише додаються й видаляються, **залишок = початковий + додано − списано** і рахується на клієнті. Тому кілька телефонів пишуть одночасно й не перезаписують одне одного.
- `prev` у події це знімок залишків минулого переобліку (його бачать і гості).
- `pg` це спільний id групи операцій одного преміксу (для скасування й видалення всією групою).

## Що можна змінити в коді

| Що | Де |
|---|---|
| Список позицій з Excel | `src/app/core/items.json` |
| Рецепти преміксів і відповідність інгредієнтів позиціям | `src/app/core/premix.ts` |
| Фільтри за видами алкоголю | `src/app/core/categories.ts` (`CATEGORIES`) |
| Об'єм пляшки вина, кеги, виключення (тетра-пак, домашнє) | `src/app/core/categories.ts` (`BOTTLE_L`, `KEG_L`, `packSize`) |
| Колонки Excel і CSV | `src/app/core/export.ts` |
| Текст інструкції в застосунку | `src/app/ui/help-screen.ts` |
| Адреса сайту для запрошень, ключі Firebase | `src/environments/environment.ts` |
| Правила доступу | `firestore.rules` |
| Кольори й вигляд | `src/styles.css` |

### Премікси

Рецепт це список «позиція інвентаризації + мл на 1 порцію». Залишок преміксу в літрах ділиться між інгредієнтами пропорційно, тож 1,45 л Garden Party (145 мл на порцію) дає джин 0,65 л, сік 0,5 л, Triple Sec 0,15 л, сироп 0,15 л. Позиції в кг (ПФ манго-маракуя, ПФ обліпиха) рахуються як 1 л = 1 кг. Номер `n` у рецепті не змінюй і не використовуй повторно, бо за ним зберігається історія.

## Структура проєкту

```
src/app/
  core/    дані й логіка: store (NgRx SignalStore), репозиторії (Firestore, локальний), каталог, експорт
  ui/      компоненти екранів: список, деталі, історія, таблиця, івенти, інструкція, вхід
firestore.rules   правила безпеки
firebase.json     конфігурація Firebase (правила)
```

`Repo` це абстракція над сховищем: `FirestoreRepo` працює, коли налаштовано Firebase, інакше `LocalRepo` (localStorage).

## Резервна копія

«Івенти → Резервна копія → Зберегти» створює один JSON з усіма подіями й доданими позиціями. «Відновити» додає й оновлює записи за id та нічого не видаляє. Підтримуються копії зі старої версії застосунку.
