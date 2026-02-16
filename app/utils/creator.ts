import { auth, db } from "@/firebase";   // adjust path if needed
import { doc, getDoc } from "firebase/firestore";

export const getCurrentUserInfo = () => {
  const user = auth.currentUser;
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email
  };
};

export const getUserName = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return "Unknown";
  return snap.data().name || "Unknown";
};
