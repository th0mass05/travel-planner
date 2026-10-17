import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URL, URLSearchParams, Response, Request, AbortSignal, ...globals });
  return exports;
}
const helpers = load("../app/helpers/flightSearch.ts");
const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const query = { mode: "number", date, flightNumber: "BA123", tripId: 42 };
const row = { ident: "BAW123", ident_iata: "BA123", ident_icao: "BAW123", origin: "EGLL", origin_iata: "LHR", destination: "KJFK", destination_iata: "JFK", scheduled_out: `${date}T12:00:00Z`, scheduled_in: `${date}T20:00:00Z` };
const airportMap = new Map([["EGLL", { timezone: "Europe/London" }], ["KJFK", { timezone: "America/New_York" }]]);

test("flight numbers accept IATA, ICAO and alphanumeric airline codes", () => {
  for (const [input, airline, number] of [[" ba 0123 ", "BA", "123"], ["EZY1234", "EZY", "1234"], ["U21234", "U2", "1234"], ["3U123", "3U", "123"]]) {
    const result = helpers.parseFlightNumber(input);
    assert.equal(result.airline, airline);
    assert.equal(result.number, number);
  }
  assert.throws(() => helpers.parseFlightNumber("123"));
});

test("invalid dates and routes fail before a provider request", () => {
  assert.throws(() => helpers.parseFlightSearch({ ...query, date: "2026-02-30" }));
  assert.throws(() => helpers.parseFlightSearch({ ...query, date: "2000-01-01" }));
  assert.throws(() => helpers.parseFlightSearch({ mode: "route", date, origin: "LHR", destination: "LHR" }));
  assert.equal(helpers.parseFlightSearch({ mode: "route", date, origin: " lhr ", destination: "jfk" }).origin, "LHR");
});

test("schedule requests bound pagination and encode opaque cursors", () => {
  const url = new URL(helpers.scheduleSearchPath(query, "a&max_pages=99"), "https://example.test");
  assert.equal(url.searchParams.get("max_pages"), "1");
  assert.equal(url.searchParams.get("cursor"), "a&max_pages=99");
  assert.equal(url.searchParams.get("flight_number"), "123");
  assert.ok(decodeURIComponent(url.pathname).includes("T10:00:00.000Z"));
});

test("airport-local conversion respects daylight saving and date boundaries", () => {
  assert.equal(helpers.localFlightTime("2026-07-01T23:30:00Z", "Europe/London").date, "2026-07-02");
  assert.equal(helpers.localFlightTime("2026-07-01T23:30:00Z", "Europe/London").time, "00:30");
  assert.equal(helpers.localFlightTime("2026-12-01T23:30:00Z", "Europe/London").time, "23:30");
  assert.throws(() => helpers.localFlightTime("2026-07-01T23:30:00", "Europe/London"));
});

test("overnight flights retain local arrival dates and elapsed duration", () => {
  const input = { ...query, date: "2026-07-01" };
  const result = helpers.normalizeSchedules([{ ...row, scheduled_out: "2026-07-01T22:00:00Z", scheduled_in: "2026-07-02T06:00:00Z" }], airportMap, input).flights[0];
  assert.equal(result.time, "23:00");
  assert.equal(result.arrivalDate, "2026-07-02");
  assert.equal(result.arrivalTime, "02:00");
  assert.equal(result.duration, "8h 0m");
});

test("codeshares deduplicate and missing timezones never silently become UTC", () => {
  const codeshare = { ...row, ident_iata: "AA6123", ident_icao: "AAL6123", actual_ident: "BAW123", actual_ident_iata: "BA123", actual_ident_icao: "BAW123" };
  const result = helpers.normalizeSchedules([codeshare, row], airportMap, query);
  assert.equal(result.flights.length, 1);
  assert.equal(result.flights[0].ident, "BA123");
  assert.equal(result.flights[0].aliases.length, 2);
  const missing = helpers.normalizeSchedules([row], new Map(), query);
  assert.equal(missing.incomplete, true);
  assert.equal(missing.flights.length, 0);
  assert.equal(helpers.normalizeSchedules([row], airportMap, { ...query, date: "2000-01-01" }).flights.length, 0);
});

