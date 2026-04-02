import { useState } from "react";
import { Camera } from "lucide-react";
import { PhotoData, PhotoDialogProps } from "../../types"; 
import { compressImage } from "../../helpers/helpers";

export default function PhotoDialog({ onClose, onAdd }: PhotoDialogProps) {
  const [formData, setFormData] = useState<PhotoData>({
    url: "", caption: "", date: "", location: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    /* ... keep existing compression logic ... */
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setFormData(prev => ({ ...prev, url: compressedBase64 }));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Add Photo</h3>
        
        <div className="space-y-5">
          {/* Custom File Input Styling */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Image</label>
            <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                    formData.url ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-400"
                }`}>
                    {formData.url ? (
                        <img src={formData.url} alt="Preview" className="h-40 object-cover rounded-lg shadow-sm" />
                    ) : (
                        <div className="py-6 text-stone-400 group-hover:text-stone-600">
                            <Camera size={32} className="mx-auto mb-2" />
                            <span className="text-sm font-medium">Click to upload photo</span>
                        </div>
                    )}
                </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Caption</label>
            <input
              type="text"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="What's happening?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                placeholder="Where?"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-2">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Save Memory
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