import { Check, ShoppingBag } from "lucide-react";
import { StoredPlace, ShoppingData } from "../../types";

export default function PlaceShoppingListDialog({
  place,
  items,
  onClose,
}: {
  place: StoredPlace;
  items: ShoppingData[];
  onClose: () => void;
}) {
  const storeItems = items.filter(i => i.linkedPlaces?.some(p => p.id === place.id));

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 border-b border-stone-100 pb-4">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h3 className="text-xl font-serif text-stone-900 leading-tight">{place.name}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Shopping List</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-6 pr-2">
          {storeItems.length === 0 ? (
            <p className="text-stone-500 text-sm text-center py-4 italic">No items linked to this store yet.</p>
          ) : (
            storeItems.map(item => (
              <div key={item.id} className={`p-3 rounded-lg border ${item.bought ? "bg-stone-50 border-stone-100" : "bg-white border-stone-200 shadow-sm"}`}>
                <div className="flex items-start justify-between">
                  <span className={`font-medium ${item.bought ? "line-through text-stone-400" : "text-stone-900"}`}>
                    {item.item}
                  </span>
                  {item.bought && <Check size={16} className="text-emerald-500" />}
                </div>
                {item.notes && <p className="text-xs text-stone-500 mt-1">{item.notes}</p>}
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="w-full px-4 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800">
          Close
        </button>
      </div>
    </div>
  );
}