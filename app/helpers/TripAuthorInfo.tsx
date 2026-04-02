import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function TripAuthorInfo({ 
  uid, 
  createdAt, 
  className = "" 
}: { 
  uid?: string | null; 
  createdAt?: string; 
  className?: string; 
}) {
  const [name, setName] = useState<string>("");
  
  useEffect(() => {
    if (!uid) return;
    
    // 1. Check if it's the current user
    if (auth.currentUser?.uid === uid) {
      setName("You");
      return;
    }

    // 2. Otherwise fetch user name
    const fetchName = async () => {
      try {
        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || data.displayName || "Unknown");
        } else {
          setName("Unknown Traveler");
        }
      } catch (e) {
        setName("Unknown");
      }
    };
    fetchName();
  }, [uid]);

  if (!uid && !createdAt) return null;

  return (
    <div className={`flex items-center gap-1 text-xs text-gray-400 italic ${className}`}>
      {uid && <span>{name}</span>}
      {uid && createdAt && <span>•</span>}
      {createdAt && (
        <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
      )}
    </div>
  );
}