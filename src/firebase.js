import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Importado aqui

const firebaseConfig = {
  apiKey: "AIzaSyDX_vetgmtyxHX2wpzaqX0y09NasJtyUXg",
  authDomain: "botoes-e5f81.firebaseapp.com",
  projectId: "botoes-e5f81",
  storageBucket: "botoes-e5f81.firebasestorage.app",
  messagingSenderId: "213114513073",
  appId: "1:213114513073:web:599ebfd3b30e2e4656a490",
  measurementId: "G-1BZT2ZLP00"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Exportado aqui
