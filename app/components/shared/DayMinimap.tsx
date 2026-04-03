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
        // 1. Fetch ALL relevant hotels for this date
        const hotelKeys = await storage.list(`hotel:${tripId}:`);
        
        for (const key of hotelKeys.keys || []) {
          const snap = await storage.get(key);
          if (snap?.value) {
            const h = JSON.parse(snap.value) as StoredHotel;
            
            // ⭐ CHANGED: Use >= on checkOut and removed the 'break'
            // This ensures if you check out of Hotel A and into Hotel B on the same day, both show up.
            if (h.status === "confirmed" && h.checkIn <= date && h.checkOut >= date) { 
              const coords = await getCoords(h.address);
              if (coords) {
                routePoints.push({ 
                  id: `hotel-${h.id}`, 
                  ...coords, 
                  name: h.name, 
                  type: 'hotel', 
                  isItineraryItem: false 
                });
              }
            }
          }
        }

        // 2. Red-Eye Fallback (only if no hotels were found at all)
        if (routePoints.length === 0 && date) {
          const currentDateObj = new Date(date);
          if (!isNaN(currentDateObj.getTime())) {
            currentDateObj.setDate(currentDateObj.getDate() - 1);
            const yesterdayStr = currentDateObj.toISOString().split('T')[0];
            const yesterdaySnap = await storage.get(`itinerary:${tripId}:date:${yesterdayStr}`);
            
            if (yesterdaySnap?.value) {
              const yesterdayData = JSON.parse(yesterdaySnap.value);
              if (yesterdayData.items && yesterdayData.items.length > 0) {
                const lastItem = yesterdayData.items[yesterdayData.items.length - 1];
                const arrivalLocation = lastItem.transitEnd || lastItem.location; 
                const query = lastItem.iconType === "flight" ? `${arrivalLocation} Airport` : arrivalLocation;
                const coords = await getCoords(query);
                if (coords) routePoints.push({ id: `redeye-arrival`, ...coords, name: `Arrived from ${lastItem.activity}`, type: 'transport', isItineraryItem: false });
              }
            }
          }
        }

        // 3. Add Actual Itinerary Items
        if (dayData && dayData.items) {
          for (const item of dayData.items) {
            const query = item.iconType === "flight" ? `${item.location} Airport` : item.location;
            const coords = await getCoords(query);
            if (coords) routePoints.push({ id: `item-${item.id}`, ...coords, name: item.activity, type: item.iconType, isItineraryItem: true });
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
      if (points.length === 1) {
        mapRef.current.flyTo({ center: [points[0].lng, points[0].lat], zoom: 14, duration: 1500 });
      } else {
        const lngs = points.map(p => p.lng);
        const lats = points.map(p => p.lat);
        mapRef.current.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, duration: 1500 }
        );
      }
    }
  }, [points]);

  const lineFeatures = useMemo(() => {
    const features = [];
    for (let i = 0; i < points.length - 1; i++) {
      features.push({
        type: 'Feature', 
        properties: { type: points[i + 1].type },
        geometry: { type: 'LineString', coordinates: [ [points[i].lng, points[i].lat], [points[i + 1].lng, points[i + 1].lat] ] }
      });
    }
    return { type: 'FeatureCollection', features };
  }, [points]);

  const mappedCount = points.filter(p => p.isItineraryItem).length;

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
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        mapStyle="mapbox://styles/th0masc05/cmnj6whmn007y01sedkhwh1iu"
        projection={{ name: 'globe' }}
        interactive={true}
      >
        {points.length > 1 && (
          <Source type="geojson" data={lineFeatures as any}>
            <Layer 
              id={`route-general-${dayData.day}`}
              type="line"
              filter={['!in', 'type', 'flight', 'transport']}
              paint={{
                'line-color': '#78716c',
                'line-width': 2,
                'line-dasharray': [1, 2] 
              }}
            />
          </Source>
        )}

        {points.map((p, index) => {
          const isHotel = p.type === 'hotel';
          const displayIndex = p.isItineraryItem ? points.filter((pt, i) => pt.isItineraryItem && i <= index).length : null;
          const pinColor = isHotel ? "#1c1917" : CATEGORY_COLORS[p.type] || "#f43f5e";
          
          return (
            <Marker key={`${p.id}-${index}`} longitude={p.lng} latitude={p.lat} anchor="center">
              <div 
                className="rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white transition-transform hover:scale-110"
                style={{ 
                  backgroundColor: pinColor, 
                  width: isHotel ? '24px' : '20px', 
                  height: isHotel ? '24px' : '20px', 
                  fontSize: isHotel ? '12px' : '10px' 
                }}
                title={p.name}
              >
                {isHotel ? "H" : (displayIndex ?? "•")}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}