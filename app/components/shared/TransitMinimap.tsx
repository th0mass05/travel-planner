"use client";
import React, { useEffect, useState, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
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
  
  // 1. STATE MANAGEMENT
  const [coords, setCoords] = useState<{start: {lat: number, lng: number}, end: {lat: number, lng: number}} | null>(null);
  const [locations, setLocations] = useState<{start: string, end: string} | null>(null);
  
  // This state controls where the camera is looking
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1
  });

  // 2. DATA FETCHING (Same as before)
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
        } catch (e) { console.error(e); }
      }
    };
    getMissingData();
  }, [item.sourceId, tripId]);

  // 3. GEOCODING
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
          const newCoords = {
            start: { lat: startRes.results[0].geometry.location.lat(), lng: startRes.results[0].geometry.location.lng() },
            end: { lat: endRes.results[0].geometry.location.lat(), lng: endRes.results[0].geometry.location.lng() }
          };
          setCoords(newCoords);

          // 4. IMMEDIATELY CALCULATE AND UPDATE VIEWSTATE
          const midLng = (newCoords.start.lng + newCoords.end.lng) / 2;
          const midLat = (newCoords.start.lat + newCoords.end.lat) / 2;
          
          // Calculate distance to determine zoom
          const dist = Math.sqrt(
            Math.pow(newCoords.start.lng - newCoords.end.lng, 2) + 
            Math.pow(newCoords.start.lat - newCoords.end.lat, 2)
          );

          let zoom = 1.5;
          if (dist < 10) zoom = 4.5;
          else if (dist < 40) zoom = 3;
          else if (dist < 80) zoom = 2.2;

          setViewState({
            longitude: midLng,
            latitude: midLat,
            zoom: zoom
          });
        }
      } catch (e) { console.warn("Geocode failed"); }
    };
    fetchCoords();
  }, [locations, isLoaded]);

  // 5. MEMOIZED LINE DATA
  const lineData = useMemo(() => {
    if (!coords) return null;
    return {
      type: 'Feature',
      geometry: { 
        type: 'LineString', 
        coordinates: [[coords.start.lng, coords.start.lat], [coords.end.lng, coords.end.lat]] 
      }
    };
  }, [coords]);

  if (!locations) return null;

  const isFlight = item.iconType === "flight";
  const Icon = isFlight ? Plane : Train;
  const color = isFlight ? '#6366f1' : '#f43f5e'; 

  return (
    <div className="w-full aspect-[2.5/1] min-h-[140px] rounded-xl border border-stone-200 overflow-hidden shadow-sm flex flex-col relative bg-[#111]">
      {/* Header Overlay */}
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
          {...viewState} // 👈 CONTROLLED VIEW: This forces the map to move
          onMove={evt => setViewState(evt.viewState)} // Keeps it interactive if needed
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/th0masc05/cmnj6whmn007y01sedkhwh1iu" 
          projection={{ name: 'globe' }} 
          style={{ width: '100%', height: '100%' }}
        >
          {lineData && (
            <Source type="geojson" data={lineData as any}>
              <Layer 
                id={`line-${item.id}`} 
                type="line" 
                paint={{ 
                  'line-color': color, 
                  'line-width': 2, 
                  'line-dasharray': isFlight ? [3, 2] : [1] 
                }} 
              />
            </Source>
          )}
          
          <Marker longitude={coords.start.lng} latitude={coords.start.lat}>
            <div className="w-2 h-2 rounded-full bg-white border-2 shadow-sm" style={{ borderColor: color }} />
          </Marker>
          <Marker longitude={coords.end.lng} latitude={coords.end.lat}>
            <div className="w-2 h-2 rounded-full bg-white border-2 shadow-sm" style={{ borderColor: color }} />
          </Marker>
        </Map>
      )}
    </div>
  );
}