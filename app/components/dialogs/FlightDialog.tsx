import { useState } from "react";
import { Plane } from "lucide-react";
import {FlightData, FlightDialogProps } from "../../types"; 


export default function FlightDialog({ onClose, onAdd, initialData }: FlightDialogProps) {
  const [formData, setFormData] = useState<FlightData>(
    initialData ?? {
      airline: "", flightNumber: "", 
      departure: "", arrival: "",
      date: "", time: "",
      arrivalDate: "", arrivalTime: "", duration: "", // NEW Defaults
      link: "", status: "potential", price: "", details: "",
      createdAt: new Date().toISOString(),
    }
  );

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">
            {initialData ? "Edit Flight" : "Add Flight"}
        </h3>
        
        <div className="space-y-6">
          {/* Airline & Flight No */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Airline</label>
              <input
                type="text"
                value={formData.airline}
                onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
                placeholder="e.g. BA"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Flight No.</label>
              <input
                type="text"
                value={formData.flightNumber}
                onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
                placeholder="e.g. 123"
              />
            </div>
          </div>

          {/* DEPARTURE SECTION */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
            <h4 className="text-xs font-bold uppercase text-stone-400 tracking-widest flex items-center gap-2">
              <Plane size={12} className="rotate-[-45deg]" /> Departure
            </h4>
            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-1">
                 <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Airport</label>
                 <input
                    value={formData.departure}
                    onChange={(e) => setFormData({ ...formData, departure: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm font-bold uppercase"
                    placeholder="LHR"
                 />
               </div>
               <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setFormData({ 
                          ...formData, 
                          date: newDate,
                          // 👇 Auto-fill arrival date in the state if it's empty
                          arrivalDate: formData.arrivalDate || newDate 
                        });
                      }}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* ARRIVAL SECTION */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
            <h4 className="text-xs font-bold uppercase text-stone-400 tracking-widest flex items-center gap-2">
              <Plane size={12} className="rotate-[45deg]" /> Arrival
            </h4>
            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-1">
                 <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Airport</label>
                 <input
                    value={formData.arrival}
                    onChange={(e) => setFormData({ ...formData, arrival: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm font-bold uppercase"
                    placeholder="JFK"
                 />
               </div>
               <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.arrivalDate || formData.date} // Default to dep date logic if empty visually
                      onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.arrivalTime || ""}
                      onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* Duration & Price */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Duration</label>
                <input
                    type="text"
                    value={formData.duration || ""}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                    placeholder="e.g. 8h 30m"
                />
             </div>
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Price</label>
                <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                    placeholder="Total Cost"
                />
             </div>
          </div>

          {/* Status & Details */}
          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
                >
                  <option value="potential">Potential</option>
                  <option value="confirmed">Confirmed</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Details</label>
                <textarea
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                    placeholder="Seat numbers, terminal info..."
                    rows={2}
                />
             </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd({ ...formData, arrivalDate: formData.arrivalDate || formData.date })}
              
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              {initialData ? "Save Changes" : "Add Flight"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}