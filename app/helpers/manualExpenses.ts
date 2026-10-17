export type ExpenseCategory = "accommodation" | "travel" | "food" | "shopping" | "miscellaneous" | "other";
export type ExpensePayment = { uid: string; amount: number };

function moneyToCents(value: string): number {
  const amount = Number(value);
  if (!value.trim() || !Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid amount of £0 or more.");
  }
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) {
    throw new Error("Enter amounts with no more than two decimal places.");
  }
  return cents;
}

export function createManualExpense(input: {
  mode: "shared" | "mine";
  label: string;
  amount: string;
  category: ExpenseCategory;
  uid?: string;
  selected: string[];
  splitMode: "equal" | "custom";
  custom: Record<string, string>;
}) {
  if (!input.uid) throw new Error("Please sign in again before saving an expense.");
  if (!input.label.trim()) throw new Error("Please enter a description for this expense.");
  const cents = moneyToCents(input.amount);
  let paidBy: ExpensePayment[] = [];
  if (input.mode === "shared") {
    const selected = [...new Set(input.selected)];
    if (selected.length === 0) throw new Error("Select at least one person who paid.");
    if (input.splitMode === "equal") {
      const each = Math.floor(cents / selected.length);
      const remainder = cents % selected.length;
      paidBy = selected.map((uid, index) => ({ uid, amount: (each + (index < remainder ? 1 : 0)) / 100 }));
    } else {
      const shares = selected.map(uid => moneyToCents(input.custom[uid] || "0"));
      if (shares.reduce((sum, share) => sum + share, 0) !== cents) {
        throw new Error("The custom split must add up to the total expense.");
      }
      paidBy = selected.map((uid, index) => ({ uid, amount: shares[index] / 100 }));
    }
  }
  return {
    id: Date.now(), label: input.label.trim(), amount: cents / 100,
    category: input.category, paidBy, createdByUid: input.uid,
    createdAt: new Date().toISOString(), type: "manualExpense" as const,
  };
}

export function manualExpenseKey(tripId: number, expense: ReturnType<typeof createManualExpense>, personal: boolean): string {
  return personal
    ? `expense:${tripId}:user:${expense.createdByUid}:${expense.id}`
    : `expense:${tripId}:shared:${expense.id}`;
}
