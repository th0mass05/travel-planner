import React from "react";
import { MapPin, Check, Star, ExternalLink, ShoppingBag, Plus } from "lucide-react";
import { StoredPlace, ShoppingData, PlaceType } from "../../types";
import { TripAuthorInfo } from "../../helpers";
import { categoryIcons, PLACE_CATEGORIES } from "../../styling/styling";

type PlaceCardProps = {
  place: StoredPlace;
  showCategoryBadge: boolean;
  shoppingItems: ShoppingData[];
  onToggleVisited: (place: StoredPlace) => void;
  onOpenShoppingList: (place: StoredPlace) => void;
  onEdit: (place: StoredPlace) => void;
  onConfirm: (place: StoredPlace) => void;
  onUnconfirm: (place: StoredPlace) => void;
  onDelete: (placeId: number, category?: PlaceType) => void;
};

export default function PlaceCard({
  place,
  showCategoryBadge,
  shoppingItems,
  onToggleVisited,
  onOpenShoppingList,
  onEdit,
  onConfirm,
  onUnconfirm,
  onDelete,
}: PlaceCardProps) {
  // Resolve category icon and label, with sensible fallbacks
  const CategoryIcon = categoryIcons[place.category] || MapPin;
  const categoryLabel = PLACE_CATEGORIES.find((c) => c.id === place.category)?.label || "Place";

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${
        place.visited
          ? `border-stone-200 opacity-80 hover:opacity-100`
          : "border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1"
      }`}
    >
      <div className="relative h-56 overflow-hidden bg-stone-100">
        {/* Render place image when available, otherwise show a placeholder icon */}
        {place.imageUrl ? (
          <img
            src={place.imageUrl}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <MapPin size={48} />
          </div>
        )}

        {/* Optionally display the place category badge */}
        {showCategoryBadge && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-stone-900 px-2.5 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <CategoryIcon size={14} className="text-rose-500" />
            {categoryLabel}
          </div>
        )}

        {/* Indicate when the place has been marked as visited */}
        {place.visited && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-stone-900 p-2 rounded-full shadow-md">
            <Check size={16} strokeWidth={3} />
          </div>
        )}

        {/* Show rating badge when rating data exists */}
        {place.rating && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {place.rating}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-serif text-stone-900 leading-tight group-hover:text-rose-800 transition-colors">
            {place.name}
          </h3>

          {/* Link to an external website for the place when available */}
          {place.link && (
            <a href={place.link} target="_blank" rel="noreferrer" className="text-stone-300 hover:text-stone-900">
              <ExternalLink size={16} />
            </a>
          )}
        </div>

        {/* Link to Google Maps, using a stored URL when available or a query fallback */}
        <a
          href={place.googleMapsUrl || `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(place.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 hover:text-rose-500 transition-colors cursor-pointer w-fit group/link"
        >
          <MapPin size={12} />
          <span className="group-hover/link:underline">{place.address}</span>
        </a>

        <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-3">
          {place.description}
        </p>

        {/* Display creator and timestamp metadata */}
        <div className="mt-auto mb-4">
          <TripAuthorInfo uid={place.createdByUid} createdAt={place.createdAt} />
        </div>

        <div className="pt-4 border-t border-stone-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Toggle visited state */}
          <label className="inline-flex items-center gap-2 py-1 cursor-pointer group/check shrink-0">
            <input
              type="checkbox"
              checked={Boolean(place.visited)}
              onChange={() => onToggleVisited(place)}
              className="w-4 h-4 rounded border-stone-300 accent-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            />
            <span className="text-xs font-bold uppercase text-stone-400 group-hover/check:text-stone-900">
              Visited
            </span>
          </label>
            {/* Show linked shopping list summary for shopping places with associated items */}
            {place.category === "shopping" &&
              shoppingItems.filter((i) => i.linkedPlaces?.some((p) => p.id === place.id)).length > 0 && (
                <button
                  onClick={() => onOpenShoppingList(place)}
                  className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-50 text-xs font-bold whitespace-nowrap"
                >
                  <ShoppingBag size={14} />
                  List ({shoppingItems.filter((i) => i.linkedPlaces?.some((p) => p.id === place.id)).length})
                </button>
              )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold items-center">
            <button onClick={() => onEdit(place)} className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 whitespace-nowrap">
              Edit
            </button>

            {/* Show confirm actions based on whether the place already has a confirmed visit */}
            {!place.confirmed ? (
              <button onClick={() => onConfirm(place)} className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 whitespace-nowrap">
                Confirm
              </button>
            ) : (
              <>
                <button
                  onClick={() => onConfirm(place)}
                  className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 inline-flex items-center gap-1.5 whitespace-nowrap"
                  title="Add Another Date"
                >
                  <Plus size={12} strokeWidth={3} /> Confirm New Date
                </button>
                <button onClick={() => onUnconfirm(place)} className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 whitespace-nowrap">
                  Unconfirm
                </button>
              </>
            )}

            <button onClick={() => onDelete(place.id, place.category)} className="px-3 py-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 whitespace-nowrap">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
