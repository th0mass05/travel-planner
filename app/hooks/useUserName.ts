import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";   // adjust path if needed

export default function useUserName(uid?: string | null) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!uid) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          setName(snap.data().name || "Unknown");
        } else {
          setName("Unknown");
        }
      } catch {
        setName("Unknown");
      }
    };

    load();
  }, [uid]);

  return name;
}
