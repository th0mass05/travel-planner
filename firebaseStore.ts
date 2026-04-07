import { db } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  onSnapshot,
  query,
  where,
  documentId,
  deleteDoc
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
  
  async delete(key: string) {
    await deleteDoc(doc(db, "travelData", key));
  },

  async list(prefix: string) {

    const q = query(
      collection(db, "travelData"),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + '\uf8ff')
    );

    const snapshot = await getDocs(q);
    const keys: string[] = [];

    snapshot.forEach(d => {
      keys.push(d.id);
    });

    return { keys };
  },

  async getAll<T>(prefix: string): Promise<T[]> {
    const q = query(
      collection(db, "travelData"),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + '\uf8ff')
    );

    const snapshot = await getDocs(q);
    const items: T[] = [];

    snapshot.forEach((doc) => {

      const data = doc.data() as T;
      items.push(data);
    });

    return items;
  },

  subscribeToList(prefix: string, callback: (items: any[]) => void) {
    const q = query(
      collection(db, "travelData"),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + '\uf8ff')
    );

    return onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data());
      });
      callback(items);
    });
  }
};