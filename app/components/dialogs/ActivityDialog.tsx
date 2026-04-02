import { useState } from "react";
import { 
  PlaceType, ActivityData, ActivityDialogProps 
} from "../../types"; 
import Autocomplete from "react-google-autocomplete";

export default function ActivityDialog({ onClose, onAdd, initialData }: ActivityDialogProps) {
  const [formData, setFormData] = useState<ActivityData>(
    initialData || { // ⭐ Use initialData
      time: "",
      activity: "",
      location: "",
      notes: "",
      iconType: "activity",
      createdAt: new Date().toISOString(),
    }
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif mb-4">
          {initialData ? "Edit Activity" : "Add Activity"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Activity</label>
            <input
              type="text"
              value={formData.activity}
              onChange={(e) =>
                setFormData({ ...formData, activity: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="What are you doing?"
            />
          </div>
          
          {/* ⭐ UPDATED: Google Maps Autocomplete for Location */}
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Autocomplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              defaultValue={formData.location}
              onPlaceSelected={(place) => {
                if (place) {
                  setFormData({ 
                    ...formData, 
                    // Use formatted_address, fallback to name, or empty string
                    location: place.formatted_address || place.name || "",
                  });
                }
              }}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="Start typing an address or place..."
              options={{
                types: [], 
                fields: ["name", "formatted_address", "url", "geometry"] 
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Icon</label>
            <select
              value={formData.iconType}
              onChange={(e)=>
                setFormData({...formData, iconType:e.target.value})
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer bg-white"
            >
              <option value="activity">General Activity</option>
              <option value="visit">Place to Visit</option>
              <option value="eat">Food & Drink</option>
              <option value="flight">Flight</option>
              <option value="hotel">Hotel</option>
              <option value="transport">Transport</option>
              <option value="landmark">Landmark</option>
              <option value="day-trip">Day Trip</option>
              <option value="shopping">Shopping</option>
              <option value="experience">Experience</option>
              <option value="nature">Nature</option>
              <option value="entertainment">Entertainment</option>
              <option value="culture">Culture</option>
              <option value="nightlife">Nightlife</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              {initialData ? "Save Changes" : "Add Activity"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}