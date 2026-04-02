import { auth } from "../../../firebase";   // adjust path if needed
import React, { useState, useEffect, useMemo,} from "react";
import {PlaceCard} from "../../components/cards";
import {
  ConfirmToItineraryDialog, CostDialog, PlaceDialog, PlaceShoppingListDialog
} from "../../components/dialogs" ; // Adjust this path if your dialogs are in a different folder
import { 
  ItineraryItem, PlacesTabProps, StoredPlace, PlaceFormData, ShoppingData, PlaceType, IconType
} from "../../types"; // <-- Adjust this path if your types folder is somewhere else!
import { 
  deleteKey,
  removeFromItineraryBySource,
  updateItineraryBySource,
} from "../../helpers/helpers"; // Adjust this path to match your folder structure
 // Adjust this path to match your folder structure
import {
  Plus,
} from "lucide-react";
import { storage } from "../../../firebaseStore";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { mapLibraries } from "../../helpers/helpers";
import { getAvailableLocations} from "../../helpers/helpers";
import { PLACE_CATEGORIES, CATEGORY_COLORS } from "../../styling/styling";

export default function PlacesTab({ tripId, country }: PlacesTabProps) {
  const [places, setPlaces] = useState<StoredPlace[]>([]);
  const [activeCategory, setActiveCategory] = useState<PlaceType | "all">("all");
  const [activeLocationPath, setActiveLocationPath] = useState<string[]>([]);
  const [editingPlace, setEditingPlace] = useState<StoredPlace | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [confirmingPlace, setConfirmingPlace] = useState<StoredPlace | null>(null);
  const [costDialogPlace, setCostDialogPlace] = useState<StoredPlace | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<StoredPlace | null>(null);
  const [countryCoords, setCountryCoords] = useState<{lat: number, lng: number} | null>(null);
  const [shoppingItems, setShoppingItems] = useState<ShoppingData[]>([]);
  const [shoppingListPlace, setShoppingListPlace] = useState<StoredPlace | null>(null); // For the mini-dialog
  useEffect(() => {
    const unsubscribe = storage.subscribeToList(
      `place:${tripId}:`, 
      (newPlaces: StoredPlace[]) => {
        const uniquePlacesMap = new Map();
        
        newPlaces.forEach((p) => {
          if (!p.category) p.category = "visit";
          // ⭐ LEGACY FIX: Ensure old places at least have an empty array to prevent crashes
          if (!p.locationPath) p.locationPath = []; 
          uniquePlacesMap.set(p.id, p);
        });

        const deduplicated = Array.from(uniquePlacesMap.values());
        setPlaces(deduplicated.sort((a: any, b: any) => b.id - a.id));
      }
    );
    return () => unsubscribe();
  }, [tripId]);
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubShopping = storage.subscribeToList(
      `shopping:${tripId}:user:${user.uid}:`, 
      (items) => setShoppingItems(items)
    );
    return () => unsubShopping();
  }, [tripId]);
  const addPlace = async (placeData: PlaceFormData) => {
    const place: StoredPlace = {
      ...placeData,
      id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    };
    await storage.set(`place:${tripId}:${place.category}:${place.id}`, place);
  };

  const handleVisitedToggle = async (place: StoredPlace) => {
    if (place.visited) {
      const updated = { ...place, visited: false };
      delete updated.cost;
      delete updated.paidBy;
      delete updated.rating; 
      await storage.set(`place:${tripId}:${place.category}:${place.id}`, updated);
      return;
    }
    setCostDialogPlace(place);
  };

  const confirmPlace = async (place: StoredPlace, date: string, time: string) => {
    const key = `itinerary:${tripId}:date:${date}`;
    const existing = await storage.get(key);
    const targetDay = existing?.value ? JSON.parse(existing.value) : { date, items: [] };

    const newItem: ItineraryItem = {
      id: Date.now(),
      time,
      activity: place.name,
      location: place.address,
      notes: place.description || "",
      // ⭐ FIXED: Pass the exact category straight to the itinerary!
      iconType: (place.category || "visit") as IconType, 
      sourceId: `place:${place.id}`, 
      createdAt: new Date().toISOString(),
      googleMapsUrl: place.googleMapsUrl
    };

    targetDay.items.push(newItem);
    targetDay.items.sort((a: any, b: any) => a.time.localeCompare(b.time));
    await storage.set(key, targetDay);

    place.confirmed = true;
    await storage.set(`place:${tripId}:${place.category}:${place.id}`, place);
    setConfirmingPlace(null);
  };

  const unconfirmPlace = async (place: StoredPlace) => {
    await removeFromItineraryBySource(tripId, `place:${place.id}`);
    const updated = { ...place, confirmed: false, visited: false };
    delete updated.cost;
    delete updated.paidBy;
    delete updated.rating; 
    await storage.set(`place:${tripId}:${place.category}:${place.id}`, updated);
  };

  const handleEditPlace = async (formData: PlaceFormData) => {
    if (!editingPlace) return;

    const updated: StoredPlace = {
      ...editingPlace,
      ...formData
    };

    // ⭐ LEGACY CLEANUP: Delete the old key no matter what
    const oldCat = editingPlace.category || "visit";
    if (oldCat !== updated.category) {
       await deleteKey(`place:${tripId}:${oldCat}:${editingPlace.id}`);
    }
    // Also blindly delete from the old hardcoded paths just to be perfectly safe
    await deleteKey(`place:${tripId}:visit:${editingPlace.id}`);
    await deleteKey(`place:${tripId}:eat:${editingPlace.id}`);

    // Save the new one
    await storage.set(`place:${tripId}:${updated.category}:${editingPlace.id}`, updated);

    if (updated.confirmed) {
       await updateItineraryBySource(tripId, `place:${updated.id}`, updated.name, updated.address);
    }
    setEditingPlace(null);
  };

  const deletePlace = async (placeId: number, category?: PlaceType) => {
    if (!confirm("Delete this place?")) return;
    await removeFromItineraryBySource(tripId, `place:${placeId}`);
    
    // ⭐ LEGACY CLEANUP: Try deleting from all possible old paths so it never gets stuck
    if (category) await deleteKey(`place:${tripId}:${category}:${placeId}`);
    await deleteKey(`place:${tripId}:visit:${placeId}`);
    await deleteKey(`place:${tripId}:eat:${placeId}`);
  };
  
  // Strict filtering for the UI
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const categoryMatch = activeCategory === "all" || p.category === activeCategory;
      const path = p.locationPath || [];
      // To match, the place's path must contain the active path at the beginning
      // Example: If active is ["Tokyo"], places with ["Tokyo"] and ["Tokyo", "Shibuya"] both match
      const locationMatch = activeLocationPath.every((loc, index) => path[index] === loc);
      return categoryMatch && locationMatch;
    });
  }, [places, activeCategory, activeLocationPath]);
  const visitedCount = filteredPlaces.filter((p) => p.visited).length;
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  minZoom: 5,
  maxZoom: 18,
  styles: [
    // 1. Base Landscape: Very light stone/grey
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f1f1f1" }] 
    },
    // 2. Water: Darker grey to create boundary contrast
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#d4d4d4" }]
    },
    // 3. Labels: Keep City names (Tokyo, Shinjuku) but make them dark and clean
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#757575" }]
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#f1f1f1" }, { weight: 2 }]
    },
    {
      featureType: "administrative.locality",
      elementType: "labels.text",
      stylers: [{ visibility: "on" }]
    },
    // 4. Roads: The "Blueprint" effect
    {
      featureType: "road",
      elementType: "labels", 
      stylers: [{ visibility: "off" }] // Kills names and numbers
    },
    {
      featureType: "road.highway",
      elementType: "geometry.fill",
      stylers: [{ color: "#525252" }, { visibility: "on" }] // Dark grey main arteries
    },
    {
      featureType: "road.arterial",
      elementType: "geometry.fill",
      stylers: [{ color: "#8a8a8a" }, { visibility: "on" }] // Medium grey connectors
    },
    {
      featureType: "road.local",
      elementType: "geometry.fill",
      stylers: [{ color: "#bebebe" }, { visibility: "on" }] // Light grey local streets
    },
    // 5. Clutter: Hide everything else
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.province", stylers: [{ visibility: "off" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] }
  ],
};
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries, // ⭐ ADD THIS LINE
  });
  useEffect(() => {
    // Check if we actually have ANY place with valid coordinates to center on
    const hasValidCoords = places.some(p => p.lat && p.lng);

    // If API is ready, we have a country name, and NO places have coords yet...
    if (isLoaded && country && !hasValidCoords) {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ address: country }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          setCountryCoords({ lat: loc.lat(), lng: loc.lng() });
        } else {
          console.warn("Geocoding failed for:", country, status);
        }
      });
    }
  }, [isLoaded, country, places, tripId]);
  const initialCenter = useMemo(() => {
    // 1. Try to find the first place that actually has coordinates
    const firstPlaceWithCoords = places.find(p => p.lat && p.lng);
    
    if (firstPlaceWithCoords) {
      return { 
        lat: Number(firstPlaceWithCoords.lat), 
        lng: Number(firstPlaceWithCoords.lng) 
      };
    }

    // 2. If no places have coords, use the country we just geocoded
    if (countryCoords) return countryCoords;

    // 3. Desert Fallback
    return { lat: 20, lng: 0 };
  }, [places, countryCoords, tripId]); // Added 'places' here!
  const initialZoom = useMemo(() => {
    const hasPlaces = places.some(p => p.lat && p.lng);
    
    if (hasPlaces) {
      return 9; // Regional view (shows a city and its surroundings)
    }
    
    return 6; // Country view (perfect for seeing all of Japan/Italy/UK)
  }, [tripId]);
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-100 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-serif text-stone-900">Explore</h2>
          <p className="text-stone-500 mt-1">
            {visitedCount} / {filteredPlaces.length} places explored
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 flex items-center justify-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
        >
          <Plus size={18} /> Add Place
        </button>
      </div>
      {/* ⭐ NEW: Cascading Location Navigation (Updated with Stone Palette) */}
      <div className="flex flex-col gap-3">
        
        {/* Level 0: Top Level Locations (Always visible if there are any) */}
        {getAvailableLocations(places, 0, []).length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mr-2">Region:</span>
            <button
              onClick={() => setActiveLocationPath([])}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeLocationPath.length === 0
                  ? "bg-stone-800 text-white border-stone-800 shadow-md"
                  : "bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-100"
              }`}
            >
              All Locations
            </button>
            {getAvailableLocations(places, 0, []).map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveLocationPath([loc])}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  activeLocationPath[0] === loc
                    ? "bg-stone-800 text-white border-stone-800 shadow-md"
                    : "bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-100"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        )}

        {/* Level 1+: Dynamically render sub-location rows based on selection */}
        {activeLocationPath.map((selectedLoc, depth) => {
          const subLocations = getAvailableLocations(places, depth + 1, activeLocationPath);
          if (subLocations.length === 0) return null; // No children, don't render a row

          return (
            <div key={depth} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center ml-4 border-l-2 border-stone-200 pl-4 mt-1">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mr-2">Area:</span>
              <button
                onClick={() => setActiveLocationPath(activeLocationPath.slice(0, depth + 1))}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  activeLocationPath.length === depth + 1
                    ? "bg-stone-600 text-white border-stone-600 shadow-sm"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                All in {selectedLoc}
              </button>
              {subLocations.map((subLoc) => (
                <button
                  key={subLoc}
                  onClick={() => {
                    const newPath = activeLocationPath.slice(0, depth + 1);
                    newPath.push(subLoc);
                    setActiveLocationPath(newPath);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                    activeLocationPath[depth + 1] === subLoc
                      ? "bg-stone-600 text-white border-stone-600 shadow-sm"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  {subLoc}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {/* Sub-Navigation Menu */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {PLACE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
              activeCategory === cat.id
                ? "bg-stone-900 text-white border-stone-900 shadow-md"
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="flex bg-stone-100 p-1 rounded-xl w-fit self-end mb-6">
        <button 
          onClick={() => setViewMode('grid')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
        >
          Grid
        </button>
        <button 
          onClick={() => setViewMode('map')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
        >
          Map
        </button>
      </div>
      {/* Grid OR Map rendering */}
      {filteredPlaces.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-stone-200">
           <p className="text-stone-400 mb-2">No places found in this category</p>
           <button onClick={() => setShowAddDialog(true)} className="text-stone-900 font-bold underline hover:text-rose-600">
             Start adding places
           </button>
        </div>
      ) : viewMode === 'map' ? (
        /* ⭐ Map View Rendering */
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative bg-stone-100 flex items-center justify-center">
          {!isLoaded ? (
            <p className="text-stone-400 font-medium">Loading Map...</p>
          ) : (
            <>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                zoom={initialZoom}
                center={initialCenter}
                options={mapOptions}
                onClick={() => setSelectedPlace(null)} 
              >
                {/* 1. Map Markers */}
                {filteredPlaces.map((place) => {
                  if (!place.lat || !place.lng) return null; 
                  
                  // Get the assigned pastel color, default to stone if not found
                  const pinColor = CATEGORY_COLORS[place.category] || "#a8a29e";

                  return (
                    <Marker
                      key={place.id}
                      position={{ lat: place.lat, lng: place.lng }}
                      title={place.name}
                      onClick={() => setSelectedPlace(place)}
                      icon={{
                        // A perfect circle
                        path: "M 0, 0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0",
                        fillColor: pinColor,
                        fillOpacity: 1,
                        strokeColor: "#747474", // White border looks best on dots
                        strokeWeight: 3,
                        scale: 0.8, // Slightly smaller
                        // ⭐ CRITICAL: Tells the popup window to spawn dead center above the dot
                        anchor: new window.google.maps.Point(0, 0), 
                      }}
                    />
                  );
                })}

                {/* 2. The Popup Window (Info Card) */}
                {selectedPlace && selectedPlace.lat && selectedPlace.lng && (
                  <InfoWindow
                    position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                    onCloseClick={() => setSelectedPlace(null)}
                    options={{ disableAutoPan: true }}
                  >
                    <div className="p-1 max-w-[200px]">
                      {selectedPlace.imageUrl && (
                        <img 
                          src={selectedPlace.imageUrl} 
                          alt={selectedPlace.name} 
                          className="w-full h-24 object-cover rounded-md mb-2" 
                        />
                      )}
                      <h4 className="font-serif font-bold text-stone-900 text-lg leading-tight mb-1">
                        {selectedPlace.name}
                      </h4>
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                        {PLACE_CATEGORIES.find(c => c.id === selectedPlace.category)?.label || "Place"}
                      </p>
                      
                      <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                        <button 
                          onClick={() => setEditingPlace(selectedPlace)} 
                          className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
                        >
                          EDIT
                        </button>
                        <a 
                          href={selectedPlace.googleMapsUrl || `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(selectedPlace.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors ml-auto"
                        >
                          DIRECTIONS
                        </a>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>

              {/* 3. Floating Map Legend */}
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-stone-200 pointer-events-auto">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 border-b border-stone-100 pb-2">
                  Map Key
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {/* Filter out "All Places" since it doesn't have a specific pin color */}
                  {PLACE_CATEGORIES.filter(cat => cat.id !== "all").map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shadow-sm border border-stone-200/50" 
                        style={{ backgroundColor: CATEGORY_COLORS[cat.id] || "#a8a29e" }}
                      />
                      <span className="text-xs font-medium text-stone-600 whitespace-nowrap">
                        {cat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              showCategoryBadge={activeCategory === "all"}
              shoppingItems={shoppingItems}
              onToggleVisited={handleVisitedToggle}
              onOpenShoppingList={setShoppingListPlace}
              onEdit={setEditingPlace}
              onConfirm={setConfirmingPlace}
              onUnconfirm={unconfirmPlace}
              onDelete={deletePlace}
            />
          ))}
        </div>
      )}

      {showAddDialog && (
        <PlaceDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(data) => {
            addPlace(data);
            setShowAddDialog(false);
          }}
          initialCategory={activeCategory !== "all" ? activeCategory : "visit"}
          // ⭐ TIP: Pass the active location to pre-fill the form!
          initialLocationPath={activeLocationPath} 
          allPlaces={places}
        />
      )}
      {shoppingListPlace && (
        <PlaceShoppingListDialog
          place={shoppingListPlace}
          items={shoppingItems}
          onClose={() => setShoppingListPlace(null)}
        />
      )}
      {confirmingPlace && (
        <ConfirmToItineraryDialog
          title={confirmingPlace.name}
          onClose={() => setConfirmingPlace(null)}
          onConfirm={(date, time) =>
            confirmingPlace && confirmPlace(confirmingPlace, date, time)
          }
        />
      )}

      {costDialogPlace && (
        <CostDialog
          item={{ 
            item: costDialogPlace.name,
            currentRating: costDialogPlace.rating
          }}
          tripId={tripId}
          showRating={true}
          onClose={() => setCostDialogPlace(null)}
          onSave={async (cost, paidBy, rating) => {
            const updated: StoredPlace = {
              ...costDialogPlace!,
              visited: true,
              cost: Number(cost),
              paidBy,
              rating 
            };
            // Fallback for legacy categories during visit toggle
            const cat = costDialogPlace!.category || "visit";
            await storage.set(`place:${tripId}:${cat}:${costDialogPlace!.id}`, updated);
            if (!updated.confirmed) setConfirmingPlace(updated);
            setCostDialogPlace(null);
          }}
        />
      )}

      {editingPlace && (
        <PlaceDialog
          initialData={{
            name: editingPlace.name,
            description: editingPlace.description,
            address: editingPlace.address,
            rating: editingPlace.rating || "",
            imageUrl: editingPlace.imageUrl || "",
            link: editingPlace.link || "",
            visited: editingPlace.visited,
            category: editingPlace.category || "visit",
            locationPath: editingPlace.locationPath || [] // ⭐ Safely pass fallback
          }}
          onClose={() => setEditingPlace(null)}
          onAdd={(data) => handleEditPlace(data)}
          allPlaces={places}
        />
      )}
    </div>
  );
}