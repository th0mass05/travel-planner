import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadSource(path, mocks = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports,
    require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), console, setTimeout, clearTimeout,
  });
  return loaded.exports;
}
const { createManualExpense, manualExpenseKey } = loadSource("../app/helpers/manualExpenses.ts");
const base = { mode: "mine", label: " Taxi ", amount: "10.00", category: "travel", uid: "alice", selected: [], splitMode: "equal", custom: {} };

function expenseForm(write, onSave) {
  let index = 0;
  const states = [];
  const { default: ExpenseDialog } = loadSource("../app/components/dialogs/ExpenseDialog.tsx", {
    react: {
      useState(initial) { const slot = index++; states[slot] = slot === 0 ? "Taxi" : slot === 1 ? "10" : initial; return [states[slot], value => { states[slot] = value; }]; },
      useEffect() {}, useRef(initial) { return { current: initial }; },
    },
    "../../../firebase": { auth: { currentUser: { uid: "alice" } } },
    "firebase/firestore": {}, "../../../firebaseStore": { storage: { set: write } },
    "../../helpers/manualExpenses": { createManualExpense, manualExpenseKey },
  });
  const tree = ExpenseDialog({ mode: "mine", tripId: 42, onClose() {}, onSave });
  return { submit: () => tree.props.children.props.onSubmit({ preventDefault() {} }), states };
}

test("form waits for persistence and blocks repeated submissions", async () => {
  let finish;
  let writes = 0;
  let saved = 0;
  const form = expenseForm(async (key, expense) => {
    writes++;
    assert.match(key, /^expense:42:user:alice:/);
    assert.equal(Object.values(expense).includes(undefined), false);
    await new Promise(resolve => { finish = resolve; });
  }, () => { saved++; });
  const pending = form.submit();
  await form.submit();
  assert.equal(writes, 1);
  assert.equal(saved, 0);
  finish();
  await pending;
  assert.equal(saved, 1);
});

test("failed writes keep the form open, show an error and allow retry", async () => {
  let writes = 0;
  let saved = 0;
  const form = expenseForm(async () => {
    if (++writes === 1) throw new Error("permission-denied");
  }, () => { saved++; });
  await form.submit();
  assert.equal(saved, 0);
  assert.match(form.states[9], /Could not save/);
  assert.equal(form.states[10], false);
  await form.submit();
  assert.equal(saved, 1);
});

test("personal expense is Firestore-safe and uses the current user's key", () => {
  const expense = createManualExpense(base);
  assert.equal(expense.label, "Taxi");
  assert.equal(expense.amount, 10);
  assert.equal(expense.paidBy.length, 0);
  assert.equal(Object.values(expense).includes(undefined), false);
  assert.equal(manualExpenseKey(42, expense, true), `expense:42:user:alice:${expense.id}`);
});

test("equal splits preserve every penny and deduplicate payers", () => {
  const expense = createManualExpense({ ...base, mode: "shared", selected: ["alice", "bob", "carol", "alice"] });
  assert.equal(JSON.stringify(expense.paidBy.map(p => p.amount)), "[3.34,3.33,3.33]");
  assert.equal(manualExpenseKey(42, expense, false), `expense:42:shared:${expense.id}`);
});

test("custom splits accept exact totals and reject mismatches or invalid amounts", () => {
  const input = { ...base, mode: "shared", selected: ["alice", "bob"], splitMode: "custom", custom: { alice: "6.75", bob: "3.25" } };
  assert.equal(createManualExpense(input).paidBy[0].amount, 6.75);
  assert.throws(() => createManualExpense({ ...input, custom: { alice: "6", bob: "3" } }), /add up/);
  assert.throws(() => createManualExpense({ ...input, custom: { alice: "-1", bob: "11" } }), /valid amount/);
});

test("invalid input cannot produce a saved expense", () => {
  for (const amount of ["", " ", "-1", "NaN", "Infinity", "0.001"]) {
    assert.throws(() => createManualExpense({ ...base, amount }));
  }
  assert.throws(() => createManualExpense({ ...base, uid: undefined }), /sign in/);
  assert.throws(() => createManualExpense({ ...base, label: " " }), /description/);
  assert.throws(() => createManualExpense({ ...base, mode: "shared" }), /at least one/);
});

test("zero-cost expenses and ordinary decimal amounts remain valid", () => {
  assert.equal(createManualExpense({ ...base, amount: "0" }).amount, 0);
  assert.equal(createManualExpense({ ...base, amount: "19.99" }).amount, 19.99);
});

for (const mode of ["mine", "shared"]) {
  test(`${mode} budget loads manual expenses with the correct totals and deletion keys`, async () => {
    const states = [];
    const effects = [];
    const requests = [];
    let index = 0;
    const react = {
      useState(initial) { const slot = index++; states[slot] = slot === 5 ? mode : initial; return [states[slot], value => { states[slot] = value; }]; },
      useEffect(fn) { effects.push(fn); }, useCallback(fn) { return fn; }, useRef() { return { current: null }; },
    };
    const shared = { id: 1, label: "Shared taxi", amount: 10, category: "travel", paidBy: [{ uid: "alice", amount: 4 }, { uid: "bob", amount: 6 }] };
    const personal = { id: 2, label: "Bus", amount: 3, category: "travel" };
    const { default: BudgetTab } = loadSource("../app/components/tabs/BudgetTab.tsx", {
      react, "../../../firebase": { auth: { currentUser: { uid: "alice" } } },
      "../../components/dialogs": { ExpenseDialog() {} }, "../../helpers/helpers": {},
      "../../../firebaseStore": { storage: {
        async get() { return null; },
        async getAll(prefix) {
          requests.push(prefix);
          if (prefix === "expense:42:shared:") return [shared];
          if (prefix === "expense:42:user:alice:") return [personal];
          return [];
        },
      } },
    });
    BudgetTab({ tripId: 42 });
    effects.forEach(fn => fn());
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(states[0], false);
    assert.equal(requests.includes("expense:42:shared:"), true);
    assert.equal(states[2].travel.total, mode === "mine" ? 7 : 10);
    const items = states[2].travel.items;
    assert.equal(items[0].sourceKey, mode === "mine" ? undefined : "expense:42:shared:1");
    if (mode === "mine") assert.equal(items[1].sourceKey, "expense:42:user:alice:2");
  });
}
