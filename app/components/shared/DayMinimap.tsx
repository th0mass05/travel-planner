import React, { useEffect, useState, useMemo } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Loader2 } from "lucide-react";
import { ItineraryDay, StoredHotel } from "../../types"; // Adjust path
import { storage } from "../../../firebaseStore"; // Adjust path
import { mapLibraries } from "../../helpers/helpers"; // Adjust path
import { CATEGORY_COLORS } from "../../styling/styling"; // Adjust path

// Reusing your aesthetic map styles from PlacesTab
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f1f1f1" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#d4d4d4" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f1f1f1" }, { weight: 2 }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
};

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: string; // 'hotel', 'flight', 'transport', 'visit', etc.
};

export default function DayMinimap({ 
  dayData, 
  date, 
  tripId 
}: { 
  dayData: ItineraryDay; 
  date: string;
  tripId: number;
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !dayData) return;

    const buildRoute = async () => {
      setIsProcessing(true);
      const geocoder = new window.google.maps.Geocoder();
      const routePoints: MapPoint[] = [];

      // Helper to Geocode a string
      const getCoords = async (address: string): Promise<{lat: number, lng: number} | null> => {
        if (!address) return null;
        try {
          const res = await geocoder.geocode({ address });
          if (res.results[0]) {
            return { lat: res.results[0].geometry.location.lat(), lng: res.results[0].geometry.location.lng() };
          }
        } catch (e) {
          console.warn("Geocoding failed for:", address);
        }
        return null;
      };

      // 1. Find the Active Hotel for this date
      try {
        const hotelKeys = await storage.list(`hotel:${tripId}:`);
        let activeHotel: StoredHotel | null = null;
        
        for (const key of hotelKeys.keys || []) {
          const snap = await storage.get(key);
          if (snap?.value) {
            const h = JSON.parse(snap.value) as StoredHotel;
            if (h.status === "confirmed" && h.checkIn <= date && h.checkOut > date) {
              activeHotel = h;
              break; // Found where they are waking up
            }
          }
        }

        if (activeHotel && activeHotel.address) {
          const coords = await getCoords(activeHotel.address);
          if (coords) {
            routePoints.push({ id: `hotel-${activeHotel.id}`, ...coords, name: activeHotel.name, type: 'hotel' });
          }
        }
      } catch (err) {
        console.error("Error fetching hotel:", err);
      }

      // 2. Process Itinerary Items in order
      for (const item of dayData.items) {
        // If it's a flight, geocoding an airport code (e.g. "HND Airport") usually works perfectly
        const query = item.iconType === "flight" ? `${item.location} Airport` : item.location;
        const coords = await getCoords(query);
        
        if (coords) {
          routePoints.push({ 
            id: `item-${item.id}`, 
            ...coords, 
            name: item.activity, 
            type: item.iconType 
          });
        }
      }

      setPoints(routePoints);
      setIsProcessing(false);
    };

    buildRoute();
  }, [dayData, date, tripId, isLoaded]);

  // Handle Automatic Zoom & Bounds when points change
  useEffect(() => {
    if (map && points.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      
      // If there's only 1 point, zoom in manually so it doesn't zoom too close
      if (points.length === 1) {
        map.setCenter({ lat: points[0].lat, lng: points[0].lng });
        map.setZoom(14);
      } else {
        // Automatically frames the perfect view (from a city block to the whole globe)
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 }); 
      }
    }
  }, [map, points]);

  // Generate Route Segments (Lines between points)
  const routeSegments = useMemo(() => {
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      segments.push({
        id: `seg-${i}`,
        path: [{ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng }],
        type: end.type // The line style depends on what we are traveling *to*
      });
    }
    return segments;
  }, [points]);

  if (!isLoaded) return <div className="h-full bg-stone-100 rounded-2xl animate-pulse" />;

  return (
    <div className="w-full h-full bg-[#E5E3DF] rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col relative group">
      
      {/* Map Header Overlay */}
      <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-stone-200 z-10 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Day {dayData.day} Route</p>
          <p className="text-sm font-serif text-stone-900 leading-tight">
            {points.length > 0 ? `${points.length} stops mapped` : "No locations found."}
          </p>
        </div>
        {isProcessing && <Loader2 size={16} className="text-stone-400 animate-spin" />}
      </div>

      <div className="flex-1 w-full h-full relative z-0">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          options={mapOptions}
          onLoad={(m) => setMap(m)}
          // Default center before bounds take over
          center={{ lat: 20, lng: 0 }} 
          zoom={2}
        >
          {/* 1. Draw Lines */}
          {routeSegments.map((seg) => {
            const isFlight = seg.type === "flight";
            const isTrain = seg.type === "transport";

            return (
              <Polyline
                key={seg.id}
                path={seg.path}
                options={{
                  // Flights are dashed indigo, Trains are solid rose, walking/default is dotted stone
                  strokeColor: isFlight ? '#6366f1' : isTrain ? '#f43f5e' : '#78716c',
                  strokeOpacity: isFlight ? 0 : 1, // 0 for flights because we use the icons for dashing
                  strokeWeight: isTrain ? 3 : 2,
                  // Geodesic makes long flights curve beautifully over the earth's surface
                  geodesic: true, 
                  icons: isFlight ? [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '15px'
                  }] : seg.type !== "transport" ? [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                    offset: '0',
                    repeat: '10px'
                  }] : [],
                }}
              />
            );
          })}

          {/* 2. Draw Markers */}
          {points.map((p, index) => {
            const isHotel = p.type === 'hotel';
            const color = isHotel ? "#000000" : CATEGORY_COLORS[p.type] || "#f43f5e";
            
            return (
              <Marker
                key={p.id}
                position={{ lat: p.lat, lng: p.lng }}
                title={p.name}
                // Optional: Make the first and last dots slightly larger
                icon={{
                  path: "M 0, 0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0",
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  scale: isHotel ? 0.7 : 0.6, 
                  anchor: new window.google.maps.Point(0, 0),
                }}
                // Add a label inside the dot showing the stop number (skip 0 if hotel)
                label={isHotel ? { text: "H", color: "white", fontSize: "10px", fontWeight: "bold" } : { text: index.toString(), color: "white", fontSize: "10px", fontWeight: "bold" }}
              />
            );
          })}
        </GoogleMap>
      </div>
    </div>
  );
}