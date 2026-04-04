import { useState } from "react";
import { Camera } from "lucide-react";
import { compressImage } from "../../helpers/helpers";
import { TripFormData, TripDialogProps } from "../../types";

export default function TripDialog({ initialData, onClose, onSubmit }: TripDialogProps) {
  const [formData, setFormData] = useState<TripFormData>(
    initialData
      ? {
          destination: initialData.destination,
          country: initialData.country,
          startDate: initialData.startDate,
          endDate: initialData.endDate,
          year: initialData.year, // Keep as number
          tagline: initialData.tagline,
          imageUrl: initialData.imageUrl || "",
          bgGradient: initialData.bgGradient || "from-stone-200 to-stone-300",
          status: initialData.status || "upcoming",
        }
      : {
          destination: "",
          country: "",
          startDate: "",
          endDate: "",
          year: new Date().getFullYear(), 
          tagline: "",
          imageUrl: "",
          bgGradient: "from-rose-100 to-teal-100",
          status: "upcoming",
        }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file); // Uses your existing helper
        setFormData({ ...formData, imageUrl: compressed });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async () => {
    setError(""); 

    if (!formData.destination || !formData.startDate || !formData.endDate) {
      setError("Please fill in the destination, start date, and end date."); 
      return;
    }
    
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">
          {initialData ? "Edit Journey" : "Start New Journey"}
        </h3>

        <div className="space-y-5">
          {/* Destination & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Destination</label>
              <input
                autoFocus
                type="text"
                value={formData.destination}
                onChange={(e) => { setFormData({ ...formData, destination: e.target.value }); setError(""); }}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                placeholder="e.g. Kyoto"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                placeholder="e.g. Japan"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tagline / Caption</label>
            <textarea
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="e.g. Cherry blossoms and ancient temples..."
              rows={2}
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Cover Image</label>
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden transition-all ${
                  formData.imageUrl ? "border-stone-900" : "border-stone-300 hover:border-stone-400"
              }`}>
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-stone-400 flex flex-col items-center">
                    <Camera size={24} className="mb-2" />
                    <span className="text-xs font-bold">Upload Cover Photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-lg animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}
          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? "Saving..." : initialData ? "Update Journey" : "Create Journey"}
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