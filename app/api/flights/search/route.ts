import { normalizeSchedules, parseFlightSearch, scheduleSearchPath, type AirportInfo, type FlightSearchInput, type FlightSearchResponse, type ScheduledFlight } from "../../../helpers/flightSearch";

export const runtime = "nodejs";
const AEROAPI = "https://aeroapi.flightaware.com/aeroapi";
const MINUTE = 60_000;

class SearchError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Bounded, short-lived caches. No raw provider responses are written to Firestore.
const airports = new Map<string, { value: AirportInfo; expires: number }>();
const searches = new Map<string, { value: FlightSearchResponse; expires: number }>();
const rates = new Map<string, { count: number; expires: number }>();

function takeRate(key: string, limit: number) {
  const now = Date.now();
  for (const [id, entry] of rates) if (entry.expires <= now) rates.delete(id);
  const entry = rates.get(key) || { count: 0, expires: now + MINUTE };
  if (entry.count >= limit || (!rates.has(key) && rates.size >= 2000)) {
    throw new SearchError("Flight search is busy. Please wait a minute and try again.", 429);
  }
  entry.count++;
  rates.set(key, entry);
}

function saveCache<T>(cache: Map<string, { value: T; expires: number }>, key: string, value: T, ttl: number, max: number) {
  for (const [id, entry] of cache) if (entry.expires <= Date.now()) cache.delete(id);
  if (cache.size >= max) cache.delete(cache.keys().next().value!);
  cache.set(key, { value, expires: Date.now() + ttl });
}

async function providerGet(path: string, apiKey: string): Promise<Response> {
  // Personal plans allow 10 result sets/minute. This is per server instance,
  // not an account-wide budget cap across multiple Vercel instances.
  takeRate("provider", 10);
  const response = await fetch(`${AEROAPI}${path}`, {
    headers: { "x-apikey": apiKey, Accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(10_000), redirect: "error",
  });
  if (response.status === 401 || response.status === 403) throw new SearchError("FlightAware rejected access. Check the API key and schedules access in your FlightAware account.", 503);
  if (response.status === 402) throw new SearchError("FlightAware requires a billing or account update before searches can continue.", 503);
  if (response.status === 429) throw new SearchError("FlightAware's search limit has been reached. Please wait a minute and try again.", 429);
  if (response.status >= 500) throw new SearchError("FlightAware is temporarily unavailable. Please try again or enter the flight manually.", 502);
  return response;
}

async function airportInfo(code: string, apiKey: string): Promise<AirportInfo | null> {
  if (!/^[A-Z0-9]{3,5}$/.test(code)) return null;
  const cached = airports.get(code);
  if (cached && cached.expires > Date.now()) return cached.value;
  const response = await providerGet(`/airports/${encodeURIComponent(code)}`, apiKey);
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new SearchError("Could not retrieve airport details. Please try again.", 502);
  const data = await response.json();
  if (typeof data.timezone !== "string") return null;
  try { new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format(); } catch { return null; }
  const value: AirportInfo = { timezone: data.timezone, name: typeof data.name === "string" ? data.name : code };
  saveCache(airports, code, value, 24 * 60 * MINUTE, 2000);
  return value;
}

async function authorizeTrip(token: string, tripId: number): Promise<string> {
  const firebaseKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!firebaseKey || !project) throw new SearchError("Flight search is not configured yet.", 503);
  // Verify through Firebase instead of trusting decoded browser claims. No
  // service-account key is needed; the trip read uses the caller's security rules.
  const account = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }),
    cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (account.status >= 500 || account.status === 429) throw new SearchError("Sign-in verification is temporarily unavailable. Please try again.", 503);
  if (!account.ok) throw new SearchError("Please sign in again before searching flights.", 401);
  const user = (await account.json()).users?.[0];
  if (!user?.localId || user.disabled) throw new SearchError("Please sign in again before searching flights.", 401);
  const allowed = process.env.FLIGHTAWARE_ALLOWED_UIDS?.split(",").map(value => value.trim()).filter(Boolean);
  if (allowed?.length && !allowed.includes(user.localId)) throw new SearchError("Flight search is not enabled for your account yet. You can still add flights manually.", 403);
  takeRate(`user:${user.localId}`, 5);
  const trip = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/travelData/${encodeURIComponent(`trip:${tripId}`)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (trip.status >= 500 || trip.status === 429) throw new SearchError("Could not check trip access. Please try again.", 503);
  if (!trip.ok) throw new SearchError("You must be a member of this trip to search flights.", 403);
  const fields = (await trip.json()).fields;
  const isOwner = fields?.ownerId?.stringValue === user.localId;
  const isMember = fields?.members?.arrayValue?.values?.some((member: { stringValue?: string }) => member.stringValue === user.localId);
  if (!isOwner && !isMember) throw new SearchError("You must be a member of this trip to search flights.", 403);
  return user.localId;
}

