import { useState } from "react";

export default function SimpleCostDialog({
  itemName,
  onClose,
  onSave
}: {
  itemName: string;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    setError(""); // Clear previous errors
    const val = parseFloat(cost);
    
    if (val < 0) {
      setError("Cost cannot be negative."); 
      return;
    }

    if (!isNaN(val)) {
      onSave(val);
    } else {
      onSave(0);
    }
  };
  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
        
        <div className="mb-6">
          <h3 className="text-xl font-serif text-stone-900">Item Acquired</h3>
          <p className="text-stone-500 text-sm mt-1">
            How much did you spend on <span className="font-bold text-stone-800">{itemName}</span>?
          </p>
        </div>

        <div className="relative mb-6">
          <span className="absolute left-4 top-3 text-stone-400 font-serif text-lg">£</span>
          <input
            type="number"
            min="0"
            autoFocus
            placeholder="0.00"
            value={cost}
            onChange={(e) => { setCost(e.target.value); setError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
            className="w-full border border-stone-300 rounded-xl pl-8 pr-4 py-3 text-2xl font-serif focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all placeholder:text-stone-200 text-stone-900"
          />
        </div>
        {error && (
          <div className="text-rose-600 text-sm font-medium mb-4 text-center animate-in fade-in">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}