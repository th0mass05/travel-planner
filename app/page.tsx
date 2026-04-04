"use client";
import { useRouter } from "next/navigation";
import ProfileView from "./components/ProfileView"; 
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";   
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";   
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import useUserName from "./hooks/useUserName";
import CreatorBadge from "./hooks/CreatorBadge";
import { formatDistanceToNow } from "date-fns";
import emailjs from "@emailjs/browser";
import React, { useState, useEffect, useRef, useCallback, useMemo} from "react";
import Autocomplete from "react-google-autocomplete";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import TripAuthorInfo from "./helpers/TripAuthorInfo";
import LinkedItemDetails from "./components/shared/LinkedItemDetails";
import FriendsView from "./components/FriendsView";
import NotificationToggle from "./components/shared/NotificationToggle";
import { FlightCard, HotelCard, TransportCard, PlaceCard, TripCard } from "./components/cards";
import {AdminTab, ItineraryTab, PlacesTab, PhotosTab, ScrapbookTab, ShoppingTab, BudgetTab} from "./components/tabs";
import {
  ActivityDialog, ConfirmToItineraryDialog, CostDialog, FlightDialog, HotelDialog, LocationManagerDialog, PackingDialog, PlaceDialog, PhotoDialog, ShoppingDialog, TransportDialog, TripDialog, ExpenseDialog, PlaceShoppingListDialog, SimpleCostDialog, DocumentDialog
} from "./components/dialogs" ; // Adjust this path if your dialogs are in a different folder
import { 
  TransportData, DocumentData, StoredTransport, PlaceType, PlaceData, 
  PhotoData, FlightData, HotelData, PackingData, ShoppingData, 
  ActivityData, View, TripStatus, TripFormData, TripSegment, TripData, 
  StoredFlight, StoredHotel, StoredPacking, ScrapbookEntry, 
  ScrapbookTabProps, StoredPlace, PlacesTabProps, PhotosTabProps, 
  DocumentDialogProps, PlaceFormData, PlaceDialogProps, PhotoDialogProps, 
  FlightDialogProps, HotelDialogProps, PackingDialogProps, 
  ShoppingDialogProps, ActivityDialogProps, TripDialogProps, 
  ConfirmToItineraryDialogProps, IconType, ItineraryItem, ItineraryDay, 
  HomePageProps, TripCardProps, TripViewProps, TabId 
} from "./types"; 
import { 
  createGoogleCalendarLink,
  deleteKey,
  getDatesInRange,
  compressImage,
  removeFromItineraryBySource,
  updateItineraryBySource,
  getAvailableLocations,
  mapLibraries
} from "./helpers/helpers";
import {
  iconMap,
  categoryIcons,
  CATEGORY_COLORS,
  PLACE_CATEGORIES
} from "./styling/styling"; 
import {
  Calendar,
  MapPin,
  Clock,
  Plane,
  Hotel,
  PackageCheck,
  Camera,
  Sparkles,
  Plus,
  Check,
  Star,
  Utensils,
  ChevronLeft,
  ExternalLink,
  Link as LinkIcon,
  ShoppingBag,
  Wallet,
  Train,
  FileText,
  Download,
  Trash2,
  Bell,
  BellOff,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { storage } from "../firebaseStore";
import { exp } from "firebase/firestore/pipelines";
import { actionAsyncStorage } from "next/dist/server/app-render/action-async-storage.external";
import { 
  Landmark, Car, TreePine, 
  Ticket, Palette, Wine
} from 'lucide-react';



export default function TravelJournal() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [currentView, setCurrentView] = useState("home");
  const [selectedTrip, setSelectedTrip] = useState<TripData | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [nameSaveStatus, setNameSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toastMsg, setToastMsg] = useState("");
  
  const [loading, setLoading] = useState(true);
  const handleLogout = async () => {
    await signOut(auth);
  };

  // SINGLE AUTH LISTENER (this handles redirect + loading trips)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      // user exists → load their trips
      loadTrips(user.uid);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setDisplayName(snap.data().name || "");
        }
      } catch (e) {
        console.error("Failed to load display name", e);
      }
    });

    return unsub;
  }, []);

  const updateTrip = async (tripId: number, data: TripFormData) => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Get the existing trip so we don't lose members/id/created info
    const existing = trips.find(t => t.id === tripId);
    if (!existing) return;

    const updatedTrip: TripData = {
      ...existing, // Keep ID, ownerId, members, etc.
      ...data,     // Overwrite title, image, dates, etc.
    };

    // 2. Save to DB
    await storage.set(`trip:${tripId}`, updatedTrip);

    // 3. Refresh the UI list
    await loadTrips(user.uid);
  };
  const loadTrips = async (uid: string) => {
    setLoading(true);
    const userEmail = auth.currentUser?.email;

    try {
      
      
      const allTrips = await storage.getAll<TripData>("trip:");
      
      const loadedTrips: TripData[] = [];

      // Process in memory (Instant)
      allTrips.forEach((trip) => {
         // Ensure trip data is valid
         if (!trip || !trip.id) return;

         // 1. Is user a full member?
         const isMember = trip.ownerId === uid || trip.members?.includes(uid);
         
         // 2. Is user invited?
         const isInvited = userEmail && trip.invites?.includes(userEmail);

         if (isMember) {
           loadedTrips.push(trip);
         } else if (isInvited) {
           // Add to list with pending flag
           loadedTrips.push({ ...trip, isPendingInvite: true });
         }
      });

      setTrips(loadedTrips.sort((a, b) => b.id - a.id));

    } catch (error) {
      console.error("Error loading trips:", error);
    }

    setLoading(false);
  };


  const handleRespondToInvite = async (trip: TripData, accept: boolean) => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
      // 1. Fetch fresh trip data
      const tripSnap = await storage.get(`trip:${trip.id}`);
      if (!tripSnap?.value) return;
      const currentTrip = JSON.parse(tripSnap.value);

      // 2. Remove email from 'invites'
      const newInvites = (currentTrip.invites || []).filter((e: string) => e !== user.email);
      
      let updatedTrip = { ...currentTrip, invites: newInvites };

      // 3. If accepted, add UID to 'members'
      if (accept) {
        const newMembers = [...(currentTrip.members || []), user.uid];
        updatedTrip = { ...updatedTrip, members: newMembers };
      }

      // 4. Save
      await storage.set(`trip:${trip.id}`, updatedTrip);

      // 5. Reload UI
      await loadTrips(user.uid);
      
    } catch (err) {
      console.error("Failed to respond to invite", err);
    }
  };
  const createTrip = async (tripData: TripFormData): Promise<TripData> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    const trip: TripData = {
      id: Date.now(),
      ...tripData,
      ownerId: user.uid,
      members: [user.uid],
      createdAt: new Date().toISOString(),
      createdByUid: user.uid,
    };

    await storage.set(`trip:${trip.id}`, trip);



    setSelectedTrip(trip);
    setCurrentView("trip");
    loadTrips(user.uid);

    return trip;
  };

  const deleteTrip = async (tripId: number) => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmed = confirm("Delete this trip? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteKey(`trip:${tripId}`);

      // If user was viewing it, go home
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setCurrentView("home");
      }

      // reload trips list
      await loadTrips(user.uid);

    } catch (err) {
      console.error("Delete trip failed:", err);
    }
  };



  if (currentView === "home") {
    return (
      <div className="[&_button]:cursor-pointer">
        
      {/* Logout button top right */}
      {/* GLOBAL TOP NAVIGATION */}
      <div className="flex justify-between items-center p-4 max-w-7xl mx-auto w-full">
        
        {/* LEFT SIDE: Friends */}
        <div>
          <button
            onClick={() => setCurrentView("friends")}
            className="flex items-center gap-2 px-4 py-2 bg-white text-stone-700 rounded-lg hover:bg-stone-50 text-sm font-bold uppercase tracking-wider transition-all border border-stone-200 shadow-sm"
          >
            <Users size={16} className="text-indigo-500" /> Friends
          </button>
        </div>

        {/* RIGHT SIDE: User Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 p-1 pr-2 shadow-sm hidden sm:flex">
            <div className="relative">
              <input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setNameSaveStatus("idle");
                }}
                placeholder="Your name"
                className="px-3 py-1.5 outline-none text-sm w-40 font-medium"
              />
              {nameSaveStatus === "saved" && (
                <span className="absolute right-2 top-1.5 text-emerald-500 animate-in fade-in zoom-in">
                  <CheckCircle size={16} />
                </span>
              )}
            </div>
            
            <button
              onClick={async () => {
                // ... keep your existing save name logic here ...
                const user = auth.currentUser;
                if (!user) return;
                setNameSaveStatus("saving");
                try {
                  await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    name: displayName,
                  }, { merge: true });
                  setNameSaveStatus("saved");
                  setTimeout(() => setNameSaveStatus("idle"), 3000);
                } catch (e) {
                  console.error("Failed to save name", e);
                  setNameSaveStatus("idle");
                }
              }}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${
                nameSaveStatus === "saved" 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "bg-stone-900 text-white hover:bg-stone-800"
              }`}
            >
              {nameSaveStatus === "saving" ? "..." : nameSaveStatus === "saved" ? "Saved" : "Save"}
            </button>
          </div>

          <button
            onClick={() => setCurrentView("profile")}
            className="px-4 py-2 bg-white text-stone-700 rounded-lg hover:bg-stone-50 text-sm font-bold uppercase tracking-wider border border-stone-200 shadow-sm transition-all"
          >
            Profile
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 hover:text-stone-900 text-sm font-bold uppercase tracking-wider transition-all"
          >
            Log out
          </button>
        </div>
      </div>

      <HomePage
        trips={trips}
        loading={loading}
        onSelectTrip={(trip: TripData) => {
          setSelectedTrip(trip);
          setCurrentView("trip");
        }}
        onCreateTrip={createTrip}
        onUpdateTrip={updateTrip}
        onDeleteTrip={deleteTrip}
        onRespondInvite={handleRespondToInvite}
        onOpenFriends={() => setCurrentView("friends")}
      />


      </div>
    );
  }

  if (currentView === "trip" && selectedTrip) {
    return (
      <TripView
        trip={selectedTrip}
        onBack={() => {
          setCurrentView("home");
          setSelectedTrip(null);
        }}
      />
    );
  }
  if (currentView === "profile") {
    return <ProfileView onBack={() => setCurrentView("home")} />;
  }
  if (currentView === "friends") {
    return <FriendsView onBack={() => setCurrentView("home")} />;
  }

  return null;
}

function HomePage({
  trips,
  loading,
  onSelectTrip,
  onCreateTrip,
  onUpdateTrip,
  onDeleteTrip,
  onRespondInvite,
  onOpenFriends
}: HomePageProps) {
  
  const [filter, setFilter] = useState("all"); 
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripData | null>(null);
  const handleSaveTrip = async (data: TripFormData) => {
    if (editingTrip) {
      
      await onUpdateTrip(editingTrip.id, data);
    } else {
      // Create new trip
      await onCreateTrip(data);
    }
    setShowTripDialog(false);
    setEditingTrip(null);
  };

  const openCreate = () => {
    setEditingTrip(null);
    setShowTripDialog(true);
  };

  const openEdit = (trip: TripData) => {
    setEditingTrip(trip);
    setShowTripDialog(true);
  };
  // Filter logic remains the same...
  const filteredTrips = trips.filter((trip) => {
    if (filter === "invited") return trip.isPendingInvite;
    if (trip.isPendingInvite) return false;
    if (filter === "all") return true;
    return trip.status === filter;
  });

  const inviteCount = trips.filter(t => t.isPendingInvite).length;

  

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans selection:bg-rose-100 flex flex-col">
      {/* 1. Load Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* 2. Hero Section - COMPACT VERSION */}
      <div className="relative border-b border-stone-200 bg-white pt-10 pb-8 px-8 overflow-hidden shrink-0">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-400 via-orange-300 to-blue-400" />
        
        <div className="max-w-7xl mx-auto flex justify-between items-start mb-6 relative z-20">
        {/* Top Left: Friends Button */}
          
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
             {/* BIGGER BADGE */}
             <div className="inline-block mb-4 px-6 py-2 rounded-full bg-stone-100 text-stone-700 text-sm font-bold tracking-widest uppercase shadow-sm border border-stone-200">
               Your Travel Journal
             </div>
             
             {/* SMALLER HEADLINE */}
             <h1 className="text-5xl md:text-6xl font-serif text-stone-900 mb-4 tracking-tight leading-tight">
               Collect Moments.
             </h1>
             
             <p className="text-stone-500 text-lg font-light mb-6 max-w-xl mx-auto leading-relaxed">
               Your personal archive of adventures and memories.
             </p>
             
             <button
              onClick={openCreate}
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm font-medium tracking-wide"
            >
              <Plus size={18} className="text-rose-200" /> 
              <span>Start New Journey</span>
            </button>
        </div>
      </div>

      {/* 3. Main Content Area - REDUCED WHITESPACE */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
        
        {/* Filter Tabs - REDUCED MARGIN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-2xl font-serif text-stone-900">Your Journeys</h2>
            <p className="text-stone-500 text-sm font-light">
              {trips.filter(t => !t.isPendingInvite).length} adventures recorded
            </p>
          </div>
          
          <div className="flex gap-1 p-1 bg-stone-100 rounded-lg self-start md:self-auto">
            {["all", "upcoming", "ongoing", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                  filter === f
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
                }`}
              >
                {f}
              </button>
            ))}

            <button
               onClick={() => setFilter("invited")}
               className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                 filter === "invited"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
               }`}
             >
               Invites
               {inviteCount > 0 && (
                 <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                   {inviteCount}
                 </span>
               )}
            </button>
          </div>
        </div>

        {/* Grid Area - TIGHTER GRID */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-10 h-10 bg-stone-200 rounded-full mb-3"></div>
              <div className="h-3 w-24 bg-stone-200 rounded"></div>
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-200">
            <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
              <MapPin size={24} />
            </div>
            <p className="text-stone-900 font-serif text-lg mb-1">No journeys found</p>
            <p className="text-stone-500 text-sm">Time to plan your next adventure.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => !trip.isPendingInvite && onSelectTrip(trip)}
                onDelete={() => onDeleteTrip(trip.id)}
                isInvited={trip.isPendingInvite || false}
                onEdit={() => openEdit(trip)}
                onAccept={() => onRespondInvite(trip, true)}
                onDecline={() => onRespondInvite(trip, false)}
              />
            ))}
          </div>
        )}
      </div>

      {showTripDialog && (
        <TripDialog
          initialData={editingTrip || undefined}
          onClose={() => {
            setShowTripDialog(false);
            setEditingTrip(null);
          }}
          onSubmit={handleSaveTrip}
        />
      )}
    </div>
  );
}

