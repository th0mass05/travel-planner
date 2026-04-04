import { auth } from "../../../firebase"; 
import React, { useState, useEffect, useCallback, useRef} from "react";
import {
  ExpenseDialog
} from "../../components/dialogs" ; 
import { 
  StoredTransport,
  StoredFlight, StoredHotel, StoredPlace 
} from "../../types"; 
import { 
  deleteKey,
} from "../../helpers/helpers";
 
import {
  Plus,
  Trash2,   
} from "lucide-react";
import { storage } from "../../../firebaseStore";
export default function BudgetTab({ tripId }: { tripId: number }) {
  // --- TYPES ---
  type BudgetLimits = {
    total: number;
    accommodation: number;
    travel: number;
    food: number;
    shopping: number;
    miscellaneous: number;
    other: number;
  };

  type BudgetItem = {
    label: string;
    amount: number;
    id?: number;
    sourceKey?: string;
  };

  type BudgetCategory = {
    total: number;
    items: BudgetItem[];
  };

  type BudgetState = {
    accommodation: BudgetCategory;
    travel: BudgetCategory;
    food: BudgetCategory;
    shopping: BudgetCategory;
    miscellaneous: BudgetCategory;
    other: BudgetCategory;
  };

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<BudgetLimits>({
    total: 0, accommodation: 0, travel: 0, food: 0, shopping: 0, miscellaneous: 0, other: 0,
  });

  const [budget, setBudget] = useState<BudgetState>({
    accommodation: { total: 0, items: [] },
    travel: { total: 0, items: [] },
    food: { total: 0, items: [] },
    shopping: { total: 0, items: [] },
    miscellaneous: { total: 0, items: [] },
    other: { total: 0, items: [] },
  });

  const [editingBudget, setEditingBudget] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [mode, setMode] = useState<"shared" | "mine">("shared");

  const myUid = auth.currentUser?.uid;

  // --- HELPERS ---
  const handleDeleteExpense = async (sourceKey: string) => {
    if (!confirm("Delete this expense?")) return;
    await deleteKey(sourceKey); // Uses your existing global deleteKey helper
    await loadData(); // Instantly refresh the budget
  };
  const toCents = (p?: string | number): number => {
    if (typeof p === "number") return Math.round(p * 100);
    if (!p) return 0;
    const clean = String(p).replace(/[^\d.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  const fromCents = (cents: number): number => cents / 100;

  // --- DATA LOADING ---
  const loadData = useCallback(async () => {
    let isActive = true; 
    setLoading(true);

    try {
      const [
        limitSnap,
        hotels,
        flights,
        transports,
        eats,
        visits,
        shopping,
        sharedExpenses,
        personalExpenses
      ] = await Promise.all([
        storage.get(`budgetLimits:${tripId}:${mode}`),
        storage.getAll<StoredHotel>(`hotel:${tripId}:`),
        storage.getAll<StoredFlight>(`flight:${tripId}:`),
        storage.getAll<StoredTransport>(`transport:${tripId}:`),
        storage.getAll<StoredPlace>(`place:${tripId}:eat:`),
        storage.getAll<StoredPlace>(`place:${tripId}:visit:`),
        (mode === "mine" && myUid) ? storage.getAll<any>(`shopping:${tripId}:user:${myUid}:`) : Promise.resolve([]),
        (mode === "shared") ? storage.getAll<any>(`expense:${tripId}:shared:`) : Promise.resolve([]),
        (mode === "mine" && myUid) ? storage.getAll<any>(`expense:${tripId}:user:${myUid}:`) : Promise.resolve([])
      ]);

      if (!isActive) return;
      
      if (limitSnap?.value) {
        setLimits(JSON.parse(limitSnap.value));
      } else {
        setLimits({ total: 0, accommodation: 0, travel: 0, food: 0, shopping: 0, miscellaneous: 0, other: 0 });
      }

      const newBudgetState: any = {
        accommodation: { total: 0, items: [] },
        travel: { total: 0, items: [] },
        food: { total: 0, items: [] },
        shopping: { total: 0, items: [] },
        miscellaneous: { total: 0, items: [] },
        other: { total: 0, items: [] },
      };

      const processItem = (
        category: keyof BudgetState,
        label: string,
        cost: string | number,
        paidBy?: { uid: string; amount: number }[],
        manualData?: { id: number, sourceKey: string } // 👈 NEW
      ) => {
        let cents = 0;

        if (mode === "shared") {
          cents = toCents(cost);
        } else if (mode === "mine" && myUid) {
          if (paidBy && Array.isArray(paidBy) && paidBy.length > 0) {
            const me = paidBy.find(p => p.uid === myUid);
            if (me) cents = toCents(me.amount);
          } else {
             cents = 0; 
          }
        }

        if (cents !== 0) {
           newBudgetState[category].total += cents;
           newBudgetState[category].items.push({ 
             label, 
             amount: fromCents(cents),
             id: manualData?.id,              // 👈 NEW
             sourceKey: manualData?.sourceKey // 👈 NEW
           });
        }
      };

      hotels.forEach(h => {
        if (h.status === "confirmed") {
            processItem("accommodation", h.name || "Hotel", h.cost ?? h.price ?? 0, h.paidBy);
        }
      });

      flights.forEach(f => {
        if (f.status === "confirmed") {
            processItem("travel", `${f.airline} ${f.flightNumber}`, f.cost ?? f.price ?? 0, f.paidBy);
        }
      });

      transports.forEach(t => {
        if (t.status === "confirmed") {
            processItem("travel", `${t.type} ${t.code || ""}`, t.cost ?? t.price ?? 0, t.paidBy);
        }
      });

      eats.forEach(p => {
        if (p.visited) {
            processItem("food", p.name, p.cost ?? p.price ?? 0, p.paidBy);
        }
      });

      visits.forEach(p => {
        if (p.visited) {
            processItem("other", p.name, p.cost ?? p.price ?? 0, p.paidBy);
        }
      });

      shopping.forEach(s => {
        if (s.bought && s.cost) {
          const cents = toCents(s.cost);
          newBudgetState.shopping.total += cents;
          newBudgetState.shopping.items.push({ label: s.item, amount: fromCents(cents) });
        }
      });

      const processManual = (list: any[], forceMine: boolean) => {
        list.forEach(e => {
            const cat = (e.category && newBudgetState[e.category]) ? e.category : "other";
            
            // 👈 NEW: Construct the exact storage key so we can delete it later
            const sourceKey = mode === "shared" 
                ? `expense:${tripId}:shared:${e.id}`
                : `expense:${tripId}:user:${myUid}:${e.id}`;

            if (forceMine) {
                const cents = toCents(e.amount);
                newBudgetState[cat].total += cents;
                newBudgetState[cat].items.push({ 
                  label: e.label, 
                  amount: fromCents(cents),
                  id: e.id,             // 👈 NEW
                  sourceKey: sourceKey  // 👈 NEW
                });
            } else {
                processItem(cat, e.label, e.amount, e.paidBy, { id: e.id, sourceKey }); // 👈 Pass to helper
            }
        });
      };

      processManual(sharedExpenses, false);
      processManual(personalExpenses, true);

      Object.keys(newBudgetState).forEach(k => {
          newBudgetState[k].total = fromCents(newBudgetState[k].total);
      });

      setBudget(newBudgetState);
      
    } catch (e) {
      console.error("Error loading budget", e);
    } finally {
      if (isActive) setLoading(false);
    }

    
  }, [tripId, mode, myUid]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // --- DEBOUNCED SAVING ---
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLimitChange = (field: keyof BudgetLimits, value: number) => {
    const newLimits = { ...limits, [field]: value };
    setLimits(newLimits);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
        storage.set(`budgetLimits:${tripId}:${mode}`, newLimits).catch(console.error);
    }, 500);
  };

  const totalSpent = Object.values(budget).reduce((a, b) => a + b.total, 0);
  const totalRemaining = limits.total - totalSpent;

  // ✅ FIXED CALCULATION LOGIC
  // 1. Iterate over known budget categories (accommodation, travel, etc) NOT 'limits' keys
  // 2. Force Number() on every value to prevent string concatenation bug
  const subLimitsTotal = Object.keys(budget).reduce((sum, category) => {
    const val = limits[category as keyof BudgetLimits];
    return sum + (Number(val) || 0);
  }, 0);
    
  // 3. Force Number() on comparison
  const isOverCap = subLimitsTotal > (Number(limits.total) || 0);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
           <h2 className="text-3xl font-serif text-stone-900">Financials</h2>
           <p className="text-stone-500 mt-3">Track shared expenses and personal spending.</p>
        </div>
        
        {/* Toggle Pills */}
        <div className="flex bg-stone-100 p-1 rounded-lg">
           <button
             onClick={() => setMode("shared")}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
               mode === "shared" ? "bg-white shadow-sm text-stone-900" : "text-stone-400 hover:text-stone-600"
             }`}
           >
             Shared Budget
           </button>
           <button
             onClick={() => setMode("mine")}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
               mode === "mine" ? "bg-white shadow-sm text-stone-900" : "text-stone-400 hover:text-stone-600"
             }`}
           >
             My Spending
           </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
          <div className="py-12 text-center text-stone-400 animate-pulse">
              Calculating financials...
          </div>
      )}

      {!loading && (
        <>
            {/* Action Bar */}
            <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    // ✅ FIX: Prevent closing if limits are invalid
                    if (editingBudget && isOverCap) return; 
                    setEditingBudget((v) => !v);
                  }}
                  // ✅ FIX: Visually disable the button
                  disabled={editingBudget && isOverCap}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    editingBudget && isOverCap 
                      ? "text-stone-300 cursor-not-allowed bg-stone-50" // Disabled style
                      : "text-stone-500 hover:text-stone-900" // Normal style
                  }`}
                >
                  {editingBudget ? "Done Editing" : "Adjust Limits"}
                </button>
                <button
                onClick={() => setShowExpenseDialog(true)}
                className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                <Plus size={16} /> Add Expense
                </button>
            </div>

            {/* Budget Summary Card */}
            {!editingBudget && limits.total > 0 && (
                <div className="bg-stone-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                    <div className="relative z-10">
                        <div className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-1">Remaining Budget</div>
                        <div className={`text-5xl font-serif mb-6 ${totalRemaining < 0 ? 'text-red-300' : ''}`}>
                            £{totalRemaining.toFixed(2)}
                        </div>
                        
                        <div className="flex gap-8 border-t border-white/10 pt-4">
                            <div>
                                <div className="text-xs text-stone-500 uppercase font-bold">Total Budget</div>
                                <div className="text-lg">£{limits.total.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-stone-500 uppercase font-bold">Total Spent</div>
                                <div className="text-lg">£{totalSpent.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Limits Editor */}
            {editingBudget && (
                <div className="bg-stone-50 rounded-xl p-6 border border-stone-200 animate-in fade-in slide-in-from-top-2">
                <h4 className="font-serif text-lg mb-4 text-stone-900">Set Budget Limits</h4>
                {isOverCap && (
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100 block mb-4">
                    Sub-budgets (£{subLimitsTotal.toFixed(2)}) exceed Total Cap (£{Number(limits.total).toFixed(2)})
                  </span>
                )}
                <div className="grid gap-4">
                    <div className={`flex justify-between items-center bg-white p-3 rounded-lg border ${
                      // ✅ FIX: Red border if over cap
                      isOverCap ? "border-red-300 ring-1 ring-red-100" : "border-stone-200"
                      }`}>
                        <span className="font-bold text-stone-700">Total Cap</span>
                        <input
                        type="number"
                        value={limits.total || ''}
                        onChange={(e) => handleLimitChange('total', Number(e.target.value))}
                        className={`w-32 text-right outline-none font-serif text-lg ${
                          // ✅ FIX: Red text if over cap
                          isOverCap ? "text-red-600" : ""
                        }`}
                        />
                    </div>
                    <div className="h-px bg-stone-200 my-2" />
                    {Object.keys(budget).map((cat) => (
                        <div key={cat} className="flex justify-between items-center text-sm">
                            <span className="capitalize text-stone-600">{cat}</span>
                            <div className="flex items-center gap-2">
                            <span className="text-stone-400">£</span>
                            <input
                                type="number"
                                value={limits[cat as keyof BudgetLimits] || ''}
                                onChange={(e) => handleLimitChange(cat as keyof BudgetLimits, Number(e.target.value))}
                                className="w-24 text-right bg-transparent border-b border-stone-300 focus:border-stone-900 outline-none transition-colors"
                            />
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            )}

            {/* Detailed Breakdown */}
            <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
                <h3 className="font-serif text-xl mb-6 border-b border-stone-100 pb-2">Expenses Breakdown</h3>
                <div className="space-y-8">
                {Object.entries(budget).map(([name, data]) => (
                    <div key={name}>
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-stone-400 text-xs font-bold uppercase tracking-wider">{name}</span>
                            <span className="font-serif text-lg font-medium text-stone-900">£{data.total.toFixed(2)}</span>
                        </div>
                        
                        {data.items.length > 0 ? (
                            <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                            {data.items.map((i, idx) => (
                                <div key={i.id || idx} className="group flex justify-between items-center text-sm text-stone-600">
                                  <span>{i.label}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-stone-500">£{i.amount.toFixed(2)}</span>
                                    
                                    {/* 👈 NEW: Delete Button (only shows on hover for manual expenses) */}
                                    {i.sourceKey && (
                                        <button 
                                            onClick={() => handleDeleteExpense(i.sourceKey!)}
                                            className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete manual expense"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                  </div>
                                </div>
                            ))}
                            </div>
                        ) : (
                            <div className="h-1 bg-stone-100 rounded-full overflow-hidden" />
                        )}
                    </div>
                ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center">
                    <span className="font-serif text-xl text-stone-900">Total Spent</span>
                    <span className="font-serif text-2xl text-stone-900">£{totalSpent.toFixed(2)}</span>
                </div>
            </div>
        </>
      )}

      {/* Dialog */}
      {showExpenseDialog && (
        <ExpenseDialog
          mode={mode}
          tripId={tripId}
          onClose={() => setShowExpenseDialog(false)}
          onSave={async () => {
            setShowExpenseDialog(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
}