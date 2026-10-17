import { useState } from "react";
import { Camera } from "lucide-react";
import { PhotoData, PhotoDialogProps } from "../../types"; 

export default function PhotoDialog({ onClose, onAdd }: PhotoDialogProps) {
  const [formData, setFormData] = useState<PhotoData>({
    url: "", caption: "", date: "", location: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Store the raw file to upload later
    setSelectedFile(file);
    
    // Instant UI preview (no compression wait time)
    setFormData(prev => ({ ...prev, url: URL.createObjectURL(file) }));
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onAdd(formData, selectedFile);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="photo-dialog-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 sm:p-8 text-stone-900 animate-in zoom-in-95 duration-200">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-rose-500 mb-2"><Camera size={18} /><span className="text-xs font-bold uppercase tracking-widest">Photo Gallery</span></div>
          <h3 id="photo-dialog-title" className="text-2xl font-serif">Add Photo</h3>
          <p className="text-stone-500 text-sm mt-1">Save a favourite moment from your journey.</p>
        </div>
        
        <div className="space-y-5">
          {/* Custom File Input Styling */}
          <div>
            <label htmlFor="photo-file" className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Image</label>
            <div className="relative group cursor-pointer">
                <input
                  type="file"
                  id="photo-file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-stone-900 peer-focus-visible:ring-offset-2 ${
                    formData.url ? "border-stone-300 bg-stone-50" : "border-stone-200 bg-stone-50 group-hover:border-stone-400"
                }`}>
                    {formData.url ? (
                        <img src={formData.url} alt="Preview" className="h-40 max-w-full object-contain rounded-lg shadow-sm" />
                    ) : (
                        <div className="py-6 text-stone-400 group-hover:text-stone-600">
                            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3"><Camera size={24} /></div>
                            <span className="text-sm font-medium">Click to upload photo</span>
                        </div>
                    )}
                </div>
            </div>
          </div>

          <div>
            <label htmlFor="photo-caption" className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Caption</label>
            <input
              id="photo-caption"
              type="text"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
              placeholder="What's happening?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label htmlFor="photo-date" className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Date</label>
              <input
                id="photo-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full min-w-0 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="photo-location" className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Location</label>
              <input
                id="photo-location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                placeholder="Where?"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-5 mt-6 border-t border-stone-100">
            <button
              onClick={handleSave}
              disabled={isUploading || !selectedFile}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Save Memory"}
            </button>
            <button
              onClick={onClose}
              disabled={isUploading}
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
