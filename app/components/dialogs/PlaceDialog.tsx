import { useState } from "react";
import { 
  PlaceType,PlaceFormData, PlaceDialogProps 
} from "../../types"; 
import { getAvailableLocations, compressImage } from "../../helpers/helpers";
import Autocomplete from "react-google-autocomplete";
export default function PlaceDialog({ 
  onClose, 
  onAdd, 
  initialData, 
  initialCategory = "visit", 
  initialLocationPath = [],
  allPlaces = [],
}: PlaceDialogProps) {
  const [formData, setFormData] = useState<PlaceFormData>(
    initialData || { 
      name: "",
      description: "",
      address: "",
      rating: "",
      imageUrl: "",
      link: "",
      visited: false,
      category: initialCategory,
      locationPath: initialLocationPath,
    }
  );

  // ⭐ NEW: Local state just to hold the text the user is currently typing before hitting Enter
  const [locInput, setLocInput] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData({ ...formData, imageUrl: compressedBase64 });
      } catch (err) {
        console.error("Image compression failed", err);
        alert("Failed to load image. Please try another.");
      }
    }
  };
  const currentDepth = (formData.locationPath || []).length;
  const suggestions = getAvailableLocations(allPlaces, currentDepth, formData.locationPath || [])
    // Automatically filter the suggestions as the user types
    .filter(loc => loc.toLowerCase().includes(locInput.toLowerCase()));
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif mb-4">
          {initialData ? "Edit Place" : `Add ${formData.category === "eat" ? "Restaurant" : "Place"}`}
        </h3>
        <div className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as PlaceType })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none bg-white cursor-pointer"
            >
              <option value="eat">Food & Drink</option>
              <option value="landmark">Landmark</option>
              <option value="day-trip">Area / Day Trip</option>
              <option value="shopping">Shopping</option>
              <option value="experience">Experience</option>
              <option value="nature">Nature</option>
              <option value="entertainment">Entertainment</option>
              <option value="culture">Culture</option>
              <option value="nightlife">Nightlife</option>
              <option value="visit">Other Visit</option>
            </select>
          </div>

          {/* ⭐ UPDATED: Interactive Breadcrumb / Tag Input */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Location Path (Optional)
            </label>
            
            {/* Faux Input Container */}
            <div className="flex flex-wrap items-center gap-2 w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus-within:border-gray-900 bg-white transition-colors">
              
              {(formData.locationPath || []).map((loc, index) => (
                <div key={index} className="flex items-center gap-1 bg-stone-100 text-stone-800 px-2 py-1 rounded-md text-sm border border-stone-200 shadow-sm">
                  <span className="font-medium">{loc}</span>
                  <button
                    type="button" // Prevent form submission
                    onClick={() => {
                      const newPath = (formData.locationPath || []).slice(0, index);
                      setFormData({ ...formData, locationPath: newPath });
                    }}
                    className="text-stone-400 hover:text-rose-500 ml-1 text-lg leading-none outline-none"
                    title="Remove this and sub-locations"
                  >
                    &times;
                  </button>
                </div>
              ))}

              <input
                type="text"
                value={locInput}
                onChange={(e) => setLocInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = locInput.trim();
                    if (val) {
                      setFormData({
                        ...formData,
                        locationPath: [...(formData.locationPath || []), val]
                      });
                      setLocInput(""); 
                    }
                  }
                }}
                className="flex-1 min-w-[140px] outline-none bg-transparent py-1 text-sm"
                placeholder={
                  (formData.locationPath || []).length === 0 
                    ? "e.g., Tokyo (Press Enter)" 
                    : "Add sub-location..."
                }
              />
            </div>

            {/* ⭐ NEW UI: Clickable Suggestion Chips */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                  Suggestions:
                </span>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        locationPath: [...(formData.locationPath || []), suggestion]
                      });
                      setLocInput(""); // Clear the input
                    }}
                    className="px-2.5 py-1 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-medium rounded border border-stone-200 transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Type a location and press <strong>Enter</strong> or click a suggestion above.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder={formData.category === "eat" ? "e.g., Sushi Saito" : "e.g., Tokyo Tower"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              rows={2}
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Autocomplete
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              defaultValue={formData.address}
              onPlaceSelected={(place) => {
                if (place) {
                  setFormData({ 
                    ...formData, 
                    address: place.formatted_address || place.name || "",
                    name: formData.name || place.name || "", 
                    googleMapsUrl: place.url || "",
                    lat: place.geometry?.location?.lat(),
                    lng: place.geometry?.location?.lng()
                  });
                }
              }}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="Start typing a place or address..."
              options={{ types: [], fields: ["name", "formatted_address", "url", "geometry"] }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website Link (optional)</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="https://..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {formData.imageUrl && (
              <div className="mt-2">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              {initialData ? "Save Changes" : `Add ${formData.category === "eat" ? "Restaurant" : "Place"}`}
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