import { Check, Hotel, MapPin } from "lucide-react";
import { StoredHotel } from "../../types";
import { TripAuthorInfo } from "../../helpers";

export default function HotelCard({
  hotel,
  onConfirm,
  onUnconfirm,
  onEdit,
  onDelete
}: {
  hotel: StoredHotel;
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
            <Hotel size={18} />
          </div>
          <h4 className="text-lg font-serif font-bold text-stone-900 leading-tight">{hotel.name}</h4>
        </div>

        {/* Toggle confirm state based on current status */}
        {hotel.status !== "confirmed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
          >
            Confirm
          </button>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
            <Check size={12} strokeWidth={3} /> Confirmed
          </span>
        )}
      </div>

      {/* Address with external Google Maps link (fallback to search if URL not provided) */}
      <a 
        href={hotel.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2 text-stone-500 text-sm mb-5 hover:text-stone-900 transition-colors group/link w-fit"
      >
        <MapPin size={14} className="mt-0.5 flex-shrink-0 group-hover/link:text-stone-900 transition-colors" />
        <span className="leading-snug group-hover/link:underline">{hotel.address}</span>
      </a>

      <div className="flex-1 space-y-4 mb-4">
        
        {/* Display check-in and check-out dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-stone-50 px-3 py-2.5 rounded-lg flex items-center gap-2">
            <span className="text-xs text-stone-400 uppercase font-bold whitespace-nowrap">Check-in</span>
            <span className="font-bold text-stone-600">{hotel.checkIn}</span>
          </div>
          <div className="bg-stone-50 px-3 py-2.5 rounded-lg flex items-center gap-2">
            <span className="text-xs text-stone-400 uppercase font-bold whitespace-nowrap">Check-out</span>
            <span className="font-bold text-stone-600">{hotel.checkOut}</span>
          </div>
        </div>
        
        {/* Render optional price and additional notes if present */}
        {(hotel.price || hotel.details) && (
          <div className="flex flex-wrap items-baseline gap-6 pt-2 text-sm text-stone-600">
            {hotel.price && (
              <div className="flex-shrink-0">
                Cost: <span className="font-bold text-stone-600 text-base">{hotel.price}</span>
              </div>
            )}
            {hotel.details && (
              <div className="italic text-stone-500 leading-relaxed">
                "{hotel.details}"
              </div>
            )}
          </div>
        )}

        {/* Show creator and creation timestamp metadata */}
        <div className="pt-2 border-t border-stone-100">
          <TripAuthorInfo uid={hotel.createdByUid} createdAt={hotel.createdAt} />
        </div>
      </div>

      {/* Footer actions for managing hotel entry */}
      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wide border-t border-stone-100 pt-4 mt-auto">
        {hotel.status === "confirmed" && (
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