test("autofill preserves price, notes, status and booking links", () => {
  const match = helpers.normalizeSchedules([row], airportMap, query).flights[0];
  const old = { price: "100", details: "Window seat", status: "confirmed", link: "booking", airline: "ZZ" };
  const result = helpers.applyFlightMatch(old, match);
  for (const key of ["price", "details", "status", "link"]) assert.equal(result[key], old[key]);
  assert.equal(result.airline, "BA");
  assert.equal(old.airline, "ZZ");
});

function routeFixture({ member = true, allowed, providerStatus = 200, key = "private-test-key" } = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("accounts:lookup")) return Response.json({ users: [{ localId: "user1" }] });
    if (url.includes("firestore.googleapis")) return Response.json({ fields: { members: { arrayValue: { values: [{ stringValue: member ? "user1" : "someone-else" }] } } } });
    if (providerStatus !== 200) return new Response("private-test-key provider secret", { status: providerStatus });
    if (url.includes("/schedules/")) return Response.json({ scheduled: [row], links: { next: "/schedules/example?cursor=page2" } });
    if (url.endsWith("/airports/EGLL")) return Response.json({ name: "Heathrow", timezone: "Europe/London" });
    if (url.endsWith("/airports/KJFK")) return Response.json({ name: "JFK", timezone: "America/New_York" });
    throw new Error("Unexpected network request");
  };
  const route = load("../app/api/flights/search/route.ts", { require: () => helpers, fetch, process: { env: { FLIGHTAWARE_API_KEY: key, NEXT_PUBLIC_FIREBASE_API_KEY: "firebase", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test", FLIGHTAWARE_ALLOWED_UIDS: allowed } } });
  const request = (body = query, token = "token") => route.POST(new Request("http://localhost/api/flights/search", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }));
  return { request, calls, providerCalls: () => calls.filter(call => call.url.includes("aeroapi.flightaware")) };
}

test("unauthenticated, nonmember, unconfigured and restricted users cannot spend API credits", async () => {
  for (const [options, token, status] of [[{}, "", 401], [{ member: false }, "token", 403], [{ key: "" }, "token", 503], [{ allowed: "other" }, "token", 403]]) {
    const f = routeFixture(options);
    assert.equal((await f.request(query, token)).status, status);
    assert.equal(f.providerCalls().length, 0);
  }
});

test("authorized search returns matches, keeps key private and caches provider work", async () => {
  const f = routeFixture();
  const response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.flights[0].departure, "LHR");
  assert.equal(body.nextCursor, "page2");
  assert.ok(!JSON.stringify(body).includes("private-test-key"));
  assert.equal(f.providerCalls().length, 3);
  assert.equal(f.providerCalls()[0].options.headers["x-apikey"], "private-test-key");
  assert.equal((await f.request()).status, 200);
  assert.equal(f.providerCalls().length, 3);
  assert.equal(f.calls.filter(call => call.url.includes("accounts:lookup")).length, 2);
  await f.request({ ...query, cursor: body.nextCursor });
  assert.equal(f.providerCalls().length, 4);
  assert.equal(new URL(f.providerCalls()[3].url).searchParams.get("cursor"), "page2");
});

test("provider errors are safe and rate limits are actionable", async () => {
  for (const [providerStatus, expected] of [[401, 503], [429, 429], [500, 502]]) {
    const f = routeFixture({ providerStatus });
    const response = await f.request();
    assert.equal(response.status, expected);
    assert.ok(!(await response.text()).includes("private-test-key"));
    if (expected === 429) assert.equal(response.headers.get("retry-after"), "60");
  }
  const f = routeFixture();
  for (let count = 0; count < 5; count++) assert.equal((await f.request()).status, 200);
  assert.equal((await f.request()).status, 429);
  assert.equal(f.providerCalls().length, 3);
});
