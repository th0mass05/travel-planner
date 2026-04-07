import { Check, Plane } from "lucide-react";
import { StoredFlight } from "../../types";
import { TripAuthorInfo } from "../../helpers";

export default function FlightCard({
  flight,
  onConfirm,
  onUnconfirm,
  onEdit,
  onDelete
}: {
  flight: StoredFlight;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative flex flex-col h-full hover:border-stone-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <Plane size={18} />
          </div>
          <div>
            <h4 className="text-lg font-serif font-bold text-stone-900">{flight.airline}</h4>
            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">{flight.flightNumber}</p>
          </div>
        </div>

        {/* Show confirm action unless the flight is already confirmed */}
        {flight.status !== "confirmed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            Confirm
          </button>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Check size={12} strokeWidth={3} /> Confirmed
          </span>
        )}
      </div>

      <div className="flex-1 space-y-5 mb-4">
        {/* Display origin, destination, and optional duration */}
        <div className="flex items-center justify-between text-stone-800 px-1">
          <div className="text-center">
            <span className="block text-2xl font-serif">{flight.departure}</span>
            <span className="text-xs text-stone-400 font-bold uppercase">Depart</span>
          </div>

          <div className="flex-1 flex flex-col items-center px-4">
            {flight.duration && (
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">{flight.duration}</span>
            )}
            <div className="w-full border-t border-stone-300 relative">
              <Plane size={12} className="absolute -top-[6px] left-1/2 -ml-1.5 text-stone-300 rotate-90" />
            </div>
          </div>

          <div className="text-center">
            <span className="block text-2xl font-serif">{flight.arrival}</span>
            <span className="text-xs text-stone-400 font-bold uppercase">Arrive</span>
          </div>
        </div>

        {/* Show departure and arrival date/time details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-stone-50 px-3 py-2.5 rounded-lg">
            <span className="block text-xs text-stone-400 uppercase font-bold mb-0.5">Departure</span>
            <div className="font-bold text-stone-800">{flight.time}</div>
            <div className="text-xs text-stone-500">
              {new Date(flight.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="bg-stone-50 px-3 py-2.5 rounded-lg text-right">
            <span className="block text-xs text-stone-400 uppercase font-bold mb-0.5">Arrival</span>
            <div className="font-bold text-stone-800">{flight.arrivalTime || "—"}</div>
            <div className="text-xs text-stone-500">
              {flight.arrivalDate
                ? new Date(flight.arrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : "—"}
            </div>
          </div>
        </div>

        {/* Render optional price and additional notes if available */}
        {(flight.price || flight.details) && (
          <div className="flex flex-wrap items-baseline gap-6 pt-2 text-sm text-stone-600">
            {flight.price && (
              <div className="flex-shrink-0">
                Cost: <span className="font-bold text-stone-900 text-base">{flight.price}</span>
              </div>
            )}
            {flight.details && (
              <div className="italic text-stone-500 leading-relaxed">
                "{flight.details}"
              </div>
            )}
          </div>
        )}

        {/* Show creator and creation timestamp metadata */}
        <div className="pt-2 border-t border-stone-100">
          <TripAuthorInfo uid={flight.createdByUid} createdAt={flight.createdAt} />
        </div>
      </div>

      {/* Footer actions for flight management */}
      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wide border-t border-stone-100 pt-4 mt-auto">
        {flight.status === "confirmed" && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnconfirm(); }}
            className="text-amber-500 hover:text-amber-700 transition-colors"
          >
            Unconfirm
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-stone-400 hover:text-stone-900 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-300 hover:text-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}