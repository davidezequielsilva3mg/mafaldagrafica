import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCbNFlEVmq5JLEowiX4_dJmco05t-1uRwM",
  authDomain: "mafalda-grafica.firebaseapp.com",
  projectId: "mafalda-grafica",
  storageBucket: "mafalda-grafica.firebasestorage.app",
  messagingSenderId: "1036113368691",
  appId: "1:1036113368691:web:ed09d55b4e2806e5ee7c06"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);