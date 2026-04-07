import { useState } from "react";
import { MapPin } from "lucide-react";
import { ShoppingData, ShoppingDialogProps } from "../../types";
import { compressImage } from "@/app/helpers/helpers";
export default function ShoppingDialog({ onClose, onAdd, shoppingPlaces, existingCategories }: ShoppingDialogProps) {
  const [formData, setFormData] = useState<ShoppingData>({
    item: "", category: "", link: "", notes: "", imageUrl: "", 
    linkedPlaces: [], 
    createdAt: new Date().toISOString(),
  });
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
  const handleSubmit = () => {
    if (!formData.item) return;
    onAdd({ ...formData, category: formData.category || "General" });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Add Shopping Item</h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Item Name</label>
            <input
              type="text"
              autoFocus
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
              placeholder="e.g., Vintage Camera"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="e.g., Souvenirs"
            />

            {existingCategories && existingCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {existingCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button" // Prevents form submission
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                      formData.category === cat
                        ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Link (Optional)</label>
             <input
               type="url"
               value={formData.link}
               onChange={(e) => setFormData({ ...formData, link: e.target.value })}
               className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
               placeholder="https://..."
             />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:border-stone-900 outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 text-sm transition-all"
            />
            {formData.imageUrl && (
              <div className="mt-3">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-stone-200 shadow-sm"
                />
              </div>
            )}
          </div>
          {/* SCALABLE MULTI-SELECT: Selected Chips + Add Dropdown */}
          {shoppingPlaces.length > 0 && (
            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Link to Stores (Optional)</label>

               {/* 1. Show Selected Stores as Removable Chips */}
               {formData.linkedPlaces && formData.linkedPlaces.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3">
                   {formData.linkedPlaces.map(place => (
                     <div key={place.id} className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm animate-in fade-in zoom-in-95">
                       <MapPin size={12} className="text-rose-500" />
                       {place.name}
                       <button
                         type="button"
                         onClick={() => setFormData({
                           ...formData,
                           linkedPlaces: formData.linkedPlaces!.filter(p => p.id !== place.id)
                         })}
                         className="ml-1 text-rose-400 hover:text-rose-700 hover:scale-110 transition-all outline-none"
                         title="Remove store"
                       >
                         &times;
                       </button>
                     </div>
                   ))}
                 </div>
               )}

               {/* 2. Dropdown to Add More Stores (Filters out already selected ones) */}
               {shoppingPlaces.filter(p => !formData.linkedPlaces?.some(lp => lp.id === p.id)).length > 0 ? (
                 <select
                   value="" // Always resets to empty after selection
                   onChange={(e) => {
                     const pId = Number(e.target.value);
                     const place = shoppingPlaces.find(p => p.id === pId);
                     if (place) {
                       const current = formData.linkedPlaces || [];
                       setFormData({ ...formData, linkedPlaces: [...current, { id: place.id, name: place.name }] });
                     }
                   }}
                   className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all bg-white cursor-pointer text-sm"
                 >
                   <option value="" disabled>+ Add a store...</option>
                   {shoppingPlaces
                     .filter(p => !formData.linkedPlaces?.some(lp => lp.id === p.id)) // Only show unselected stores
                     .map(place => (
                       <option key={place.id} value={place.id}>{place.name}</option>
                     ))
                   }
                 </select>
               ) : (
                  // Friendly message if they've literally selected every store on the list
                  <div className="text-xs text-stone-400 italic bg-stone-50 p-3 rounded-lg border border-stone-100 text-center">
                    All available shopping places have been linked.
                  </div>
               )}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              rows={2}
              placeholder="Color, size, max price..."
            />
          </div>

          <div className="flex gap-3 pt-4 mt-2">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Add Item
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