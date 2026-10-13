/**
 * Налаштування Firebase. Встав сюди firebaseConfig зі свого проєкту
 * (Firebase Console → Project settings → Your apps → Web app).
 * Якщо apiKey порожній, застосунок працює локально (дані лише в цьому браузері).
 */
export const environment = {
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  /** true: вхід за email і паролем (один спільний акаунт для бару). false: без входу (правила Firestore мають бути відкриті). */
  requireLogin: true,
};
