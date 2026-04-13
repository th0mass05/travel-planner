"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import { useJsApiLoader } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { ItineraryDay, StoredHotel } from "../../types"; 
import { storage } from "../../../firebaseStore"; 
import { mapLibraries } from "../../helpers/helpers"; 
import { CATEGORY_COLORS } from "../../styling/styling"; 

type MapPoint = { id: string; lat: number; lng: number; name: string; type: string; isItineraryItem: boolean; numericId?: number; };

export default function DayMinimap({ 
  dayData, 
  date, 
  tripId, 
  onPinClick 
}: { 
  dayData: ItineraryDay; 
  date: string; 
  tripId: number; 
  onPinClick?: (itemId: number) => void; 
}) {
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries 
  });
  
  const mapRef = useRef<MapRef>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatedCoords, setAnimatedCoords] = useState<number[][]>([]);
  const animationRef = useRef<number>(0);
  useEffect(() => {
    if (points.length < 2) {
      console.log("Not enough points to animate yet");
      setAnimatedCoords([]);
      return;
    }

    console.log("Starting animation for", points.length, "points");

    const fullCoords = points.map(p => [p.lng, p.lat]);
    
    // We want to create a lot of tiny steps between the actual points
    // to make the animation smooth and visible.
    const stepsPerSegment = 30; 
    const interpolatedPath: number[][] = [];

    for (let i = 0; i < fullCoords.length - 1; i++) {
      const start = fullCoords[i];
      const end = fullCoords[i + 1];
      
      for (let j = 0; j <= stepsPerSegment; j++) {
        const ratio = j / stepsPerSegment;
        const lng = start[0] + (end[0] - start[0]) * ratio;
        const lat = start[1] + (end[1] - start[1]) * ratio;
        interpolatedPath.push([lng, lat]);
      }
    }

    let currentStep = 0;
    // Start with just the first two tiny segments so the line is valid
    setAnimatedCoords(interpolatedPath.slice(0, 2));

    const animate = () => {
      if (currentStep < interpolatedPath.length) {
        setAnimatedCoords(interpolatedPath.slice(0, currentStep));
        currentStep += 1; // Increase this number to make it faster
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Give the map 1 second to finish flyTo/zoom before drawing
    const timeout = setTimeout(animate, 1000);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearTimeout(timeout);
    };
  }, [points]);

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
        const allHotels: StoredHotel[] = [];
        for (const key of hotelKeys.keys || []) {
          const snap = await storage.get(key);
          if (snap?.value) {
            const h = JSON.parse(snap.value) as StoredHotel;
            if (h.status === "confirmed") allHotels.push(h);
          }
        }

        const morningHotel = allHotels.find(h => h.checkOut === date || (h.checkIn < date && h.checkOut > date));
        const eveningHotel = allHotels.find(h => h.checkIn === date || (h.checkIn < date && h.checkOut > date));

        // 1. Start: Morning Hotel
        if (morningHotel) {
          const coords = await getCoords(morningHotel.address);
          if (coords) {
            routePoints.push({ id: `hotel-morning-${morningHotel.id}`, ...coords, name: morningHotel.name, type: 'hotel', isItineraryItem: false });
          }
        }

        // 2. Middle: Itinerary Items (Stations/Places)
        if (dayData && dayData.items) {
          for (const item of dayData.items) {
            const query = item.iconType === "flight" ? `${item.location} Airport` : item.location;
            const coords = await getCoords(query);
            if (coords) {
              routePoints.push({ id: `item-${item.id}`, ...coords, name: item.activity, type: item.iconType, isItineraryItem: true, numericId: item.id });
            }
          }
        }

        // 3. End: Evening Hotel
        if (eveningHotel) {
          const coords = await getCoords(eveningHotel.address);
          if (coords) {
            const isDuplicate = routePoints.some(p => p.lat === coords.lat && p.lng === coords.lng);
            if (!isDuplicate) {
              routePoints.push({ id: `hotel-evening-${eveningHotel.id}`, ...coords, name: eveningHotel.name, type: 'hotel', isItineraryItem: false });
            }
          }
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
        { padding: 60, duration: 1500 }
      );
    }
  }, [points]);

  const animatedLineFeature = useMemo(() => {
  if (animatedCoords.length < 2) return null;
  return {
    type: 'Feature',
    geometry: { 
      type: 'LineString', 
      coordinates: animatedCoords 
    }
  };
}, [animatedCoords]);

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
        {animatedLineFeature && (
          <Source 
            id="route-source" 
            key={`route-${date}`} // This forces a fresh source when you change days
            type="geojson" 
            data={animatedLineFeature as any}
          >
            <Layer 
              id="route-line"
              type="line"
              paint={{
                'line-color': '#f43f5e', 
                'line-width': 2.5,
                'line-dasharray': [2, 1], 
                'line-cap': 'round',
                'line-join': 'round'
              }}
            />
          </Source>
        )}

        {points.map((p, index) => {
          const isHotel = p.type === 'hotel';
          const pinColor = isHotel ? "#1c1917" : CATEGORY_COLORS[p.type] || "#f43f5e";
          
          
          // It counts how many itinerary items exist in the points array up to this index.
          const stopNumber = p.isItineraryItem 
            ? points.slice(0, index + 1).filter(item => item.isItineraryItem).length 
            : null;

          return (
            <Marker key={`${p.id}-${index}`} longitude={p.lng} latitude={p.lat} anchor="center">
              <div 
                onClick={(e) => {
                    if (p.isItineraryItem && p.numericId && onPinClick) {
                      e.stopPropagation();
                      onPinClick(p.numericId);
                    }
                  }}
                className="rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white transition-all hover:scale-125 cursor-help"
                style={{ 
                  backgroundColor: pinColor, 
                  width: isHotel ? '22px' : '20px', 
                  height: isHotel ? '22px' : '20px', 
                  fontSize: isHotel ? '11px' : '10px' 
                }}
                title={p.name}
              >
                {/* Show "H" for hotels, otherwise show the sequential stop number */}
                {isHotel ? "H" : stopNumber}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}