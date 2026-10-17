import { useState, useEffect, useRef } from "react";
import { X, Wallet } from "lucide-react";
import { auth, db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { storage } from "../../../firebaseStore";
import { createManualExpense, manualExpenseKey, type ExpenseCategory } from "../../helpers/manualExpenses";

const categories: ExpenseCategory[] = ["accommodation", "travel", "food", "shopping", "miscellaneous", "other"];
const fieldClass = "w-full border border-stone-200 rounded-xl px-4 py-3 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2";

export default function ExpenseDialog({ mode, tripId, onClose, onSave }: {
  mode: "shared" | "mine";
  tripId: number;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [members, setMembers] = useState<{ uid: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [loadingMembers, setLoadingMembers] = useState(mode === "shared");
  const [memberError, setMemberError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    if (mode !== "shared") return;
    const loadMembers = async () => {
      try {
        const tripDoc = await storage.get(`trip:${tripId}`);
        if (!tripDoc?.value) throw new Error("Trip not found.");
        const trip = JSON.parse(tripDoc.value) as { members?: string[]; ownerId?: string };
        const memberIds = [...new Set([...(trip.members || []), ...(trip.ownerId ? [trip.ownerId] : [])])];
        if (!memberIds.length) throw new Error("No trip members found.");
        const result = await Promise.all(memberIds.map(async uid => {
          // A missing or unreadable profile should not block allocating a payment.
          try {
            const snap = await getDoc(doc(db, "users", uid));
            const data = snap.data();
            return { uid, name: data?.name || data?.displayName || data?.email || (uid === auth.currentUser?.uid ? "You" : "Trip member") };
          } catch {
            return { uid, name: uid === auth.currentUser?.uid ? "You" : "Trip member" };
          }
        }));
        if (active) { setMembers(result); setSelected(memberIds); }
      } catch {
        if (active) setMemberError("Could not load trip members. Close this form and try again.");
      } finally {
        if (active) setLoadingMembers(false);
      }
    };
    void loadMembers();
    return () => { active = false; };
  }, [mode, tripId]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLInputElement>("#expense-description")?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current || loadingMembers || memberError) return;
    setError("");
    try {
      const expense = createManualExpense({ mode, label, amount, category, uid: auth.currentUser?.uid, selected, splitMode, custom });
      savingRef.current = true;
      setSaving(true);
      await storage.set(manualExpenseKey(tripId, expense, mode === "mine"), expense);
    } catch (saveError) {
      setError(savingRef.current ? "Could not save this expense. Please try again." : saveError instanceof Error ? saveError.message : "Please check the expense details.");
      savingRef.current = false;
      setSaving(false);
      return;
    }
    // Keep Save locked after a successful write while the parent closes and refreshes.
    await onSave();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <form ref={dialogRef} onSubmit={handleSave} noValidate role="dialog" aria-modal="true" aria-labelledby="expense-title"
        onKeyDown={event => {
          if (event.key === "Escape" && !savingRef.current) onClose();
          if (event.key === "Tab") {
            const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
            if (!controls?.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 sm:p-8 text-stone-900">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-rose-500 mb-2"><Wallet size={18} /><span className="text-xs font-bold uppercase tracking-widest">{mode === "shared" ? "Shared Budget" : "My Spending"}</span></div>
            <h3 id="expense-title" className="text-2xl font-serif">Add Expense</h3>
            <p className="text-stone-500 text-sm mt-1">{mode === "shared" ? "Record a trip expense and who paid for it." : "Keep track of your personal trip spending."}</p>
          </div>
          <button type="button" aria-label="Close expense form" onClick={onClose} disabled={saving} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors disabled:opacity-50"><X size={20} /></button>
        </div>
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <div>
            <label htmlFor="expense-description" className={labelClass}>Description</label>
            <input id="expense-description" placeholder="e.g. Airport taxi" value={label} onChange={event => setLabel(event.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="expense-category" className={labelClass}>Category</label>
            <select id="expense-category" value={category} onChange={event => setCategory(event.target.value as ExpenseCategory)} className={fieldClass}>
              {categories.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="expense-amount" className={labelClass}>Total cost</label>
            <div className="relative"><span className="absolute left-4 top-3 text-stone-400 font-serif text-lg">£</span><input id="expense-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} className={`${fieldClass} pl-9 font-serif text-lg`} /></div>
          </div>
          {mode === "shared" && <div className="space-y-4 border-t border-stone-100 pt-5">
            <div>
              <p className={labelClass}>Who paid?</p>
              {loadingMembers && <p role="status" className="text-sm text-stone-400">Loading trip members…</p>}
              <div className="flex flex-wrap gap-2">
                {members.map(member => <label key={member.uid} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${selected.includes(member.uid) ? "bg-stone-100 border-stone-300 text-stone-900" : "border-stone-200 text-stone-500"}`}><input type="checkbox" checked={selected.includes(member.uid)} onChange={() => setSelected(previous => previous.includes(member.uid) ? previous.filter(uid => uid !== member.uid) : [...previous, member.uid])} className="accent-stone-900" />{member.name}</label>)}
              </div>
            </div>
            <div className="flex bg-stone-100 p-1 rounded-lg">
              {(["equal", "custom"] as const).map(value => <button key={value} type="button" aria-pressed={splitMode === value} onClick={() => setSplitMode(value)} className={`flex-1 px-3 py-2 rounded-md text-sm font-bold transition-all ${splitMode === value ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-900"}`}>{value === "equal" ? "Split equally" : "Custom split"}</button>)}
            </div>
            {splitMode === "equal" && <p className="text-xs text-stone-500">Split between the selected people, with any spare pennies allocated in order.</p>}
            {splitMode === "custom" && selected.map(uid => <div key={uid} className="flex items-center justify-between gap-3"><label htmlFor={`expense-share-${uid}`} className="text-sm text-stone-600">{members.find(member => member.uid === uid)?.name}</label><div className="relative w-32 shrink-0"><span className="absolute left-3 top-3 text-stone-400">£</span><input id={`expense-share-${uid}`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={custom[uid] || ""} onChange={event => setCustom(previous => ({ ...previous, [uid]: event.target.value }))} className={`${fieldClass} pl-7 text-right`} /></div></div>)}
          </div>}
        </fieldset>
        {(error || memberError) && <p role="alert" className="mt-5 text-rose-600 text-sm font-medium bg-rose-50 p-3 rounded-lg border border-rose-100">{error || memberError}</p>}
        <div className="flex gap-3 mt-6 pt-5 border-t border-stone-100">
          <button type="submit" disabled={saving || loadingMembers || Boolean(memberError)} className="flex-1 px-4 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Saving…" : "Save Expense"}</button>
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
