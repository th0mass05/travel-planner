"use client";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";   // adjust path if needed
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";   // adjust path if needed
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import useUserName from "./hooks/useUserName";
import CreatorBadge from "./hooks/CreatorBadge";
import { formatDistanceToNow } from "date-fns";
import emailjs from "@emailjs/browser";

import React, { useState, useEffect, useRef } from "react";
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
  FileText, // Add this
  Download, // Add this
  Trash2,   // Add this (optional, for cleaner delete icons)
  Bell,
  BellOff,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { storage } from "../firebaseStore";
import { exp } from "firebase/firestore/pipelines";
import { actionAsyncStorage } from "next/dist/server/app-render/action-async-storage.external";

// Helper to generate a "Add to Google Calendar" URL
const createGoogleCalendarLink = (
  activity: string,
  location: string,
  note: string,
  date: string,
  time: string
) => {
  // Format: YYYYMMDDTHHMMSS
  // Simple concatenation assuming local time (floating time)
  const cleanDate = date.replace(/-/g, "");
  const cleanTime = time ? time.replace(/:/g, "") + "00" : "090000";
  
  const startDateTime = `${cleanDate}T${cleanTime}`;
  
  // Calculate end time (default +1 hour)
  let endHour = parseInt(cleanTime.substring(0, 2)) + 1;
  const endDateTime = `${cleanDate}T${endHour.toString().padStart(2, "0")}${cleanTime.substring(2)}`;

  const details = encodeURIComponent(`${note}\n\nAdded via Travel Journal`);
  const text = encodeURIComponent(activity);
  const loc = encodeURIComponent(location);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${loc}`;
};

const deleteKey = async (key: string) => {
  try {
    // attempt delete if supported (runtime check)
    const s = storage as any;

    if (typeof s.delete === "function") {
      await s.delete(key);
    } else {
      // fallback for Firebase/local storage systems
      await storage.set(key, { __deleted: true });
    }
  } catch (err) {
    console.error("Delete failed:", err);
  }
};


export type TransportData = {
  type: string;
  code?: string;
  departure: string;
  arrival: string;
  date?: string;
  time?: string;
  price?: string;
  link?: string;
  details?: string;
  status?: "potential" | "confirmed";

};

export type DocumentData = {
  id: number;
  name: string;
  category: "Tickets" | "Reservations" | "Insurance" | "ID" | "Other";
  fileUrl: string;      // Base64 string of the file
  fileName: string;     // Original filename (e.g., "flight-ticket.pdf")
  fileType: string;     // MIME type (e.g., "application/pdf")
  createdByUid?: string | null;
  createdAt?: string;
};

export type StoredTransport = TransportData & {
  id:number;
  createdByUid?:string|null;
  createdAt?:string;
  cost?:string;
  price?: string | number; 
  paidBy?:{uid:string,amount:number}[];
};


export type PlaceType = "eat" | "visit";

export type PlaceData = {
  id: number;              // REQUIRED for storage, delete, confirm, sorting
  name: string;
  description: string;
  address: string;

  rating?: string;         // optional
  imageUrl?: string;       // optional
  link?: string;           // optional

  visited: boolean;
  confirmed?: boolean;
  createdAt?: string;        // ISO date string
  createdByUid?: string | null;
};


export type PhotoData = {
  url: string;         // base64 or URL
  caption: string;
  date: string;        // yyyy-mm-dd
  location: string;
  createdByUid?: string | null;
};

export type FlightData = {
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;

  date: string;
  time: string;

  // ⭐ NEW FIELDS
  arrivalDate?: string;
  arrivalTime?: string;
  duration?: string;

  returnDate?: string;
  returnTime?: string;

  link?: string;
  status: string;

  price?: string;
  details?: string;
  createdAt?: string;
  createdByUid?: string | null;
};



export type HotelData = {
  id?: number;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  confirmationNumber: string;
  link: string;
  status: "potential" | "confirmed";
  price?: string;      // NEW
  details?: string;    // NEW
  createdByUid?: string | null;
  createdAt?: string;

};


export type PackingData = {
  category: string;
  item: string;
  packed?: boolean;
  createdByUid?: string | null;
  createdAt?: string;
};

export type ShoppingData = {
  id?: number;
  bought?: boolean;
  item: string;
  category: string;
  link?: string;
  notes?: string;
  createdByUid?: string | null;
  createdAt?: string;
};


export type ActivityData = {
  time: string;
  activity: string;
  location: string;
  notes?: string;
  iconType: string;
  createdAt?: string;
};

export type View = "home" | "trip";

export type TripStatus = "upcoming" | "ongoing" | "completed";

type TripFormData = {
  destination: string;
  country: string;
  year: number;
  tagline: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  imageUrl: string;
  bgGradient: string;
};

// Add this near your other types
export type TripSegment = {
  id: string;
  location: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  color: string;     // e.g., "bg-blue-100"
};

// Update TripData
type TripData = TripFormData & {
  id: number;
  createdAt: string;
  ownerId: string;
  members: string[];
  createdByUid?: string | null;
  segments?: TripSegment[];
  invites?: string[]; // ⭐ NEW: Stores emails of invited people
  isPendingInvite?: boolean; // ⭐ NEW: Local helper flag for UI
};


const iconMap = {
  flight: Plane,
  hotel: Hotel,
  eat: Utensils,
  visit: MapPin,
  activity: Clock,
  custom: Star,
  transport: Train,
   // fallback for manual picks
};


// Helper to get all dates between start and end
const getDatesInRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];

  // Iterate from start to end date
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current).toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Dialog Components




type PlaceFormData = {
  name: string;
  description: string;
  address: string;
  rating: string;
  imageUrl: string;
  link: string;
  visited: boolean;
};

type PlaceDialogProps = {
  onClose: () => void;
  onAdd: (data: PlaceFormData) => void;
  type: PlaceType;
  initialData?: PlaceFormData;
};

function PlaceDialog({ onClose, onAdd, type, initialData }: PlaceDialogProps) {
  const [formData, setFormData] = useState<PlaceFormData>(
    initialData || { // ⭐ Use initialData if provided
      name: "",
      description: "",
      address: "",
      rating: "",
      imageUrl: "",
      link: "",
      visited: false,
    }
  );


  // Inside PlaceDialog ...

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress image before setting state
        const compressedBase64 = await compressImage(file);
        setFormData({ ...formData, imageUrl: compressedBase64 });
      } catch (err) {
        console.error("Image compression failed", err);
        alert("Failed to load image. Please try another.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">
          Add {type === "eat" ? "Restaurant" : "Place"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder={
                type === "eat" ? "e.g., Sushi Saito" : "e.g., Tokyo Tower"
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              rows={2}
              placeholder="Brief description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="Full address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Website Link (optional)
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Rating (optional)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) =>
                  setFormData({ ...formData, rating: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., 4.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Image (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {formData.imageUrl && (
              <div className="mt-2">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              {initialData ? "Save Changes" : `Add ${type === "eat" ? "Restaurant" : "Place"}`}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to compress images before saving
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        
        // ⭐ UPDATED: Increased from 800 to 1920 for clear HD banners
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // ⭐ UPDATED: Increased quality to 0.8 (80%) for sharper details
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Add this new component to handle "Who and When"
function TripAuthorInfo({ 
  uid, 
  createdAt, 
  className = "" 
}: { 
  uid?: string | null; 
  createdAt?: string; 
  className?: string; 
}) {
  const [name, setName] = useState<string>("");
  
  useEffect(() => {
    if (!uid) return;
    
    // 1. Check if it's the current user
    if (auth.currentUser?.uid === uid) {
      setName("You");
      return;
    }

    // 2. Otherwise fetch user name
    const fetchName = async () => {
      try {
        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || data.displayName || "Unknown");
        } else {
          setName("Unknown Traveler");
        }
      } catch (e) {
        setName("Unknown");
      }
    };
    fetchName();
  }, [uid]);

  if (!uid && !createdAt) return null;

  return (
    <div className={`flex items-center gap-1 text-xs text-gray-400 italic ${className}`}>
      {uid && <span>{name}</span>}
      {uid && createdAt && <span>•</span>}
      {createdAt && (
        <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
      )}
    </div>
  );
}

type PhotoDialogProps = {
  onClose: () => void;
  onAdd: (data: PhotoData) => void;
};

function PhotoDialog({ onClose, onAdd }: PhotoDialogProps) {
  const [formData, setFormData] = useState<PhotoData>({
    url: "", caption: "", date: "", location: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    /* ... keep existing compression logic ... */
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setFormData(prev => ({ ...prev, url: compressedBase64 }));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Add Photo</h3>
        
        <div className="space-y-5">
          {/* Custom File Input Styling */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Image</label>
            <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                    formData.url ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-400"
                }`}>
                    {formData.url ? (
                        <img src={formData.url} alt="Preview" className="h-40 object-cover rounded-lg shadow-sm" />
                    ) : (
                        <div className="py-6 text-stone-400 group-hover:text-stone-600">
                            <Camera size={32} className="mx-auto mb-2" />
                            <span className="text-sm font-medium">Click to upload photo</span>
                        </div>
                    )}
                </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Caption</label>
            <input
              type="text"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="What's happening?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                placeholder="Where?"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-2">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Save Memory
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FlightDialogProps = {
  onClose: () => void;
  onAdd: (data: FlightData) => void;
  initialData?: FlightData; // optional, used for edit mode
};

