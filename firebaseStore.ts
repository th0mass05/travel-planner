import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot
} from "firebase/firestore";

export const storage = {

  async get(key: string) {
    const snap = await getDoc(doc(db, "travelData", key));
    if (!snap.exists()) return null;
    return { value: JSON.stringify(snap.data()) };
  },

  async set(key: string, value: any) {
    await setDoc(doc(db, "travelData", key), value);
  },

  async list(prefix: string) {
    const col = collection(db, "travelData");
    const snapshot = await getDocs(col);

    const keys: string[] = [];
    snapshot.forEach(d => {
      if (d.id.startsWith(prefix)) keys.push(d.id);
    });

    return { keys };
  },

  // optional realtime helper if you want later
  subscribe(key: string, callback: (data:any)=>void) {
    return onSnapshot(doc(db, "travelData", key), snap => {
      if (snap.exists()) callback(snap.data());
    });
  }

};
