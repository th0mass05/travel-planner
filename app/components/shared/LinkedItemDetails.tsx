import { useState, useEffect } from "react";
import { ExternalLink, Star } from "lucide-react";
import { storage } from "../../../firebaseStore";
import { StoredPlace } from "../../types";

export default function LinkedItemDetails({ sourceId, tripId }: { sourceId: string; tripId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!sourceId) return setLoading(false);
      
      try {
        if (sourceId.startsWith("place:")) {
          // Places are stored with a category in the key, so we have to find it
          const allPlaces = await storage.list(`place:${tripId}:`);
          const targetId = sourceId.split(":")[1];
          const matchingKey = allPlaces?.keys?.find(k => k.endsWith(`:${targetId}`));
          if (matchingKey) {
            const snap = await storage.get(matchingKey);
            if (snap?.value) setData({ type: "place", ...JSON.parse(snap.value) });
          }
        } else if (sourceId.startsWith("hotel:")) {
           const snap = await storage.get(sourceId.replace("hotel:", `hotel:${tripId}:`));
           if (snap?.value) setData({ type: "hotel", ...JSON.parse(snap.value) });
        } else if (sourceId.startsWith("flight:")) {
           const snap = await storage.get(sourceId.replace("flight:", `flight:${tripId}:`));
           if (snap?.value) setData({ type: "flight", ...JSON.parse(snap.value) });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadData();
  }, [sourceId, tripId]);

  if (loading) return <div className="animate-pulse h-16 bg-stone-50 rounded-lg mt-3"></div>;
  if (!data) return null;

  // Render rich data if it's a Place
  if (data.type === "place") {
    const place = data as StoredPlace;
    const categoryLabels: Record<string, string> = {
      "eat": "Food & Drink",
      "landmark": "Landmark",
      "day-trip": "Day Trip",
      "shopping": "Shopping",
      "experience": "Experience",
      "nature": "Nature",
      "nightlife": "Nightlife",
      "visit": "Visit"
    };
    const displayCategory = categoryLabels[place.category] || place.category;
    return (
      <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
         {place.imageUrl && (
           <img src={place.imageUrl} alt={place.name} className="w-full h-48 object-cover rounded-xl shadow-sm" />
         )}
         {place.description && <p className="text-stone-600 text-sm leading-relaxed">{place.description}</p>}
         
         <div className="flex flex-wrap gap-2 mt-1">
           {place.rating && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold shadow-sm border border-amber-100/50">
                <Star size={12} className="fill-amber-400 text-amber-400" /> {place.rating}
              </span>
           )}
           {place.category && (
              <span className="bg-stone-100 text-stone-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm border border-stone-200/50">
                {displayCategory}
              </span>
           )}
           {place.link && (
             <a onClick={(e) => e.stopPropagation()} href={place.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-stone-50 hover:bg-stone-100 text-stone-600 px-2 py-1 rounded text-xs font-bold transition-colors shadow-sm border border-stone-200/50">
               <ExternalLink size={12} /> Website
             </a>
           )}
         </div>
      </div>
    );
  }

  // Render extra info if it's a Hotel or Flight
  if (data.type === "hotel" || data.type === "flight") {
     return (
       <div className="mt-4 pt-4 border-t border-stone-100">
         <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600 italic">
            {data.type === "hotel" ? `Conf: ${data.confirmationNumber || "N/A"}` : `Flight Duration: ${data.duration || "N/A"}`}
         </div>
       </div>
     );
  }

  return null;
}