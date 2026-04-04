import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { doc, setDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";import { db } from "../../../firebase"; 

export default function ProTipWidget({ dayLocations, city, tripId, dayDate }: any) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const locationsString = dayLocations.join(",");

  //  1. EXTRACTED GENERATION LOGIC
  // This lets us call it on first load AND when the refresh button is clicked
  const fetchNewTipFromAI = async () => {
    setLoading(true);
    try {
      //Grab all previously generated tips for THIS trip from Firestore
      const tipsQuery = query(collection(db, "ai_tips"), where("tripId", "==", tripId));
      const querySnapshot = await getDocs(tipsQuery);
      
      // Map them into an array of strings
      const previousTips = querySnapshot.docs.map(doc => doc.data().tip);

      //  2. Send the previousTips array to our backend
      const res = await fetch("/api/generate-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          locations: dayLocations, 
          city, 
          previousTips
        }),
      });
      if (!res.ok) throw new Error("Backend API failed");
      const data = await res.json();
      
      if (data.tip) {
        setTip(data.tip);
        
        const tipDocId = `${tripId}_${dayDate}`;
        const tipRef = doc(db, "ai_tips", tipDocId);
        await setDoc(tipRef, { 
          tip: data.tip, 
          tripId, 
          dayDate,
          createdAt: new Date().toISOString() 
        });
      }
    } catch (e) {
      console.error("API Error:", e);
      setTip("Check local guides or ask your hotel concierge for the best hidden spots today!"); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dayLocations.length === 0) {
      setTip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const tipDocId = `${tripId}_${dayDate}`;
    const tipRef = doc(db, "ai_tips", tipDocId); 

    // This creates a live connection to this specific day's tip in the database
    const unsubscribe = onSnapshot(tipRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().tip) {
        // If the document exists, update the screen instantly
        setTip(docSnap.data().tip);
        setLoading(false);
      } else {
        // If the document doesn't exist at all (first time loading the day)
        // Call generation function
        fetchNewTipFromAI();
      }
    });

    // Cleanup the listener when we switch days
    return () => unsubscribe();
    
  }, [dayDate, tripId, city, locationsString]);

  // Completely hide the widget if there's no tip and we aren't loading
  if (!loading && !tip) return null;

  return (
    <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 shadow-sm relative overflow-hidden group">
      
      <div className="absolute -top-4 -right-4 text-indigo-100 opacity-50 pointer-events-none">
        <Sparkles size={80} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
            <Sparkles size={14} /> Daily Insight
          </h4>
          
          {/*  3. REFRESH BUTTON */}
          <button 
            onClick={fetchNewTipFromAI}
            disabled={loading}
            className="text-indigo-400 hover:text-indigo-700 transition-colors p-1 rounded-md hover:bg-indigo-100/50"
            title="Generate a new tip"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-300" : ""} />
          </button>
        </div>
        
        {loading ? (
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-4 bg-indigo-200/50 rounded w-3/4"></div>
            <div className="h-4 bg-indigo-200/50 rounded w-full"></div>
            <div className="h-4 bg-indigo-200/50 rounded w-5/6"></div>
          </div>
        ) : (
          <p className="text-sm text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
            {tip?.replace(/\*\*/g, "")}
          </p>
        )}
      </div>
    </div>
  );
}