function TripView({ trip: initialTrip, onBack }: TripViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const [trip, setTrip] = useState<TripData>(initialTrip);
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabsAnchorRef = useRef<HTMLDivElement>(null);

  // 2. SMARTER SCROLL EFFECT
  
  useEffect(() => {
    // Add a tiny 50ms buffer to let the DOM settle and prevent the "jolt"
    const timer = setTimeout(() => {
      if (tabsAnchorRef.current) {
        // Find the exact pixel position of the top of the tabs
        const tabsPosition = tabsAnchorRef.current.getBoundingClientRect().top + window.scrollY;
        
        // Only scroll if the user has scrolled past the top of the tabs
        if (window.scrollY > tabsPosition) {
          window.scrollTo({ 
            top: tabsPosition, 
            behavior: "smooth" 
          });
        }
      }
    }, 50);

    // Cleanup the timer if the user clicks tabs really fast
    return () => clearTimeout(timer);
  }, [activeTab]);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "travelData", `trip:${initialTrip.id}`), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const realData = data.value ? JSON.parse(data.value) : data;
        setTrip((prev) => ({ ...prev, ...realData }));
      }
    });
    return () => unsub();
  }, [initialTrip.id]);

  const [summary, setSummary] = useState({
    flights: 0,
    hotels: 0,
    activities: 0,
    places: 0,
    photos: 0,
    locations: 0
  });

  
  const loadSummary = async () => {
    
    // For brevity in this snippet, I am assuming you kept the logic from the previous file.
     const getAll = async (prefix: string) => {
      const res = await storage.list(prefix);
      if (!res?.keys) return [];
      const promises = res.keys.map((key) => storage.get(key));
      const results = await Promise.all(promises);
      return results.map((r) => (r?.value ? JSON.parse(r.value) : null)).filter((i) => i !== null);
    };

    try {
      const allFlights = await getAll(`flight:${trip.id}:`);
      const flightCount = allFlights.filter((f: any) => f.status === "confirmed").length;
      const allHotels = await getAll(`hotel:${trip.id}:`);
      const hotelCount = allHotels.filter((h: any) => h.status === "confirmed").length;
      const eats = await getAll(`place:${trip.id}:eat:`);
      const visits = await getAll(`place:${trip.id}:visit:`);
      const placeCount = [...eats, ...visits].filter((p: any) => p.confirmed === true).length;
      const photoRes = await storage.list(`photo:${trip.id}:`);
      const photoCount = photoRes?.keys?.length || 0;
      const itineraryRes = await storage.list(`itinerary:${trip.id}:date:`);
      let activityCount = 0;
      if (itineraryRes?.keys) {
        for (const key of itineraryRes.keys) {
          const data = await storage.get(key);
          if (data?.value) {
            const parsed = JSON.parse(data.value);
            activityCount += parsed.items?.length || 0;
          }
        }
      }
      const uniqueLocations = new Set(trip.segments?.map((s) => s.location.trim()) || []).size;
      setSummary({ flights: flightCount, hotels: hotelCount, activities: activityCount, places: placeCount, photos: photoCount, locations: uniqueLocations });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadSummary(); }, [trip.id, trip.segments]);

  const dayCount = Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;


  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "itinerary", label: "Itinerary", icon: Calendar },
    { id: "places", label: "Places", icon: MapPin }, 
    { id: "shopping", label: "Wishlist", icon: ShoppingBag },
    { id: "photos", label: "Gallery", icon: Camera },
    { id: "scrapbook", label: "Journal", icon: Sparkles },
    { id: "admin", label: "Admin", icon: PackageCheck },
    { id: "budget", label: "Budget", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-stone-900 selection:bg-rose-100 [&_button]:cursor-pointer">
       {/* Font Style Block (Repeated here to ensure it loads if user lands directly) */}
       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* 1. HERO HEADER */}
      <div className="relative h-[40vh] min-h-[300px] w-full group">
        
        {/* Back Button (Floating) */}
        <button
            onClick={onBack}
            className="absolute top-6 left-6 z-20 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:bg-white transition-all text-sm font-bold text-stone-800 flex items-center gap-2"
        >
            <ChevronLeft size={16} /> All Journeys
        </button>

        {/* Cover Image */}
        {trip.imageUrl ? (
            <img
            src={trip.imageUrl}
            alt={trip.destination}
            className="w-full h-full object-cover brightness-[0.85]"
            />
        ) : (
            <div className={`w-full h-full bg-gradient-to-br ${trip.bgGradient}`} />
        )}
        
        {/* Title Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-20 pb-8 px-8">
            <div className="max-w-7xl mx-auto flex items-end justify-between">
                <div className="text-white">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                        <span className="uppercase tracking-widest text-xs font-bold">{trip.country}</span>
                        <span>•</span>
                        <span className="font-serif italic">{trip.year}</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-serif mb-2 tracking-tight">{trip.destination}</h1>
                    <p className="text-white/80 text-lg font-light max-w-xl">{trip.tagline}</p>
                </div>

                {/* Notification Toggle (styled dark) */}
                <div className="mb-2">
                    <NotificationToggle tripId={trip.id} />
                </div>
            </div>
        </div>
      </div>

      {/* 2. STATS BAR */}
      <div ref={tabsAnchorRef} className="h-0 w-full" style={{ scrollMarginTop: '20px' }} />

      {/* 2. STATS BAR & TABS CONTAINER (Notice we removed the ref from here!) */}
      <div className="border-b border-stone-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-stone-500 font-medium overflow-x-auto no-scrollbar">
                <span className="text-stone-900">{dayCount} Days</span>
                <span className="h-4 w-px bg-stone-200" />
                <span>{summary.locations} Locations</span>
                <span>{summary.flights} Flights</span>
                <span>{summary.activities} Activities</span>
                <span>{summary.places} Places</span>
            </div>

            {/* Dates */}
            <div className="text-stone-400 text-sm font-medium whitespace-nowrap">
                {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} 
                {' — '} 
                {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </div>
        </div>

        {/* 3. TABS NAVIGATION */}
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-8">
                {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-2 py-4 border-b-2 transition-all whitespace-nowrap ${
                        isActive
                        ? "border-stone-900 text-stone-900"
                        : "border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-200"
                    }`}
                    >
                    <Icon size={16} className={isActive ? "text-rose-500" : "group-hover:text-stone-500"} />
                    <span className={`text-sm ${isActive ? "font-bold tracking-wide" : "font-medium"}`}>
                        {tab.label}
                    </span>
                    </button>
                );
                })}
            </div>
        </div>
      </div>

      {/* 4. CONTENT AREA */}
      <div className="max-w-7xl w-full mx-auto px-6 py-12 min-h-screen">
        {activeTab === "itinerary" && <ItineraryTab trip={trip} />}
        {activeTab === "places" && <PlacesTab tripId={trip.id} country={trip.country} />}
        {activeTab === "shopping" && <ShoppingTab tripId={trip.id} />}
        {activeTab === "photos" && <PhotosTab tripId={trip.id} />}
        {activeTab === "scrapbook" && <ScrapbookTab tripId={trip.id} />}
        {activeTab === "admin" && <AdminTab tripId={trip.id} />}
        {activeTab === "budget" && <BudgetTab tripId={trip.id} />}
      </div>
    </div>
  );
}
