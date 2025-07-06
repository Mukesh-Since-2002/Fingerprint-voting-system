// Step 1: Import necessary Firebase services
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

// Step 2: Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDswb74bcpf1f2qn0Tyb00swrJzLa_3bP8",
  authDomain: "fingerprint-voting-syste-7687a.firebaseapp.com",
  projectId: "fingerprint-voting-syste-7687a",
  storageBucket: "fingerprint-voting-syste-7687a.appspot.com",
  messagingSenderId: "1003849149435",
  appId: "1:1003849149435:web:bfe5bc02c4506a4f39795e",
  measurementId: "G-H3JBDEPRSN"
};

// Step 3: Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Step 4: Export services to use in components
export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };
