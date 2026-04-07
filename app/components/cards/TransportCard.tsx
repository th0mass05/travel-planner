import { Check, Train } from "lucide-react";
import { StoredTransport } from "../../types";
import { TripAuthorInfo } from "../../helpers";

export default function TransportCard({
  transport,
  onConfirm,
  onUnconfirm,
  onEdit,
  onDelete
}: {
  transport: StoredTransport;
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
            <Train size={18} />
          </div>
          <div>
            <h4 className="text-lg font-serif font-bold text-stone-900">{transport.type}</h4>
            {transport.code && (
              <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">
                {transport.code}
              </p>
            )}
          </div>
        </div>

        {/* Toggle confirm state based on current transport status */}
        {transport.status !== "confirmed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full"
          >
            Confirm
          </button>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Check size={12} strokeWidth={3} /> Confirmed
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 mb-4">
        {/* Display the transport route */}
        <div className="flex items-center gap-2 text-stone-800 font-medium bg-stone-50 p-3 rounded-lg">
          <span>{transport.departure}</span>
          <span className="text-stone-300">➝</span>
          <span>{transport.arrival}</span>
        </div>

        {/* Show date and optional time */}
        <p className="text-stone-500 text-sm pl-1">
          {transport.date} {transport.time && `@ ${transport.time}`}
        </p>

        {/* Render optional price and additional notes if present */}
        {(transport.price || transport.details) && (
          <div className="text-xs text-stone-500 space-y-1 pt-1 pl-1">
            {transport.price && (
              <p>
                Cost: <span className="font-medium text-stone-900">{transport.price}</span>
              </p>
            )}
            {transport.details && <p className="italic">"{transport.details}"</p>}
          </div>
        )}

        {/* Show creator and creation timestamp metadata */}
        <div className="pt-2 border-t border-stone-100">
          <TripAuthorInfo uid={transport.createdByUid} createdAt={transport.createdAt} />
        </div>
      </div>

      {/* Footer actions for managing transport entry */}
      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wide border-t border-stone-100 pt-4 mt-auto">
        {transport.status === "confirmed" && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnconfirm(); }}
            className="text-amber-500 hover:text-amber-700 transition-colors"
          >
            Unconfirm
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-stone-400 hover:text-stone-900"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-300 hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}