function FlightDialog({ onClose, onAdd, initialData }: FlightDialogProps) {
  const [formData, setFormData] = useState<FlightData>(
    initialData ?? {
      airline: "", flightNumber: "", 
      departure: "", arrival: "",
      date: "", time: "",
      arrivalDate: "", arrivalTime: "", duration: "", // NEW Defaults
      link: "", status: "potential", price: "", details: "",
      createdAt: new Date().toISOString(),
    }
  );

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">
            {initialData ? "Edit Flight" : "Add Flight"}
        </h3>
        
        <div className="space-y-6">
          {/* Airline & Flight No */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Airline</label>
              <input
                type="text"
                value={formData.airline}
                onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
                placeholder="e.g. BA"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Flight No.</label>
              <input
                type="text"
                value={formData.flightNumber}
                onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
                placeholder="e.g. 123"
              />
            </div>
          </div>

          {/* DEPARTURE SECTION */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
            <h4 className="text-xs font-bold uppercase text-stone-400 tracking-widest flex items-center gap-2">
              <Plane size={12} className="rotate-[-45deg]" /> Departure
            </h4>
            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-1">
                 <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Airport</label>
                 <input
                    value={formData.departure}
                    onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm font-bold uppercase"
                    placeholder="LHR"
                 />
               </div>
               <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* ARRIVAL SECTION */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
            <h4 className="text-xs font-bold uppercase text-stone-400 tracking-widest flex items-center gap-2">
              <Plane size={12} className="rotate-[45deg]" /> Arrival
            </h4>
            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-1">
                 <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Airport</label>
                 <input
                    value={formData.arrival}
                    onChange={(e) => setFormData({ ...formData, arrival: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm font-bold uppercase"
                    placeholder="JFK"
                 />
               </div>
               <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.arrivalDate || formData.date} // Default to dep date logic if empty visually
                      onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.arrivalTime || ""}
                      onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                      className="w-full px-2 py-2 border border-stone-300 rounded-md focus:border-stone-900 outline-none text-sm"
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* Duration & Price */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Duration</label>
                <input
                    type="text"
                    value={formData.duration || ""}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                    placeholder="e.g. 8h 30m"
                />
             </div>
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Price</label>
                <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                    placeholder="Total Cost"
                />
             </div>
          </div>

          {/* Status & Details */}
          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
                >
                  <option value="potential">Potential</option>
                  <option value="confirmed">Confirmed</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Details</label>
                <textarea
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                    placeholder="Seat numbers, terminal info..."
                    rows={2}
                />
             </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              {initialData ? "Save Changes" : "Add Flight"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


type HotelDialogProps = {
  onClose: () => void;
  onAdd: (data: HotelData) => void;
  initialData?: HotelData;
};

function HotelDialog({ onClose, onAdd, initialData }: HotelDialogProps) {
  const [formData, setFormData] = useState<HotelData>(
    initialData || {
      name: "", address: "", checkIn: "", checkOut: "",
      confirmationNumber: "", link: "", status: "potential",
      price: "", details: "", createdAt: new Date().toISOString(),
    }
  );

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">
          {initialData ? "Edit Accommodation" : "Add Accommodation"}
        </h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Hotel Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="e.g. Grand Hyatt Tokyo"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="Full Address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Check-in</label>
              <input
                type="date"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Check-out</label>
              <input
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Conf. Number</label>
               <input
                 type="text"
                 value={formData.confirmationNumber}
                 onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                 placeholder="#12345"
               />
            </div>
            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Total Cost</label>
               <input
                 type="text"
                 value={formData.price}
                 onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                 placeholder="e.g. £450"
               />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Details</label>
            <textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              rows={2}
              placeholder="Room type, breakfast included..."
            />
          </div>

          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Booking Link</label>
             <input
               type="url"
               value={formData.link}
               onChange={(e) => setFormData({ ...formData, link: e.target.value })}
               className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
               placeholder="https://..."
             />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
            >
              <option value="potential">Potential Option</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              {initialData ? "Save Changes" : "Add Hotel"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type PackingDialogProps = {
  onClose: () => void;
  onAdd: (data: PackingData) => void;
};

function PackingDialog({ onClose, onAdd }: PackingDialogProps) {
  const [formData, setFormData] = useState<PackingData>({
    category: "Clothing", item: "", createdAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Add Packing Item</h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
            >
              <option value="Clothing">Clothing</option>
              <option value="Toiletries">Toiletries</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
              <option value="Accessories">Accessories</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Item Name</label>
            <input
              type="text"
              autoFocus
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="e.g. Passport, Camera Charger"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Add to List
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ShoppingDialogProps = {
  onClose: () => void;
  onAdd: (data: ShoppingData) => void;
};


function ShoppingDialog({ onClose, onAdd }: ShoppingDialogProps) {
  const [formData, setFormData] = useState<ShoppingData>({
    item: "", category: "", link: "", notes: "",
    createdAt: new Date().toISOString(),
  });

  const handleSubmit = () => {
    if (!formData.item) return;
    onAdd({ ...formData, category: formData.category || "General" });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Add Shopping Item</h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Item Name</label>
            <input
              type="text"
              autoFocus
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
              placeholder="e.g., Vintage Camera"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              placeholder="e.g., Souvenirs"
            />
          </div>

          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Link (Optional)</label>
             <input
               type="url"
               value={formData.link}
               onChange={(e) => setFormData({ ...formData, link: e.target.value })}
               className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
               placeholder="https://..."
             />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none transition-all"
              rows={2}
              placeholder="Color, size, max price..."
            />
          </div>

          <div className="flex gap-3 pt-4 mt-2">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Add Item
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ActivityDialogProps = {
  onClose: () => void;
  onAdd: (data: ActivityData) => void;
  initialData?: ActivityData; // ⭐ NEW PROP
};

function ActivityDialog({ onClose, onAdd, initialData }: ActivityDialogProps) {
  const [formData, setFormData] = useState<ActivityData>(
    initialData || { // ⭐ Use initialData
      time: "",
      activity: "",
      location: "",
      notes: "",
      iconType: "activity",
      createdAt: new Date().toISOString(),
    }
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Add Activity</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Activity</label>
            <input
              type="text"
              value={formData.activity}
              onChange={(e) =>
                setFormData({ ...formData, activity: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="What are you doing?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="Where?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Icon</label>
            <select
              value={formData.iconType}
              onChange={(e)=>
                setFormData({...formData, iconType:e.target.value})
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer"
            >
              <option value="activity">General Activity</option>
              <option value="visit">Place to Visit</option>
              <option value="eat">Restaurant / Food</option>
              <option value="flight">Flight</option>
              <option value="hotel">Hotel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              {initialData ? "Save Changes" : "Add Activity"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// Add/Replace this component
type TripDialogProps = {
  initialData?: TripData; // If present, we are editing
  onClose: () => void;
  onSubmit: (data: TripFormData) => Promise<void>;
};

function TripDialog({ initialData, onClose, onSubmit }: TripDialogProps) {
  const [formData, setFormData] = useState<TripFormData>(
    initialData
      ? {
          destination: initialData.destination,
          country: initialData.country,
          startDate: initialData.startDate,
          endDate: initialData.endDate,
          year: initialData.year, // Keep as number
          tagline: initialData.tagline,
          imageUrl: initialData.imageUrl || "",
          bgGradient: initialData.bgGradient || "from-stone-200 to-stone-300",
          status: initialData.status || "upcoming",
        }
      : {
          destination: "",
          country: "",
          startDate: "",
          endDate: "",
          year: new Date().getFullYear(), // ⭐ FIX: Removed .toString()
          tagline: "",
          imageUrl: "",
          bgGradient: "from-rose-100 to-teal-100",
          status: "upcoming",
        }
  );

  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file); // Uses your existing helper
        setFormData({ ...formData, imageUrl: compressed });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.destination || !formData.startDate || !formData.endDate) {
      alert("Please fill in the destination and dates.");
      return;
    }
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">
          {initialData ? "Edit Journey" : "Start New Journey"}
        </h3>

        <div className="space-y-5">
          {/* Destination & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Destination</label>
              <input
                autoFocus
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                placeholder="e.g. Kyoto"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
                placeholder="e.g. Japan"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tagline / Caption</label>
            <textarea
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="e.g. Cherry blossoms and ancient temples..."
              rows={2}
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Cover Image</label>
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden transition-all ${
                  formData.imageUrl ? "border-stone-900" : "border-stone-300 hover:border-stone-400"
              }`}>
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-stone-400 flex flex-col items-center">
                    <Camera size={24} className="mb-2" />
                    <span className="text-xs font-bold">Upload Cover Photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? "Saving..." : initialData ? "Update Journey" : "Create Journey"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ConfirmToItineraryDialogProps = {
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  title: string;
};


function ConfirmToItineraryDialog({
  onClose,
  onConfirm,
  title,
}: ConfirmToItineraryDialogProps) {

  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h3 className="text-xl font-serif mb-4">Confirm "{title}"</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer"
              value={time}
              onChange={(e)=>setTime(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={()=>onConfirm(date,time)}
              className="flex-1 bg-gray-900 text-white py-2 rounded-lg"
            >
              Confirm
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


type IconType = "activity" | "visit" | "eat" | "flight" | "hotel" | "transport";

type ItineraryItem = {
  id: number;
  time: string;
  activity: string;
  location: string;
  notes: string;
  iconType: IconType;
  createdByUid?: string | null;
  createdAt?: string;
  sourceId?: string; // ⭐ NEW: Links to original Place ID (e.g., "place:123")
};

type ItineraryDay = {
  day: number;
  date: string;
  items: ItineraryItem[];
};

// ⭐ NEW: Remove from Itinerary if Unconfirmed/Deleted
const removeFromItineraryBySource = async (tripId: number, sourceId: string) => {
  // We have to search all days because we don't know the date
  const keys = await storage.list(`itinerary:${tripId}:date:`);
  if (!keys || !keys.keys) return;

  for (const key of keys.keys) {
    const daySnap = await storage.get(key);
    if (daySnap?.value) {
      const dayData = JSON.parse(daySnap.value);
      const originalLen = dayData.items.length;
      
      // Filter out the item linked to this place
      dayData.items = dayData.items.filter((i: ItineraryItem) => i.sourceId !== sourceId);

      // If changed, save back
      if (dayData.items.length !== originalLen) {
        await storage.set(key, dayData);
      }
    }
  }
};

// ⭐ NEW: Update Itinerary if Place is Modified
const updateItineraryBySource = async (tripId: number, sourceId: string, newName: string, newLoc: string) => {
  const keys = await storage.list(`itinerary:${tripId}:date:`);
  if (!keys || !keys.keys) return;

  for (const key of keys.keys) {
    const daySnap = await storage.get(key);
    if (daySnap?.value) {
      const dayData = JSON.parse(daySnap.value);
      let changed = false;

      dayData.items = dayData.items.map((i: ItineraryItem) => {
        if (i.sourceId === sourceId) {
          changed = true;
          return { ...i, activity: newName, location: newLoc };
        }
        return i;
      });

      if (changed) {
        await storage.set(key, dayData);
      }
    }
  }
};

const addToItineraryStorage = async (
  tripId: number,
  date: string,
  time: string,
  activity: string,
  location: string,
  notes: string = "",
  iconType: IconType = "activity"
): Promise<void> => {
  if (!date) return;

  // 1. Save to Database (Standard Logic)
  const key = `itinerary:${tripId}:date:${date}`;
  const existing = await storage.get(key);
  let targetDay: ItineraryDay;

  if (existing?.value) {
    targetDay = JSON.parse(existing.value) as ItineraryDay;
  } else {
    targetDay = { day: 0, date, items: [] };
  }

  const newItem = {
    id: Date.now(),
    time,
    activity,
    location,
    notes,
    iconType
  };

  targetDay.items.push(newItem);
  targetDay.items.sort((a: ItineraryItem, b: ItineraryItem) =>
    (a.time || "").localeCompare(b.time || "")
  );

  await storage.set(key, targetDay);

  // ---------------------------------------------------------
  // 2. ⭐ NEW: Notification Trigger Logic
  // ---------------------------------------------------------
  // ... inside addToItineraryStorage ...

  // 2. ⭐ REAL Notification Trigger Logic
  try {
    // A. Fetch Subscribers
    const snap = await storage.get(`settings:${tripId}:notifications`);
    if (snap?.value) {
      const settings = JSON.parse(snap.value);
      
      // B. Filter: Who wants emails?
      const recipients = Object.values(settings)
        .filter((u: any) => u.enabled && u.email)
        .map((u: any) => u.email);

      if (recipients.length > 0) {
        // C. Generate Calendar Link
        const calendarLink = createGoogleCalendarLink(
           activity, 
           location, 
           notes, 
           date, 
           time
        );

        // D. Prepare the message for the template
        const templateParams = {
          subject: `New Activity: ${activity} in ${location}`,
          message: `
            Hey! A new activity has been added to the trip.
            
            What: ${activity}
            When: ${date} at ${time}
            Where: ${location}
            
            Add to Google Calendar:
            ${calendarLink}
          `,
          to_email: recipients.join(","), // EmailJS will send to comma-separated list
        };

        // E. SEND REAL EMAIL 🚀
        // Replace these strings with your actual IDs from Step 1
        const SERVICE_ID = "service_b2fw42k";   // e.g. "service_x9..."
        const TEMPLATE_ID = "template_3khbgqf"; // e.g. "template_a5..."
        const PUBLIC_KEY = "rOp_TDdIEYOIqxNii";   // e.g. "user_123..."

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        
        console.log("✅ Email sent successfully to:", recipients);
        
      }
    }
  } catch (err) {
    console.error("Failed to send email:", err);
  }
};


function FlightCard({
  flight,
  onConfirm,
  onEdit,
  onDelete
}: {
  flight: StoredFlight;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative flex flex-col h-full hover:border-stone-300">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <Plane size={18} />
          </div>
          <div>
             <h4 className="text-lg font-serif font-bold text-stone-900">{flight.airline}</h4>
             <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">{flight.flightNumber}</p>
          </div>
        </div>
        {flight.status !== "confirmed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            Confirm
          </button>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Check size={12} strokeWidth={3} /> Confirmed
          </span>
        )}
      </div>

      <div className="flex-1 space-y-5 mb-4">
        
        {/* Route Visualization */}
        <div className="flex items-center justify-between text-stone-800 px-1">
           <div className="text-center">
              <span className="block text-2xl font-serif">{flight.departure}</span>
              <span className="text-xs text-stone-400 font-bold uppercase">Depart</span>
           </div>
           
           {/* Duration Line */}
           <div className="flex-1 flex flex-col items-center px-4">
              {flight.duration && (
                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">{flight.duration}</span>
              )}
              <div className="w-full border-t border-stone-300 relative">
                 <Plane size={12} className="absolute -top-[6px] left-1/2 -ml-1.5 text-stone-300 rotate-90" />
              </div>
           </div>

           <div className="text-center">
              <span className="block text-2xl font-serif">{flight.arrival}</span>
              <span className="text-xs text-stone-400 font-bold uppercase">Arrive</span>
           </div>
        </div>

        {/* Times Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
           {/* Departure Info */}
           <div className="bg-stone-50 px-3 py-2.5 rounded-lg">
              <span className="block text-xs text-stone-400 uppercase font-bold mb-0.5">Departure</span>
              <div className="font-bold text-stone-800">{flight.time}</div>
              <div className="text-xs text-stone-500">
                {new Date(flight.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
              </div>
           </div>

           {/* Arrival Info */}
           <div className="bg-stone-50 px-3 py-2.5 rounded-lg text-right">
              <span className="block text-xs text-stone-400 uppercase font-bold mb-0.5">Arrival</span>
              <div className="font-bold text-stone-800">{flight.arrivalTime || "—"}</div>
              <div className="text-xs text-stone-500">
                {flight.arrivalDate ? new Date(flight.arrivalDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : "—"}
              </div>
           </div>
        </div>

        {/* Cost & Details */}
        {(flight.price || flight.details) && (
          <div className="flex flex-wrap items-baseline gap-6 pt-2 text-sm text-stone-600">
            {flight.price && (
               <div className="flex-shrink-0">
                 Cost: <span className="font-bold text-stone-900 text-base">{flight.price}</span>
               </div>
            )}
            {flight.details && (
               <div className="italic text-stone-500 leading-relaxed">
                 "{flight.details}"
               </div>
            )}
          </div>
        )}
        
        <div className="pt-2 border-t border-stone-100">
           <TripAuthorInfo uid={flight.createdByUid} createdAt={flight.createdAt} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wide border-t border-stone-100 pt-4 mt-auto">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="text-stone-400 hover:text-stone-900 transition-colors"
        >
          Edit
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="text-red-300 hover:text-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}


export default function TravelJournal() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [currentView, setCurrentView] = useState("home");
  const [selectedTrip, setSelectedTrip] = useState<TripData | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [nameSaveStatus, setNameSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [loading, setLoading] = useState(true);
  const handleLogout = async () => {
    await signOut(auth);
  };

  // ⭐ SINGLE AUTH LISTENER (this handles redirect + loading trips)
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
      // 🚀 OPTIMIZATION: Fetch ALL trips in 1 single request
      // This uses the 'getAll' helper we added to firebaseStore.ts earlier
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
      <div className="flex justify-end items-center gap-3 p-4">
        <div className="flex items-center gap-2 bg-white rounded-lg border p-1 pr-2 shadow-sm">
          <div className="relative">
            <input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setNameSaveStatus("idle"); // Reset status on type
              }}
              placeholder="Your name"
              className="px-3 py-1.5 outline-none text-sm w-40"
            />
            {nameSaveStatus === "saved" && (
              <span className="absolute right-2 top-1.5 text-green-500 animate-in fade-in zoom-in">
                <CheckCircle size={16} />
              </span>
            )}
          </div>
          
          <button
            onClick={async () => {
              const user = auth.currentUser;
              if (!user) return;
              
              setNameSaveStatus("saving");
              try {
                await setDoc(doc(db, "users", user.uid), {
                  email: user.email,
                  name: displayName,
                }, { merge: true });
                
                setNameSaveStatus("saved");
                // Reset checkmark after 3 seconds
                setTimeout(() => setNameSaveStatus("idle"), 3000);
              } catch (e) {
                console.error("Failed to save name", e);
                setNameSaveStatus("idle");
              }
            }}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded transition-all ${
              nameSaveStatus === "saved" 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            {nameSaveStatus === "saving" ? "..." : nameSaveStatus === "saved" ? "Saved" : "Save"}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400 text-sm font-medium"
        >
          Log out
        </button>
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

  return null;
}


type HomePageProps = {
  trips: TripData[];
  loading: boolean;
  onSelectTrip: (trip: TripData) => void;
  onCreateTrip: (trip: TripFormData) => Promise<TripData>;
  onUpdateTrip: (tripId: number, data: TripFormData) => Promise<void>;
  onDeleteTrip: (tripId: number) => void;
  onRespondInvite: (trip: TripData, accept: boolean) => void; // ⭐ NEW PROP
};
function HomePage({
  trips,
  loading,
  onSelectTrip,
  onCreateTrip,
  onUpdateTrip,
  onDeleteTrip,
  onRespondInvite,
}: HomePageProps) {
  
  const [filter, setFilter] = useState("all"); 
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripData | null>(null);
  const handleSaveTrip = async (data: TripFormData) => {
    if (editingTrip) {
      // ⭐ Use the prop from parent to update and reload
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


// Update the props definition
type TripCardProps = {
  trip: TripData;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void; // ⭐ Add this
  isInvited: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
};

function TripCard({ trip, onClick, onDelete, onEdit, isInvited, onAccept, onDecline }: TripCardProps) {
  // ... (keep existing statusConfig and config logic) ...
  const statusConfig: Record<TripStatus, { label: string; className: string }> = {
    upcoming: { label: "Upcoming", className: "bg-amber-100 text-amber-800 border-amber-200" },
    ongoing:  { label: "Happening Now", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    completed:{ label: "Completed", className: "bg-stone-100 text-stone-600 border-stone-200" },
  };
  const config = statusConfig[trip.status] || statusConfig.upcoming;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col bg-white rounded-2xl transition-all duration-300 ${
        !isInvited ? "hover:-translate-y-2 cursor-pointer" : ""
      }`}
    >
      {/* ... (Keep existing Image Container & Content Header) ... */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md group-hover:shadow-2xl transition-all duration-500">
         {/* ... keep existing image logic ... */}
         {trip.imageUrl ? (
          <img src={trip.imageUrl} alt={trip.destination} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${trip.bgGradient || "from-stone-200 to-stone-300"}`} />
        )}
        {/* ... keep badge logic ... */}
         <div className="absolute top-4 left-4 z-10">
          {isInvited ? (
             <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><Users size={12} /> Invited</div>
          ) : (
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm backdrop-blur-md bg-white/90 ${config.className}`}>{config.label}</div>
          )}
        </div>
      </div>

      <div className="pt-5 px-2 pb-2 flex-1 flex flex-col">
        {/* ... (Keep existing text content) ... */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-2xl font-serif text-stone-900 group-hover:text-rose-900 transition-colors">{trip.destination}</h3>
          <span className="font-serif text-stone-400 text-lg italic">{trip.year}</span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-500 text-sm font-medium mb-3 uppercase tracking-wide">
          <MapPin size={14} className="text-rose-400" />{trip.country}
        </div>
        <p className="text-stone-600 text-sm leading-relaxed line-clamp-2 mb-4">{trip.tagline}</p>

        {/* Footer Actions */}
        <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400">
               {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>

            {isInvited ? (
               <div className="flex gap-2">
                 {/* ... keep invite buttons ... */}
                 <button onClick={(e) => { e.stopPropagation(); onDecline?.(); }} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold">Decline</button>
                 <button onClick={(e) => { e.stopPropagation(); onAccept?.(); }} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold shadow-md">Accept</button>
               </div>
            ) : (
              <div className="flex gap-1">
                {/* ⭐ Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-300 hover:text-stone-600"
                  title="Edit Trip"
                >
                  {/* You might need to import Pencil from lucide-react */}
                  <span className="text-xs font-bold">Edit</span> 
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors group/delete"
                  title="Delete Trip"
                >
                  <Trash2 size={16} className="text-stone-300 group-hover/delete:text-red-500 transition-colors" />
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

type TripViewProps = {
  trip: TripData;
  onBack: () => void;
};

type TabId =
  | "itinerary"
  | "places-visit"
  | "places-eat"
  | "shopping"
  | "photos"
  | "scrapbook"
  | "admin"
  | "budget";
function TripView({ trip: initialTrip, onBack }: TripViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const [trip, setTrip] = useState<TripData>(initialTrip);

  // ... (Keep existing useEffect for Snapshot and Summary logic) ...
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

  // ... (Keep existing loadSummary logic) ...
  // ... (Keep existing dayCount logic) ...
  const loadSummary = async () => {
    // ... paste your existing loadSummary logic here ...
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
    { id: "places-visit", label: "To Visit", icon: MapPin },
    { id: "places-eat", label: "To Eat", icon: Utensils },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
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
      <div className="max-w-7xl w-full mx-auto px-6 py-12">
        {activeTab === "itinerary" && <ItineraryTab trip={trip} />}
        {activeTab === "places-visit" && <PlacesTab tripId={trip.id} type="visit" />}
        {activeTab === "places-eat" && <PlacesTab tripId={trip.id} type="eat" />}
        {activeTab === "shopping" && <ShoppingTab tripId={trip.id} />}
        {activeTab === "photos" && <PhotosTab tripId={trip.id} />}
        {activeTab === "scrapbook" && <ScrapbookTab tripId={trip.id} />}
        {activeTab === "admin" && <AdminTab tripId={trip.id} />}
        {activeTab === "budget" && <BudgetTab tripId={trip.id} />}
      </div>
    </div>
  );
}

type ItineraryTabProps = {
  trip: TripData;
};
function ItineraryTab({ trip }: { trip: TripData }) {
  // ... existing state ...
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Location Manager State
  const [showLocDialog, setShowLocDialog] = useState(false);
  
  // ⭐ UPDATE: Initialize with trip.segments
  const [tripSegments, setTripSegments] = useState<TripSegment[]>(trip.segments || []);

  // ⭐ NEW EFFECT: Keep segments in sync when they change in DB
  useEffect(() => {
    if (trip.segments) {
      setTripSegments(trip.segments);
    }
  }, [trip.segments]);

  // ... rest of the component ...

  useEffect(() => {
    // 1. Calculate the date range structure
    const allDates = getDatesInRange(trip.startDate, trip.endDate);

    // 2. Subscribe to all itinerary items
    const unsubscribe = storage.subscribeToList(
      `itinerary:${trip.id}:date:`,
      (storedDays: any[]) => {
        const storedByDate: Record<string, ItineraryDay> = {};
        storedDays.forEach((day) => {
          storedByDate[day.date] = day;
        });

        const fullItinerary = allDates.map((date, index) => {
          const stored = storedByDate[date];
          return {
            day: index + 1,
            date,
            items: stored?.items ?? [],
          };
        });

        setDays(fullItinerary);
      }
    );

    return () => unsubscribe();
  }, [trip.id, trip.startDate, trip.endDate]);

  // ⭐ UPDATED: Returns an ARRAY of locations for overlaps
  const getLocationsForDate = (date: string) => {
    return tripSegments.filter((s) => date >= s.startDate && date <= s.endDate);
  };

  const saveSegments = async (newSegments: TripSegment[]) => {
    const updatedTrip = { ...trip, segments: newSegments };
    setTripSegments(newSegments);
    await storage.set(`trip:${trip.id}`, updatedTrip);
    setShowLocDialog(false);
  };

  const addActivity = async (dayNum: number, activity: ActivityData) => {
      const dayData = days.find((d) => d.day === dayNum);
      const date = dayData?.date;
      if (!date) return;
  
      const key = `itinerary:${trip.id}:date:${date}`;
      const existing = await storage.get(key);
      const parsed: ItineraryDay = existing?.value
      ? JSON.parse(existing.value)
      : { date, items: [] };
  
      const newItem: ItineraryItem = {
        id: Date.now(),
        activity: activity.activity,
        location: activity.location,
        notes: activity.notes || "",
        time: activity.time || "",
        createdByUid: auth.currentUser?.uid || null,
        iconType: (activity.iconType ?? "activity") as IconType,
        createdAt: new Date().toISOString(),
      };
      
      const updatedItems = [...(parsed.items || []), newItem];
      updatedItems.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  
      // 1. Save to Storage
      await storage.set(key, { date, items: updatedItems });

      // 2. ⭐ TRIGGER EMAIL NOTIFICATION (Silent)
      try {
        const snap = await storage.get(`settings:${trip.id}:notifications`);
        if (snap?.value) {
          const settings = JSON.parse(snap.value);
          
          const recipients = Object.values(settings)
            .filter((u: any) => u.enabled && u.email)
            .map((u: any) => u.email);

          if (recipients.length > 0) {
            const calendarLink = createGoogleCalendarLink(
              activity.activity, 
              activity.location, 
              activity.notes || "", 
              date, 
              activity.time
            );

            const templateParams = {
              subject: `New Activity: ${activity.activity} in ${activity.location}`,
              message: `
                Hey! A new activity has been added to the trip.
                
                What: ${activity.activity}
                When: ${date} at ${activity.time}
                Where: ${activity.location}
                
                Add to Google Calendar:
                ${calendarLink}
              `,
              to_email: recipients.join(","),
            };

            // PASTE YOUR KEYS HERE AGAIN
            const SERVICE_ID = "service_b2fw42k";   // e.g. "service_x9..."
            const TEMPLATE_ID = "template_3khbgqf"; // e.g. "template_a5..."
            const PUBLIC_KEY = "rOp_TDdIEYOIqxNii";   // e.g. "user_123..."

            await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
            console.log("✅ Email sent silently");
          }
        }
      } catch (err) {
        console.error("Failed to send email:", err);
      }
  };

  const deleteActivity = async (date: string, activityId: number) => {
       const key = `itinerary:${trip.id}:date:${date}`;
       const existing = await storage.get(key);
       if (!existing?.value) return;
       const parsed = JSON.parse(existing.value);
       parsed.items = parsed.items.filter((i: ItineraryItem) => i.id !== activityId);
       await storage.set(key, parsed);
  };
  const [editingActivity, setEditingActivity] = useState<ItineraryItem | null>(null); // ⭐ NEW
  // ⭐ NEW: Handle Edit Save
  const handleEditActivity = async (updatedData: ActivityData) => {
    if (!editingActivity) return;
    
    // Find the day this item belongs to
    // (In a real app, passing the date to edit function is safer, but searching works too)
    const dayData = days[currentDayIndex]; 
    const key = `itinerary:${trip.id}:date:${dayData.date}`;
    
    // 1. Update in Storage
    const newItemList = dayData.items.map(item => {
      if (item.id === editingActivity.id) {
        return {
          ...item,
          time: updatedData.time,
          activity: updatedData.activity,
          location: updatedData.location,
          notes: updatedData.notes || "",
          iconType: (updatedData.iconType as IconType)
        };
      }
      return item;
    });

    // Re-sort
    newItemList.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    await storage.set(key, { ...dayData, items: newItemList });
    setEditingActivity(null);
  };

  const currentDayData = days[currentDayIndex] || { day: 1, date: "", items: [] };
  
  // ⭐ Get ALL locations for the current day (could be 1, could be 2+)
  const currentLocations = getLocationsForDate(currentDayData.date);
  // --- EXPORT TO CALENDAR ---
  const downloadICS = () => {
    if (!days || days.length === 0) {
      alert("No itinerary items to export.");
      return;
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TravelJournal//MyTrip//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    days.forEach((day) => {
      day.items.forEach((item) => {
        if (!item.time) return; // Skip items without time

        // Format Date/Time: YYYYMMDDTHHMMSS
        const dateStr = day.date.replace(/-/g, ""); // 2024-01-01 -> 20240101
        const timeStr = item.time.replace(/:/g, "") + "00"; // 14:30 -> 143000
        const startDateTime = `${dateStr}T${timeStr}`;

        // Create End Time (Assume 1 hour duration)
        // A robust solution would calculate real duration, but +1 hour is standard for simple exports
        let hour = parseInt(item.time.split(":")[0]);
        const minute = item.time.split(":")[1];
        let endHour = hour + 1;
        // Simple overflow handle (23:00 -> 00:00 next day is complex, so we just clamp to 23:59 for simplicity or wrap)
        const endDateTime = `${dateStr}T${endHour.toString().padStart(2, "0")}${minute}00`;

        icsContent.push("BEGIN:VEVENT");
        icsContent.push(`UID:${item.id}@traveljournal.app`);
        icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
        icsContent.push(`DTSTART:${startDateTime}`);
        icsContent.push(`DTEND:${endDateTime}`);
        icsContent.push(`SUMMARY:${item.activity}`);
        icsContent.push(`DESCRIPTION:${item.notes || ""} (Location: ${item.location})`);
        icsContent.push(`LOCATION:${item.location}`);
        icsContent.push("STATUS:CONFIRMED");
        icsContent.push("END:VEVENT");
      });
    });

    icsContent.push("END:VCALENDAR");

    // Create and trigger download
    const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${trip.destination}_Itinerary.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif text-stone-900 pb-1">Itinerary</h2>
          {viewMode === "timeline" && (
            <p className="text-stone-500 mt-3 font-light">
               Day {currentDayData.day} <span className="text-stone-300 mx-2">•</span> {currentDayData.date}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="bg-stone-100 p-1 rounded-lg flex">
                {["timeline", "calendar"].map((m) => (
                    <button
                        key={m}
                        onClick={() => setViewMode(m as any)}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                            viewMode === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>
            
            <div className="h-6 w-px bg-stone-200 mx-2" />

            <button onClick={downloadICS} className="p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Export">
                <Download size={20} />
            </button>
            <button onClick={() => setShowLocDialog(true)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Locations">
                <MapPin size={20} />
            </button>
            
            {viewMode === "timeline" && (
                <button
                onClick={() => setShowAddDialog(true)}
                className="ml-2 px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                >
                <Plus size={16} /> Add Activity
                </button>
            )}
        </div>
      </div>

      {/* ================= TIMELINE VIEW ================= */}
      {viewMode === "timeline" && (
        <>
          {/* Day Navigation Pills */}
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {days.map((day, index) => {
              const dayLocs = getLocationsForDate(day.date);
              const isActive = currentDayIndex === index;
              
              return (
                <button
                  key={day.day}
                  onClick={() => setCurrentDayIndex(index)}
                  className={`relative flex-shrink-0 px-5 py-3 rounded-xl transition-all border ${
                    isActive
                      ? "bg-stone-900 text-white border-stone-900 shadow-md"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900"
                  }`}
                >
                  <div className="flex flex-col items-center">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? "text-stone-400" : "text-stone-400"}`}>
                        Day
                      </span>
                      <span className="text-xl font-serif leading-none mt-1">{day.day}</span>
                  </div>
                  
                  {/* Indicator Dots */}
                  {dayLocs.length > 0 && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      {dayLocs.map(loc => (
                         <span key={loc.id} className={`w-2 h-2 rounded-full ${loc.color.split(" ")[0]}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Location Banners */}
          <div className="space-y-3">
            {currentLocations.map((loc) => (
              <div key={loc.id} className={`px-6 py-3 rounded-lg flex justify-between items-center text-sm font-medium ${loc.color}`}>
                 <span>Currently in <span className="font-bold">{loc.location}</span></span>
                 <MapPin size={16} className="opacity-50" />
              </div>
            ))}
          </div>

          {/* Activity Cards */}
          {currentDayData.items.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-stone-200">
              <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Clock size={24} className="text-stone-300" />
              </div>
              <p className="text-stone-900 font-serif text-lg">Empty Schedule</p>
              <button onClick={() => setShowAddDialog(true)} className="mt-4 text-rose-600 font-medium hover:underline text-sm">
                Plan something for Day {currentDayData.day}
              </button>
            </div>
          ) : (
            <div className="relative border-l border-stone-200 ml-4 pl-8 space-y-8 py-2">
              {currentDayData.items.map((item) => {
                const Icon = iconMap[item.iconType] || Clock;
                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-[#FDFCF8] bg-stone-300 group-hover:bg-stone-900 transition-colors" />
                    
                    <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-all group-hover:border-stone-300">
                        <div className="flex gap-5">
                            {/* Time Column */}
                            <div className="flex-shrink-0 w-16 pt-1">
                                <span className="block text-lg font-bold text-stone-900">{item.time || "—"}</span>
                                <div className="mt-2 text-stone-300">
                                    <Icon size={20} />
                                </div>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-serif text-stone-900 group-hover:text-rose-900 transition-colors">
                                        {item.activity}
                                    </h3>
                                    
                                    {/* Action Buttons (Hidden until hover) */}
                                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingActivity(item)} className="text-xs font-bold text-stone-400 hover:text-stone-900 uppercase">Edit</button>
                                        <button onClick={() => deleteActivity(currentDayData.date, item.id)} className="text-xs font-bold text-red-300 hover:text-red-500 uppercase">Delete</button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-stone-500 text-sm font-medium mb-3">
                                    <MapPin size={14} className="text-rose-400" />
                                    {item.location}
                                </div>

                                {item.notes && (
                                    <div className="bg-stone-50 px-4 py-3 rounded-lg text-stone-600 text-sm italic border border-stone-100">
                                        "{item.notes}"
                                    </div>
                                )}
                                
                                <div className="mt-4 pt-4 border-t border-stone-50 flex items-center gap-2">
                                    <TripAuthorInfo uid={item.createdByUid} createdAt={item.createdAt} />
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ================= CALENDAR VIEW (Simplified) ================= */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {days.map((day) => {
             const dayLocs = getLocationsForDate(day.date);

             return (
               <div 
                  key={day.date} 
                  onClick={() => { setCurrentDayIndex(day.day - 1); setViewMode("timeline"); }}
                  className="group bg-white border border-stone-200 rounded-xl hover:border-stone-400 hover:shadow-lg cursor-pointer transition-all min-h-[180px] flex flex-col relative overflow-hidden"
               >
                  {/* ⭐ NEW: Segmented Color Bar at the Top */}
                  {dayLocs.length > 0 ? (
                    <div className="absolute top-0 left-0 right-0 h-3 flex w-full">
                      {dayLocs.map((loc) => (
                        <div 
                          key={loc.id} 
                          // Extract the 'bg-xxx' class from your stored color string
                          className={`flex-1 h-full ${loc.color.split(" ")[0]}`} 
                          title={loc.location} 
                        />
                      ))}
                    </div>
                  ) : (
                    // Optional: A faint grey bar for days with no location, to keep alignment consistent
                    <div className="absolute top-0 left-0 right-0 h-3 bg-stone-50" />
                  )}

                  {/* Card Content - Added pt-5 to account for the bar */}
                  <div className="p-4 pt-6 flex-1 flex flex-col">
                    
                    {/* Date Header */}
                    <div className="flex justify-between items-baseline mb-3 border-b border-stone-100 pb-2">
                        <span className="font-serif font-bold text-xl text-stone-800 group-hover:text-stone-900 transition-colors">
                          Day {day.day}
                        </span>
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                          {new Date(day.date).getDate()}
                        </span>
                    </div>
                    
                    {/* Items List */}
                    <div className="flex-1 space-y-2 overflow-hidden">
                        {day.items.slice(0, 4).map(i => (
                            <div key={i.id} className="text-xs text-stone-600 truncate flex items-center gap-2 px-1.5 py-1 rounded hover:bg-stone-50 transition-colors">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  i.iconType === 'eat' ? 'bg-amber-400' :
                                  i.iconType === 'visit' ? 'bg-emerald-400' :
                                  'bg-stone-300'
                                }`} />
                                <span className="truncate">{i.activity}</span>
                            </div>
                        ))}
                        
                        {day.items.length > 4 && (
                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2 pt-1">
                            +{day.items.length - 4} more
                          </div>
                        )}
                        
                        {day.items.length === 0 && (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-stone-300 text-xs italic">Free day</span>
                          </div>
                        )}
                    </div>
                  </div>
               </div>
             );
          })}
        </div>
      )}

      {/* ... (Dialogs remain same) ... */}
      {showAddDialog && (
        <ActivityDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(activity) => {
            addActivity(currentDayIndex + 1, activity);
            setShowAddDialog(false);
          }}
        />
      )}
      {editingActivity && (
        <ActivityDialog
          initialData={{ // You'll need to update ActivityDialog to accept initialData (see step 4)
            time: editingActivity.time,
            activity: editingActivity.activity,
            location: editingActivity.location,
            notes: editingActivity.notes,
            iconType: editingActivity.iconType,
          }}
          onClose={() => setEditingActivity(null)}
          onAdd={handleEditActivity} // Reuse the onAdd prop but treating it as update
        />
      )}

      {showLocDialog && (
        <LocationManagerDialog
          trip={trip}
          onClose={() => setShowLocDialog(false)}
          onSave={saveSegments}
        />
      )}
    </div>
  );
}

export type StoredPlace = PlaceData & {
  id: number;
  createdByUid?: string | null;
  createdAt?: string;
  cost?: number;
  price?: string | number; 
  paidBy?: {
    uid: string;
    amount: number;}[]
};


type PlacesTabProps = {
  tripId: number;
  type: "eat" | "visit";
};

function PlacesTab({ tripId, type }: PlacesTabProps) {
  const [places, setPlaces] = useState<StoredPlace[]>([]);

  const [editingPlace, setEditingPlace] = useState<StoredPlace | null>(null); // ⭐ NEW
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [confirmingPlace, setConfirmingPlace] = useState<StoredPlace | null>(null);
  const [costDialogPlace, setCostDialogPlace] = useState<StoredPlace | null>(null);





  useEffect(() => {
    // Listen to either "eat" or "visit" list
    const unsubscribe = storage.subscribeToList(
      `place:${tripId}:${type}:`, 
      (newPlaces) => {
        setPlaces(newPlaces.sort((a: any, b: any) => b.id - a.id));
      }
    );

    return () => unsubscribe();
  }, [tripId, type]);

  // You can now remove 'await loadPlaces()' from addPlace, deletePlace, and confirmPlace.
  // Just perform the storage operation, and the UI will update itself.

  

  const addPlace = async (placeData: Omit<PlaceData, "id">) => {
    const place: PlaceData = {
      ...placeData,
      id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    };


    await storage.set(`place:${tripId}:${type}:${place.id}`, place);
    
  };


  const handleVisitedToggle = async (place: StoredPlace) => {

    // ===== UNVISIT =====
    if (place.visited) {

      const updated = { ...place, visited:false };
      delete updated.cost;
      delete updated.paidBy;

      await storage.set(`place:${tripId}:${type}:${place.id}`, updated);
      
      return;
    }

    // ===== VISIT =====
    // open cost dialog FIRST
    setCostDialogPlace(place);
  };



  const confirmPlace = async (place: StoredPlace, date: string, time: string) => {
    // Save to Itinerary with Source ID
    const key = `itinerary:${tripId}:date:${date}`;
    const existing = await storage.get(key);
    const targetDay = existing?.value ? JSON.parse(existing.value) : { date, items: [] };

    const newItem: ItineraryItem = {
      id: Date.now(),
      time,
      activity: place.name,
      location: place.address,
      notes: place.description || "",
      iconType: type === "eat" ? "eat" : "visit",
      sourceId: `place:${place.id}`, // ⭐ LINK HERE
      createdAt: new Date().toISOString()
    };

    targetDay.items.push(newItem);
    targetDay.items.sort((a: any, b: any) => a.time.localeCompare(b.time));
    await storage.set(key, targetDay);

    // Update Place status
    place.confirmed = true;
    await storage.set(`place:${tripId}:${type}:${place.id}`, place);
    setConfirmingPlace(null);
  };
  // Inside PlacesTab component...

  const unconfirmPlace = async (place: StoredPlace) => {
    // 1. Remove from Itinerary
    await removeFromItineraryBySource(tripId, `place:${place.id}`);

    // 2. Update Place status
    // ⭐ KEY CHANGE: Set visited to false and remove cost data
    const updated = { 
      ...place, 
      confirmed: false, 
      visited: false 
    };
    
    // Clean up financial data since it's no longer "visited"
    delete updated.cost;
    delete updated.paidBy;

    await storage.set(`place:${tripId}:${type}:${place.id}`, updated);
  };
  const handleEditPlace = async (formData: PlaceFormData) => {
    if (!editingPlace) return;

    const updated: StoredPlace = {
      ...editingPlace,
      ...formData
    };

    await storage.set(`place:${tripId}:${type}:${editingPlace.id}`, updated);

    // If it was confirmed, sync the new name/address to the itinerary
    if (updated.confirmed) {
       await updateItineraryBySource(tripId, `place:${updated.id}`, updated.name, updated.address);
    }

    setEditingPlace(null);
  };

  const deletePlace = async (placeId: number) => {
    if (!confirm("Delete this place?")) return;
    
    // Remove from Itinerary first
    await removeFromItineraryBySource(tripId, `place:${placeId}`);
    
    // Delete actual place
    await deleteKey(`place:${tripId}:${type}:${placeId}`);
  };
  const visitedCount = places.filter((p) => p.visited).length;
  // Refined Accents
  const accentColor = type === "eat" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200";
  const iconColor = type === "eat" ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-stone-100 pb-4">
        <div>
          <h2 className="text-3xl font-serif text-stone-900">
            {type === "eat" ? "Culinary Spots" : "Sights to See"}
          </h2>
          <p className="text-stone-500 mt-1">
            {visitedCount} / {places.length} {type === "eat" ? "tasted" : "explored"}
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={18} />
          Add {type === "eat" ? "Restaurant" : "Place"}
        </button>
      </div>

      {places.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-stone-200">
           <p className="text-stone-400 mb-2">No places added yet</p>
           <button onClick={() => setShowAddDialog(true)} className="text-stone-900 font-bold underline hover:text-rose-600">
             Start your list
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {places.map((place) => (
            <div
              key={place.id}
              className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${
                place.visited
                  ? `border-stone-200 opacity-80 hover:opacity-100`
                  : "border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1"
              }`}
            >
              {/* Image Header */}
              <div className="relative h-56 overflow-hidden bg-stone-100">
                {place.imageUrl ? (
                  <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <MapPin size={48} />
                   </div>
                )}
                
                {/* Visited Badge */}
                {place.visited && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-stone-900 p-2 rounded-full shadow-md">
                      <Check size={16} strokeWidth={3} />
                    </div>
                )}

                {/* Rating Badge */}
                {place.rating && (
                   <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {place.rating}
                   </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-serif text-stone-900 leading-tight group-hover:text-rose-800 transition-colors">
                        {place.name}
                    </h3>
                    {place.link && (
                        <a href={place.link} target="_blank" rel="noreferrer" className="text-stone-300 hover:text-stone-900">
                            <ExternalLink size={16} />
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                    <MapPin size={12} /> {place.address}
                </div>

                <p className="text-stone-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {place.description}
                </p>

                <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                    
                    {/* Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer group/check">
                        <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                            place.visited ? "bg-stone-900 border-stone-900 text-white" : "border-stone-300 group-hover/check:border-stone-900"
                        }`}>
                            {place.visited && <Check size={12} />}
                        </div>
                        <input type="checkbox" checked={place.visited} onChange={()=>handleVisitedToggle(place)} className="hidden" />
                        <span className="text-xs font-bold uppercase text-stone-400 group-hover/check:text-stone-900">Visited</span>
                    </label>

                    {/* Actions Menu */}
                    <div className="flex gap-3 text-xs font-bold uppercase tracking-wide">
                        <button onClick={() => setEditingPlace(place)} className="text-stone-400 hover:text-stone-900">Edit</button>
                        
                        {!place.confirmed ? (
                            <button onClick={() => setConfirmingPlace(place)} className="text-rose-400 hover:text-rose-600">Confirm</button>
                        ) : (
                            <button onClick={() => unconfirmPlace(place)} className="text-amber-500 hover:text-amber-700">Unconfirm</button>
                        )}
                        
                        <button onClick={() => deletePlace(place.id)} className="text-stone-300 hover:text-red-500">Delete</button>
                    </div>
                </div>
              </div>
            </div>
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
          type={type}
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
          item={{ item: costDialogPlace.name }}
          tripId={tripId}
          onClose={() => setCostDialogPlace(null)}
          onSave={async (cost, paidBy) => {
            const updated: StoredPlace = {
              ...costDialogPlace!,
              visited: true,
              cost: Number(cost),
              paidBy
            };

            await storage.set(
              `place:${tripId}:${type}:${costDialogPlace!.id}`,
              updated
            );

            // ⭐ FIX: Only ask for date/time if it hasn't been confirmed yet
            if (!updated.confirmed) {
              setConfirmingPlace(updated);
            }

            setCostDialogPlace(null);
          }}
        />
      )}
      {editingPlace && (
        <PlaceDialog
          type={type}
          initialData={{
            name: editingPlace.name,
            description: editingPlace.description,
            address: editingPlace.address,
            rating: editingPlace.rating || "",
            imageUrl: editingPlace.imageUrl || "",
            link: editingPlace.link || "",
            visited: editingPlace.visited
          }}
          onClose={() => setEditingPlace(null)}
          onAdd={(data) => handleEditPlace(data)}
        />
      )}



    </div>
  );
  
}

type ShoppingTabProps = {
  tripId: number;
};


// 1. Define the simple dialog component (Paste this right above ShoppingTab or inside it)
function SimpleCostDialog({
  itemName,
  onClose,
  onSave
}: {
  itemName: string;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [cost, setCost] = useState("");

  const handleSave = () => {
    // Basic validation to ensure we save a number
    const val = parseFloat(cost);
    if (!isNaN(val)) {
      onSave(val);
    } else {
      // If empty or invalid, just close or save 0 depending on preference
      // Here we'll treat empty as cancel or 0
      onSave(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[400px] p-6 space-y-4 animate-in fade-in zoom-in duration-200">
        
        <div>
          <h3 className="text-xl font-serif text-gray-900">Item Acquired</h3>
          <p className="text-gray-500 text-sm mt-1">
            How much did you spend on <span className="font-semibold text-gray-900">{itemName}</span>?
          </p>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-500">£</span>
          <input
            type="number"
            autoFocus
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
            className="w-full border-2 border-gray-200 rounded-lg pl-8 pr-3 py-2 text-lg focus:border-gray-900 outline-none transition-colors"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}

// 2. The Updated ShoppingTab
function ShoppingTab({ tripId }: { tripId: number }) {
  type ShoppingItem = ShoppingData & {
    id: number;
    bought: boolean;
    cost?: number; 
    createdByUid?: string | null;
    createdAt?: string;
  };

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Track which item we are currently marking as bought
  const [buyingItem, setBuyingItem] = useState<ShoppingItem | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // This listens for ANY change to shopping items
    const unsubscribe = storage.subscribeToList(
      `shopping:${tripId}:user:${user.uid}:`, 
      (newItems) => {
        // Automatically sorts and updates state whenever DB changes
        setItems(newItems.sort((a: any, b: any) => b.id - a.id));
      }
    );

    return () => unsubscribe(); // Cleanup when tab closes
  }, [tripId]);

  

  // Updated addItem (No longer needs manual loadItems call)
  const addItem = async (itemData: ShoppingData) => {
    const user = auth.currentUser;
    if (!user) return;

    const newItem: ShoppingItem = {
      ...itemData,
      id: Date.now(),
      bought: false,
      createdByUid: user.uid,
      createdAt: new Date().toISOString(),
    };

    // Just save. The listener above will update the UI automatically.
    await storage.set(
      `shopping:${tripId}:user:${user.uid}:${newItem.id}`,
      newItem
    );
  };

  // Updated deleteItem (No longer needs manual loadItems call)
  const deleteItem = async (id: number) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteKey(`shopping:${tripId}:user:${user.uid}:${id}`);
  };

  const handleToggleClick = async (item: ShoppingItem) => {
    const user = auth.currentUser;
    if (!user) return;

    // If currently bought -> Unbuy immediately (remove cost)
    if (item.bought) {
      const updated = { ...item, bought: false };
      delete updated.cost;

      await storage.set(
        `shopping:${tripId}:user:${user.uid}:${item.id}`,
        updated
      );
      
    } else {
      // If currently NOT bought -> Open the Simple Cost Dialog
      setBuyingItem(item);
    }
  };

  const saveCost = async (amount: number) => {
    if (!buyingItem) return;
    const user = auth.currentUser;
    if (!user) return;

    const updated: ShoppingItem = {
      ...buyingItem,
      bought: true,
      cost: amount
    };

    await storage.set(
      `shopping:${tripId}:user:${user.uid}:${buyingItem.id}`,
      updated
    );
    
    setBuyingItem(null);
    
  };

  // Group items by category
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const boughtCount = items.filter((i) => i.bought).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif text-gray-900">My Shopping List</h2>
          <p className="text-gray-800 mt-1">
            {boughtCount} of {items.length} items acquired
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4 mx-auto">
            <ShoppingBag size={32} className="text-teal-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Personal Wishlist
          </h3>
          <p className="text-gray-800 mb-4">
            Items you add here are private and only appear in your personal budget.
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg"
          >
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category}
              className="bg-white border border-stone-200 shadow-sm rounded-lg overflow-hidden h-fit"
            >
              <div className="bg-stone-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-serif text-xl text-gray-900">{category}</h3>
              </div>

              <div className="p-4 space-y-3">
                {items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        item.bought
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-gray-200 hover:border-teal-300 hover:shadow-sm"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.bought}
                        onChange={() => handleToggleClick(item)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-medium truncate ${
                              item.bought
                                ? "line-through text-gray-500"
                                : "text-gray-900"
                            }`}
                          >
                            {item.item}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {/* Show cost if bought */}
                            {item.bought && item.cost !== undefined && (
                                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                    {item.cost === 0 ? "Free" : `£${item.cost}`}
                                </span>
                            )}

                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-teal-600 transition-colors"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {item.notes}
                          </p>
                        )}
                        <div className="mt-1">
                          <TripAuthorInfo uid={item.createdByUid} createdAt={item.createdAt} />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <ShoppingDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(data) => {
            addItem(data);
            setShowAddDialog(false);
          }}
        />
      )}

      {buyingItem && (
        <SimpleCostDialog
          itemName={buyingItem.item}
          onClose={() => setBuyingItem(null)}
          onSave={saveCost}
        />
      )}
    </div>
  );
}


function CostDialog({
  item,
  tripId,
  onClose,
  onSave
}:{
  item:{ item:string },
  tripId:number,
  onClose:()=>void,
  onSave:(cost:string, paidBy:{uid:string,amount:number}[])=>void
}){
  const [noCost,setNoCost] = useState(false);

  const [cost,setCost]=useState("");
  const [members,setMembers]=useState<string[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [mode,setMode]=useState<"equal"|"custom">("equal");
  const [custom,setCustom]=useState<Record<string,string>>({});

  useEffect(()=>{
    const load=async()=>{
      const t=await storage.get(`trip:${tripId}`);
      if(t?.value){
        const trip=JSON.parse(t.value);
        setMembers(trip.members||[]);
      }
    };
    load();
  },[tripId]);

  const toggle=(uid:string)=>{
    setSelected(s=>s.includes(uid)?s.filter(u=>u!==uid):[...s,uid]);
  };

  const save = async () => {

    if(!noCost && !cost) return;

    const numericCost = noCost ? 0 : Number(cost || 0);

    let paidBy:{uid:string;amount:number}[] = [];

    if(!noCost){

      if(mode==="equal"){

        const each = numericCost / selected.length;

        paidBy = selected.map(uid=>({
          uid,
          amount:each
        }));

      }else{

        paidBy = selected.map(uid=>({
          uid,
          amount:Number(custom[uid] || 0)
        }));

      }

    }

    await onSave(
      String(numericCost),
      paidBy
    );

  };


  return(
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-[460px] p-6 space-y-5">
      
      <h3 className="text-xl font-serif">Add cost</h3>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={noCost}
          onChange={(e)=>setNoCost(e.target.checked)}
        />
        No cost
      </label>


      <input
        type="number"
        placeholder="Total cost"
        value={noCost ? "0" : cost}
        disabled={noCost}
        onChange={e=>setCost(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2 disabled:bg-gray-100"
      />

      
      {!noCost && (
            <div>

        <p className="font-medium mb-2">Who paid?</p>
        <div className="space-y-1">
          {members.map(uid=>(
            <label key={uid} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={selected.includes(uid)}
                onChange={()=>toggle(uid)}
              />
              <CreatorBadge uid={uid}/>
            </label>
          ))}
        </div>

        <button
          className="text-sm text-blue-600 mt-1"
          onClick={()=>setSelected(members)}
        >
          Select all
        </button>
      </div>)}

      {!noCost && (
          <div>

        <p className="font-medium mb-1">Split</p>

        <label className="mr-3">
          <input type="radio" checked={mode==="equal"} onChange={()=>setMode("equal")} />
          Equal
        </label>

        <label>
          <input type="radio" checked={mode==="custom"} onChange={()=>setMode("custom")} />
          Custom
        </label>
      </div>)}

      {!noCost && mode==="custom" && (
        <div className="space-y-2">
          {selected.map(uid=>(
            <div key={uid} className="flex justify-between items-center">
              <CreatorBadge uid={uid}/>
              <input
                type="number"
                value={custom[uid]||""}
                onChange={e=>setCustom({...custom,[uid]:e.target.value})}
                className="border rounded px-2 py-1 w-24"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
        <button onClick={save} className="bg-gray-900 text-white px-4 py-2 rounded">Save</button>
      </div>

    </div>
  </div>
  );
}



type PhotosTabProps = {
  tripId: number;
};


function PhotosTab({ tripId }: PhotosTabProps) {
  type PhotoItem = PhotoData & {
    id: number;
    createdByUid?: string | null;
    createdAt?: string;
  };
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = storage.subscribeToList(
      `photo:${tripId}:`, 
      (newPhotos) => {
        setPhotos(newPhotos.sort((a: any, b: any) => b.id - a.id));
      }
    );

    return () => unsubscribe();
  }, [tripId]);

  

  const addPhoto = async (photoData: PhotoData) => {
      const photo: PhotoItem = {
    ...photoData,
    id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
  };

    await storage.set(`photo:${tripId}:${photo.id}`, photo);
    
  };

  const deletePhoto = async (photoId: number) => {

    await deleteKey(`photo:${tripId}:${photoId}`);
    
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif text-gray-900">Photo Gallery</h2>
          <p className="text-gray-800 mt-1">{photos.length} photos captured</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <Plus size={18} />
          Add Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4 mx-auto">
            <Camera size={32} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Add More Memories
          </h3>
          <p className="text-gray-800 mb-4">
            Upload photos from your trip to keep your journal complete
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg"
          >
            Upload First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo: PhotoItem) => (

            <div
              key={photo.id}
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 hover:shadow-2xl transition-all group"
            >
              <div className="relative h-64 w-full overflow-hidden rounded-t-lg">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>




              <div className="p-4 flex flex-col">
                <p className="font-medium text-gray-800 mb-2">
                  {photo.caption}
                </p>
                <div className="mb-2">
                  <TripAuthorInfo uid={photo.createdByUid} createdAt={photo.createdAt} />
                </div>

                <div className="space-y-1 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{photo.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{photo.location}</span>
                  </div>
                </div>

                
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <PhotoDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(data) => {
            addPhoto(data);
            setShowAddDialog(false);
          }}
        />
      )}
    </div>
  );

}

export type ScrapbookEntry = {
  id: number;
  day: number;
  title: string;
  date: string;
  content: string;
};

type ScrapbookTabProps = {
  tripId: number;
};


function ScrapbookTab({ tripId }: ScrapbookTabProps) {

  const [entries, setEntries] = useState<ScrapbookEntry[]>([]);


  useEffect(() => {
    loadEntries();
  }, [tripId]);

  const loadEntries = async () => {
    const result = await storage.list(`scrapbook:${tripId}:`);
    const loadedEntries: ScrapbookEntry[] = [];


    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedEntries.push(JSON.parse(data.value));
        }
      }
    }

    setEntries(
      loadedEntries.sort((a: ScrapbookEntry, b: ScrapbookEntry) => a.day - b.day)
    );

  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-serif text-gray-900">Travel Scrapbook</h2>
        <p className="text-gray-800 mt-1">
          Daily journal entries from your journey
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-700">No scrapbook entries yet</p>
        </div>
      ) : (
        entries.map((entry: ScrapbookEntry) => (

          <div
            key={entry.id}
            className="bg-white border-2 rounded-lg overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-rose-500 to-purple-500 text-white">
              <h3 className="text-2xl font-serif">{entry.title}</h3>
              <p className="text-sm opacity-80">{entry.date}</p>
            </div>

            <div className="p-6">
              <p className="text-gray-700 italic">{entry.content}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
function HotelCard({
  hotel,
  onConfirm,
  onEdit,
  onDelete
}: {
  hotel: StoredHotel;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative flex flex-col h-full hover:border-stone-300">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <Hotel size={18} />
          </div>
          <h4 className="text-lg font-serif font-bold text-stone-900 leading-tight">{hotel.name}</h4>
        </div>
        
        {hotel.status !== "confirmed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
          >
            Confirm
          </button>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
             <Check size={12} strokeWidth={3} /> Confirmed
          </span>
        )}
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-stone-500 text-sm mb-5">
        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
        <span className="leading-snug">{hotel.address}</span>
      </div>

      <div className="flex-1 space-y-4 mb-4">
        
        {/* Dates - Side by Side Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-stone-50 px-3 py-2.5 rounded-lg flex items-center gap-2">
             <span className="text-xs text-stone-400 uppercase font-bold whitespace-nowrap">Check-in</span>
             <span className="font-bold text-stone-600">{hotel.checkIn}</span>
          </div>
          <div className="bg-stone-50 px-3 py-2.5 rounded-lg flex items-center gap-2">
             <span className="text-xs text-stone-400 uppercase font-bold whitespace-nowrap">Check-out</span>
             <span className="font-bold text-stone-600">{hotel.checkOut}</span>
          </div>
        </div>
        
        {/* Cost & Details - Larger Font & Horizontal Gap */}
        {(hotel.price || hotel.details) && (
          <div className="flex flex-wrap items-baseline gap-6 pt-2 text-sm text-stone-600">
             {hotel.price && (
               <div className="flex-shrink-0">
                 Cost: <span className="font-bold text-stone-600 text-base">{hotel.price}</span>
               </div>
             )}
             {hotel.details && (
               <div className="italic text-stone-500 leading-relaxed">
                 "{hotel.details}"
               </div>
             )}
          </div>
        )}

        <div className="pt-2 border-t border-stone-100">
           <TripAuthorInfo uid={hotel.createdByUid} createdAt={hotel.createdAt} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wide border-t border-stone-100 pt-4 mt-auto">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-stone-400 hover:text-stone-900 transition-colors">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-300 hover:text-red-600 transition-colors">Delete</button>
      </div>
    </div>
  );
}

type DocumentDialogProps = {
  onClose: () => void;
  onAdd: (data: Omit<DocumentData, "id" | "createdAt" | "createdByUid">) => void;
};
function DocumentDialog({ onClose, onAdd }: DocumentDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentData["category"]>("Tickets");
  const [fileData, setFileData] = useState<{ url: string; name: string; type: string } | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      setError("File is too large (Max 900KB).");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setFileData({ url: result, name: file.name, type: file.type });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name || !fileData) {
      setError("Please provide a name and upload a file.");
      return;
    }
    onAdd({ name, category, fileUrl: fileData.url, fileName: fileData.name, fileType: fileData.type });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Upload Document</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Document Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="e.g. Flight Confirmations"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
            >
              <option value="Tickets">Tickets</option>
              <option value="Reservations">Reservations</option>
              <option value="Insurance">Insurance</option>
              <option value="ID">IDs / Passports</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">File (PDF, Image)</label>
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                  fileData ? "border-emerald-500 bg-emerald-50" : "border-stone-300 hover:border-stone-400"
              }`}>
                  {fileData ? (
                      <div className="text-emerald-700 font-medium flex flex-col items-center">
                         <FileText size={32} className="mb-2" />
                         <span className="text-sm">{fileData.name}</span>
                      </div>
                  ) : (
                      <div className="text-stone-400 group-hover:text-stone-600">
                          <FileText size={32} className="mx-auto mb-2" />
                          <span className="text-sm font-medium">Click to upload</span>
                          <span className="block text-xs mt-1 opacity-70">Max 900KB</span>
                      </div>
                  )}
              </div>
            </div>
            {error && <p className="text-rose-500 text-xs mt-2 font-medium">{error}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Upload
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function TransportCard({
  transport,
  onConfirm,
  onEdit,
  onDelete
}: {
  transport: StoredTransport;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative flex flex-col h-full hover:border-stone-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <Train size={18} />
          </div>
          <div>
            <h4 className="text-lg font-serif font-bold text-stone-900">{transport.type}</h4>
            {transport.code && <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">{transport.code}</p>}
          </div>
        </div>
        {transport.status !== "confirmed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full"
          >
            Confirm
          </button>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
             <Check size={12} strokeWidth={3} /> Confirmed
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 mb-4">
        <div className="flex items-center gap-2 text-stone-800 font-medium bg-stone-50 p-3 rounded-lg">
           <span>{transport.departure}</span>
           <span className="text-stone-300">➝</span>
           <span>{transport.arrival}</span>
        </div>
        
        <p className="text-stone-500 text-sm pl-1">{transport.date} {transport.time && `@ ${transport.time}`}</p>
        
        {(transport.price || transport.details) && (
          <div className="text-xs text-stone-500 space-y-1 pt-1 pl-1">
            {transport.price && <p>Cost: <span className="font-medium text-stone-900">{transport.price}</span></p>}
            {transport.details && <p className="italic">"{transport.details}"</p>}
          </div>
        )}
        <div className="pt-2 border-t border-stone-100">
           <TripAuthorInfo uid={transport.createdByUid} createdAt={transport.createdAt} />
        </div>
      </div>

      <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wide border-t border-stone-100 pt-4 mt-auto">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-stone-400 hover:text-stone-900">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-300 hover:text-red-600">Delete</button>
      </div>
    </div>
  );
}
export type StoredFlight = FlightData & { 
  id: number;
  cost?: string | number;               // Add this
  price?: string | number;              // Add this
  paidBy?: { uid: string; amount: number }[]; // Add this
};

export type StoredHotel = HotelData & { 
  id: number;
  cost?: string | number;               // Add this
  price?: string | number;              // Add this
  paidBy?: { uid: string; amount: number }[]; // Add this
};
export type StoredPacking = PackingData & { id: number; packed: boolean };

type AdminTabProps = { tripId: number };

function AdminTab({ tripId }: { tripId: number }) {
  // 1. Update ActiveSubTab type
  const [activeSubTab, setActiveSubTab] = useState<
    "members" | "flights" | "hotels" | "transport" | "packing" | "documents"
  >("flights"); // Default to members or flights, your choice
  
  // Data State
  const [flights, setFlights] = useState<StoredFlight[]>([]);
  const [hotels, setHotels] = useState<StoredHotel[]>([]);
  const [transports, setTransports] = useState<StoredTransport[]>([]);
  const [packing, setPacking] = useState<StoredPacking[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  // Dialog State
  const [showFlightDialog, setShowFlightDialog] = useState(false);
  const [showHotelDialog, setShowHotelDialog] = useState(false);
  const [showTransportDialog, setShowTransportDialog] = useState(false);
  const [showPackingDialog, setShowPackingDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);

  // Edit/Action State
  const [costDialogFlight, setCostDialogFlight] = useState<StoredFlight | null>(null);
  const [costDialogHotel, setCostDialogHotel] = useState<StoredHotel | null>(null);
  const [costDialogTransport, setCostDialogTransport] = useState<StoredTransport | null>(null);
  const [editingTransport, setEditingTransport] = useState<StoredTransport | null>(null);
  const [editingFlight, setEditingFlight] = useState<StoredFlight | null>(null);
  const [editingHotel, setEditingHotel] = useState<StoredHotel | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [packingMode, setPackingMode] = useState<"shared" | "personal">("shared");

  // 2. Add State for Members Tab
  type MemberDisplay = {
    id: string; // uid or email
    name: string;
    email?: string; // only for invites
    status: "Member" | "Invited";
    isMe?: boolean;
  };
  
  const [memberList, setMemberList] = useState<MemberDisplay[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle");
  const [inviteMsg, setInviteMsg] = useState("");
  // 3. Load Members Effect
  useEffect(() => {
    if (activeSubTab === "members") {
      loadMembers();
    }
  }, [activeSubTab, tripId]);
  const loadMembers = async () => {
    try {
      const tripSnap = await storage.get(`trip:${tripId}`);
      if (!tripSnap?.value) return;
      const tripData = JSON.parse(tripSnap.value);
      const currentUid = auth.currentUser?.uid;

      const list: MemberDisplay[] = [];

      // A. Process Actual Members
      if (tripData.members) {
        for (const uid of tripData.members) {
          // Fetch user details from Firestore 'users' collection
          let name = "Unknown User";
          try {
             const userDoc = await getDoc(doc(db, "users", uid));
             if (userDoc.exists()) {
               name = userDoc.data().name || userDoc.data().email || "User";
             }
          } catch(e) { console.log("User fetch error", e)}

          list.push({
            id: uid,
            name: name,
            status: "Member",
            isMe: uid === currentUid
          });
        }
      }

      // B. Process Invites
      if (tripData.invites) {
        tripData.invites.forEach((email: string) => {
          list.push({
            id: email,
            name: email, // For invites, name is the email
            email: email,
            status: "Invited",
          });
        });
      }

      setMemberList(list);
    } catch (e) {
      console.error("Failed to load members", e);
    }
  };
  // --- LISTENERS ---
  useEffect(() => {
    const unsubFlights = storage.subscribeToList(`flight:${tripId}:`, (items) => setFlights(items));
    const unsubHotels = storage.subscribeToList(`hotel:${tripId}:`, (items) => setHotels(items));
    const unsubTransport = storage.subscribeToList(`transport:${tripId}:`, (items) => setTransports(items));
    const unsubDocuments = storage.subscribeToList(`document:${tripId}:`, (items) => {
      setDocuments(items.sort((a: any, b: any) => b.id - a.id));
    });

    const user = auth.currentUser;
    let unsubPacking = () => {};
    if (user) {
      const packingPrefix = packingMode === "shared"
        ? `packing:${tripId}:shared`
        : `packing:${tripId}:user:${user.uid}`;
      unsubPacking = storage.subscribeToList(packingPrefix, (items) => setPacking(items));
    }

    return () => {
      unsubFlights();
      unsubHotels();
      unsubTransport();
      unsubDocuments();
      unsubPacking();
    };
  }, [tripId, packingMode]);

  // --- ACTIONS ---

  // FLIGHTS
  const addFlight = async (data: FlightData) => {
    const user = auth.currentUser;
    const newFlight: StoredFlight = {
      ...data,
      id: editingFlight ? editingFlight.id : Date.now(),
      createdByUid: user?.uid,
      createdAt: editingFlight ? editingFlight.createdAt : new Date().toISOString(),
    };
    await storage.set(`flight:${tripId}:${newFlight.id}`, newFlight);
    setEditingFlight(null);
  };

  const deleteFlight = async (id: number) => {
    if (confirm("Delete this flight?")) await deleteKey(`flight:${tripId}:${id}`);
  };

  // HOTELS
  const addHotel = async (data: HotelData) => {
    const user = auth.currentUser;
    const newHotel: StoredHotel = {
      ...data,
      id: editingHotel ? editingHotel.id : Date.now(),
      createdByUid: user?.uid,
      createdAt: editingHotel ? editingHotel.createdAt : new Date().toISOString(),
    };
    await storage.set(`hotel:${tripId}:${newHotel.id}`, newHotel);
    setEditingHotel(null);
  };

  const deleteHotel = async (id: number) => {
    if (confirm("Delete this hotel?")) await deleteKey(`hotel:${tripId}:${id}`);
  };

  // TRANSPORT
  const addTransport = async (data: TransportData) => {
    const user = auth.currentUser;
    const newTransport: StoredTransport = {
      ...data,
      id: editingTransport ? editingTransport.id : Date.now(),
      createdByUid: user?.uid,
      createdAt: editingTransport ? editingTransport.createdAt : new Date().toISOString(),
    };
    await storage.set(`transport:${tripId}:${newTransport.id}`, newTransport);
    setEditingTransport(null);
  };

  const deleteTransport = async (id: number) => {
    if (confirm("Delete this transport?")) await deleteKey(`transport:${tripId}:${id}`);
  };

  // PACKING & DOCUMENTS (Same as before)
  const addPackingItem = async (data: PackingData) => {
    const user = auth.currentUser;
    const newItem: StoredPacking = {
      ...data,
      id: Date.now(),
      packed: false,
      createdByUid: user?.uid,
      createdAt: new Date().toISOString(),
    };
    const prefix = packingMode === "shared" ? `packing:${tripId}:shared` : `packing:${tripId}:user:${user?.uid}`;
    await storage.set(`${prefix}:${newItem.id}`, newItem);
  };

  const togglePacked = async (item: StoredPacking) => {
    const user = auth.currentUser;
    const updated = { ...item, packed: !item.packed };
    const prefix = packingMode === "shared" ? `packing:${tripId}:shared` : `packing:${tripId}:user:${user?.uid}`;
    await storage.set(`${prefix}:${item.id}`, updated);
  };

  const deletePackingItem = async (id: number) => {
    const user = auth.currentUser;
    const prefix = packingMode === "shared" ? `packing:${tripId}:shared` : `packing:${tripId}:user:${user?.uid}`;
    await deleteKey(`${prefix}:${id}`);
  };

  const addDocument = async (data: Omit<DocumentData, "id" | "createdAt" | "createdByUid">) => {
    const user = auth.currentUser;
    const newDoc: DocumentData = {
      id: Date.now(),
      ...data,
      createdByUid: user?.uid || null,
      createdAt: new Date().toISOString(),
    };
    await storage.set(`document:${tripId}:${newDoc.id}`, newDoc);
  };

  const deleteDocument = async (id: number) => {
    if (confirm("Delete document?")) await deleteKey(`document:${tripId}:${id}`);
  };

  const downloadDocument = (doc: DocumentData) => {
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.fileName || doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Packing stats
  const packedCount = packing.filter((p) => p.packed).length;
  // 👇 ADD THIS: Groups the list items into categories
  const groupedPacking = packing.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, StoredPacking[]>);

  const categories = Object.keys(groupedPacking).sort();
  // --- CLEANUP TOOL ---
  const cleanUpGhosts = async () => {
    if (!confirm("This will scan for and delete any broken/empty items that cannot be deleted normally. Continue?")) return;

    let count = 0;
    const prefixes = [`flight:${tripId}:`, `hotel:${tripId}:`, `transport:${tripId}:`, `packing:${tripId}:`];

    try {
      for (const prefix of prefixes) {
        // 1. Get all KEYS for this category
        const result = await storage.list(prefix);
        
        if (result && result.keys) {
          for (const key of result.keys) {
            // 2. Fetch the raw data for each key
            const dataSnap = await storage.get(key);
            
            // 3. Determine if it's "Ghost" (Broken/Empty)
            let isBroken = false;
            
            if (!dataSnap) {
               isBroken = true;
            } else {
               try {
                 // Handle both stringified (legacy) and raw object data
                 const val = dataSnap.value ? JSON.parse(dataSnap.value) : dataSnap;
                 
                 // CRITICAL CHECK: Does it have an ID? 
                 // If ID is missing, or it's an empty object, it's a ghost.
                 if (!val || val.id === undefined || Object.keys(val).length <= 1) {
                   isBroken = true;
                 }
               } catch (e) {
                 isBroken = true; // If we can't parse it, it's corrupt
               }
            }

            // 4. Delete if broken
            if (isBroken) {
              console.log("Deleting ghost item:", key);
              await deleteKey(key);
              count++;
            }
          }
        }
      }
      alert(`Cleanup complete! Removed ${count} broken items.`);
      // Reload page to refresh state cleanly
      window.location.reload(); 
    } catch (err) {
      console.error("Cleanup failed:", err);
      alert("An error occurred during cleanup. Check console.");
    }
  };
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="border-b border-stone-100 pb-5">
        <h2 className="text-3xl font-serif text-stone-900 pb-2">Trip Administration</h2>
        <p className="text-stone-500 mt-1 font-light">Manage logistics, documents, and fellow travelers.</p>
      </div>
      <div className="text-stone-500 mt-1 font-light"></div>
      {/* PILL NAVIGATION (Cleaner than underline) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab("members")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            activeSubTab === "members"
              ? "bg-stone-900 text-white shadow-md"
              : "bg-white text-stone-500 border border-stone-200 hover:border-stone-400 hover:text-stone-900"
          }`}
        >
          <Users size={16} /> Members
        </button>

        {[
          { id: "flights", label: "Flights", icon: Plane },
          { id: "hotels", label: "Accommodations", icon: Hotel },
          { id: "transport", label: "Transport", icon: Train },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "packing", label: "Packing List", icon: PackageCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          // Cast tab.id to satisfy TypeScript if needed, or rely on loose matching
          return (
             <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeSubTab === tab.id
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-500 border border-stone-200 hover:border-stone-400 hover:text-stone-900"
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>
      {/* === MEMBERS VIEW === */}
      {activeSubTab === "members" && (
        <div className="space-y-8 max-w-2xl">
          
          {/* 1. Invite Section (Updated Style) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-serif text-stone-900 mb-2">Invite Travelers</h3>
            <p className="text-stone-500 text-sm mb-6">
              Add friends to this trip to share the itinerary and expenses.
            </p>
            
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteStatus("idle");
                }}
                className="flex-1 border border-stone-300 rounded-lg px-4 py-3 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all placeholder:text-stone-400"
              />
              <button
                onClick={async () => {
                   /* ... keep existing invite logic ... */
                   if (!inviteEmail) return;
                   const user = auth.currentUser;
                   if (!user) return;
                   try {
                     const tripSnap = await storage.get(`trip:${tripId}`);
                     if (tripSnap?.value) {
                       const tripData = JSON.parse(tripSnap.value);
                       const currentInvites = tripData.invites || [];
                       if (currentInvites.includes(inviteEmail)) {
                          setInviteStatus("error");
                          setInviteMsg("User already invited.");
                          return;
                       }
                       const updated = {
                         ...tripData,
                         invites: [...currentInvites, inviteEmail],
                       };
                       await storage.set(`trip:${tripId}`, updated);
                       setInviteStatus("success");
                       setInviteMsg(`Invite sent to ${inviteEmail}`);
                       setInviteEmail("");
                       loadMembers(); 
                     }
                   } catch (e) {
                     setInviteStatus("error");
                     setInviteMsg("Failed to send invite.");
                   }
                }}
                className="px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-lg"
              >
                Send Invite
              </button>
            </div>
            
            {/* Visual Feedback */}
            {inviteStatus !== "idle" && (
              <div className={`mt-4 flex items-center gap-2 text-sm font-bold animate-in slide-in-from-top-2 ${
                inviteStatus === "success" ? "text-emerald-600" : "text-rose-600"
              }`}>
                {inviteStatus === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {inviteMsg}
              </div>
            )}
          </div>

          {/* 2. Members List (Keep existing logic, just ensure styling matches) */}
          <div>
            <h3 className="text-xl font-serif text-stone-900 mb-4">Who's going?</h3>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 shadow-sm">
              {memberList.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                      member.status === "Member" 
                        ? "bg-stone-900 text-white" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">
                        {member.name} {member.isMe && <span className="text-stone-400 font-normal">(You)</span>}
                      </p>
                      {member.status === "Invited" && (
                        <p className="text-xs text-stone-500">{member.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    member.status === "Member" 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* === FLIGHTS VIEW === */}
      {activeSubTab === "flights" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif">Flights</h3>
            <button
              onClick={() => { setEditingFlight(null); setShowFlightDialog(true); }}
              className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Add Flight
            </button>
          </div>
          {/* GRID LAYOUT FOR FLIGHTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onConfirm={() => setCostDialogFlight(flight)}
                onDelete={() => deleteFlight(flight.id)}
                onEdit={() => {
                  setEditingFlight(flight);
                  setShowFlightDialog(true);
                }}
              />
            ))}
            {flights.length === 0 && <div className="col-span-2 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">No flights added yet.</div>}
          </div>
        </div>
      )}

      {/* === HOTELS VIEW === */}
      {activeSubTab === "hotels" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif">Accommodations</h3>
            <button
              onClick={() => { setEditingHotel(null); setShowHotelDialog(true); }}
              className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Add Hotel
            </button>
          </div>
          {/* GRID LAYOUT FOR HOTELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                onConfirm={() => setCostDialogHotel(hotel)}
                onDelete={() => deleteHotel(hotel.id)}
                onEdit={() => {
                  setEditingHotel(hotel);
                  setShowHotelDialog(true);
                }}
              />
            ))}
            {hotels.length === 0 && <div className="col-span-2 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">No hotels added yet.</div>}
          </div>
        </div>
      )}

      {/* === TRANSPORT VIEW === */}
      {activeSubTab === "transport" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif">Transport</h3>
            <button
              onClick={() => { setEditingTransport(null); setShowTransportDialog(true); }}
              className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Add Transport
            </button>
          </div>
          {/* GRID LAYOUT FOR TRANSPORT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transports.map((t) => (
              <TransportCard
                key={t.id}
                transport={t}
                onConfirm={() => setCostDialogTransport(t)}
                onDelete={() => deleteTransport(t.id)}
                onEdit={() => {
                  setEditingTransport(t);
                  setShowTransportDialog(true);
                }}
              />
            ))}
            {transports.length === 0 && <div className="col-span-2 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">No transport added yet.</div>}
          </div>
        </div>
      )}

      {/* === DOCUMENTS VIEW (Grid Already) === */}
      {activeSubTab === "documents" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif">Trip Documents</h3>
            <button
              onClick={() => setShowDocumentDialog(true)}
              className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Upload Doc
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-700">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                      <FileText size={24} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadDocument(doc)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Download size={18} />
                      </button>
                      <button onClick={() => deleteDocument(doc.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">{doc.category}</span>
                    <CreatorBadge uid={doc.createdByUid} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === PACKING VIEW (List) === */}
      {activeSubTab === "packing" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-serif">Packing List ({packedCount}/{packing.length})</h3>
            <div className="flex gap-2">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setPackingMode("shared")}
                  className={`px-3 py-1 rounded text-sm ${packingMode === "shared" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                >
                  Shared
                </button>
                <button
                  onClick={() => setPackingMode("personal")}
                  className={`px-3 py-1 rounded text-sm ${packingMode === "personal" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                >
                  Personal
                </button>
              </div>
              <button
                onClick={() => setShowPackingDialog(true)}
                className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Add Item
              </button>
            </div>
          </div>
          {/* 👇 REPLACE WITH THIS NEW GROUPED GRID 👇 */}
          {packing.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-xl border border-dashed border-stone-200">
               <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
                  <PackageCheck size={24} />
               </div>
               <p className="text-stone-500 text-sm">List is empty.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
               {/* 1. Loop through Categories first */}
               {categories.map((category) => {
                 const items = groupedPacking[category];
                 const catPacked = items.filter(i => i.packed).length;
                 
                 return (
                   <div key={category} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                      {/* Category Header */}
                      <div className="flex justify-between items-baseline mb-4 border-b border-stone-100 pb-2">
                        <h4 className="font-serif text-lg text-stone-900">{category}</h4>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-full">
                           {catPacked}/{items.length}
                        </span>
                      </div>
                      
                      {/* 2. Loop through Items in this Category */}
                      <div className="space-y-3">
                        {items.map((item) => (
                           <div key={item.id} className="flex items-start gap-3 group">
                              <input
                                type="checkbox"
                                checked={item.packed}
                                onChange={() => togglePacked(item)}
                                className="mt-1 w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className={`text-sm font-medium transition-colors leading-snug ${
                                   item.packed ? "line-through text-stone-300" : "text-stone-700"
                                }`}>
                                  {item.item}
                                </p>
                              </div>
                              <button 
                                onClick={() => deletePackingItem(item.id)} 
                                className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete item"
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                        ))}
                      </div>
                   </div>
                 );
               })}
             </div>
          )}
          
        </div>
        
      )}
      
      

      {/* === DIALOGS (Hidden until triggered) === */}
      {showFlightDialog && (
        <FlightDialog
          initialData={editingFlight || undefined}
          onClose={() => { setShowFlightDialog(false); setEditingFlight(null); }}
          onAdd={(data) => { addFlight(data); setShowFlightDialog(false); }}
        />
      )}

      {showHotelDialog && (
        <HotelDialog
          initialData={editingHotel || undefined}
          onClose={() => { setShowHotelDialog(false); setEditingHotel(null); }}
          onAdd={(data) => { addHotel(data); setShowHotelDialog(false); }}
        />
      )}

      {showTransportDialog && (
        <TransportDialog
          initialData={editingTransport || undefined}
          onClose={() => { setShowTransportDialog(false); setEditingTransport(null); }}
          onAdd={(data) => { addTransport(data); setShowTransportDialog(false); }}
        />
      )}

      {showPackingDialog && (
        <PackingDialog
          onClose={() => setShowPackingDialog(false)}
          onAdd={(data) => { addPackingItem(data); setShowPackingDialog(false); }}
        />
      )}

      {showDocumentDialog && (
        <DocumentDialog
          onClose={() => setShowDocumentDialog(false)}
          onAdd={(data) => { addDocument(data); setShowDocumentDialog(false); }}
        />
      )}

      {costDialogFlight && (
        <CostDialog
          item={{ item: `Flight: ${costDialogFlight.airline} ${costDialogFlight.flightNumber}` }}
          tripId={tripId}
          onClose={() => setCostDialogFlight(null)}
          onSave={async (cost, paidBy) => {
            const updated = { ...costDialogFlight, status: "confirmed", cost, paidBy };
            await storage.set(`flight:${tripId}:${costDialogFlight.id}`, updated);
            setCostDialogFlight(null);
          }}
        />
      )}

      {costDialogHotel && (
        <CostDialog
          item={{ item: `Hotel: ${costDialogHotel.name}` }}
          tripId={tripId}
          onClose={() => setCostDialogHotel(null)}
          onSave={async (cost, paidBy) => {
            const updated = { ...costDialogHotel, status: "confirmed", cost, paidBy };
            await storage.set(`hotel:${tripId}:${costDialogHotel.id}`, updated);
            setCostDialogHotel(null);
          }}
        />
      )}

      {costDialogTransport && (
        <CostDialog
          item={{ item: `Transport: ${costDialogTransport.type}` }}
          tripId={tripId}
          onClose={() => setCostDialogTransport(null)}
          onSave={async (cost, paidBy) => {
            const updated = { ...costDialogTransport, status: "confirmed", cost, paidBy };
            await storage.set(`transport:${tripId}:${costDialogTransport.id}`, updated);
            setCostDialogTransport(null);
          }}
        />
      )}
    </div>
  );
}
function BudgetTab({ tripId }: { tripId: number }) {
  type BudgetLimits = {
    total: number;
    accommodation: number;
    travel: number;
    food: number;
    shopping: number;
    miscellaneous: number;
    other: number;
  };

  const [limits, setLimits] = useState<BudgetLimits>({
    total: 0,
    accommodation: 0,
    travel: 0,
    food: 0,
    shopping: 0,
    miscellaneous: 0,
    other: 0,
  });

  const [editingBudget, setEditingBudget] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  type BudgetMode = "shared" | "mine";
  const [mode, setMode] = useState<BudgetMode>("shared");

  type BudgetItem = {
    label: string;
    amount: number;
  };

  type BudgetCategory = {
    total: number;
    items: BudgetItem[];
  };
  
  type BudgetState = {
    accommodation: BudgetCategory;
    travel: BudgetCategory;
    food: BudgetCategory;
    shopping: BudgetCategory;
    miscellaneous: BudgetCategory;
    other: BudgetCategory;
  };

  const [budget, setBudget] = useState<BudgetState>({
    accommodation: { total: 0, items: [] },
    travel: { total: 0, items: [] },
    food: { total: 0, items: [] },
    shopping: { total: 0, items: [] },
    miscellaneous: { total: 0, items: [] },
    other: { total: 0, items: [] },
  });

  const myUid = auth.currentUser?.uid;

  // ✅ FIX 1: Robust price parser that handles Numbers AND Strings
  const parsePrice = (p?: string | number) => {
    if (typeof p === "number") return p;
    if (!p) return 0;
    // robustly handle string inputs like "£1,200.00" or "$500"
    return Number(String(p).replace(/[^\d.]/g, "")) || 0;
  };

  const getMyShare = (cost: string | number, paidBy?: { uid: string; amount: number }[]) => {
    // If we have explicit split data, use that
    if (paidBy && myUid) {
      const me = paidBy.find((p) => p.uid === myUid);
      return me?.amount || 0;
    }
    // Fallback: if no split data, parse the full cost
    return parsePrice(cost);
  };

  const loadLimits = async () => {
    try {
      const snap = await storage.get(`budgetLimits:${tripId}:${mode}`);
      if (snap?.value) {
        setLimits(JSON.parse(snap.value));
      } else {
        // Reset limits if none found
        setLimits({
          total: 0,
          accommodation: 0,
          travel: 0,
          food: 0,
          shopping: 0,
          miscellaneous: 0,
          other: 0,
        });
      }
    } catch (e) {
      console.error("Error loading limits", e);
    }
  };

  const loadBudget = async () => {
    try {
      const newBudget: BudgetState = {
        accommodation: { total: 0, items: [] },
        travel: { total: 0, items: [] },
        food: { total: 0, items: [] },
        shopping: { total: 0, items: [] },
        miscellaneous: { total: 0, items: [] },
        other: { total: 0, items: [] },
      };

      const addItem = (
        cat: keyof typeof newBudget,
        label: string,
        cost: string | number,
        paidBy?: any
      ) => {
        let amount = 0;
        if (mode === "mine") {
          if (!myUid) return;
          if (paidBy && Array.isArray(paidBy)) {
             const me = paidBy.find((p: any) => p.uid === myUid);
             if (me) amount = me.amount;
          } 
        } else {
          amount = parsePrice(cost);
        }

        if (amount > 0) {
          newBudget[cat].total += amount;
          newBudget[cat].items.push({ label, amount });
        }
      };

      // --- 1. HOTELS ---
      const hotels = await storage.getAll<StoredHotel>(`hotel:${tripId}:`);
      hotels.forEach(h => {
        if (h.status === "confirmed") {
          // Use ?? "" to ensure we never pass undefined to addItem
          addItem("accommodation", h.name || "Hotel", h.cost ?? h.price ?? "", h.paidBy);
        }
      });

      // --- 2. FLIGHTS ---
      const flights = await storage.getAll<StoredFlight>(`flight:${tripId}:`);
      flights.forEach(f => {
        if (f.status === "confirmed") {
          addItem("travel", `${f.airline} ${f.flightNumber}`, f.cost ?? f.price ?? "", f.paidBy);
        }
      });
      
      // --- 3. TRANSPORT ---
      const transports = await storage.getAll<StoredTransport>(`transport:${tripId}:`);
      transports.forEach(t => {
        if (t.status === "confirmed") {
          addItem("travel", `${t.type} ${t.code || ""}`, t.cost ?? t.price ?? "", t.paidBy);
        }
      });

      // --- 4. SHOPPING (Personal Only) ---
      if (mode === "mine" && myUid) {
        const shoppingItems = await storage.getAll<any>(`shopping:${tripId}:user:${myUid}:`);
        shoppingItems.forEach(s => {
            if (s.bought && s.cost) {
                newBudget.shopping.total += Number(s.cost);
                newBudget.shopping.items.push({ 
                  label: s.item, 
                  amount: Number(s.cost) 
                });
            }
        });
      }

      // --- 5. PLACES ---
      const [eats, visits] = await Promise.all([
          storage.getAll<StoredPlace>(`place:${tripId}:eat:`),
          storage.getAll<StoredPlace>(`place:${tripId}:visit:`)
      ]);

      eats.forEach(p => {
        if (p.visited) {
            addItem("food", p.name, p.cost ?? p.price ?? "", p.paidBy);
        }
      });

      visits.forEach(p => {
        if (p.visited) {
            addItem("other", p.name, p.cost ?? p.price ?? "", p.paidBy);
        }
      });

      // --- 6. MANUAL EXPENSES ---
      if (mode === "shared") {
        const sharedExpenses = await storage.getAll<any>(`expense:${tripId}:shared:`);
        sharedExpenses.forEach(e => {
             addItem((e.category as keyof BudgetState) || "other", e.label, e.amount, e.paidBy);
        });
      }

      if (mode === "mine" && myUid) {
        const myExpenses = await storage.getAll<any>(`expense:${tripId}:user:${myUid}:`);
        myExpenses.forEach(e => {
            addItem((e.category as keyof BudgetState) || "other", e.label, e.amount);
        });
      }

      setBudget(newBudget);
    } catch (err) {
      console.error("Budget calculation failed:", err);
    }
  };

  useEffect(() => {
    loadBudget();
    loadLimits();
  }, [tripId, mode]);

  const saveLimits = async (newLimits: BudgetLimits) => {
    setLimits(newLimits);
    await storage.set(`budgetLimits:${tripId}:${mode}`, newLimits);
  };

  const totalSpent = Object.values(budget).reduce((a, b) => a + b.total, 0);
  const totalRemaining = limits.total - totalSpent;

  return (
    <div className="space-y-8 max-w-3xl mx-auto"> {/* Centered layout */}
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
           <h2 className="text-3xl font-serif text-stone-900">Financials</h2>
           <p className="text-stone-500 mt-3">Track shared expenses and personal spending.</p>
        </div>
        
        {/* Toggle Pills */}
        <div className="flex bg-stone-100 p-1 rounded-lg">
           <button
             onClick={() => setMode("shared")}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
               mode === "shared" ? "bg-white shadow-sm text-stone-900" : "text-stone-400 hover:text-stone-600"
             }`}
           >
             Shared Budget
           </button>
           <button
             onClick={() => setMode("mine")}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
               mode === "mine" ? "bg-white shadow-sm text-stone-900" : "text-stone-400 hover:text-stone-600"
             }`}
           >
             My Spending
           </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setEditingBudget((v) => !v)}
          className="px-4 py-2 text-stone-500 hover:text-stone-900 text-sm font-medium transition-colors"
        >
          {editingBudget ? "Done Editing" : "Adjust Limits"}
        </button>
        <button
          onClick={() => setShowExpenseDialog(true)}
          className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Budget Summary Card */}
      {!editingBudget && limits.total > 0 && (
        <div className="bg-stone-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
           {/* Decorative circle */}
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
           
           <div className="relative z-10">
             <div className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-1">Remaining Budget</div>
             <div className="text-5xl font-serif mb-6">£{totalRemaining.toFixed(2)}</div>
             
             <div className="flex gap-8 border-t border-white/10 pt-4">
                <div>
                   <div className="text-xs text-stone-500 uppercase font-bold">Total Budget</div>
                   <div className="text-lg">£{limits.total.toFixed(2)}</div>
                </div>
                <div>
                   <div className="text-xs text-stone-500 uppercase font-bold">Total Spent</div>
                   <div className="text-lg">£{totalSpent.toFixed(2)}</div>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Limits Editor */}
      {editingBudget && (
        <div className="bg-stone-50 rounded-xl p-6 border border-stone-200 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-serif text-lg mb-4 text-stone-900">Set Budget Limits</h4>
          <div className="grid gap-4">
             <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-700">Total Cap</span>
                <input
                  type="number"
                  value={limits.total}
                  onChange={(e) => saveLimits({ ...limits, total: Number(e.target.value) })}
                  className="w-32 text-right outline-none font-serif text-lg"
                />
             </div>
             <div className="h-px bg-stone-200 my-2" />
             {Object.keys(budget).map((cat) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                   <span className="capitalize text-stone-600">{cat}</span>
                   <div className="flex items-center gap-2">
                      <span className="text-stone-400">£</span>
                      <input
                        type="number"
                        value={limits[cat as keyof BudgetLimits]}
                        onChange={(e) => saveLimits({ ...limits, [cat]: Number(e.target.value) })}
                        className="w-24 text-right bg-transparent border-b border-stone-300 focus:border-stone-900 outline-none transition-colors"
                      />
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <h3 className="font-serif text-xl mb-6 border-b border-stone-100 pb-2">Expenses Breakdown</h3>
        <div className="space-y-8">
          {Object.entries(budget).map(([name, data]) => (
            <div key={name}>
               <div className="flex justify-between items-baseline mb-2">
                  <span className="text-stone-400 text-xs font-bold uppercase tracking-wider">{name}</span>
                  <span className="font-serif text-lg font-medium text-stone-900">£{data.total.toFixed(2)}</span>
               </div>
               
               {data.items.length > 0 ? (
                 <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                    {data.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-stone-600">
                        <span>{i.label}</span>
                        <span className="font-mono text-stone-500">£{i.amount.toFixed(2)}</span>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                    {/* Empty state bar */}
                 </div>
               )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center">
           <span className="font-serif text-xl text-stone-900">Total Spent</span>
           <span className="font-serif text-2xl text-stone-900">£{totalSpent.toFixed(2)}</span>
        </div>
      </div>
        {showExpenseDialog && (
          <ExpenseDialog
            mode={mode}
            tripId={tripId}
            onClose={() => setShowExpenseDialog(false)}
            onSave={async () => {
              setShowExpenseDialog(false);
              await loadBudget();
            }}
          />
        )}

        <hr />

        <Row
          label="Total"
          value={Object.values(budget).reduce((a, b) => a + b.total, 0)}
        />
      </div>
    
  );
}

function Row({label,value}:{label:string,value:number}){
  return(
    <div className="flex justify-between">
      <span>{label}</span>
      <span>£{value.toFixed(2)}</span>
    </div>
  )
}

function Category({
  title,
  items
}:{title:string,items:{label:string,value:number}[]}){

  const total=items.reduce((s,i)=>s+i.value,0);

  if(items.length===0){
    return(
      <div>
        <div className="flex justify-between font-semibold">
          <span>{title}</span>
          <span>£0.00</span>
        </div>
      </div>
    );
  }

  return(
    <div className="space-y-2">

      <div className="flex justify-between font-semibold text-lg">
        <span>{title}</span>
        <span>£{total.toFixed(2)}</span>
      </div>

      <div className="pl-4 space-y-1 text-sm text-gray-700">

        {items.map((i,idx)=>(
          <div key={idx} className="flex justify-between">
            <span>{i.label}</span>
            <span>£{i.value.toFixed(2)}</span>
          </div>
        ))}

      </div>

    </div>
  );
}

function ExpenseDialog({
  mode,
  tripId,
  onClose,
  onSave
}:{
  mode:"shared"|"mine";
  tripId:number;
  onClose:()=>void;
  onSave:()=>void;
}){

  const [label,setLabel]=useState("");
  const [amount,setAmount]=useState("");
  const [category,setCategory]=useState("other");

  const [members,setMembers]=useState<{uid:string,name:string}[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [splitMode,setSplitMode]=useState<"equal"|"custom">("equal");
  const [custom,setCustom]=useState<Record<string,string>>({});

  // LOAD MEMBERS ONLY FOR SHARED MODE
  useEffect(()=>{

    const loadMembers=async()=>{

      if(mode!=="shared") return;

      const tripDoc=await storage.get(`trip:${tripId}`);
      if(!tripDoc?.value) return;

      const trip=JSON.parse(tripDoc.value);
      const memberIds=trip.members || [];

      const result=[];

      for(const uid of memberIds){

        const userSnap = await getDoc(doc(db,"users",uid));

        if(userSnap.exists()){
          const data=userSnap.data();
          result.push({
            uid,
            name: data.name || data.displayName || data.email || "User"
          });
        }else{
          result.push({uid,name:"User"});
        }

      }

      setMembers(result);
      setSelected(memberIds);   // default: everyone selected
    };

    loadMembers();

  },[mode,tripId]);
    const handleSave=async()=>{

    if(!label || !amount) return;

    let paidBy:any[]|undefined=undefined;

    if(mode==="shared"){

      const total=Number(amount);

      if(splitMode==="equal"){

        const each=total/selected.length;

        paidBy=selected.map(uid=>({
          uid,
          amount:each
        }));

      }else{

        paidBy=selected.map(uid=>({
          uid,
          amount:Number(custom[uid]||0)
        }));
      }
    }

    const expense={
      id:Date.now(),
      label,
      amount,
      category,
      paidBy,
      createdByUid:auth.currentUser?.uid || null,
      createdAt:new Date().toISOString(),
      type:"manualExpense"
    };

    const key=
      mode==="shared"
        ? `expense:${tripId}:shared:${expense.id}`
        : `expense:${tripId}:user:${auth.currentUser?.uid}:${expense.id}`;

    await storage.set(key,expense);

    onSave();
  };
    return(
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

    <div className="bg-white rounded-xl shadow-xl w-[480px] p-6 space-y-4">

      <h3 className="text-xl font-serif">Add Expense</h3>

      <input
        placeholder="What was it?"
        value={label}
        onChange={e=>setLabel(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2"
      />

      <select
        value={category}
        onChange={e=>setCategory(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2"
      >
        <option value="accommodation">Accommodation</option>
        <option value="travel">Travel</option>
        <option value="food">Food</option>
        <option value="shopping">Shopping</option>
        <option value="miscellaneous">Miscellaneous</option>
        <option value="other">Other</option>
      </select>

      <input
        type="number"
        placeholder="Cost"
        value={amount}
        onChange={e=>setAmount(e.target.value)}
        className="w-full border-2 rounded-lg px-3 py-2"
      />
      {mode==="shared" && members.length>0 && (

<div className="space-y-3 border-t pt-4">

  <div className="text-sm font-medium">Who paid?</div>

  <div className="flex flex-wrap gap-2">
    {members.map(m=>(
      <label key={m.uid} className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={selected.includes(m.uid)}
          onChange={()=>{
            setSelected(prev =>
              prev.includes(m.uid)
                ? prev.filter(u=>u!==m.uid)
                : [...prev,m.uid]
            );
          }}
        />
        {m.name}
      </label>
    ))}
  </div>

  <div className="flex gap-2 pt-2">

    <button
      onClick={()=>setSplitMode("equal")}
      className={`px-3 py-1 rounded ${
        splitMode==="equal" ? "bg-gray-900 text-white":"bg-gray-200"
      }`}
    >
      Split equally
    </button>

    <button
      onClick={()=>setSplitMode("custom")}
      className={`px-3 py-1 rounded ${
        splitMode==="custom" ? "bg-gray-900 text-white":"bg-gray-200"
      }`}
    >
      Custom split
    </button>

  </div>

  {splitMode==="custom" && selected.map(uid=>{
    const m=members.find(x=>x.uid===uid);
    return(
      <div key={uid} className="flex justify-between items-center">
        <span className="text-sm">{m?.name}</span>

        <input
          type="number"
          placeholder="0"
          value={custom[uid]||""}
          onChange={e=>
            setCustom(c=>({...c,[uid]:e.target.value}))
          }
          className="w-24 border rounded px-2 py-1 text-sm"
        />
      </div>
    );
  })}

</div>

)}
  <div className="flex justify-end gap-2 pt-3">

<button onClick={onClose} className="px-4 py-2 border rounded-lg">
Cancel
</button>

<button onClick={handleSave} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
Save
</button>

</div>

</div>
</div>
);
}
function TransportDialog({
  initialData,
  onClose,
  onAdd
}:{
  initialData?:TransportData;
  onClose:()=>void;
  onAdd:(data:TransportData)=>void;
}){

  const [type,setType]=useState(initialData?.type || "");
  const [code,setCode]=useState(initialData?.code || "");
  const [departure,setDeparture]=useState(initialData?.departure || "");
  const [arrival,setArrival]=useState(initialData?.arrival || "");
  const [date,setDate]=useState(initialData?.date || "");
  const [time,setTime]=useState(initialData?.time || "");
  const [price,setPrice]=useState(initialData?.price || "");
  const [link,setLink]=useState(initialData?.link || "");
  const [details,setDetails]=useState(initialData?.details || "");
  const [status,setStatus]=useState<"potential"|"confirmed">(initialData?.status || "potential");


  const handleSave=()=>{

    if(!type || !departure || !arrival){
      alert("Please fill transport type, departure and arrival");
      return;
    }

    onAdd({
      type,
      code,
      departure,
      arrival,
      date,
      time,
      price,
      link,
      details,
      status
    });
  };

  return(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto p-6 space-y-4">

        <h3 className="text-2xl font-serif">
          {initialData ? "Edit Transport" : "Add Transport"}
        </h3>

        {/* TYPE */}
        <input
          placeholder="Transport type (Train, Coach, Ferry...)"
          value={type}
          onChange={e=>setType(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* CODE */}
        <input
          placeholder="Number / Code (optional)"
          value={code}
          onChange={e=>setCode(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* ROUTE */}
        <div className="grid grid-cols-2 gap-3">

          <input
            placeholder="Departure"
            value={departure}
            onChange={e=>setDeparture(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

          <input
            placeholder="Arrival"
            value={arrival}
            onChange={e=>setArrival(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

        </div>

        {/* DATE + TIME */}
        <div className="grid grid-cols-2 gap-3">

          <input
            type="date"
            value={date}
            onChange={e=>setDate(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

          <input
            type="time"
            value={time}
            onChange={e=>setTime(e.target.value)}
            className="border-2 rounded-lg px-3 py-2"
          />

        </div>

        {/* PRICE */}
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={e=>setPrice(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* BOOKING LINK */}
        <input
          placeholder="Booking link (optional)"
          value={link}
          onChange={e=>setLink(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* DETAILS */}
        <textarea
          placeholder="Details / notes"
          value={details}
          onChange={e=>setDetails(e.target.value)}
          className="w-full border-2 rounded-lg px-3 py-2"
        />

        {/* STATUS */}
        <select
          value={status}
          onChange={e=>setStatus(e.target.value as "potential"|"confirmed")}
          className="w-full border-2 rounded-lg px-3 py-2"
        >
          <option value="potential">Potential option</option>
          <option value="confirmed">Confirmed</option>
        </select>


        {/* BUTTONS */}
        <div className="flex justify-end gap-2 pt-3">

          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  );
}

function LocationManagerDialog({
  trip,
  onClose,
  onSave,
}: {
  trip: TripData;
  onClose: () => void;
  onSave: (segments: TripSegment[]) => void;
}) {
  const [segments, setSegments] = useState<TripSegment[]>(trip.segments || []);
  const [newLoc, setNewLoc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [color, setColor] = useState("bg-blue-100");

  const colors = [
    { label: "Blue", val: "bg-blue-100 text-blue-800 border-blue-200" },
    { label: "Rose", val: "bg-rose-100 text-rose-800 border-rose-200" },
    { label: "Green", val: "bg-green-100 text-green-800 border-green-200" },
    { label: "Amber", val: "bg-amber-100 text-amber-800 border-amber-200" },
    { label: "Purple", val: "bg-purple-100 text-purple-800 border-purple-200" },
  ];

  const add = () => {
    if (!newLoc || !start || !end) return;
    setSegments([
      ...segments,
      { id: Date.now().toString(), location: newLoc, startDate: start, endDate: end, color },
    ]);
    setNewLoc("");
    setStart("");
    setEnd("");
  };

  const remove = (id: string) => {
    setSegments(segments.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Manage Trip Locations</h3>
        
        {/* Existing Segments */}
        <div className="space-y-2 mb-6">
          {segments.map((s) => (
            <div key={s.id} className={`flex justify-between items-center p-3 rounded border ${s.color}`}>
              <div>
                <span className="font-bold">{s.location}</span>
                <span className="text-sm ml-2 opacity-80">{s.startDate} → {s.endDate}</span>
              </div>
              <button onClick={() => remove(s.id)} className="text-sm font-bold hover:underline">
                Remove
              </button>
            </div>
          ))}
          {segments.length === 0 && <p className="text-gray-500 italic">No locations defined yet.</p>}
        </div>

        {/* Add New */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Add New Segment</h4>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="Location (e.g., Tokyo)"
            value={newLoc}
            onChange={(e) => setNewLoc(e.target.value)}
          />
          <div className="flex gap-2">
            <input type="date" className="border rounded px-2 py-1 w-1/2" value={start} onChange={(e) => setStart(e.target.value)} />
            <input type="date" className="border rounded px-2 py-1 w-1/2" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c.val}
                onClick={() => setColor(c.val)}
                className={`w-6 h-6 rounded-full border-2 ${c.val.split(" ")[0]} ${color === c.val ? "border-black" : "border-transparent"}`}
              />
            ))}
          </div>
          <button onClick={add} className="w-full bg-gray-900 text-white py-2 rounded">Add Segment</button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={() => onSave(segments)} className="px-4 py-2 bg-gray-900 text-white rounded">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ tripId }: { tripId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSetting();
  }, [tripId]);

  const loadSetting = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Fetch the notification settings for this trip
    const snap = await storage.get(`settings:${tripId}:notifications`);
    if (snap?.value) {
      const settings = JSON.parse(snap.value);
      // Check if MY user id is enabled
      setEnabled(!!settings[user.uid]?.enabled);
    }
    setLoading(false);
  };

  const toggle = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const newStatus = !enabled;
    setEnabled(newStatus); // Optimistic update

    // 1. Get existing settings
    const snap = await storage.get(`settings:${tripId}:notifications`);
    let settings = snap?.value ? JSON.parse(snap.value) : {};

    // 2. Update MY entry
    settings[user.uid] = {
      enabled: newStatus,
      email: user.email, // Save email so the sender knows where to send it!
      name: user.displayName || "Traveler"
    };

    // 3. Save back
    await storage.set(`settings:${tripId}:notifications`, settings);
    
    if (newStatus) {
      alert("You will now receive email alerts for new activities.");
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      title={enabled ? "Turn off email alerts" : "Turn on email alerts"}
      className={`p-2 rounded-full transition-colors ${
        enabled 
          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
      }`}
    >
      {enabled ? <Bell size={20} className="fill-current" /> : <BellOff size={20} />}
    </button>
  );
}