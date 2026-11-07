import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCOmIA6jTV6rmYMdM4x_YvvqkDCKeS1TpA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cdsure-c360f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cdsure-c360f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cdsure-c360f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "693345890442",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:693345890442:web:e9ff28259a2286460dfd73",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KFK51EVS67"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
};

export type { FirebaseUser };