async function search(input: FlightSearchInput, apiKey: string, cursor: string): Promise<FlightSearchResponse> {
  const cacheKey = JSON.stringify([input, cursor]);
  const cached = searches.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const response = await providerGet(scheduleSearchPath(input, cursor), apiKey);
  if (response.status === 400) throw new SearchError("FlightAware could not search those details. Check the date, airline and airport codes.", 400);
  if (!response.ok) throw new SearchError("Flight search failed. Please try again or enter the flight manually.", 502);
  const data = await response.json();
  if (!Array.isArray(data.scheduled)) throw new SearchError("FlightAware returned an unexpected response. Please try again.", 502);
  const rows: ScheduledFlight[] = data.scheduled.slice(0, 15);
  const codes = [...new Set(rows.flatMap(row => [row.origin_icao || row.origin, row.destination_icao || row.destination]))];
  const metadata = new Map<string, AirportInfo>();
  // A flight number or direct route normally needs just two airport lookups.
  // Bound unusual responses rather than issuing dozens of chargeable requests.
  let uncached = 0;
  for (const code of codes) {
    if (!code) continue;
    const cachedAirport = airports.get(code);
    if ((!cachedAirport || cachedAirport.expires <= Date.now()) && ++uncached > 6) continue;
    const info = await airportInfo(code, apiKey);
    if (info) metadata.set(code, info);
  }
  const normalized = normalizeSchedules(rows, metadata, input);
  let nextCursor: string | null = null;
  if (typeof data.links?.next === "string") {
    // Extract only the opaque cursor; never follow provider/client supplied URLs.
    const candidate = new URL(data.links.next, `${AEROAPI}/`).searchParams.get("cursor");
    if (candidate && candidate.length <= 2048 && candidate !== cursor) nextCursor = candidate;
  }
  const result = { ...normalized, nextCursor };
  if (!result.incomplete) saveCache(searches, cacheKey, result, 5 * MINUTE, 200);
  return result;
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token || token.length > 8192) throw new SearchError("Please sign in before searching flights.", 401);
    if (Number(request.headers.get("content-length")) > 8192) throw new SearchError("Search request is too large.", 413);
    const text = await request.text();
    if (text.length > 8192) throw new SearchError("Search request is too large.", 413);
    let body;
    let input: FlightSearchInput;
    try { body = JSON.parse(text); input = parseFlightSearch(body); }
    catch (error) { throw new SearchError(error instanceof Error ? error.message : "Invalid search details.", 400); }
    if (!Number.isSafeInteger(body.tripId) || body.tripId <= 0) throw new SearchError("Choose a trip before searching flights.", 400);
    if (body.cursor !== undefined && (typeof body.cursor !== "string" || body.cursor.length > 2048)) throw new SearchError("Invalid search page.", 400);
    const apiKey = process.env.FLIGHTAWARE_API_KEY?.trim();
    if (!apiKey) throw new SearchError("Flight search is not configured yet. You can still enter flight details manually.", 503);
    await authorizeTrip(token, body.tripId);
    return Response.json(await search(input, apiKey, body.cursor || ""), { headers });
  } catch (error) {
    const status = error instanceof SearchError ? error.status : 502;
    const message = error instanceof SearchError ? error.message : "Flight search could not connect. Please try again or enter the flight manually.";
    return Response.json({ error: message }, { status, headers: { ...headers, ...(status === 429 ? { "Retry-After": "60" } : {}) } });
  }
}
