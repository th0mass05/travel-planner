// components/dialogs/TransportDialog.tsx
import { useState } from "react";

import { TransportData, TransportDialogProps } from "../../types";
export default function TransportDialog({
  initialData,
  onClose,
  onAdd,
  defaultDate // ⭐ Catch it here
}: TransportDialogProps) {
  const [type, setType] = useState(initialData?.type || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [departure, setDeparture] = useState(initialData?.departure || "");
  const [arrival, setArrival] = useState(initialData?.arrival || "");
  const [date, setDate] = useState(initialData?.date || defaultDate || "");
  const [time, setTime] = useState(initialData?.time || "");
  // ⭐ NEW FIELDS
  const [arrivalDate, setArrivalDate] = useState(initialData?.arrivalDate || initialData?.date || defaultDate || "");
  const [arrivalTime, setArrivalTime] = useState(initialData?.arrivalTime || "");
  
  const [price, setPrice] = useState(initialData?.price || "");
  const [link, setLink] = useState(initialData?.link || "");
  const [details, setDetails] = useState(initialData?.details || "");
  const [status, setStatus] = useState<"potential" | "confirmed">(initialData?.status || "potential");

  const handleSave = () => {
    if (!type || !departure || !arrival || !date || !time || !arrivalTime) {
      alert("Please fill in the transport type, route, and both departure/arrival times.");
      return;
    }

    onAdd({
      type,
      code,
      departure,
      arrival,
      date,
      time,
      arrivalDate, // ⭐ Added
      arrivalTime, // ⭐ Added
      price,
      link,
      details,
      status
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-8 space-y-6">
        <h3 className="text-2xl font-serif text-stone-900">
          {initialData ? "Edit Transport" : "Add Transport"}
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Type (e.g. Train)"
              value={type}
              onChange={e => setType(e.target.value)}
              className="border-2 rounded-xl px-4 py-2.5 outline-none focus:border-stone-900 transition-colors"
            />
            <input
              placeholder="Code (optional)"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="border-2 rounded-xl px-4 py-2.5 outline-none focus:border-stone-900 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-stone-400 ml-1">Departure Station</label>
              <input value={departure} onChange={e => setDeparture(e.target.value)} className="w-full border-2 rounded-xl px-4 py-2.5" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-stone-400 ml-1">Arrival Station</label>
              <input value={arrival} onChange={e => setArrival(e.target.value)} className="w-full border-2 rounded-xl px-4 py-2.5" />
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl space-y-4 border border-stone-100">
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-stone-500">Departure Date/Time</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-stone-500">Arrival Date/Time</label>
                  <input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
             </div>
          </div>

          <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} className="w-full border-2 rounded-xl px-4 py-2.5" />
          <textarea placeholder="Details / notes" value={details} onChange={e => setDetails(e.target.value)} className="w-full border-2 rounded-xl px-4 py-2.5 h-24" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-6 py-2.5 font-bold text-stone-500 hover:text-stone-900 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-8 py-2.5 bg-stone-900 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all">Save Transport</button>
        </div>
      </div>
    </div>
  );
}