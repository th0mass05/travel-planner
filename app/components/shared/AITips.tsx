import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { db } from "../../../firebase"; // Adjust path
import { doc, getDoc, updateDoc } from "firebase/firestore";
export default function ProTipWidget({ dayLocations, city, tripId, dayDate }: any) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAndFetchTip = async () => {
      setLoading(true);

      // 1. Define the reference to this specific day's itinerary
      const dayDocRef = doc(db, "itinerary", `${tripId}_${dayDate}`);
      
      try {
        // 2. Check Firebase first
        const daySnap = await getDoc(dayDocRef);
        const dayData = daySnap.data();

        if (dayData?.aiTip) {
          setTip(dayData.aiTip);
          setLoading(false);
          return;
        }

        // 3. If no tip in DB, call the API
        const res = await fetch("/api/generate-tip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: dayLocations, city }),
        });
        const data = await res.json();
        
        if (data.tip) {
          setTip(data.tip);
          // 4. Save to Firebase so it's free/instant next time!
          await updateDoc(dayDocRef, { aiTip: data.tip });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (dayLocations.length > 0) {
      checkAndFetchTip();
    }
  }, [dayLocations, tripId, dayDate]);

  // Don't render anything if there's no tip and we aren't loading
  if (!loading && !tip) return null;

  return (
    <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -top-4 -right-4 text-indigo-100 opacity-50">
        <Sparkles size={80} />
      </div>

      <div className="relative z-10">
        <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1.5">
          <Sparkles size={14} /> Daily Insight
        </h4>
        
        {loading ? (
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-4 bg-indigo-200/50 rounded w-3/4"></div>
            <div className="h-4 bg-indigo-200/50 rounded w-full"></div>
            <div className="h-4 bg-indigo-200/50 rounded w-5/6"></div>
          </div>
        ) : (
          <p className="text-sm text-stone-700 leading-relaxed font-medium">
            {tip}
          </p>
        )}
      </div>
    </div>
  );
}