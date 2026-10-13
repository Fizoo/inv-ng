import { FirebaseApp, initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';

export const firebaseConfigured = !!environment.firebase.apiKey && !!environment.firebase.projectId;
let app: FirebaseApp | null = null;
export const fbApp = () => (app ??= initializeApp(environment.firebase));
