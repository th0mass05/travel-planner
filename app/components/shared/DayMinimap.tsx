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
        // 1. Fetch ALL hotels for the trip
        const hotelKeys = await storage.list(`hotel:${tripId}:`);
        const allHotels: StoredHotel[] = [];
        for (const key of hotelKeys.keys || []) {
          const snap = await storage.get(key);
          if (snap?.value) {
            const h = JSON.parse(snap.value) as StoredHotel;
            if (h.status === "confirmed") allHotels.push(h);
          }
        }

        // 2. Identify "Morning" and "Evening" Hotels
        // Morning: Check-out is today OR stay includes today
        const morningHotel = allHotels.find(h => h.checkOut === date || (h.checkIn < date && h.checkOut > date));
        // Evening: Check-in is today OR stay includes today
        const eveningHotel = allHotels.find(h => h.checkIn === date || (h.checkIn < date && h.checkOut > date));

        // 3. Add Morning Hotel (Anchor Start)
        if (morningHotel) {
          const coords = await getCoords(morningHotel.address);
          if (coords) {
            routePoints.push({ id: `hotel-morning-${morningHotel.id}`, ...coords, name: morningHotel.name, type: 'hotel', isItineraryItem: false });
          }
        }

        // 4. Add Itinerary Items (Stations/Activities)
        if (dayData && dayData.items) {
          for (const item of dayData.items) {
            // We no longer need the "if (isTransit) add end" logic here
            // because the itinerary itself now contains both points!
            const query = item.iconType === "flight" ? `${item.location} Airport` : item.location;
            const coords = await getCoords(query);
            
            if (coords) {
              routePoints.push({ 
                id: `item-${item.id}`, 
                ...coords, 
                name: item.activity, 
                type: item.iconType, 
                isItineraryItem: true 
              });
            }
          }
        }

        // 5. Add Evening Hotel (Anchor End)
        // Only add if it's different from the morning hotel, or if we traveled today
        if (eveningHotel && (eveningHotel.id !== morningHotel?.id || routePoints.length > 1)) {
          const coords = await getCoords(eveningHotel.address);
          if (coords) {
            // Check if we already pushed this exact coordinate to avoid zero-length line bugs
            const isDuplicate = routePoints.some(p => p.lat === coords.lat && p.lng === coords.lng);
            if (!isDuplicate) {
              routePoints.push({ id: `hotel-evening-${eveningHotel.id}`, ...coords, name: eveningHotel.name, type: 'hotel', isItineraryItem: false });
            }
          }
        }

      } catch (err) { console.error("Route build error:", err); }

      setPoints(routePoints);
      setIsProcessing(false);
    };

    buildRoute();
  }, [dayData, date, tripId, isLoaded]);

  // Viewport adjustment
  useEffect(() => {
    if (points.length > 0 && mapRef.current) {
      mapRef.current.resize();
      const lngs = points.map(p => p.lng);
      const lats = points.map(p => p.lat);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 50, duration: 1500 }
      );
    }
  }, [points]);

  const lineFeatures = useMemo(() => {
    if (points.length < 2) return null;
    const coords = points.map(p => [p.lng, p.lat]);
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords }
    };
  }, [points]);

  if (!isLoaded) return <div className="w-full h-full bg-stone-100 rounded-2xl animate-pulse" />;

  return (
    <div className="w-full h-full rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col relative bg-[#f8f9fa]">
      <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-stone-200 z-10 flex justify-between items-center pointer-events-none">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Day {dayData.day} Route</p>
          <p className="text-sm font-serif text-stone-900 leading-tight">
            {dayData?.items?.length || 0} stops mapped
          </p>
        </div>
        {isProcessing && <Loader2 size={14} className="text-stone-300 animate-spin" />}
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/th0masc05/cmnj6whmn007y01sedkhwh1iu"
        projection={{ name: 'globe' }}
        interactive={true}
      >
        {lineFeatures && (
          <Source type="geojson" data={lineFeatures as any}>
            <Layer 
              id="route-line"
              type="line"
              paint={{
                'line-color': '#78716c',
                'line-width': 1.5,
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
                className="rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white transition-all hover:scale-125"
                style={{ 
                  backgroundColor: pinColor, 
                  width: isHotel ? '20px' : '14px', 
                  height: isHotel ? '20px' : '14px', 
                  fontSize: isHotel ? '10px' : '0px' 
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