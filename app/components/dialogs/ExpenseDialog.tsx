import { useState, useEffect } from "react";
import { auth, db} from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { storage } from "../../../firebaseStore";

export default function ExpenseDialog({
  mode,
  tripId,
  onClose,
  onSave
}:{
  mode:"shared"|"mine";
  tripId:number;
  onClose:()=>void;
  onSave:()=>void;
}){

  const [label,setLabel]=useState("");
  const [amount,setAmount]=useState("");
  const [category,setCategory]=useState("other");

  const [members,setMembers]=useState<{uid:string,name:string}[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [splitMode,setSplitMode]=useState<"equal"|"custom">("equal");
  const [custom,setCustom]=useState<Record<string,string>>({});

  // LOAD MEMBERS ONLY FOR SHARED MODE
  useEffect(()=>{

    const loadMembers=async()=>{

      if(mode!=="shared") return;

      const tripDoc=await storage.get(`trip:${tripId}`);
      if(!tripDoc?.value) return;

      const trip=JSON.parse(tripDoc.value);
      const memberIds=trip.members || [];

      const result=[];

      for(const uid of memberIds){

        const userSnap = await getDoc(doc(db,"users",uid));

        if(userSnap.exists()){
          const data=userSnap.data();
          result.push({
            uid,
            name: data.name || data.displayName || data.email || "User"
          });
        }else{
          result.push({uid,name:"User"});
        }

      }

      setMembers(result);
      setSelected(memberIds);   // default: everyone selected
    };

    loadMembers();

  },[mode,tripId]);
    const handleSave=async()=>{

    if(!label || !amount) return;

    let paidBy:any[]|undefined=undefined;

    if(mode==="shared"){

      const total=Number(amount);

      if(splitMode==="equal"){

        const each=total/selected.length;

        paidBy=selected.map(uid=>({
          uid,
          amount:each
        }));

      }else{

        paidBy=selected.map(uid=>({
          uid,
          amount:Number(custom[uid]||0)
        }));
      }
    }

    const expense={
      id:Date.now(),
      label,
      amount,
      category,
      paidBy,
      createdByUid:auth.currentUser?.uid || null,
      createdAt:new Date().toISOString(),
      type:"manualExpense"
    };

    const key=
      mode==="shared"
        ? `expense:${tripId}:shared:${expense.id}`
        : `expense:${tripId}:user:${auth.currentUser?.uid}:${expense.id}`;

    await storage.set(key,expense);

    onSave();
  };
    return(
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

    <div className="bg-white rounded-xl shadow-xl w-[480px] p-6 space-y-4">

      <h3 className="text-xl font-serif">Add Expense</h3>

      <input
        placeholder="What was it?"
        value={label}
        onChange={e=>setLabel(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2"
      />

      <select
        value={category}
        onChange={e=>setCategory(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2"
      >
        <option value="accommodation">Accommodation</option>
        <option value="travel">Travel</option>
        <option value="food">Food</option>
        <option value="shopping">Shopping</option>
        <option value="miscellaneous">Miscellaneous</option>
        <option value="other">Other</option>
      </select>

      <input
        type="number"
        placeholder="Cost"
        value={amount}
        onChange={e=>setAmount(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2"
      />
      {mode==="shared" && members.length>0 && (

<div className="space-y-3 border-t pt-4">

  <div className="text-sm font-medium">Who paid?</div>

  <div className="flex flex-wrap gap-2">
    {members.map(m=>(
      <label key={m.uid} className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={selected.includes(m.uid)}
          onChange={()=>{
            setSelected(prev =>
              prev.includes(m.uid)
                ? prev.filter(u=>u!==m.uid)
                : [...prev,m.uid]
            );
          }}
        />
        {m.name}
      </label>
    ))}
  </div>

  <div className="flex gap-2 pt-2">

    <button
      onClick={()=>setSplitMode("equal")}
      className={`px-3 py-1 rounded ${
        splitMode==="equal" ? "bg-gray-900 text-white":"bg-gray-200"
      }`}
    >
      Split equally
    </button>

    <button
      onClick={()=>setSplitMode("custom")}
      className={`px-3 py-1 rounded ${
        splitMode==="custom" ? "bg-gray-900 text-white":"bg-gray-200"
      }`}
    >
      Custom split
    </button>

  </div>

  {splitMode==="custom" && selected.map(uid=>{
    const m=members.find(x=>x.uid===uid);
    return(
      <div key={uid} className="flex justify-between items-center">
        <span className="text-sm">{m?.name}</span>

        <input
          type="number"
          placeholder="0"
          value={custom[uid]||""}
          onChange={e=>
            setCustom(c=>({...c,[uid]:e.target.value}))
          }
          className="w-24 border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  })}

</div>

)}
  <div className="flex justify-end gap-2 pt-3">

<button onClick={onClose} className="px-4 py-2 border rounded-lg">
Cancel
</button>

<button onClick={handleSave} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
Save
</button>

</div>

</div>
</div>
);
}