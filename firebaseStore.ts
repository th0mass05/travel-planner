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
    // We treat the value as the whole document
    // If you need to wrap it in { value: ... } like before, do it here.
    // Based on your previous code, you were JSON.stringifying. 
    // Firestore can store objects natively! But let's stick to your pattern for safety:
    await setDoc(doc(db, "travelData", key), value); 
  },
  
  // NEW: Deletes a document directly (faster than your previous workaround)
  async delete(key: string) {
    await deleteDoc(doc(db, "travelData", key));
  },

  // OPTIMIZED LIST: Only fetches keys that match the prefix
  async list(prefix: string) {
    // The character \uf8ff is the last character in Unicode. 
    // This query says: "Find IDs starting with prefix"
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

  // ⭐ NEW SUPER FUNCTION: Fetches DATA directly (1 Request instead of 10+)
  async getAll<T>(prefix: string): Promise<T[]> {
    const q = query(
      collection(db, "travelData"),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + '\uf8ff')
    );

    const snapshot = await getDocs(q);
    const items: T[] = [];

    snapshot.forEach((doc) => {
      // Assuming your data is stored directly in the doc
      // If you stored it as a stringified JSON string called "value", use parse:
      // const data = JSON.parse(doc.data().value);
      
      // Based on your "set" logic, it looks like you store the object directly:
      const data = doc.data() as T;
      items.push(data);
    });

    return items;
  },

  // ⭐ REAL-TIME LISTENER: Website-wide updates
  subscribeToList(prefix: string, callback: (items: any[]) => void) {
    const q = query(
      collection(db, "travelData"),
      where(documentId(), '>=', prefix),
      where(documentId(), '<', prefix + '\uf8ff')
    );

    // This runs automatically whenever ANYONE changes data in this prefix
    return onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data());
      });
      callback(items);
    });
  }
};