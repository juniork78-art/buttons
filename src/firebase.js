import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

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
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db, analytics };
