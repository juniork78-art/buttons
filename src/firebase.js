import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Importado aqui

const firebaseConfig = {
  apiKey: "AIzaSyDmWcZtrfQK2aXDzBdCtcIuPGmHkfpfyrg",
  authDomain: "botoes-1787c.firebaseapp.com",
  projectId: "botoes-1787c",
  storageBucket: "botoes-1787c.firebasestorage.app",
  messagingSenderId: "233788862144",
  appId: "1:233788862144:web:9064d961ace070823dc725",
  measurementId: "G-4MX2B6VX9S"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Exportado aqui
