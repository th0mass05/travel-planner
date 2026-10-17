import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function fixture(initial, failCommit = false) {
  const records = new Map(Object.entries(structuredClone(initial)));
  const commits = [];
  const storage = {
    async get(key) { return records.has(key) ? { value: JSON.stringify(records.get(key)) } : null; },
    async getAll(prefix) { return [...records].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value); },
    async list(prefix) { return { keys: [...records.keys()].filter(key => key.startsWith(prefix)) }; },
    async updateMany(updates) {
      if (failCommit) throw new Error("permission-denied");
      commits.push(updates);
      updates.forEach(({ key, value }) => records.set(key, { ...records.get(key), ...value }));
    },
  };
  const source = readFileSync(new URL("../app/helpers/itineraryPlaces.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({ storage }) });
  return { ...exports, records, commits };
}

const dayKey = "itinerary:42:date:2026-10-17";
const placeKey = "place:42:culture:7";
const visit = { id: 1, sourceId: "place:7", activity: "Museum", time: "10:00" };
const data = {
  [dayKey]: { date: "2026-10-17", day: 1, items: [visit] },
  [placeKey]: { id: 7, confirmed: true, visited: true, cost: 12, rating: "5", name: "Museum" },
};

test("deleting the last scheduled visit unconfirms the place in the same commit", async () => {
  const f = fixture(data);
  await f.deleteItineraryActivity(42, "2026-10-17", 1);
  assert.equal(f.records.get(dayKey).items.length, 0);
  assert.equal(f.records.get(dayKey).day, 1);
  assert.equal(f.records.get(placeKey).confirmed, false);
  assert.equal(f.records.get(placeKey).visited, true);
  assert.equal(f.records.get(placeKey).cost, 12);
  assert.equal(f.records.get(placeKey).rating, "5");
  assert.equal(f.commits.length, 1);
  assert.equal(f.commits[0].length, 2);
});

for (const sameDay of [true, false]) {
  test(`another visit on ${sameDay ? "the same day" : "a different day"} keeps the place confirmed`, async () => {
    const initial = structuredClone(data);
    const other = { ...visit, id: 2, time: "15:00" };
    if (sameDay) initial[dayKey].items.push(other);
    else initial["itinerary:42:date:2026-10-18"] = { date: "2026-10-18", items: [other] };
    const f = fixture(initial);
    await f.deleteItineraryActivity(42, "2026-10-17", 1);
    assert.equal(f.records.get(placeKey).confirmed, true);
  });
}

test("unrelated places, other trips and unlinked activities are untouched", async () => {
  const initial = structuredClone(data);
  initial[dayKey].items.push({ id: 2, activity: "Walk" }, { id: 3, sourceId: "hotel:7" });
  initial["place:42:eat:17"] = { id: 17, confirmed: true };
  initial["place:99:culture:7"] = { id: 7, confirmed: true };
  const f = fixture(initial);
  await f.deleteItineraryActivity(42, "2026-10-17", 2);
  assert.equal(f.commits[0].length, 1);
  await f.deleteItineraryActivity(42, "2026-10-17", 3);
  assert.equal(f.commits[1].length, 1);
  await f.deleteItineraryActivity(42, "2026-10-17", 1);
  assert.equal(f.records.get("place:42:eat:17").confirmed, true);
  assert.equal(f.records.get("place:99:culture:7").confirmed, true);
});

test("missing days, already-deleted activities and missing places are safe", async () => {
  const f = fixture({ [dayKey]: data[dayKey] });
  await f.deleteItineraryActivity(42, "2026-10-19", 1);
  await f.deleteItineraryActivity(42, "2026-10-17", 99);
  assert.equal(f.commits.length, 0);
  await f.deleteItineraryActivity(42, "2026-10-17", 1);
  assert.equal(f.records.get(dayKey).items.length, 0);
  assert.equal(f.records.size, 1);
});

test("failed commit leaves the itinerary and confirmation unchanged", async () => {
  const f = fixture(data, true);
  await assert.rejects(f.deleteItineraryActivity(42, "2026-10-17", 1), /permission-denied/);
  assert.equal(f.records.get(dayKey).items.length, 1);
  assert.equal(f.records.get(placeKey).confirmed, true);
});

test("live confirmation sources reflect scheduled visits, ignoring stale place flags", () => {
  const f = fixture({});
  const sources = f.confirmedPlaceSources([{ items: [visit, { ...visit, id: 2 }, { id: 3, sourceId: "hotel:8" }] }, {}]);
  assert.deepEqual([...sources], ["place:7"]);
  assert.equal(f.confirmedPlaceSources([{ items: [] }]).has("place:7"), false);
});
