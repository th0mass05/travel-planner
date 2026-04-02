import React, { useEffect, useState } from "react";
import { ShoppingData, StoredPlace } from "../../types";
import { auth } from "../../../firebase";   // adjust path if needed
import { ShoppingDialog, SimpleCostDialog } from "../../components/dialogs" ;
import { ExternalLink, Plus, Trash2, ShoppingBag, MapPin } from "lucide-react";
import { deleteKey } from "../../helpers/helpers"; // Adjust this path to match your folder structure
import { storage } from "../../../firebaseStore";


export default function ShoppingTab({ tripId }: { tripId: number }) {
  type ShoppingItem = ShoppingData & {
    id: number;
    bought: boolean;
    cost?: number; 
    createdByUid?: string | null;
    createdAt?: string;
  };

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [shoppingPlaces, setShoppingPlaces] = useState<StoredPlace[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [buyingItem, setBuyingItem] = useState<ShoppingItem | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubShopping = storage.subscribeToList(
      `shopping:${tripId}:user:${user.uid}:`, 
      (newItems) => setItems(newItems.sort((a: any, b: any) => b.id - a.id))
    );

    const unsubPlaces = storage.subscribeToList(
      `place:${tripId}:shopping:`, 
      (places) => setShoppingPlaces(places)
    );

    return () => { unsubShopping(); unsubPlaces(); };
  }, [tripId]);

  const addItem = async (itemData: ShoppingData) => {
    const user = auth.currentUser;
    if (!user) return;

    const newItem: ShoppingItem = {
      ...itemData,
      id: Date.now(),
      bought: false,
      createdByUid: user.uid,
      createdAt: new Date().toISOString(),
    };

    await storage.set(`shopping:${tripId}:user:${user.uid}:${newItem.id}`, newItem);
  };

  const deleteItem = async (id: number) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteKey(`shopping:${tripId}:user:${user.uid}:${id}`);
  };

  const handleToggleClick = async (item: ShoppingItem) => {
    const user = auth.currentUser;
    if (!user) return;

    if (item.bought) {
      const updated = { ...item, bought: false };
      delete updated.cost;
      await storage.set(`shopping:${tripId}:user:${user.uid}:${item.id}`, updated);
    } else {
      setBuyingItem(item);
    }
  };

  const saveCost = async (amount: number) => {
    if (!buyingItem) return;
    const user = auth.currentUser;
    if (!user) return;

    const updated: ShoppingItem = { ...buyingItem, bought: true, cost: amount };
    await storage.set(`shopping:${tripId}:user:${user.uid}:${buyingItem.id}`, updated);
    setBuyingItem(null);
  };

  const boughtCount = items.filter((i) => i.bought).length;

  // 👇 GROUPING LOGIC FOR MASONRY GRID 👇
  const groupedShopping = items.reduce((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const categories = Object.keys(groupedShopping).sort();

  // Masonry layout algorithm
  const distributeCategories = (numCols: number) => {
    const cols: string[][] = Array.from({ length: numCols }, () => []);
    const heights = Array.from({ length: numCols }, () => 0);

    categories.forEach(category => {
      const catItems = groupedShopping[category] || [];
      const estimatedHeight = 5 + catItems.length; // Base header weight + items
      
      let minIdx = 0;
      for (let i = 1; i < numCols; i++) {
        if (heights[i] < heights[minIdx]) {
          minIdx = i;
        }
      }
      cols[minIdx].push(category);
      heights[minIdx] += estimatedHeight;
    });

    return cols;
  };

  const cols1 = distributeCategories(1);
  const cols2 = distributeCategories(2);
  const cols3 = distributeCategories(3);

  // Helper to render individual category cards
  const renderShoppingCard = (category: string) => {
    const catItems = groupedShopping[category];
    const catBought = catItems.filter(i => i.bought).length;
    
    return (
      <div key={category} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
         <div className="flex justify-between items-baseline mb-4 border-b border-stone-100 pb-2">
           <h4 className="font-serif text-lg text-stone-900">{category}</h4>
           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-full">
              {catBought}/{catItems.length}
           </span>
         </div>
         
         <div className="space-y-3">
           {catItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 group">
                 {/* Checklist Toggle */}
                 <input
                   type="checkbox"
                   checked={item.bought}
                   onChange={() => handleToggleClick(item)}
                   className="mt-1 w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                 />
                 
                 {/* Item Details */}
                 <div className="flex-1 min-w-0 pt-0.5">
                   <p className={`text-sm font-medium transition-colors leading-snug ${
                      item.bought ? "line-through text-stone-300" : "text-stone-700"
                   }`}>
                     {item.item}
                   </p>
                   
                   {/* Meta: Store location & Notes */}
                   {( (item.linkedPlaces && item.linkedPlaces.length > 0) || item.notes) && (
                      <div className="mt-1.5 flex flex-col gap-1.5">
                         
                         {/* ⭐ Loop through all linked places and render a badge for each */}
                         {item.linkedPlaces && item.linkedPlaces.length > 0 && (
                           <div className="flex flex-wrap gap-1.5">
                             {item.linkedPlaces.map(place => (
                               <span key={place.id} className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                  <MapPin size={10} /> {place.name}
                               </span>
                             ))}
                           </div>
                         )}

                         {item.notes && <span className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{item.notes}</span>}
                      </div>
                   )}
                 </div>

                 {/* Actions (Cost, Link, Delete) */}
                 <div className="flex items-center gap-2 flex-shrink-0">
                    {item.bought && item.cost !== undefined && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            {item.cost === 0 ? "Free" : `£${item.cost}`}
                        </span>
                    )}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-stone-900 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button 
                      onClick={() => deleteItem(item.id)} 
                      className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
              </div>
           ))}
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <h2 className="text-3xl font-serif text-stone-900">My Wishlist</h2>
          <p className="text-stone-500 mt-1">
            {boughtCount} / {items.length} items acquired
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-stone-200">
          <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4 mx-auto text-stone-300">
            <ShoppingBag size={32} />
          </div>
          <h3 className="text-xl font-serif text-stone-900 mb-2">
            Personal Wishlist
          </h3>
          <p className="text-stone-500 mb-6 max-w-sm mx-auto">
            Items you add here are private and only appear in your personal budget.
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="text-stone-900 font-bold underline hover:text-stone-600"
          >
            Start your list
          </button>
        </div>
      ) : (
         <>
           {/* MOBILE: 1 Column */}
           <div className="grid md:hidden grid-cols-1 gap-6">
             {cols1.map((col, colIdx) => (
               <div key={colIdx} className="flex flex-col gap-6">
                 {col.map(renderShoppingCard)}
               </div>
             ))}
           </div>

           {/* TABLET: 2 Columns */}
           <div className="hidden md:grid lg:hidden grid-cols-2 gap-6 items-start">
             {cols2.map((col, colIdx) => (
               <div key={colIdx} className="flex flex-col gap-6">
                 {col.map(renderShoppingCard)}
               </div>
             ))}
           </div>

           {/* DESKTOP: 3 Columns */}
           <div className="hidden lg:grid grid-cols-3 gap-6 items-start">
             {cols3.map((col, colIdx) => (
               <div key={colIdx} className="flex flex-col gap-6">
                 {col.map(renderShoppingCard)}
               </div>
             ))}
           </div>
         </>
      )}

      {showAddDialog && (
        <ShoppingDialog
          shoppingPlaces={shoppingPlaces}
          existingCategories={categories}
          onClose={() => setShowAddDialog(false)}
          onAdd={(data) => {
            addItem(data);
            setShowAddDialog(false);
          }}
        />
      )}

      {buyingItem && (
        <SimpleCostDialog
          itemName={buyingItem.item}
          onClose={() => setBuyingItem(null)}
          onSave={saveCost}
        />
      )}
    </div>
  );
}