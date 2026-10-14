/**
 * Налаштування Firebase (Project settings → Your apps → Web app).
 * Якщо apiKey порожній, застосунок працює локально (дані лише в цьому браузері).
 */
export const environment = {
  /** Адреса опублікованого сайту: посилання-запрошення завжди ведуть сюди, навіть коли власник відкрив localhost. */
  publicUrl: 'https://fizoo.github.io/inv-ng/',
  firebase: {
    apiKey: 'AIzaSyCpaikHsRxHIvtoLrqLHVfjXquGlrbN0KY',
    authDomain: 'bar-inventory-a63d2.firebaseapp.com',
    projectId: 'bar-inventory-a63d2',
    storageBucket: 'bar-inventory-a63d2.firebasestorage.app',
    messagingSenderId: '278449204664',
    appId: '1:278449204664:web:ff21ab44b8fb869df7b34d',
  },
};
