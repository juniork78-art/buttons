// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmWcZtrfQK2aXDzBdCtcIuPGmHkfpfyrg",
  authDomain: "botoes-1787c.firebaseapp.com",
  projectId: "botoes-1787c",
  storageBucket: "botoes-1787c.firebasestorage.app",
  messagingSenderId: "233788862144",
  appId: "1:233788862144:web:9064d961ace070823dc725",
  measurementId: "G-4MX2B6VX9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exportações necessárias para o sistema de login e salvamento de sons
export const auth = getAuth(app);
export const db = getFirestore(app);
