"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import { useJsApiLoader } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { ItineraryDay, StoredHotel } from "../../types"; 
import { storage } from "../../../firebaseStore"; 
import { mapLibraries } from "../../helpers/helpers"; 
import { CATEGORY_COLORS } from "../../styling/styling"; 

type MapPoint = { id: string; lat: number; lng: number; name: string; type: string; isItineraryItem: boolean; };

export default function DayMinimap({ dayData, date, tripId }: { dayData: ItineraryDay; date: string; tripId: number; }) {
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries 
  });
  
  const mapRef = useRef<MapRef>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !dayData) return;

    const buildRoute = async () => {
      setIsProcessing(true);
      const geocoder = new window.google.maps.Geocoder();
      const routePoints: MapPoint[] = [];

      const getCoords = async (address: string) => {
        if (!address) return null;
        try {
          const res = await geocoder.geocode({ address });
          if (res.results[0]) return { lat: res.results[0].geometry.location.lat(), lng: res.results[0].geometry.location.lng() };
        } catch (e) { console.warn("Geocode failed:", address); }
        return null;
      };

      try {
        const hotelKeys = await storage.list(`hotel:${tripId}:`);
        const allDayHotels: StoredHotel[] = [];
        
        for (const key of hotelKeys.keys || []) {
          const snap = await storage.get(key);
          if (snap?.value) {
            const h = JSON.parse(snap.value) as StoredHotel;
            if (h.status === "confirmed" && h.checkIn <= date && h.checkOut >= date) { 
              allDayHotels.push(h);
            }
          }
        }

        // 1. Add Checkout Hotel first (The place you woke up)
        const checkoutHotel = allDayHotels.find(h => h.checkOut === date);
        if (checkoutHotel) {
          const coords = await getCoords(checkoutHotel.address);
          if (coords) routePoints.push({ id: `hotel-out-${checkoutHotel.id}`, ...coords, name: checkoutHotel.name, type: 'hotel', isItineraryItem: false });
        }

        // 2. Add Itinerary Items (Chronological)
        if (dayData && dayData.items) {
          for (const item of dayData.items) {
            const isTransit = item.iconType === "flight" || item.iconType === "transport";
            
            // Add Start Location (Departure)
            const startQuery = item.iconType === "flight" ? `${item.location} Airport` : item.location;
            const startCoords = await getCoords(startQuery);
            if (startCoords) {
              routePoints.push({ id: `item-start-${item.id}`, ...startCoords, name: item.activity, type: item.iconType, isItineraryItem: true });
            }

            // ⭐ NEW: If it's transit, also add the Arrival Location immediately after
            if (isTransit && (item.transitEnd || item.notes)) {
              const arrivalName = item.transitEnd || item.location; // Fallback
              const endQuery = item.iconType === "flight" ? `${arrivalName} Airport` : arrivalName;
              const endCoords = await getCoords(endQuery);
              if (endCoords) {
                routePoints.push({ id: `item-end-${item.id}`, ...endCoords, name: `Arrival: ${arrivalName}`, type: item.iconType, isItineraryItem: false });
              }
            }
          }
        }

        // 3. Add Checkin Hotel last (The place you're going to sleep)
        const checkinHotel = allDayHotels.find(h => h.checkIn === date);
        if (checkinHotel) {
          const coords = await getCoords(checkinHotel.address);
          if (coords) routePoints.push({ id: `hotel-in-${checkinHotel.id}`, ...coords, name: checkinHotel.name, type: 'hotel', isItineraryItem: false });
        }

      } catch (err) { console.error(err); }

      setPoints(routePoints);
      setIsProcessing(false);
    };

    buildRoute();
  }, [dayData, date, tripId, isLoaded]);

  useEffect(() => {
    if (points.length > 0 && mapRef.current) {
      mapRef.current.resize();
      const lngs = points.map(p => p.lng);
      const lats = points.map(p => p.lat);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 70, duration: 1500 }
      );
    }
  }, [points]);

  const lineFeatures = useMemo(() => {
    const coords = points.map(p => [p.lng, p.lat]);
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords }
    };
  }, [points]);

  const mappedCount = dayData?.items?.length || 0;

  if (!isLoaded) return <div className="w-full h-full bg-stone-100 rounded-2xl animate-pulse" />;

  return (
    <div className="w-full h-full rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col relative group bg-[#f8f9fa]">
      <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-stone-200 z-10 flex justify-between items-center pointer-events-none">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Day {dayData.day} Route</p>
          <p className="text-sm font-serif text-stone-900 leading-tight">
            {mappedCount} {mappedCount === 1 ? 'stop' : 'stops'} mapped
          </p>
        </div>
        {isProcessing && <Loader2 size={16} className="text-stone-400 animate-spin" />}
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/th0masc05/cmnj6whmn007y01sedkhwh1iu"
        projection={{ name: 'globe' }}
        interactive={true}
      >
        {points.length > 1 && (
          <Source type="geojson" data={lineFeatures as any}>
            <Layer 
              id={`route-line-${dayData.day}`}
              type="line"
              paint={{
                'line-color': '#78716c',
                'line-width': 2,
                'line-dasharray': [2, 2] 
              }}
            />
          </Source>
        )}

        {points.map((p, index) => {
          const isHotel = p.type === 'hotel';
          const pinColor = isHotel ? "#1c1917" : CATEGORY_COLORS[p.type] || "#f43f5e";
          
          return (
            <Marker key={`${p.id}-${index}`} longitude={p.lng} latitude={p.lat} anchor="center">
              <div 
                className="rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white"
                style={{ 
                  backgroundColor: pinColor, 
                  width: isHotel ? '22px' : '18px', 
                  height: isHotel ? '22px' : '18px', 
                  fontSize: isHotel ? '11px' : '9px' 
                }}
                title={p.name}
              >
                {isHotel ? "H" : ""}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}