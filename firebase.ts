import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBc8nX6aVjRLBGc6kqD5jaxWuMODKitqfg",
  authDomain: "travel-planner-caf2a.firebaseapp.com",
  projectId: "travel-planner-caf2a",
  storageBucket: "travel-planner-caf2a.firebasestorage.app",
  messagingSenderId: "581918081288",
  appId: "1:581918081288:web:450e98e1ca9ceef67d6cbd",
  measurementId: "G-NQYQMDWBFH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
