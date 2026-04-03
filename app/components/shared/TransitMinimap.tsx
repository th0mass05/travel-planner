"use client";
import React, { useEffect, useState, useRef } from "react";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import { useJsApiLoader } from "@react-google-maps/api";
import { Plane, Train, Loader2 } from "lucide-react";
import { ItineraryItem } from "../../types"; 
import { mapLibraries } from "../../helpers/helpers";

export default function TransitMinimap({ item }: { item: ItineraryItem }) {
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries 
  });
  
  const mapRef = useRef<MapRef>(null);
  const [coords, setCoords] = useState<{start: any, end: any} | null>(null);

  const startTarget = item.transitStart;
  const endTarget = item.transitEnd;
  if (!startTarget || !endTarget) {
    console.error("TransitMinimap: Missing start/end data for", item.activity);
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        Map data missing: {item.activity} (Needs Start/End locations)
      </div>
    );
  }
  useEffect(() => {
    if (!startTarget || !endTarget || !isLoaded) return;
    const fetchCoords = async () => {
      const geocoder = new window.google.maps.Geocoder();
      try {
        const [startRes, endRes] = await Promise.all([
          geocoder.geocode({ address: startTarget }), 
          geocoder.geocode({ address: endTarget })
        ]);
        if (startRes.results[0] && endRes.results[0]) {
          setCoords({
            start: { lat: startRes.results[0].geometry.location.lat(), lng: startRes.results[0].geometry.location.lng() },
            end: { lat: endRes.results[0].geometry.location.lat(), lng: endRes.results[0].geometry.location.lng() }
          });
        }
      } catch (e) { console.warn("Transit geocode failed"); }
    };
    fetchCoords();
  }, [startTarget, endTarget, isLoaded]);

  useEffect(() => {
    if (coords && mapRef.current) {
      mapRef.current.resize(); // Fixes the half-rendered map issue
      mapRef.current.fitBounds(
        [[Math.min(coords.start.lng, coords.end.lng), Math.min(coords.start.lat, coords.end.lat)],
         [Math.max(coords.start.lng, coords.end.lng), Math.max(coords.start.lat, coords.end.lat)]],
        { padding: 40, duration: 2000 }
      );
    }
  }, [coords]);

  if (!startTarget || !endTarget) return null;

  // Generalizing: Anything that isn't explicitly a flight is treated as ground transport
  const isFlight = item.iconType === ("flight" as any); 
  const Icon = isFlight ? Plane : Train;
  const color = isFlight ? '#6366f1' : '#f43f5e'; // Indigo for flight, Rose for ground

  const lineData = coords ? {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[coords.start.lng, coords.start.lat], [coords.end.lng, coords.end.lat]] }
  } : null;

  return (
    <div className="w-full aspect-[21/9] min-h-[160px] rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col relative bg-stone-100">
      <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm px-4 py-2 border-b border-stone-200 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2">
          <Icon size={14} className={isFlight ? "text-indigo-500" : "text-rose-500"} />
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">{item.activity}</span>
        </div>
        <span className="text-xs font-medium text-stone-400">{startTarget} ➝ {endTarget}</span>
      </div>

      {!coords || !isLoaded ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-stone-300" size={24} /></div>
      ) : (
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v11"
          interactive={false} // Locks map to prevent getting stuck scrolling
        >
          {lineData && (
            <Source type="geojson" data={lineData as any}>
                <Layer 
                id={`transit-line-${item.id}`} // 👈 Uses the unique database ID of the flight/train
                type="line" 
                paint={{ 
                    'line-color': color, 
                    'line-width': isFlight ? 2 : 3, 
                    'line-dasharray': isFlight ? [3, 3] : [1] 
                }} 
                />
            </Source>
            )}
          <Marker longitude={coords.start.lng} latitude={coords.start.lat}><div className="w-3 h-3 rounded-full bg-white border-[3px]" style={{ borderColor: color }} /></Marker>
          <Marker longitude={coords.end.lng} latitude={coords.end.lat}><div className="w-3 h-3 rounded-full bg-white border-[3px]" style={{ borderColor: color }} /></Marker>
        </Map>
      )}
    </div>
  );
}