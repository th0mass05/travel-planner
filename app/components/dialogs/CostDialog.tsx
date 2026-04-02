import { useState, useEffect } from "react";
import CreatorBadge from "../../hooks/CreatorBadge";
import { Star } from "lucide-react";
import { storage } from "../../../firebaseStore";
export default function CostDialog({
  item,
  tripId,
  onClose,
  onSave,
  showRating = false // 👈 NEW: Controls if rating shows
}:{
  item:{ item:string, currentRating?: string }, // 👈 NEW: Accepts existing rating
  tripId:number,
  showRating?: boolean,
  onClose:()=>void,
  onSave:(cost:string, paidBy:{uid:string,amount:number}[], rating?: string)=>void // 👈 NEW: Passes rating back
}){
  const [noCost,setNoCost] = useState(false);
  const [cost,setCost]=useState("");
  const [rating, setRating] = useState(item.currentRating || ""); // 👈 NEW: Rating state
  const [members,setMembers]=useState<string[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [mode,setMode]=useState<"equal"|"custom">("equal");
  const [custom,setCustom]=useState<Record<string,string>>({});
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState("");

  useEffect(()=>{
    const load=async()=>{
      const t=await storage.get(`trip:${tripId}`);
      if(t?.value){
        const trip=JSON.parse(t.value);
        setMembers(trip.members||[]);
      }
    };
    load();
  },[tripId]);

  const toggle=(uid:string)=>{
    setSelected(s=>s.includes(uid)?s.filter(u=>u!==uid):[...s,uid]);
  };

  const save = async () => {
    setError(""); // 👈 Clear any previous errors first
    if(!noCost && !cost) return;

    const numericCost = noCost ? 0 : Number(cost || 0);

    if (numericCost < 0) {
      setError("Cost cannot be negative."); // 👈 Nice inline error
      return;
    }

    if (!noCost && selected.length === 0) {
      setError("Please select at least one person who paid."); // 👈 Nice inline error
      return;
    }

    let paidBy:{uid:string;amount:number}[] = [];

    if(!noCost){
      if(mode==="equal"){
        const each = numericCost / selected.length;
        paidBy = selected.map(uid=>({
          uid,
          amount:each
        }));
      }else{
        paidBy = selected.map(uid=>({
          uid,
          amount:Number(custom[uid] || 0)
        }));
      }
    }

    await onSave(
      String(numericCost),
      paidBy,
      rating
    );
  };


  return(
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-[460px] p-6 space-y-5">
      
      <h3 className="text-xl font-serif">Add cost</h3>
      {/* INTERACTIVE 5-STAR RATING */}
      {showRating && (
        <div className="mb-2">
           <p className="font-medium mb-2">Rating</p>
           <div className="flex gap-1">
             {[1, 2, 3, 4, 5].map((star) => {
               const currentVal = Number(rating) || 0;
               // Star is active if it's <= the hovered star, OR <= the saved rating
               const isActive = star <= (hoverRating || currentVal);
               
               return (
                 <button
                   key={star}
                   type="button" // Prevents accidentally submitting forms
                   onClick={() => setRating(String(star))}
                   onMouseEnter={() => setHoverRating(star)}
                   onMouseLeave={() => setHoverRating(0)}
                   className={`p-1 transition-all hover:scale-110 ${
                     isActive ? "text-amber-400" : "text-stone-200"
                   }`}
                 >
                   <Star 
                     size={28} 
                     className={isActive ? "fill-amber-400" : ""} 
                     strokeWidth={isActive ? 0 : 2} 
                   />
                 </button>
               );
             })}
           </div>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={noCost}
          onChange={(e)=>setNoCost(e.target.checked)}
        />
        No cost
      </label>


      <input
        type="number"
        min="0"
        placeholder="Total cost"
        value={noCost ? "0" : cost}
        disabled={noCost}
        onChange={e => { setCost(e.target.value); setError(""); }}
        className="w-full border-2 rounded-lg px-3 py-2 disabled:bg-gray-100"
      />

      
      {!noCost && (
            <div>

        <p className="font-medium mb-2">Who paid?</p>
        <div className="space-y-1">
          {members.map(uid=>(
            <label key={uid} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={selected.includes(uid)}
                onChange={() => { toggle(uid); setError(""); }}
              />
              <CreatorBadge uid={uid}/>
            </label>
          ))}
        </div>

        <button
          className="text-sm text-blue-600 mt-1"
          onClick={()=>setSelected(members)}
        >
          Select all
        </button>
      </div>)}

      {!noCost && (
          <div>

        <p className="font-medium mb-1">Split</p>

        <label className="mr-3">
          <input type="radio" checked={mode==="equal"} onChange={()=>setMode("equal")} />
          Equal
        </label>

        <label>
          <input type="radio" checked={mode==="custom"} onChange={()=>setMode("custom")} />
          Custom
        </label>
      </div>)}

      {!noCost && mode==="custom" && (
        <div className="space-y-2">
          {selected.map(uid=>(
            <div key={uid} className="flex justify-between items-center">
              <CreatorBadge uid={uid}/>
              <input
                type="number"
                value={custom[uid]||""}
                onChange={e=>setCustom({...custom,[uid]:e.target.value})}
                className="border rounded px-2 py-1 w-24"
              />
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="text-rose-600 text-sm font-medium bg-rose-50 p-3 rounded-lg border border-rose-100 animate-in fade-in slide-in-from-bottom-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
        <button onClick={save} className="bg-gray-900 text-white px-4 py-2 rounded">Save</button>
      </div>

    </div>
  </div>
  );
}