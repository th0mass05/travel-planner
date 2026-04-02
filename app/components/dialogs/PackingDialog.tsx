import { useState } from "react";
import { PackingData, PackingDialogProps } from "../../types";

export default function PackingDialog({ onClose, onAdd }: PackingDialogProps) {
  const [formData, setFormData] = useState<PackingData>({
    category: "Clothing", item: "", createdAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Add Packing Item</h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
            >
              <option value="Clothing">Clothing</option>
              <option value="Toiletries">Toiletries</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
              <option value="Accessories">Accessories</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Item Name</label>
            <input
              type="text"
              autoFocus
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="e.g. Passport, Camera Charger"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Add to List
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