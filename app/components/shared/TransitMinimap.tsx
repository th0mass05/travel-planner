"use client";
import React, { useEffect, useState, useRef } from "react";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import { useJsApiLoader } from "@react-google-maps/api";
import { Plane, Train, Loader2 } from "lucide-react";
import { ItineraryItem } from "../../types"; 
import { mapLibraries } from "../../helpers/helpers";
import { storage } from "../../../firebaseStore";

export default function TransitMinimap({ item, tripId }: { item: ItineraryItem; tripId: number }) {
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries 
  });
  
  const mapRef = useRef<MapRef>(null);
  const [coords, setCoords] = useState<{start: any, end: any} | null>(null);
  const [locations, setLocations] = useState<{start: string, end: string} | null>(null);

  // 1. SMART FETCH: Use sourceId to find missing departure/arrival locations
  useEffect(() => {
    const getMissingData = async () => {
      if (item.transitStart && item.transitEnd) {
        setLocations({ start: item.transitStart, end: item.transitEnd });
        return;
      }
      if (item.sourceId) {
        try {
          const [type, id] = item.sourceId.split(':');
          const snap = await storage.get(`${type}:${tripId}:${id}`);
          if (snap?.value) {
            const data = JSON.parse(snap.value);
            if (data.departure && data.arrival) {
              setLocations({ start: data.departure, end: data.arrival });
            }
          }
        } catch (e) { console.error("Transit Data Fetch Error:", e); }
      }
    };
    getMissingData();
  }, [item, tripId]);

  // 2. GEOCODING: Addresses to Coordinates
  useEffect(() => {
    if (!locations || !isLoaded) return;
    const fetchCoords = async () => {
      const geocoder = new window.google.maps.Geocoder();
      try {
        const [startRes, endRes] = await Promise.all([
          geocoder.geocode({ address: locations.start }), 
          geocoder.geocode({ address: locations.end })
        ]);
        if (startRes.results[0] && endRes.results[0]) {
          setCoords({
            start: { lat: startRes.results[0].geometry.location.lat(), lng: startRes.results[0].geometry.location.lng() },
            end: { lat: endRes.results[0].geometry.location.lat(), lng: endRes.results[0].geometry.location.lng() }
          });
        }
      } catch (e) { console.warn("Geocode failed"); }
    };
    fetchCoords();
  }, [locations, isLoaded]);

  // 3. SMART ZOOM & RESIZE logic
  useEffect(() => {
    if (coords && mapRef.current) {
      const map = mapRef.current;
      
      // Fixes the "half-loaded" glitch by forcing a container check
      map.resize(); 

      // Fit the view to show both markers with comfortable padding
      map.fitBounds(
        [
          [Math.min(coords.start.lng, coords.end.lng), Math.min(coords.start.lat, coords.end.lat)],
          [Math.max(coords.start.lng, coords.end.lng), Math.max(coords.start.lat, coords.end.lat)]
        ],
        { 
          padding: 40, 
          duration: 2500,
          essential: true 
        }
      );
    }
  }, [coords]);

  if (!locations) return null;

  const isFlight = item.iconType === "flight";
  const Icon = isFlight ? Plane : Train;
  const color = isFlight ? '#6366f1' : '#f43f5e'; // Indigo flight line, Rose train line

  const lineData = coords ? {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[coords.start.lng, coords.start.lat], [coords.end.lng, coords.end.lat]] }
  } : null;

  return (
    <div className="w-full aspect-[2.5/1] min-h-[140px] rounded-xl border border-stone-200 overflow-hidden shadow-sm flex flex-col relative bg-stone-50 animate-in fade-in duration-700">
      
      {/* Mini-Header Overlay */}
      <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm px-3 py-1.5 border-b border-stone-200 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2">
          <Icon size={12} className={isFlight ? "text-indigo-500" : "text-rose-500"} />
          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider truncate max-w-[150px]">{item.activity}</span>
        </div>
        <span className="text-[10px] font-medium text-stone-400 truncate uppercase">
            {locations.start} ➝ {locations.end}
        </span>
      </div>

      {!coords ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-stone-200" size={20} /></div>
      ) : (
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          /* ⭐ REPLACE THIS STRING WITH YOUR CUSTOM STYLE URL */
          mapStyle="mapbox://styles/th0masc05/cmnj6whmn007y01sedkhwh1iu" 
          projection={{ name: 'mercator' }} // 👈 Forces flat map for perfect zooming
          interactive={false}
        >
          {lineData && (
            <Source type="geojson" data={lineData as any}>
              <Layer 
                id={`line-${item.id}`} 
                type="line" 
                paint={{ 
                  'line-color': color, 
                  'line-width': 2.5, 
                  'line-dasharray': isFlight ? [3, 2] : [1] 
                }} 
              />
            </Source>
          )}
          
          <Marker longitude={coords.start.lng} latitude={coords.start.lat}>
            <div className="w-2.5 h-2.5 rounded-full bg-white border-2 shadow-sm" style={{ borderColor: color }} />
          </Marker>
          <Marker longitude={coords.end.lng} latitude={coords.end.lat}>
            <div className="w-2.5 h-2.5 rounded-full bg-white border-2 shadow-sm" style={{ borderColor: color }} />
          </Marker>
        </Map>
      )}
    </div>
  );
}