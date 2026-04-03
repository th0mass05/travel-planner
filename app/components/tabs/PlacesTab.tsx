import { auth } from "../../../firebase";   
import React, { useState, useEffect, useMemo, useRef } from "react";
import { PlaceCard } from "../../components/cards";
import {
  ConfirmToItineraryDialog, CostDialog, PlaceDialog, PlaceShoppingListDialog
} from "../../components/dialogs"; 
import { 
  ItineraryItem, PlacesTabProps, StoredPlace, PlaceFormData, ShoppingData, PlaceType, IconType
} from "../../types"; 
import { 
  deleteKey,
  removeFromItineraryBySource,
  updateItineraryBySource,
  getAvailableLocations
} from "../../helpers/helpers"; 
import { Plus } from "lucide-react";
import { storage } from "../../../firebaseStore";

// ⭐ 1. Import Mapbox and the Google API Loader for Geocoding
import MapboxMap, { Marker, Popup } from 'react-map-gl/mapbox';
import { useJsApiLoader } from '@react-google-maps/api';
import { mapLibraries } from "../../helpers/helpers";
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
  const [shoppingListPlace, setShoppingListPlace] = useState<StoredPlace | null>(null); 
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Mapbox Reference
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = storage.subscribeToList(
      `place:${tripId}:`, 
      (newPlaces: StoredPlace[]) => {
        // ⭐ FIX: Explicitly type the Map keys and values
        const uniquePlacesMap = new Map<number | string, StoredPlace>();
        
        newPlaces.forEach((p) => {
          if (!p.category) p.category = "visit";
          if (!p.locationPath) p.locationPath = []; 
          uniquePlacesMap.set(p.id, p);
        });

        // ⭐ FIX: Tell TS that this array contains StoredPlaces
        const deduplicated = Array.from(uniquePlacesMap.values()) as StoredPlace[];
        
        // Removed the 'any' casts here too since we fixed the type above!
        setPlaces(deduplicated.sort((a, b) => b.id - a.id));
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

    const oldCat = editingPlace.category || "visit";
    if (oldCat !== updated.category) {
       await deleteKey(`place:${tripId}:${oldCat}:${editingPlace.id}`);
    }
    await deleteKey(`place:${tripId}:visit:${editingPlace.id}`);
    await deleteKey(`place:${tripId}:eat:${editingPlace.id}`);

    await storage.set(`place:${tripId}:${updated.category}:${editingPlace.id}`, updated);

    if (updated.confirmed) {
       await updateItineraryBySource(tripId, `place:${updated.id}`, updated.name, updated.address);
    }
    setEditingPlace(null);
  };

  const deletePlace = async (placeId: number, category?: PlaceType) => {
    if (!confirm("Delete this place?")) return;
    await removeFromItineraryBySource(tripId, `place:${placeId}`);
    
    if (category) await deleteKey(`place:${tripId}:${category}:${placeId}`);
    await deleteKey(`place:${tripId}:visit:${placeId}`);
    await deleteKey(`place:${tripId}:eat:${placeId}`);
  };
  
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const categoryMatch = activeCategory === "all" || p.category === activeCategory;
      const path = p.locationPath || [];
      const locationMatch = activeLocationPath.every((loc, index) => path[index] === loc);
      return categoryMatch && locationMatch;
    });
  }, [places, activeCategory, activeLocationPath]);
  
  const visitedCount = filteredPlaces.filter((p) => p.visited).length;

  // We still use Google here purely to get the country coordinates!
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", 
    libraries: mapLibraries, 
  });

  useEffect(() => {
    const hasValidCoords = places.some(p => p.lat && p.lng);
    if (isLoaded && country && !hasValidCoords) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: country }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          setCountryCoords({ lat: loc.lat(), lng: loc.lng() });
        }
      });
    }
  }, [isLoaded, country, places, tripId]);

  const initialCenter = useMemo(() => {
    const firstPlaceWithCoords = places.find(p => p.lat && p.lng);
    if (firstPlaceWithCoords) return { lat: Number(firstPlaceWithCoords.lat), lng: Number(firstPlaceWithCoords.lng) };
    if (countryCoords) return countryCoords;
    return { lat: 20, lng: 0 };
  }, [places, countryCoords, tripId]); 

  const initialZoom = useMemo(() => {
    const hasPlaces = places.some(p => p.lat && p.lng);
    return hasPlaces ? 10 : 5; 
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

      {/* Cascading Location Navigation */}
      <div className="flex flex-col gap-3">
        {/* Level 0 */}
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

        {/* Level 1+ */}
        {activeLocationPath.map((selectedLoc, depth) => {
          const subLocations = getAvailableLocations(places, depth + 1, activeLocationPath);
          if (subLocations.length === 0) return null; 

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
        
        /* ⭐ Mapbox View Rendering */
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative bg-[#f8f9fa] flex items-center justify-center">
          {!isLoaded ? (
            <p className="text-stone-400 font-medium">Loading Map...</p>
          ) : (
            <>
              <MapboxMap
                ref={mapRef}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                initialViewState={{
                  longitude: initialCenter.lng,
                  latitude: initialCenter.lat,
                  zoom: initialZoom
                }}
                mapStyle="mapbox://styles/mapbox/light-v11"
                interactive={true}
                onClick={() => setSelectedPlace(null)} 
              >
                {/* 1. Map Markers */}
                {filteredPlaces.map((place) => {
                  if (!place.lat || !place.lng) return null; 
                  
                  const pinColor = CATEGORY_COLORS[place.category] || "#a8a29e";

                  return (
                    <Marker
                      key={place.id}
                      longitude={place.lng}
                      latitude={place.lat}
                      anchor="center"
                      onClick={(e: any) => {
                        e.originalEvent.stopPropagation(); // Stops map from instantly closing the popup
                        setSelectedPlace(place);
                      }}
                    >
                      {/* Tailwind Styled Dots */}
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm border-[2px] border-white cursor-pointer hover:scale-125 transition-transform"
                        style={{ backgroundColor: pinColor }}
                        title={place.name}
                      />
                    </Marker>
                  );
                })}

                {/* 2. Mapbox Popup */}
                {selectedPlace && selectedPlace.lat && selectedPlace.lng && (
                  <Popup
                    longitude={selectedPlace.lng}
                    latitude={selectedPlace.lat}
                    anchor="bottom"
                    onClose={() => setSelectedPlace(null)}
                    closeOnClick={false}
                    className="z-50"
                    maxWidth="240px"
                    offset={12} // Pushes the popup slightly above the dot
                  >
                    <div className="flex flex-col">
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
                      
                      <div className="flex gap-2 mt-2 pt-3 border-t border-stone-100">
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
                  </Popup>
                )}
              </MapboxMap>

              {/* 3. Floating Map Legend */}
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-stone-200 pointer-events-auto">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 border-b border-stone-100 pb-2">
                  Map Key
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
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

      {/* Dialogs */}
      {showAddDialog && (
        <PlaceDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(data) => {
            addPlace(data);
            setShowAddDialog(false);
          }}
          initialCategory={activeCategory !== "all" ? activeCategory : "visit"}
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
            locationPath: editingPlace.locationPath || [] 
          }}
          onClose={() => setEditingPlace(null)}
          onAdd={(data) => handleEditPlace(data)}
          allPlaces={places}
        />
      )}
    </div>
  );
}