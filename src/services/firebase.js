import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyC-KKA0iTnadutGf5OqMnvkMc_vgntnY_8",
  authDomain: "ucnl-actividades.firebaseapp.com",
  projectId: "ucnl-actividades",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ucnl-actividades-default-rtdb.firebaseio.com",
  storageBucket: "ucnl-actividades.firebasestorage.app",
  messagingSenderId: "709317883582",
  appId: "1:709317883582:web:f2838d2ba39467d2ac50ef",
  measurementId: "G-FSKPB3QRYY"
};

// Inicialización segura de la app de Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Inicializar messaging de forma asíncrona y segura
let messagingInstance = null;
export const getFirebaseMessaging = async () => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  }
  return null;
};

export default app;
