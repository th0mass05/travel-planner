import React from "react";
import { MapPin, Users, Trash2 } from "lucide-react";
import {TripCardProps, TripStatus } from "../../types";
import { TripAuthorInfo } from "../../helpers";
import { categoryIcons } from "../../styling/styling";

export default function TripCard({ trip, onClick, onDelete, onEdit, isInvited, onAccept, onDecline }: TripCardProps) {
  // ... (keep existing statusConfig and config logic) ...
  const statusConfig: Record<TripStatus, { label: string; className: string }> = {
    upcoming: { label: "Upcoming", className: "bg-amber-100 text-amber-800 border-amber-200" },
    ongoing:  { label: "Happening Now", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    completed:{ label: "Completed", className: "bg-stone-100 text-stone-600 border-stone-200" },
  };
  const config = statusConfig[trip.status] || statusConfig.upcoming;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col bg-white rounded-2xl transition-all duration-300 ${
        !isInvited ? "hover:-translate-y-2 cursor-pointer" : ""
      }`}
    >
      {/* ... (Keep existing Image Container & Content Header) ... */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md group-hover:shadow-2xl transition-all duration-500">
         {/* ... keep existing image logic ... */}
         {trip.imageUrl ? (
          <img src={trip.imageUrl} alt={trip.destination} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${trip.bgGradient || "from-stone-200 to-stone-300"}`} />
        )}
        {/* ... keep badge logic ... */}
         <div className="absolute top-4 left-4 z-10">
          {isInvited ? (
             <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><Users size={12} /> Invited</div>
          ) : (
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm backdrop-blur-md bg-white/90 ${config.className}`}>{config.label}</div>
          )}
        </div>
      </div>

      <div className="pt-5 px-2 pb-2 flex-1 flex flex-col">
        {/* ... (Keep existing text content) ... */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-2xl font-serif text-stone-900 group-hover:text-rose-900 transition-colors">{trip.destination}</h3>
          <span className="font-serif text-stone-400 text-lg italic">{trip.year}</span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-500 text-sm font-medium mb-3 uppercase tracking-wide">
          <MapPin size={14} className="text-rose-400" />{trip.country}
        </div>
        <p className="text-stone-600 text-sm leading-relaxed line-clamp-2 mb-4">{trip.tagline}</p>

        {/* Footer Actions */}
        <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400">
               {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>

            {isInvited ? (
               <div className="flex gap-2">
                 {/* ... keep invite buttons ... */}
                 <button onClick={(e) => { e.stopPropagation(); onDecline?.(); }} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold">Decline</button>
                 <button onClick={(e) => { e.stopPropagation(); onAccept?.(); }} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold shadow-md">Accept</button>
               </div>
            ) : (
              <div className="flex gap-1">
                {/* ⭐ Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-300 hover:text-stone-600"
                  title="Edit Trip"
                >
                  {/* You might need to import Pencil from lucide-react */}
                  <span className="text-xs font-bold">Edit</span> 
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors group/delete"
                  title="Delete Trip"
                >
                  <Trash2 size={16} className="text-stone-300 group-hover/delete:text-red-500 transition-colors" />
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}