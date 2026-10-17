import type { FlightData } from "../types";

export type FlightSearchInput = {
  mode: "number" | "route";
  date: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
};

export type FlightMatch = {
  id: string;
  ident: string;
  operatingIdent: string;
  aliases: string[];
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureName: string;
  arrivalName: string;
  departureTimezone: string;
  arrivalTimezone: string;
  date: string;
  time: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  scheduledDeparture: string;
};

export type FlightSearchResponse = {
  flights: FlightMatch[];
  nextCursor: string | null;
  incomplete: boolean;
};

export function parseFlightNumber(value: string) {
  const normal = value.replace(/\s/g, "").toUpperCase();
  const match = normal.match(/^([A-Z]{3}|[A-Z][A-Z0-9]|[0-9][A-Z])(\d{1,4})$/);
  if (!match) throw new Error("Enter the full flight number, including the airline code (for example BA123 or U21234).");
  return { airline: match[1], number: String(Number(match[2])), ident: `${match[1]}${Number(match[2])}` };
}

export function parseFlightSearch(value: unknown, now = new Date()): FlightSearchInput {
  if (!value || typeof value !== "object") throw new Error("Enter flight search details.");
  const input = value as Record<string, unknown>;
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Choose a departure date.");
  const date = new Date(`${input.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date) throw new Error("Choose a valid departure date.");
  // Leave two days at each provider boundary for the UTC search window.
  const min = new Date(now); min.setUTCMonth(min.getUTCMonth() - 3); min.setUTCDate(min.getUTCDate() + 2);
  const max = new Date(now); max.setUTCFullYear(max.getUTCFullYear() + 1); max.setUTCDate(max.getUTCDate() - 2);
  if (input.date < min.toISOString().slice(0, 10) || input.date > max.toISOString().slice(0, 10)) {
    throw new Error(`Choose a departure date between ${min.toISOString().slice(0, 10)} and ${max.toISOString().slice(0, 10)}.`);
  }
  if (input.mode === "number") {
    const parsed = parseFlightNumber(typeof input.flightNumber === "string" ? input.flightNumber : "");
    return { mode: "number", date: input.date, flightNumber: parsed.ident };
  }
  if (input.mode === "route") {
    const origin = typeof input.origin === "string" ? input.origin.trim().toUpperCase() : "";
    const destination = typeof input.destination === "string" ? input.destination.trim().toUpperCase() : "";
    if (!/^[A-Z]{3,4}$/.test(origin) || !/^[A-Z]{3,4}$/.test(destination)) throw new Error("Enter airport codes, such as LHR and JFK.");
    if (origin === destination) throw new Error("Choose different departure and arrival airports.");
    return { mode: "route", date: input.date, origin, destination };
  }
  throw new Error("Choose flight number or route search.");
}

export function scheduleSearchPath(input: FlightSearchInput, cursor?: string) {
  // FlightAware filters UTC departure times. Include adjacent UTC dates, then
  // filter by the departure airport's local date once its timezone is known.
  const midnight = new Date(`${input.date}T00:00:00Z`).getTime();
  const start = new Date(midnight - 14 * 3600000).toISOString();
  const end = new Date(midnight + 36 * 3600000 - 1000).toISOString();
  const params = new URLSearchParams({ max_pages: "1", include_codeshares: input.mode === "number" ? "true" : "false", include_regional: "true" });
  if (cursor) params.set("cursor", cursor);
  if (input.mode === "number") {
    const flight = parseFlightNumber(input.flightNumber || "");
    params.set("airline", flight.airline);
    params.set("flight_number", flight.number);
  } else {
    params.set("origin", input.origin || "");
    params.set("destination", input.destination || "");
  }
  return `/schedules/${encodeURIComponent(start)}/${encodeURIComponent(end)}?${params}`;
}

export type ScheduledFlight = {
  ident: string;
  ident_iata?: string | null;
  ident_icao?: string | null;
  actual_ident?: string | null;
  actual_ident_iata?: string | null;
  actual_ident_icao?: string | null;
  origin: string;
  origin_icao?: string | null;
  origin_iata?: string | null;
  destination: string;
  destination_icao?: string | null;
  destination_iata?: string | null;
  scheduled_out: string;
  scheduled_in: string;
};
export type AirportInfo = { name?: string; timezone: string };

export function localFlightTime(instant: string, timezone: string) {
  if (!timezone || !/(Z|[+-]\d\d:\d\d)$/.test(instant)) throw new Error("Missing flight timezone.");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)?.value || "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

export function normalizeSchedules(rows: ScheduledFlight[], airports: Map<string, AirportInfo>, input: FlightSearchInput) {
  const groups = new Map<string, FlightMatch>();
  let incomplete = false;
  for (const row of rows) {
    try {
      const originKey = row.origin_icao || row.origin;
      const destinationKey = row.destination_icao || row.destination;
      const origin = airports.get(originKey);
      const destination = airports.get(destinationKey);
      if (!origin?.timezone || !destination?.timezone) { incomplete = true; continue; }
      const departure = localFlightTime(row.scheduled_out, origin.timezone);
      if (departure.date !== input.date) continue;
      const arrival = localFlightTime(row.scheduled_in, destination.timezone);
      const ident = row.ident_iata || row.ident_icao || row.ident;
      const parsed = parseFlightNumber(ident);
      const operatingIdent = row.actual_ident_iata || row.actual_ident_icao || row.actual_ident || ident;
      const key = `${row.actual_ident_icao || row.actual_ident || row.ident_icao || operatingIdent}:${originKey}:${destinationKey}:${row.scheduled_out}`;
      const duration = Math.round((Date.parse(row.scheduled_in) - Date.parse(row.scheduled_out)) / 60000);
      if (!Number.isFinite(duration) || duration < 0) { incomplete = true; continue; }
      const result: FlightMatch = {
        id: key, ident, operatingIdent, aliases: [ident], airline: parsed.airline, flightNumber: parsed.number,
        departure: row.origin_iata || originKey, arrival: row.destination_iata || destinationKey,
        departureName: origin.name || originKey, arrivalName: destination.name || destinationKey,
        departureTimezone: origin.timezone, arrivalTimezone: destination.timezone,
        date: departure.date, time: departure.time, arrivalDate: arrival.date, arrivalTime: arrival.time,
        duration: `${Math.floor(duration / 60)}h ${duration % 60}m`, scheduledDeparture: row.scheduled_out,
      };
      const existing = groups.get(key);
      if (existing) {
        const aliases = [...new Set([...existing.aliases, ident])];
        const matchesQuery = input.mode === "number" && [row.ident_iata, row.ident_icao, row.ident].some(code => {
          try { return parseFlightNumber(code || "").ident === input.flightNumber; } catch { return false; }
        });
        groups.set(key, { ...(matchesQuery ? result : existing), aliases });
      } else groups.set(key, result);
    } catch { incomplete = true; }
  }
  return { flights: [...groups.values()].sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture)), incomplete };
}

export function applyFlightMatch(previous: FlightData, match: FlightMatch): FlightData {
  return { ...previous, airline: match.airline, flightNumber: match.flightNumber,
    departure: match.departure, arrival: match.arrival, date: match.date, time: match.time,
    arrivalDate: match.arrivalDate, arrivalTime: match.arrivalTime, duration: match.duration };
}
