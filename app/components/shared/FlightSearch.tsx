import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";
import { auth } from "../../../firebase";
import { parseFlightSearch, type FlightMatch, type FlightSearchResponse } from "../../helpers/flightSearch";

const inputClass = "w-full min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function FlightSearch({ tripId, defaultDate, onSelect }: {
  tripId: number;
  defaultDate?: string;
  onSelect: (match: FlightMatch) => void;
}) {
  const [mode, setMode] = useState<"number" | "route">("number");
  const [date, setDate] = useState(defaultDate || today);
  const [flightNumber, setFlightNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState<FlightMatch[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [incomplete, setIncomplete] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);

  useEffect(() => () => { requestNumber.current++; requestRef.current?.abort(); }, []);

  const resetSearch = () => {
    requestNumber.current++;
    requestRef.current?.abort();
    setResults([]); setNextCursor(null); setIncomplete(false);
    setSearched(false); setLoading(false); setError(""); setSelected("");
  };

  const search = async (cursor?: string) => {
    if (loading) return;
    setError(""); setSelected("");
    let query;
    try { query = parseFlightSearch({ mode, date, flightNumber, origin, destination }); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Check the search details."); return; }
    const user = auth.currentUser;
    if (!user) { setError("Please sign in before searching flights."); return; }
    const sequence = ++requestNumber.current;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    if (!cursor) { setResults([]); setNextCursor(null); setIncomplete(false); setSearched(false); }
    try {
      const token = await user.getIdToken();
      if (sequence !== requestNumber.current) return;
      const response = await fetch("/api/flights/search", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...query, tripId, ...(cursor ? { cursor } : {}) }), signal: controller.signal,
      });
      const data = await response.json();
      if (sequence !== requestNumber.current) return;
      if (!response.ok) throw new Error(data.error || "Could not search flights. Please try again.");
      const page = data as FlightSearchResponse;
      setResults(previous => {
        const combined = new Map((cursor ? previous : []).map(flight => [flight.id, flight]));
        page.flights.forEach(flight => {
          const existing = combined.get(flight.id);
          combined.set(flight.id, { ...flight, aliases: [...new Set([...(existing?.aliases || []), ...flight.aliases])] });
        });
        return [...combined.values()].sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture));
      });
      setNextCursor(page.nextCursor);
      setIncomplete(previous => previous || page.incomplete);
      setSearched(true);
    } catch (issue) {
      if (sequence !== requestNumber.current || controller.signal.aborted) return;
      setError(issue instanceof Error ? issue.message : "Could not search flights. Please try again.");
    } finally {
      if (sequence === requestNumber.current) setLoading(false);
    }
  };

  return (
    <section aria-label="Find your flight" className="mb-6 rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
      <div>
        <h4 className="font-serif text-lg text-stone-900">Find your flight</h4>
        <p className="text-sm text-stone-500 mt-1">Choose a match to fill in the details below, or enter them yourself.</p>
      </div>
      <div className="flex rounded-lg bg-stone-200/60 p-1">
        {(["number", "route"] as const).map(value => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => { resetSearch(); setMode(value); }}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-bold transition-colors ${mode === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
            {value === "number" ? "Flight number" : "Route"}
          </button>
        ))}
      </div>
      <form onSubmit={event => { event.preventDefault(); void search(); }} className="space-y-3" noValidate>
        {mode === "number" ? (
          <div><label htmlFor="flight-search-number" className={labelClass}>Full flight number</label>
            <input id="flight-search-number" value={flightNumber} onChange={event => { resetSearch(); setFlightNumber(event.target.value.toUpperCase()); }} placeholder="e.g. BA123 or EZY1234" maxLength={12} className={inputClass} autoComplete="off" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="flight-search-origin" className={labelClass}>From airport</label><input id="flight-search-origin" value={origin} onChange={event => { resetSearch(); setOrigin(event.target.value.toUpperCase()); }} placeholder="LHR" maxLength={4} className={inputClass} autoComplete="off" /></div>
            <div><label htmlFor="flight-search-destination" className={labelClass}>To airport</label><input id="flight-search-destination" value={destination} onChange={event => { resetSearch(); setDestination(event.target.value.toUpperCase()); }} placeholder="JFK" maxLength={4} className={inputClass} autoComplete="off" /></div>
          </div>
        )}
        <div><label htmlFor="flight-search-date" className={labelClass}>Departure date</label><input id="flight-search-date" type="date" value={date} onChange={event => { resetSearch(); setDate(event.target.value); }} className={inputClass} /><p className="text-xs text-stone-500 mt-1">The date at the departure airport.</p></div>
        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}{loading ? "Searching…" : "Search flights"}
        </button>
      </form>
      {error && <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
      {searched && <div className="space-y-3">
        <p role="status" className="text-xs text-stone-500">{results.length ? `${results.length} matching ${results.length === 1 ? "flight" : "flights"}. All times are local to each airport.` : nextCursor ? "No matches on this page. Load more results to continue searching this date." : "No matching flights found. Check the number or route, try another date, or enter the details manually."}</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {results.map(flight => <button key={flight.id} type="button" onClick={() => { onSelect(flight); setSelected(flight.id); }}
            className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-stone-900 ${selected === flight.id ? "border-rose-300 bg-rose-50" : "border-stone-200 bg-white hover:border-stone-400"}`}>
            <span className="flex justify-between items-center gap-2"><span className="text-sm font-bold text-stone-900">{flight.ident}</span><span className="text-xs text-stone-500">{flight.duration}</span></span>
            {flight.operatingIdent !== flight.ident && <span className="block text-xs text-stone-500 mt-1">Operated as {flight.operatingIdent}</span>}
            <span className="grid grid-cols-2 gap-4 mt-3">
              <span className="min-w-0"><span className="block text-lg font-serif text-stone-900">{flight.departure} · {flight.time}</span><span className="block text-xs text-stone-500 break-words">{flight.departureName}</span><span className="block text-xs text-stone-500 mt-1">{flight.date}</span><span className="block text-[10px] text-stone-400 break-words">{flight.departureTimezone.replaceAll("_", " ")}</span></span>
              <span className="min-w-0"><span className="block text-lg font-serif text-stone-900">{flight.arrival} · {flight.arrivalTime}</span><span className="block text-xs text-stone-500 break-words">{flight.arrivalName}</span><span className="block text-xs text-stone-500 mt-1">{flight.arrivalDate}{flight.arrivalDate > flight.date ? " · arrives later date" : flight.arrivalDate < flight.date ? " · arrives earlier date" : ""}</span><span className="block text-[10px] text-stone-400 break-words">{flight.arrivalTimezone.replaceAll("_", " ")}</span></span>
            </span>
            {flight.aliases.length > 1 && <span className="block mt-2 text-xs text-stone-500">Also listed as {flight.aliases.filter(alias => alias !== flight.ident).join(", ")}</span>}
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-rose-600">{selected === flight.id ? <><Check size={14} /> Details filled in</> : "Use this flight"}</span>
          </button>)}
        </div>
        {nextCursor && <button type="button" disabled={loading} onClick={() => void search(nextCursor)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-50">{loading ? "Loading…" : "Load more results"}</button>}
        {incomplete && <p className="text-xs text-amber-700">Some results lacked airport-local times and could not be shown. Try again later or enter your flight manually.</p>}
      </div>}
      {selected && <p role="status" className="text-sm text-stone-600">Review the details below, then save the flight. Your price, notes and booking status have been kept.</p>}
      <p className="text-[11px] text-stone-400">Scheduled flight data from <a href="https://www.flightaware.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">FlightAware</a>. Schedules can change.</p>
    </section>
  );
}
