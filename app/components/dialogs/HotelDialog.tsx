import { useState } from "react";
import { HotelData, HotelDialogProps } from "../../types"; 
import Autocomplete from "react-google-autocomplete";

export default function HotelDialog({ onClose, onAdd, initialData }: HotelDialogProps) {
  const [formData, setFormData] = useState<HotelData>(
    initialData || {
      name: "", address: "", checkIn: "", checkOut: "",
      confirmationNumber: "", link: "", status: "potential",
      price: "", details: "", createdAt: new Date().toISOString(),
    }
  );

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">
          {initialData ? "Edit Accommodation" : "Add Accommodation"}
        </h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Hotel Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="e.g. Grand Hyatt Tokyo"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Address</label>
            <Autocomplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              defaultValue={formData.address}
              onPlaceSelected={(place) => {
                if (place) {
                  setFormData({ 
                    ...formData, 
                    address: place.formatted_address || place.name || "",
                    name: formData.name || place.name || "", 
                    googleMapsUrl: place.url || ""
                  });
                }
              }}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="Start typing hotel address..."
              // 👇 Add this block back!
              options={{
                types: [], 
                // 👇 Tell Google exactly which pieces of data to return
                fields: ["name", "formatted_address", "url", "geometry"] 
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Check-in</label>
              <input
                type="date"
                value={formData.checkIn}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData({ 
                    ...formData, 
                    checkIn: newDate,
                    // 👇 Auto-fill check-out in the state if it's empty
                    checkOut: formData.checkOut || newDate 
                  });
                }}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Check-out</label>
              <input
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Conf. Number</label>
               <input
                 type="text"
                 value={formData.confirmationNumber}
                 onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                 placeholder="#12345"
               />
            </div>
            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Total Cost</label>
               <input
                 type="text"
                 value={formData.price}
                 onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                 placeholder="e.g. £450"
               />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Details</label>
            <textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              rows={2}
              placeholder="Room type, breakfast included..."
            />
          </div>

          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Booking Link</label>
             <input
               type="url"
               value={formData.link}
               onChange={(e) => setFormData({ ...formData, link: e.target.value })}
               className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
               placeholder="https://..."
             />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
            >
              <option value="potential">Potential Option</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd({ ...formData, checkOut: formData.checkOut || formData.checkIn })}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              {initialData ? "Save Changes" : "Add Hotel"}
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