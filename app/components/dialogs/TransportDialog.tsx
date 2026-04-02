import { useState } from "react";
import { TransportData} from "../../types";

export default function TransportDialog({
  initialData,
  onClose,
  onAdd
}:{
  initialData?:TransportData;
  onClose:()=>void;
  onAdd:(data:TransportData)=>void;
}){

  const [type,setType]=useState(initialData?.type || "");
  const [code,setCode]=useState(initialData?.code || "");
  const [departure,setDeparture]=useState(initialData?.departure || "");
  const [arrival,setArrival]=useState(initialData?.arrival || "");
  const [date,setDate]=useState(initialData?.date || "");
  const [time,setTime]=useState(initialData?.time || "");
  const [price,setPrice]=useState(initialData?.price || "");
  const [link,setLink]=useState(initialData?.link || "");
  const [details,setDetails]=useState(initialData?.details || "");
  const [status,setStatus]=useState<"potential"|"confirmed">(initialData?.status || "potential");


  const handleSave=()=>{

    if(!type || !departure || !arrival){
      alert("Please fill transport type, departure and arrival");
      return;
    }

    onAdd({
      type,
      code,
      departure,
      arrival,
      date,
      time,
      price,
      link,
      details,
      status
    });
  };

  return(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto p-6 space-y-4">

        <h3 className="text-2xl font-serif">
          {initialData ? "Edit Transport" : "Add Transport"}
        </h3>

        {/* TYPE */}
        <input
          placeholder="Transport type (Train, Coach, Ferry...)"
          value={type}
          onChange={e=>setType(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* CODE */}
        <input
          placeholder="Number / Code (optional)"
          value={code}
          onChange={e=>setCode(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* ROUTE */}
        <div className="grid grid-cols-2 gap-3">

          <input
            placeholder="Departure"
            value={departure}
            onChange={e=>setDeparture(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

          <input
            placeholder="Arrival"
            value={arrival}
            onChange={e=>setArrival(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

        </div>

        {/* DATE + TIME */}
        <div className="grid grid-cols-2 gap-3">

          <input
            type="date"
            value={date}
            onChange={e=>setDate(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

          <input
            type="time"
            value={time}
            onChange={e=>setTime(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

        </div>

        {/* PRICE */}
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={e=>setPrice(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* BOOKING LINK */}
        <input
          placeholder="Booking link (optional)"
          value={link}
          onChange={e=>setLink(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* DETAILS */}
        <textarea
          placeholder="Details / notes"
          value={details}
          onChange={e=>setDetails(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* STATUS */}
        <select
          value={status}
          onChange={e=>setStatus(e.target.value as "potential"|"confirmed")}
          className="w-full border-2 rounded-lg px-3 py-2"
        >
          <option value="potential">Potential option</option>
          <option value="confirmed">Confirmed</option>
        </select>


        {/* BUTTONS */}
        <div className="flex justify-end gap-2 pt-3">

          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  );
}