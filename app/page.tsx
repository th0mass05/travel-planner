"use client";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";   // adjust path if needed
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";   // adjust path if needed
import {doc, getDoc, setDoc} from "firebase/firestore";
import useUserName from "./hooks/useUserName";
import CreatorBadge from "./hooks/CreatorBadge";
import { formatDistanceToNow } from "date-fns";


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
} from "lucide-react";
import { storage } from "../firebaseStore";
import { exp } from "firebase/firestore/pipelines";
import { actionAsyncStorage } from "next/dist/server/app-render/action-async-storage.external";

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


export type StoredTransport = TransportData & {
  id:number;
  createdByUid?:string|null;
  createdAt?:string;
  cost?:string;
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

type TripData = TripFormData & {
  id: number;
  createdAt: string;
  ownerId: string;
  members: string[];
  createdByUid?: string | null;
  
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
};

function PlaceDialog({ onClose, onAdd, type }: PlaceDialogProps) {


  const [formData, setFormData] = useState<PlaceFormData>({


    name: "",
    description: "",
    address: "",
    rating: "",
    imageUrl: "",
    link: "",
    visited: false,
  });


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          setFormData({ ...formData, imageUrl: result });
        }
      };
      reader.readAsDataURL(file);
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
              Add {type === "eat" ? "Restaurant" : "Place"}
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



type PhotoDialogProps = {
  onClose: () => void;
  onAdd: (data: PhotoData) => void;
};

function PhotoDialog({ onClose, onAdd }: PhotoDialogProps) {

  const [formData, setFormData] = useState<PhotoData>({
    url: "",
    caption: "",
    date: "",
    location: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      // ✅ ensure it's actually a string before saving
      if (typeof result === "string") {
        setFormData(prev => ({
          ...prev,
          url: result,
        }));
      }
    };

    reader.readAsDataURL(file);
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Add Photo</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {formData.url && (
              <div className="mt-2">
                <img
                  src={formData.url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Caption</label>
            <input
              type="text"
              value={formData.caption}
              onChange={(e) =>
                setFormData({ ...formData, caption: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="What's happening in this photo?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
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
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add Photo
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

type FlightDialogProps = {
  onClose: () => void;
  onAdd: (data: FlightData) => void;
  initialData?: FlightData; // optional, used for edit mode
};

function FlightDialog({ onClose, onAdd, initialData }: FlightDialogProps) {

  const [formData, setFormData] = useState<FlightData>(
    initialData ?? {
      airline: "",
      flightNumber: "",
      departure: "",
      arrival: "",
      date: "",
      time: "",
      link: "",
      status: "potential",
      price: "",
      details: "",
      createdAt: new Date().toISOString(),
    }
  );



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Add Flight</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Airline</label>
              <input
                type="text"
                value={formData.airline}
                onChange={(e) =>
                  setFormData({ ...formData, airline: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., United"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Flight Number
              </label>
              <input
                type="text"
                value={formData.flightNumber}
                onChange={(e) =>
                  setFormData({ ...formData, flightNumber: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., UA123"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Departure
              </label>
              <input
                type="text"
                value={formData.departure}
                onChange={(e) =>
                  setFormData({ ...formData, departure: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., JFK"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Arrival</label>
              <input
                type="text"
                value={formData.arrival}
                onChange={(e) =>
                  setFormData({ ...formData, arrival: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., NRT"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              />
            </div>
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price (optional)</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e)=>
                setFormData({...formData, price:e.target.value})
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              placeholder="e.g., £650"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Details (optional)</label>
            <textarea
              value={formData.details}
              onChange={(e)=>
                setFormData({...formData, details:e.target.value})
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              rows={2}
              placeholder="Seat, baggage, terminal, notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Booking Link (optional)
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
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
            >
              <option value="potential">Potential Option</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add Flight
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


type HotelDialogProps = {
  onClose: () => void;
  onAdd: (data: HotelData) => void;
  initialData?: HotelData;
};

function HotelDialog({ onClose, onAdd, initialData }: HotelDialogProps) {

  const [formData, setFormData] = useState<HotelData>(
    initialData || {
      name: "",
      address: "",
      checkIn: "",
      checkOut: "",
      confirmationNumber: "",
      link: "",
      status: "potential",
      price: "",      // NEW
      details: "",    // NEW
      createdAt: new Date().toISOString(),
    }
  );



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Add Hotel</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Hotel Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="e.g., Grand Hyatt Tokyo"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Check-in</label>
              <input
                type="date"
                value={formData.checkIn}
                onChange={(e) =>
                  setFormData({ ...formData, checkIn: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Check-out
              </label>
              <input
                type="date"
                value={formData.checkOut}
                onChange={(e) =>
                  setFormData({ ...formData, checkOut: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Confirmation Number
            </label>
            <input
              type="text"
              value={formData.confirmationNumber}
              onChange={(e) =>
                setFormData({ ...formData, confirmationNumber: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="e.g., ABC123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price (optional)</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e)=>
                setFormData({...formData, price:e.target.value})
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              placeholder="e.g., £1200 total"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Details (optional)</label>
            <textarea
              value={formData.details}
              onChange={(e)=>
                setFormData({...formData, details:e.target.value})
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              rows={2}
              placeholder="Room type, breakfast included, notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Booking Link (optional)
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
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as "potential" | "confirmed", })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
            >
              <option value="potential">Potential Option</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add Hotel
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

type PackingDialogProps = {
  onClose: () => void;
  onAdd: (data: PackingData) => void;
};

function PackingDialog({ onClose, onAdd }: PackingDialogProps) {

  const [formData, setFormData] = useState<PackingData>({
    category: "Clothing",
    item: "",
    createdAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Add Packing Item</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
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
            <label className="block text-sm font-medium mb-1">Item</label>
            <input
              type="text"
              value={formData.item}
              onChange={(e) =>
                setFormData({ ...formData, item: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="e.g., Passport, T-shirts, Phone charger"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onAdd(formData)}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add Item
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

type ShoppingDialogProps = {
  onClose: () => void;
  onAdd: (data: ShoppingData) => void;
};


function ShoppingDialog({ onClose, onAdd }: ShoppingDialogProps) {
  const [formData, setFormData] = useState<ShoppingData>({
    item: "",
    category: "",
    link: "",
    notes: "",
    createdAt: new Date().toISOString(),
  });

  const handleSubmit = () => {
    if (!formData.item) return;
    onAdd({
      ...formData,
      category: formData.category || "General", // Default if empty
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Add Shopping Item</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              type="text"
              value={formData.item}
              onChange={(e) =>
                setFormData({ ...formData, item: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="e.g., Kapital T-shirt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="e.g., Clothing, Beauty, Souvenirs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Type a new category or use an existing one.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Link (optional)
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
              rows={2}
              placeholder="Size, color, store location..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add to List
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

type ActivityDialogProps = {
  onClose: () => void;
  onAdd: (data: ActivityData) => void;
};

function ActivityDialog({ onClose, onAdd }: ActivityDialogProps) {
  const [formData, setFormData] = useState<ActivityData>({
    time: "",
    activity: "",
    location: "",
    notes: "",
    iconType: "activity",
    createdAt: new Date().toISOString(),
  });

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
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
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
              Add Activity
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

type NewTripDialogProps = {
  onClose: () => void;
  onCreate: (data: TripFormData) => void | Promise<void>;
};


function NewTripDialog({ onClose, onCreate }: NewTripDialogProps) {
  const [formData, setFormData] = useState<TripFormData>({
    destination: "",
    country: "",
    year: new Date().getFullYear(),
    tagline: "",
    startDate: "",
    endDate: "",
    status: "upcoming",
    imageUrl: "",
    bgGradient: "from-blue-400 to-purple-400",
  });


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setFormData(prev => ({
          ...prev,
          imageUrl: result,   // ✅ correct field
        }));
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-serif mb-6">Create New Journey</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Destination
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., Tokyo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                placeholder="e.g., Japan"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tagline</label>
            <input
              type="text"
              required
              value={formData.tagline}
              onChange={(e) =>
                setFormData({ ...formData, tagline: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              placeholder="A short description of your trip"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Trip Image (optional)
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

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, status: e.target.value as TripStatus })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-4 pt-4">

              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Create Journey
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400"
              >
                Cancel
              </button>

            </div>
          </form>

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
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
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
};

type ItineraryDay = {
  day: number;
  date: string;
  items: ItineraryItem[];
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

  const key = `itinerary:${tripId}:date:${date}`;

  const existing = await storage.get(key);

  let targetDay: ItineraryDay;

  if (existing?.value) {
    targetDay = JSON.parse(existing.value) as ItineraryDay;
  } else {
    targetDay = { day: 0, date, items: [] };
  }

  targetDay.items.push({
    id: Date.now(),
    time,
    activity,
    location,
    notes,
    iconType
  });

  // 🔥 FIXES a & b implicit any errors
  targetDay.items.sort((a: ItineraryItem, b: ItineraryItem) =>
    (a.time || "").localeCompare(b.time || "")
  );

  await storage.set(key, targetDay);
};


function FlightCard({
  flight,
  onConfirm,
  onEdit,
  onDelete
}:{
  flight: StoredFlight;
  onConfirm: ()=>void;
  onEdit: ()=>void;
  onDelete: ()=>void;
}){

  const creatorName = useUserName(flight.createdByUid);

  return (
    <div
      className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-lg transition-all"
    >

      <div className="flex items-start justify-between">

        <div>
          <h3 className="text-xl font-serif text-gray-800">
            {flight.airline} {flight.flightNumber}
          </h3>

          {flight.createdAt && (
            <div className="text-xs text-gray-500 mt-1">
              Added by {creatorName || "Unknown"} •{" "}
              {formatDistanceToNow(new Date(flight.createdAt), { addSuffix: true })}
            </div>
          )}


          <p className="text-gray-700 mt-1">
            {flight.departure} → {flight.arrival}
          </p>

          <div className="text-sm text-gray-600 mt-2 space-y-1">
            {flight.date && <div>Date: {flight.date}</div>}
            {flight.time && <div>Time: {flight.time}</div>}
            {flight.price && <div className="font-medium">Price: {flight.price}</div>}
            {flight.details && <div className="text-gray-500">{flight.details}</div>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">

          {flight.status !== "confirmed" && (
            <button
              onClick={onConfirm}
              className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
            >
              Confirm
            </button>
          )}

          {flight.link && (
            <button
              onClick={()=>window.open(flight.link,"_blank")}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Open Booking
            </button>
          )}

          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit
          </button>

          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>

        </div>

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


  const loadTrips = async (uid: string) => {
    setLoading(true);

    try {
      // 🔥 IMPORTANT: list ALL trips, not just user's prefix
      const result = await storage.list("trip:");

      const loadedTrips: TripData[] = [];

      if (result?.keys) {
        for (const key of result.keys) {

          const data = await storage.get(key);

          if (data?.value) {
            const trip: TripData = JSON.parse(data.value);

            // ⭐ SHOW IF OWNER OR MEMBER
            if (
              trip.ownerId === uid ||
              trip.members?.includes(uid)
            ) {
              loadedTrips.push(trip);
            }
          }
        }
      }

      setTrips(loadedTrips.sort((a, b) => b.id - a.id));

    } catch (error) {
      console.error("Error loading trips:", error);
    }

    setLoading(false);
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
      <div>

      {/* Logout button top right */}
      <div className="flex justify-end items-center gap-2 p-4">

        <input
          value={displayName}
          onChange={(e)=>setDisplayName(e.target.value)}
          placeholder="Your name"
          className="border px-3 py-2 rounded-lg"
        />

        <button
          onClick={async ()=>{
            const user = auth.currentUser;
            if(!user) return;

            try{
              await setDoc(
                doc(db,"users",user.uid),
                {
                  email:user.email,
                  name:displayName
                },
                {merge:true}
              );

              alert("Name saved ✔");   // 👈 ADD THIS

            }catch(e){
              console.error("Failed to save name",e);
              alert("Failed to save name");
            }
          }}

          className="px-3 py-2 bg-gray-900 text-white rounded-lg"
        >
          Save name
        </button>

        <button
          onClick={handleLogout}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400"
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
        onDeleteTrip={deleteTrip}
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
  onDeleteTrip: (tripId: number) => void;   // NEW
};


function HomePage({
  trips,
  loading,
  onSelectTrip,
  onCreateTrip,
  onDeleteTrip,
}: HomePageProps) {
  const [filter, setFilter] = useState("all");
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);

  const filteredTrips = trips.filter((trip) => {
    if (filter === "all") return true;
    return trip.status === filter;
  });

  const handleCreateTrip = async (data: TripFormData) => {
    await onCreateTrip(data);
    setShowNewTripDialog(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f1e8]">
      <div className="bg-[#f5f1e8] border-b border-[#d4c5a0] py-16 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block px-4 py-2 border-2 border-[#8b7355] mb-6">
            <span className="text-[#8b7355] text-sm font-medium">
              ✈️ MY TRAVEL JOURNALS
            </span>
          </div>
          <h1 className="text-6xl font-serif text-gray-900 mb-4">
            Travel Chronicles
          </h1>
          <p className="text-gray-800 text-lg mb-8">
            Collecting memories from around the world, one journey at a time.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowNewTripDialog(true)}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add New Journey
            </button>
            <button className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-2">
              🎒 Browse Memories
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif text-gray-900">My Journeys</h2>
            <p className="text-gray-800 italic">
              {trips.length} adventures collected
            </p>
          </div>
          <div className="flex gap-2">
            {["all", "upcoming", "ongoing", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors capitalize ${
                  filter === f
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-300 hover:border-gray-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-700">
            Loading your journeys...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-700 mb-4">
              No journeys yet. Start your first adventure!
            </p>
            <button
              onClick={() => setShowNewTripDialog(true)}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => onSelectTrip(trip)}
                onDelete={() => onDeleteTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showNewTripDialog && (
        <NewTripDialog
          onClose={() => setShowNewTripDialog(false)}
          onCreate={handleCreateTrip}
        />
      )}
    </div>
  );
}

type TripCardProps = {
  trip: TripData;
  onClick: () => void;
  onDelete: () => void;   // NEW
};


function TripCard({ trip, onClick, onDelete }: TripCardProps) {
  const statusColors: Record<TripStatus, string> = {
    upcoming: "bg-amber-100 text-amber-800",
    ongoing: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-800",
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 hover:shadow-xl transition-all cursor-pointer group"
    >
      <div className="relative h-48 overflow-hidden">
        {trip.imageUrl ? (
          <img
            src={trip.imageUrl}
            alt={trip.destination}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${trip.bgGradient || "from-blue-400 to-purple-400"}`}
          />
        )}
        <div className="absolute top-4 left-4">
          <div className="bg-[#f5f1e8] px-3 py-1 rounded shadow-lg">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${statusColors[trip.status] || statusColors.upcoming}`}
            >
              {trip.status || "Upcoming"}
            </span>
          </div>
        </div>
        <div className="absolute top-4 right-4 bg-[#f5f1e8] px-3 py-2 rounded shadow-lg">
          <span className="text-sm">📍</span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-baseline gap-3 mb-2">
          <h3 className="text-2xl font-serif text-gray-900">
            {trip.destination}
          </h3>
          <span className="text-gray-700">{trip.year}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-800 mb-4">
          <MapPin size={14} />
          <span className="text-sm">{trip.country}</span>
        </div>
        <p className="text-gray-700 italic text-sm">"{trip.tagline}"</p>
        <div className="flex justify-end mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();   // ⭐ IMPORTANT so clicking delete doesn't open trip
              onDelete();
            }}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
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


function TripView({ trip, onBack }: TripViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const [summary, setSummary] = useState({
    flights: 0,
    hotels: 0,
    activities: 0,
    places: 0,
    photos: 0
  });
  const loadSummary = async () => {

    const count = async (prefix: string) => {
      const res = await storage.list(prefix);
      return res?.keys?.length || 0;
    };

    const flightCount = await count(`flight:${trip.id}:`);
    const hotelCount = await count(`hotel:${trip.id}:`);
    const photoCount = await count(`photo:${trip.id}:`);

    // places = eat + visit
    const eatCount = await count(`place:${trip.id}:eat:`);
    const visitCount = await count(`place:${trip.id}:visit:`);

    // activities = sum of all itinerary days
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

    setSummary({
      flights: flightCount,
      hotels: hotelCount,
      activities: activityCount,
      places: eatCount + visitCount,
      photos: photoCount
    });
  };
  useEffect(() => {
    loadSummary();
  }, [trip.id]);
  const dayCount =
    Math.ceil(
      (new Date(trip.endDate).getTime() -
      new Date(trip.startDate).getTime())
      / (1000 * 60 * 60 * 24)
    ) + 1;


  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "itinerary", label: "Itinerary", icon: Calendar },
    { id: "places-visit", label: "Places to Visit", icon: MapPin },
    { id: "places-eat", label: "Places to Eat", icon: Utensils },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
    { id: "photos", label: "Photos", icon: Camera },
    { id: "scrapbook", label: "Scrapbook", icon: Sparkles },
    { id: "admin", label: "Admin", icon: PackageCheck },
    { id: "budget", label: "Budget", icon: Wallet },
  ];
  return (
    <div className="min-h-screen bg-[#f5f1e8]">
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-800 hover:text-gray-900 mb-4"
          >
            <ChevronLeft size={20} />
            All Trips
          </button>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
              {trip.imageUrl ? (
                <img
                  src={trip.imageUrl}
                  alt={trip.destination}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${trip.bgGradient}`}
                />
              )}
            </div>

            <div>
              <h1 className="text-4xl font-serif text-gray-900 leading-tight">
                {trip.destination} Trip {trip.year}
              </h1>

              <p className="text-gray-600 mt-1 font-light tracking-wide">
                {trip.startDate} — {trip.endDate}
              </p>
              <div className="mt-3 text-sm text-gray-600 font-medium tracking-wide">

                <span>{dayCount} days</span>

                <span className="mx-2 text-gray-300">•</span>
                <span>{summary.flights} flights</span>

                <span className="mx-2 text-gray-300">•</span>
                <span>{summary.hotels} hotels</span>

                <span className="mx-2 text-gray-300">•</span>
                <span>{summary.activities} activities</span>

                <span className="mx-2 text-gray-300">•</span>
                <span>{summary.places} places</span>

                <span className="mx-2 text-gray-300">•</span>
                <span>{summary.photos} photos</span>

              </div>

            </div>
            

          </div>
        </div>
      </div>

      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => {

              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-4 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-800 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === "itinerary" && <ItineraryTab trip={trip} />}
        {activeTab === "places-visit" && (
          <PlacesTab tripId={trip.id} type="visit" />
        )}
        {activeTab === "places-eat" && (
          <PlacesTab tripId={trip.id} type="eat" />
        )}
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

function ItineraryTab({ trip }: ItineraryTabProps) {

  const [days, setDays] = useState<ItineraryDay[]>([]);

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadDays();
  }, [trip.id, trip.startDate, trip.endDate]);

  const loadDays = async () => {
    const allDates = getDatesInRange(trip.startDate, trip.endDate);

    const result = await storage.list(`itinerary:${trip.id}:date:`);
    const storedByDate: Record<string, ItineraryDay> = {};


    if (result?.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data?.value) {
          const parsed: ItineraryDay = JSON.parse(data.value);

          storedByDate[parsed.date] = parsed;
        }
      }
    }

    const fullItinerary = allDates.map((date, index) => {
      const dayNum = index + 1;
      const stored = storedByDate[date];
      return {
        day: dayNum,
        date,
        items: stored?.items ?? [],
      };
    });

    setDays(fullItinerary);
  };


  const addActivity = async (dayNum: number, activity: ActivityData) => {


    const dayData = days.find((d) => d.day === dayNum);
    const date = dayData?.date;
    if (!date) return;

    const key = `itinerary:${trip.id}:date:${date}`;

    // Load existing stored data
    const existing = await storage.get(key);
    const parsed: ItineraryDay = existing?.value
    ? JSON.parse(existing.value)
    : { date, items: [] };


    // Add the new activity
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

    const updatedItems = [
      ...(parsed.items || []),
      newItem,
    ];



    // 🔥 SORT BY TIME (earliest first, no-time last)
    updatedItems.sort((a, b) => {
      const ta = a.time || "99:99";
      const tb = b.time || "99:99";
      return ta.localeCompare(tb);
    });

    const newDayData = {
      date,
      items: updatedItems,
    };

    await storage.set(key, newDayData);
    await loadDays();
  };



  // Safe access to current day
  const currentDayData: ItineraryDay =
  days[currentDayIndex] || { day: 1, date: "", items: [] };


  const deleteActivity = async (date: string, activityId: number) => {

    const key = `itinerary:${trip.id}:date:${date}`;
    const existing = await storage.get(key);
    if (!existing?.value) return;

    const parsed = JSON.parse(existing.value);

    parsed.items = parsed.items.filter((i: ItineraryItem) => i.id !== activityId);


    await storage.set(key, parsed);
    await loadDays();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif text-gray-900">Itinerary</h2>
          <p className="text-gray-800 mt-1">
            {currentDayData.date} • Day {currentDayData.day}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Activity
          </button>
        </div>
      </div>

      {/* Scrollable Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day, index) => (
          <button
            key={day.day}
            onClick={() => setCurrentDayIndex(index)}
            className={`px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap ${
              currentDayIndex === index
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-gray-700 border-gray-200 hover:border-rose-300"
            }`}
          >
            Day {day.day}
            <span className="ml-2 text-xs opacity-70 block sm:inline sm:ml-2">
              {day.date}
            </span>
          </button>
        ))}
      </div>

      {currentDayData.items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-700 mb-4">
            No activities planned for Day {currentDayData.day}
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg"
          >
            Add First Activity
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {[...currentDayData.items]
            .sort((a, b) => {
              const ta = a.time || "99:99";
              const tb = b.time || "99:99";
              return ta.localeCompare(tb);
            })
            .map((item: ItineraryItem) => {

              const Icon = iconMap[item.iconType] || Clock;

              return (
                <div
                  key={item.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-rose-300 hover:shadow-lg transition-all"
                >
                  <div className="flex gap-4">
                    
                    {/* ICON + TIME */}
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-purple-400 text-white shadow-lg">
                        <Icon size={24} />
                      </div>
                      <p className="text-lg font-semibold mt-2">
                        {item.time || "--:--"}
                      </p>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1">
                      
                      {/* TITLE ROW WITH DELETE */}
                      <div className="flex items-start justify-between">
                        <h3 className="text-2xl font-serif text-gray-800 mb-1">
                          {item.activity}
                        </h3>

                        <div className="flex flex-col items-end text-right">
                          <CreatorBadge uid={item.createdByUid}/>
                          {item.createdAt && (
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>



                        <button
                          onClick={() =>
                            deleteActivity(currentDayData.date, item.id)
                          }
                          className="text-red-500 hover:text-red-700 text-sm ml-4"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-gray-800 mb-2">
                        <MapPin size={18} />
                        <span className="text-lg">{item.location}</span>
                      </div>

                      {item.notes && (
                        <p className="mt-3 text-gray-700 bg-amber-50 p-3 rounded-lg italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {showAddDialog && (
        <ActivityDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(activity) => {
            addActivity(currentDayIndex + 1, activity);
            setShowAddDialog(false);
          }}
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


  const [showAddDialog, setShowAddDialog] = useState(false);
  const [confirmingPlace, setConfirmingPlace] = useState<StoredPlace | null>(null);
  const [costDialogPlace, setCostDialogPlace] = useState<StoredPlace | null>(null);





  useEffect(() => {
    loadPlaces();
  }, [tripId, type]);

  const loadPlaces = async () => {
    const result = await storage.list(`place:${tripId}:${type}:`);
    const loadedPlaces: StoredPlace[] = [];


    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedPlaces.push(JSON.parse(data.value));
        }
      }
    }

    setPlaces(loadedPlaces.sort((a, b) => b.id - a.id));


  };

  const addPlace = async (placeData: Omit<PlaceData, "id">) => {
    const place: PlaceData = {
      ...placeData,
      id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    };


    await storage.set(`place:${tripId}:${type}:${place.id}`, place);
    await loadPlaces();
  };


  const handleVisitedToggle = async (place: StoredPlace) => {

    // ===== UNVISIT =====
    if (place.visited) {

      const updated = { ...place, visited:false };
      delete updated.cost;
      delete updated.paidBy;

      await storage.set(`place:${tripId}:${type}:${place.id}`, updated);
      await loadPlaces();
      return;
    }

    // ===== VISIT =====
    // open cost dialog FIRST
    setCostDialogPlace(place);
  };



  const confirmPlace = async (
      place: StoredPlace,
      date: string,
      time: string
    ) => {

    await addToItineraryStorage(
      tripId,
      date,
      time,
      place.name,
      place.address,
      place.description || "",
      type === "eat" ? "eat" : "visit"
    );

    place.confirmed = true;

    await storage.set(`place:${tripId}:${type}:${place.id}`,place);

    setConfirmingPlace(null);
    await loadPlaces();
  };


  const visitedCount = places.filter((p) => p.visited).length;
  const bgColor =
    type === "eat"
      ? "from-amber-100 to-rose-100"
      : "from-green-100 to-teal-100";
  const checkColor = type === "eat" ? "bg-amber-500" : "bg-green-500";

  const deletePlace = async (placeId: number) => {

    await deleteKey(`place:${tripId}:${type}:${placeId}`);
    await loadPlaces();
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif text-gray-900">
            {type === "eat" ? "Places to Eat" : "Places to Visit"}
          </h2>
          <p className="text-gray-800 mt-1">
            {visitedCount} of {places.length}{" "}
            {type === "eat" ? "tried" : "visited"}
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <Plus size={18} />
          Add {type === "eat" ? "Restaurant" : "Place"}
        </button>
      </div>

      {places.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-700 mb-4">No places added yet</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg"
          >
            Add Your First {type === "eat" ? "Restaurant" : "Place"}
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-6 ${type === "eat" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}
        >
          {places.map((place) => (
            <div
              key={place.id}
              className={`border-2 rounded-lg overflow-hidden transition-all hover:shadow-xl relative ${
                place.visited
                  ? `bg-gradient-to-br ${bgColor} border-gray-300`
                  : "bg-white border-gray-200"
              }`}
            >
              {place.imageUrl && (
                <div className="relative h-84 w-full overflow-hidden rounded-t-lg">
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                  {place.visited && (
                    <div
                      className={`absolute top-4 right-4 ${checkColor} text-white p-2 rounded-full shadow-lg`}
                    >
                      <Check size={20} />
                    </div>
                  )}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3
                    className={`${type === "eat" ? "text-xl" : "text-2xl"} font-serif text-gray-800`}
                  >
                    {place.name}
                  </h3>
                  <div className="flex flex-col items-end text-right">
                    <CreatorBadge uid={place.createdByUid}/>
                    {place.createdAt && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(place.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {place.link && (
                      <a
                        href={place.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        title="Visit Website"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {place.rating && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200 h-8">
                        <Star
                          size={14}
                          className="fill-amber-400 text-amber-400"
                        />
                        <span className="text-sm font-medium">
                          {place.rating}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 mb-4 text-sm">
                  {place.description}
                </p>
                <div className="flex items-start gap-2 text-gray-800 mb-4">
                  <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                  <span className="text-xs">{place.address}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={place.visited}
                      onChange={()=>handleVisitedToggle(place)}

                      className="w-4 h-4"
                    />
                    <label className="text-sm">
                      {place.visited ? "Visited" : "Mark visited"}
                    </label>
                  </div>

                  {!place.confirmed && (
                    <button
                      onClick={()=>setConfirmingPlace(place)}
                      className="px-3 py-1 text-sm bg-gray-900 text-white rounded"
                    >
                      Confirm
                    </button>
                  )}

                  <button
                    onClick={() => deletePlace(place.id)}
                    className="px-3 py-1 text-sm border border-red-400 text-red-500 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>

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
          onClose={()=>setCostDialogPlace(null)}
          onSave={async(cost, paidBy)=>{

            const updated: StoredPlace = {
              ...costDialogPlace!,
              visited: true,
              cost: Number(cost),   // ⭐ FIX HERE
              paidBy
            };

            await storage.set(
              `place:${tripId}:${type}:${costDialogPlace!.id}`,
              updated
            );

            // open confirm dialog AFTER cost save
            setConfirmingPlace(updated);

            setCostDialogPlace(null);
            await loadPlaces();
          }}


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
    loadItems();
  }, [tripId]);

  const loadItems = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const result = await storage.list(`shopping:${tripId}:user:${user.uid}:`);
    const loadedItems: ShoppingItem[] = [];

    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedItems.push(JSON.parse(data.value));
        }
      }
    }
    setItems(loadedItems.sort((a, b) => b.id - a.id));
  };

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

    await storage.set(
      `shopping:${tripId}:user:${user.uid}:${newItem.id}`,
      newItem
    );
    await loadItems();
  };

  const deleteItem = async (id: number) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteKey(`shopping:${tripId}:user:${user.uid}:${id}`);
    await loadItems();
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
      await loadItems();
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
    await loadItems();
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
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden h-fit"
            >
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-gray-100">
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
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
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
                                <span className="text-xs font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
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
    loadPhotos();
  }, [tripId]);

  const loadPhotos = async () => {
    const result = await storage.list(`photo:${tripId}:`);
    const loadedPhotos: PhotoItem[] = [];


    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedPhotos.push(JSON.parse(data.value));
        }
      }
    }

    setPhotos(loadedPhotos.sort((a: PhotoItem, b: PhotoItem) => b.id - a.id));

  };

  const addPhoto = async (photoData: PhotoData) => {
      const photo: PhotoItem = {
    ...photoData,
    id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
  };

    await storage.set(`photo:${tripId}:${photo.id}`, photo);
    await loadPhotos();
  };

  const deletePhoto = async (photoId: number) => {

    await deleteKey(`photo:${tripId}:${photoId}`);
    await loadPhotos();
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
                <CreatorBadge uid={photo.createdByUid}/>

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
}:{
  hotel: StoredHotel;
  onConfirm: ()=>void;
  onEdit: ()=>void;
  onDelete: ()=>void;
}){

  const creatorName = useUserName(hotel.createdByUid);

  return (
    <div
      className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-amber-300 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between">

        <div>
          <h3 className="text-xl font-serif text-gray-800">
            {hotel.name}
          </h3>

          {hotel.createdAt && (
            <div className="text-xs text-gray-500 mt-1">
              Added by {creatorName || "Unknown"} •{" "}
              {formatDistanceToNow(new Date(hotel.createdAt), { addSuffix: true })}
            </div>
          )}


          {hotel.address && (
            <p className="text-gray-700 mt-1">{hotel.address}</p>
          )}

          <div className="text-sm text-gray-600 mt-2 space-y-1">
            {hotel.checkIn && <div>Check-in: {hotel.checkIn}</div>}
            {hotel.checkOut && <div>Check-out: {hotel.checkOut}</div>}
            {hotel.price && <div className="font-medium">Price: {hotel.price}</div>}
            {hotel.details && <div className="text-gray-500">{hotel.details}</div>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">

          {hotel.status !== "confirmed" && (
            <button
              onClick={onConfirm}
              className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
            >
              Confirm
            </button>
          )}

          {hotel.link && (
            <button
              onClick={()=>window.open(hotel.link,"_blank")}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Open Booking
            </button>
          )}

          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit
          </button>

          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>

        </div>

      </div>
    </div>
  );
}


export type StoredFlight = FlightData & { id: number };
export type StoredHotel = HotelData & { id: number };
export type StoredPacking = PackingData & { id: number; packed: boolean };

type AdminTabProps = { tripId: number };

function AdminTab({ tripId }: AdminTabProps) {
  const [costDialogFlight,setCostDialogFlight]=useState<StoredFlight|null>(null);
  const [costDialogHotel,setCostDialogHotel]=useState<StoredHotel|null>(null);
  const [transports,setTransports]=useState<StoredTransport[]>([]);
  const [editingTransport,setEditingTransport]=useState<StoredTransport|null>(null);
  const [showTransportDialog,setShowTransportDialog]=useState(false);
  const [costDialogTransport,setCostDialogTransport]=useState<StoredTransport|null>(null);

  type AdminSubTab = "flights" | "hotels" | "transport" | "packing";

  const [inviteEmail, setInviteEmail] = useState("");
  type PackingMode = "shared" | "personal";

  const [packingMode, setPackingMode] = useState<PackingMode>("shared");

  const [flights, setFlights] = useState<StoredFlight[]>([]);
  const [hotels, setHotels] = useState<StoredHotel[]>([]);
  const [packing, setPacking] = useState<StoredPacking[]>([]);
  const [editingFlight, setEditingFlight] = useState<StoredFlight | null>(null);
  const [editingHotel, setEditingHotel] = useState<StoredHotel | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>("flights");

  const [showFlightDialog,setShowFlightDialog]=useState(false);
  const [showHotelDialog,setShowHotelDialog]=useState(false);
  const [showPackingDialog,setShowPackingDialog]=useState(false);

  useEffect(()=>{
    loadAdminData();
  },[tripId, packingMode]);

  const loadAdminData=async()=>{

    const load = async <T,>(prefix: string): Promise<T[]> => {

      const result=await storage.list(`${prefix}:${tripId}:`);
      const arr=[];

      if(result?.keys){
        for(const key of result.keys){
          const data=await storage.get(key);

          // 🔥 ignore deleted / empty docs
          if(data?.value){
            try{
              const parsed=JSON.parse(data.value);
              if(parsed && parsed.id) arr.push(parsed);
            }catch{}
          }
        }
      }
      return arr;
    };

    setFlights(await load<StoredFlight>("flight"));
    setHotels(await load<StoredHotel>("hotel"));
    setTransports(await load<StoredTransport>("transport"));

    const user = auth.currentUser;
    if(!user) return;

    const prefix =
      packingMode === "shared"
        ? `packing:${tripId}:shared`
        : `packing:${tripId}:user:${user.uid}`;

    setPacking(await load<StoredPacking>(prefix));


  };

  const addFlight = async (data: FlightData) => {


    const user = auth.currentUser;

    const flight = editingFlight
      ? { ...editingFlight, ...data }
      : {
          id: Date.now(),
          ...data,
          createdByUid: user?.uid || null,
          createdAt : new Date().toISOString(),

        };


    await storage.set(`flight:${tripId}:${flight.id}`, flight);

          // itinerary logic unchanged
          if (flight.status === "confirmed") {

            // outbound
            await addToItineraryStorage(
              tripId,
              flight.date,
              flight.time,
              `Flight ${flight.airline} ${flight.flightNumber}`,
              `${flight.departure} → ${flight.arrival}`,
              "",
              "flight"
            );

            // return
            if (flight.returnDate) {
              await addToItineraryStorage(
                tripId,
                flight.returnDate,
                flight.returnTime || "",
                `Return Flight ${flight.airline} ${flight.flightNumber}`,
                `${flight.arrival} → ${flight.departure}`,
                "",
                "flight"
              );
            }
          }



    setEditingFlight(null);
    await loadAdminData();
  };



  const addHotel = async (data: HotelData) => {


    const user = auth.currentUser;

    const hotel = editingHotel
      ? { ...editingHotel, ...data }
      : {
          id: Date.now(),
          ...data,
          createdByUid: user?.uid || null,
          createdAt : new Date().toISOString(),
        };


    await storage.set(`hotel:${tripId}:${hotel.id}`, hotel);

    if (hotel.status === "confirmed") {

      // CHECK-IN
      if (hotel.checkIn) {
        await addToItineraryStorage(
          tripId,
          hotel.checkIn,
          "15:00",
          `Check-in: ${hotel.name}`,
          hotel.address,
          "",
          "hotel"
        );
      }

      // CHECK-OUT (NEW)
      if (hotel.checkOut) {
        await addToItineraryStorage(
          tripId,
          hotel.checkOut,
          "11:00",
          `Check-out: ${hotel.name}`,
          hotel.address,
          "",
          "hotel"
        );
      }

    }


    setEditingHotel(null);
    await loadAdminData();
  };

  const addTransport = async (data: TransportData) => {

    const user = auth.currentUser;

    const transport = editingTransport
      ? { ...editingTransport, ...data }
      : {
          id: Date.now(),
          ...data,
          createdByUid: user?.uid || null,
          createdAt: new Date().toISOString(),
        };

    await storage.set(`transport:${tripId}:${transport.id}`, transport);

    setEditingTransport(null);
    await loadAdminData();
  };

  const deleteTransport = async(id:number)=>{
    await deleteKey(`transport:${tripId}:${id}`);
    setTransports(prev=>prev.filter(t=>t.id!==id));
  };

  const confirmTransport = (t:StoredTransport)=>{
    setCostDialogTransport(t);
  };



  const addPackingItem = async (data: PackingData) => {
    const user = auth.currentUser;
    if(!user) return;

    const item = {
        id: Date.now(),
        packed:false,
        ...data,
        createdByUid: user?.uid || null,
        createdAt: new Date().toISOString()
     };

    const key =
      packingMode === "shared"
        ? `packing:${tripId}:shared:${item.id}`
        : `packing:${tripId}:user:${user.uid}:${item.id}`;

    await storage.set(key,item);

    await loadAdminData();
  };

  const deleteFlight = async (id: number) => {

    await deleteKey(`flight:${tripId}:${id}`);
    setFlights(prev => prev.filter((f) => f.id !== id)); // instant UI update
  };

  const deleteHotel = async (id: number) => {

    await deleteKey(`hotel:${tripId}:${id}`);
    setHotels(prev => prev.filter((h) => h.id !== id));

  };

  const togglePacked = async (id: number) => {

    const item=packing.find(p=>p.id===id);
    if(!item)return;
    item.packed=!item.packed;
    const user = auth.currentUser;
    if(!user) return;

    const key =
      packingMode === "shared"
        ? `packing:${tripId}:shared:${id}`
        : `packing:${tripId}:user:${user.uid}:${id}`;

    await storage.set(key,item);

    await loadAdminData();
  };

  const toggleFlightStatus = async (flightId: number) => {

    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;

    flight.status = "confirmed";

    await storage.set(`flight:${tripId}:${flightId}`, flight);

    // 🔥 ADD TO ITINERARY WHEN CONFIRMED
    if (flight.date && flight.time) {
      await addToItineraryStorage(
        tripId,
        flight.date,
        flight.time,
        `Flight ${flight.airline} ${flight.flightNumber}`,
        `${flight.departure} → ${flight.arrival}`,
        "",
        "flight"
      );
    }

    await loadAdminData();
  };
  const deletePackingItem = async (id: number) => {

    const user = auth.currentUser;
    if (!user) return;

    const confirmed = confirm("Delete this packing item?");
    if (!confirmed) return;

    const key =
      packingMode === "shared"
        ? `packing:${tripId}:shared:${id}`
        : `packing:${tripId}:user:${user.uid}:${id}`;

    await deleteKey(key);

    // instant UI update (optional but nice)
    setPacking(prev => prev.filter(p => p.id !== id));

  };

  const toggleHotelStatus = async (hotelId: number) => {

    const hotel = hotels.find((h) => h.id === hotelId);
    if (!hotel) return;

    // mark confirmed
    hotel.status = "confirmed";

    await storage.set(`hotel:${tripId}:${hotelId}`, hotel);

    // CHECK-IN
    if (hotel.checkIn) {
      await addToItineraryStorage(
        tripId,
        hotel.checkIn,
        "15:00",
        `Check-in: ${hotel.name}`,
        hotel.address || "",
        "",
        "hotel"
      );
    }

    // ✅ CHECK-OUT (THIS WAS MISSING)
    if (hotel.checkOut) {
      await addToItineraryStorage(
        tripId,
        hotel.checkOut,
        "11:00",
        `Check-out: ${hotel.name}`,
        hotel.address || "",
        "",
        "hotel"
      );
    }

    await loadAdminData();
  };


  
  const packedCount = packing.filter((p) => p.packed).length;


  return(
<div className="space-y-6">

  <div>
    <h2 className="text-3xl font-serif text-gray-900">Trip Administration</h2>
    <p className="text-gray-800 mt-1">All your important trip details in one place</p>
    
  </div>
  <p className="text-gray-800 mt-1">Invite people to your trip!</p>
  <div className="bg-white border-2 rounded-lg p-4 flex gap-2">
    <input
      type="email"
      placeholder="Invite by email"
      value={inviteEmail}
      onChange={(e)=>setInviteEmail(e.target.value)}
      className="flex-1 border-2 rounded-lg px-3 py-2"
    />

    <button
      onClick={async ()=>{
        if(!inviteEmail) return;

        // lookup user by email
        const snapshot = await getDocs(collection(db, "users"));
        let uid = null;

        snapshot.forEach((userDoc) => {
          const email = userDoc.data().email?.toLowerCase().trim();

          if (email === inviteEmail.toLowerCase().trim()) {
            uid = userDoc.id;
          }
        });


        if(!uid){
          alert("User not found");
          return;
        }

        const ownerId = auth.currentUser?.uid;
        if (!ownerId) return;

        const tripKey = `trip:${tripId}`;
        const tripDoc = await storage.get(tripKey);

        if(!tripDoc?.value) return;

        const trip = JSON.parse(tripDoc.value);

        trip.members = [...new Set([...(trip.members||[]), uid])];

        await storage.set(tripKey, trip);
        setInviteEmail("");
        alert("User invited!");
      }}
      className="px-4 py-2 bg-gray-900 text-white rounded-lg"
    >
      Invite
    </button>
  </div>


  {/* SUBTABS */}
    <div className="flex gap-2 border-b-2 border-gray-200">
      {(
        [
          { id: "flights", label: "Flights", icon: Plane },
          { id: "hotels", label: "Hotels", icon: Hotel },
          { id: "transport", label: "Other Transport", icon: Train },
          { id: "packing", label: "Packing", icon: PackageCheck },
        ] as { id: AdminSubTab; label: string; icon: any }[]
      ).map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-4 ${
              activeSubTab === tab.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-800 hover:text-gray-900"
            }`}
          >
            <Icon size={18} />
            {tab.label}
          </button>
        );
      })}
    </div>



{/* ================= FLIGHTS ================= */}
{activeSubTab==="flights"&&(
<div className="space-y-4">

<div className="flex justify-end">
<button
onClick={()=>setShowFlightDialog(true)}
className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
>
<Plus size={18}/> Add Flight
</button>
</div>

{flights.length===0?(
<div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
<p className="text-gray-700">No flights added yet</p>
</div>
):(

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{flights.map(f=>(
  <FlightCard
    key={f.id}
    flight={f}
    onConfirm={()=>setCostDialogFlight(f)}
    onEdit={()=>{
      setEditingFlight(f);
      setShowFlightDialog(true);
    }}
    onDelete={()=>deleteFlight(f.id)}
  />
))}

</div>

)}

</div>
)}


{/* ================= HOTELS ================= */}
{activeSubTab==="hotels"&&(
<div className="space-y-4">

<div className="flex justify-end">
<button
onClick={()=>setShowHotelDialog(true)}
className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
>
<Plus size={18}/> Add Hotel
</button>
</div>

{hotels.length===0?(
<div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
<p className="text-gray-700">No hotels added yet</p>
</div>
):(

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{hotels.map(h=>(
  <HotelCard
    key={h.id}
    hotel={h}
    onConfirm={()=>setCostDialogHotel(h)}
    onEdit={()=>{
      setEditingHotel(h);
      setShowHotelDialog(true);
    }}
    onDelete={()=>deleteHotel(h.id)}
  />
))}

</div>

)}

</div>
)}

{activeSubTab==="transport"&&(
<div className="space-y-4">

<div className="flex justify-end">
<button
onClick={()=>setShowTransportDialog(true)}
className="px-4 py-2 bg-gray-900 text-white rounded-lg flex items-center gap-2"
>
<Plus size={18}/> Add Transport
</button>
</div>

{transports.length===0?(
<div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
<p className="text-gray-700">No transport added yet</p>
</div>
):(

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

{transports.map(t=>(

<div key={t.id}
className="bg-white border-2 border-gray-200 rounded-lg p-6">

<div className="flex justify-between">

<div>
<h3 className="text-xl font-serif">
{t.type} {t.code||""}
</h3>

<p className="text-gray-700 mt-1">
{t.departure} → {t.arrival}
</p>

<div className="text-sm text-gray-600 mt-2 space-y-1">
{t.date && <div>Date: {t.date}</div>}
{t.time && <div>Time: {t.time}</div>}
{t.price && <div>Price: {t.price}</div>}
</div>
</div>

<div className="flex flex-col gap-2">

{t.status!=="confirmed" && (
<button
onClick={()=>confirmTransport(t)}
className="px-3 py-1 bg-amber-500 text-white rounded text-sm"
>
Confirm
</button>
)}

{t.link && (
<button
onClick={()=>window.open(t.link,"_blank")}
className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
>
Open Booking
</button>
)}

<button
onClick={()=>{
setEditingTransport(t);
setShowTransportDialog(true);
}}
className="text-blue-600 text-sm"
>
Edit
</button>

<button
onClick={()=>deleteTransport(t.id)}
className="text-red-500 text-sm"
>
Delete
</button>

</div>

</div>
</div>

))}

</div>
)}

</div>
)}


{/* ================= PACKING ================= */}
{activeSubTab==="packing"&&(

<div className="space-y-6">

<div className="flex justify-between items-center">
<div className="font-medium">
{packedCount}/{packing.length} packed
</div>
<div className="flex gap-2 mb-4">
  <button
    onClick={()=>setPackingMode("shared")}
    className={`px-3 py-1 rounded ${
      packingMode==="shared" ? "bg-gray-900 text-white" : "bg-gray-200"
    }`}
  >
    Shared List
  </button>

  <button
    onClick={()=>setPackingMode("personal")}
    className={`px-3 py-1 rounded ${
      packingMode==="personal" ? "bg-gray-900 text-white" : "bg-gray-200"
    }`}
  >
    My List
  </button>
</div>

<button
onClick={()=>setShowPackingDialog(true)}
className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
>
<Plus size={18}/> Add Item
</button>
</div>


{packing.length===0?(
<div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
<p className="text-gray-700">No packing items yet</p>
</div>
):(

Array.from(new Set(packing.map(p=>p.category))).map(category=>(
<div key={category}
className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">

<div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
<h3 className="font-serif text-lg text-gray-900">{category}</h3>
</div>

<div className="p-4 space-y-2">

{packing
.filter(p=>p.category===category)
.map(item=>(
<div key={item.id}
className={`flex items-center gap-3 p-3 rounded-lg border ${
item.packed
? "bg-gray-50 border-gray-200"
: "bg-white border-gray-200 hover:border-purple-300"
}`}
>

<input
  type="checkbox"
  checked={item.packed}
  onChange={()=>togglePacked(item.id)}
  className="w-4 h-4"
/>

<span className={item.packed?"line-through text-gray-500":"text-gray-800 flex-1"}>
  {item.item}
</span>

<button
  onClick={()=>deletePackingItem(item.id)}
  className="text-red-500 hover:text-red-700 text-xs"
>
  Delete
</button>


</div>
))}

</div>

</div>
))

)}

</div>

)}
{/* ===== DIALOGS ===== */}

{showFlightDialog && (
  <FlightDialog
    initialData={editingFlight ?? undefined}

    onClose={() => {
      setShowFlightDialog(false);
      setEditingFlight(null);
    }}
    onAdd={(data) => {
      addFlight(data);
      setShowFlightDialog(false);
    }}
  />
)}


{showHotelDialog && (
  <HotelDialog
    initialData={editingHotel ?? undefined}
    onClose={() => {
      setShowHotelDialog(false);
      setEditingHotel(null);
    }}
    onAdd={(data) => {
      addHotel(data);
      setShowHotelDialog(false);
    }}
  />
)}

{showTransportDialog && (
  <TransportDialog
    initialData={editingTransport ?? undefined}
    onClose={()=>{
      setShowTransportDialog(false);
      setEditingTransport(null);
    }}
    onAdd={(data)=>{
      addTransport(data);
      setShowTransportDialog(false);
    }}
  />
)}



{showPackingDialog && (
  <PackingDialog
    onClose={() => setShowPackingDialog(false)}
    onAdd={(data) => {
      addPackingItem(data);
      setShowPackingDialog(false);
    }}
  />
)}
{costDialogFlight && (
  <CostDialog
    item={{ item: `${costDialogFlight.airline} ${costDialogFlight.flightNumber}` }}
    tripId={tripId}
    onClose={()=>setCostDialogFlight(null)}
    onSave={async(cost,paidBy)=>{

      const updated={
        ...costDialogFlight,
        status:"confirmed",
        cost,
        paidBy
      };

      await storage.set(`flight:${tripId}:${updated.id}`,updated);

      // itinerary add (your existing logic)
      if(updated.date && updated.time){
        await addToItineraryStorage(
          tripId,
          updated.date,
          updated.time,
          `Flight ${updated.airline} ${updated.flightNumber}`,
          `${updated.departure} → ${updated.arrival}`,
          "",
          "flight"
        );
      }

      if(updated.returnDate){
        await addToItineraryStorage(
          tripId,
          updated.returnDate,
          updated.returnTime || "",
          `Return Flight ${updated.airline} ${updated.flightNumber}`,
          `${updated.arrival} → ${updated.departure}`,
          "",
          "flight"
        );
      }

      setCostDialogFlight(null);
      await loadAdminData();
    }}
  />
)}
{costDialogHotel && (
  <CostDialog
    item={{ item: costDialogHotel.name }}
    tripId={tripId}
    onClose={()=>setCostDialogHotel(null)}
    onSave={async(cost,paidBy)=>{

      const updated={
        ...costDialogHotel,
        status:"confirmed",
        cost,
        paidBy
      };

      await storage.set(`hotel:${tripId}:${updated.id}`,updated);

      if(updated.checkIn){
        await addToItineraryStorage(
          tripId,
          updated.checkIn,
          "15:00",
          `Check-in: ${updated.name}`,
          updated.address || "",
          "",
          "hotel"
        );
      }

      if(updated.checkOut){
        await addToItineraryStorage(
          tripId,
          updated.checkOut,
          "11:00",
          `Check-out: ${updated.name}`,
          updated.address || "",
          "",
          "hotel"
        );
      }

      setCostDialogHotel(null);
      await loadAdminData();
    }}
  />
)}
{costDialogTransport && (
  <CostDialog
    item={{ item:`${costDialogTransport.type} ${costDialogTransport.code||""}` }}
    tripId={tripId}
    onClose={()=>setCostDialogTransport(null)}
    onSave={async(cost,paidBy)=>{

      const updated={
        ...costDialogTransport,
        status:"confirmed",
        cost,
        paidBy
      };

      await storage.set(`transport:${tripId}:${updated.id}`,updated);

      // add to itinerary
      if(updated.date && updated.time){
        await addToItineraryStorage(
          tripId,
          updated.date,
          updated.time,
          `${updated.type} ${updated.code||""}`,
          `${updated.departure} → ${updated.arrival}`,
          "",
          "transport"
        );
      }

      setCostDialogTransport(null);
      await loadAdminData();
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
          // If viewing "Mine", only show what *I* paid
          if (!myUid) return;
          if (paidBy && Array.isArray(paidBy)) {
             const me = paidBy.find((p: any) => p.uid === myUid);
             if (me) amount = me.amount;
          } 
        } else {
          // If viewing "Shared", show total cost
          amount = parsePrice(cost);
        }

        if (amount > 0) {
          newBudget[cat].total += amount;
          newBudget[cat].items.push({ label, amount });
        }
      };

      // ... [Keep Hotels, Flights, Transport sections exactly as they were] ...
      // (I have omitted them here for brevity, but keep them in your code)
      
      // --- HOTELS ---
      const hotelRes = await storage.list(`hotel:${tripId}:`);
      if (hotelRes?.keys) {
        for (const key of hotelRes.keys) {
          const d = await storage.get(key);
          if (d?.value) {
            const h = JSON.parse(d.value);
            if (h.status === "confirmed") {
              addItem("accommodation", h.name || "Hotel", h.cost ?? h.price, h.paidBy);
            }
          }
        }
      }

      // --- FLIGHTS ---
      const flightRes = await storage.list(`flight:${tripId}:`);
      if (flightRes?.keys) {
        for (const key of flightRes.keys) {
          const d = await storage.get(key);
          if (d?.value) {
            const f = JSON.parse(d.value);
            if (f.status === "confirmed") {
              addItem("travel", `${f.airline} ${f.flightNumber}`, f.cost ?? f.price, f.paidBy);
            }
          }
        }
      }
      
      // --- TRANSPORT ---
      const transportRes = await storage.list(`transport:${tripId}:`);
      if (transportRes?.keys) {
        for (const key of transportRes.keys) {
          const d = await storage.get(key);
          if (d?.value) {
            const t = JSON.parse(d.value);
            if (t.status === "confirmed") {
              addItem("travel", `${t.type} ${t.code || ""}`, t.cost ?? t.price, t.paidBy);
            }
          }
        }
      }

      // 🔥 UPDATED SHOPPING SECTION 🔥
      // Only load shopping if looking at "My Spending"
      if (mode === "mine" && myUid) {
        // Look for keys specific to this user: shopping:tripId:user:UID:
        const shopRes = await storage.list(`shopping:${tripId}:user:${myUid}:`);
        
        if (shopRes?.keys) {
          for (const key of shopRes.keys) {
            const d = await storage.get(key);
            if (d?.value) {
              const s = JSON.parse(d.value);
              // Only include if bought and has a cost
              if (s.bought && s.cost) {
                  // Direct add to budget (bypassing addItem split logic because it's 100% yours)
                  newBudget.shopping.total += Number(s.cost);
                  newBudget.shopping.items.push({ 
                    label: s.item, 
                    amount: Number(s.cost) 
                  });
              }
            }
          }
        }
      }

      // ... [Keep Places and Manual Expenses sections exactly as they were] ...
      // --- PLACES (Eat) ---
      const eatRes = await storage.list(`place:${tripId}:eat:`);
      if (eatRes?.keys) {
        for (const key of eatRes.keys) {
          const d = await storage.get(key);
          if (d?.value) {
            const p = JSON.parse(d.value);
            if (p.visited && (p.cost || p.price)) {
              addItem("food", p.name, p.cost || p.price, p.paidBy);
            }
          }
        }
      }

      // --- PLACES (Visit) ---
      const visitRes = await storage.list(`place:${tripId}:visit:`);
      if (visitRes?.keys) {
        for (const key of visitRes.keys) {
          const d = await storage.get(key);
          if (d?.value) {
            const p = JSON.parse(d.value);
            if (p.visited && (p.cost || p.price)) {
              addItem("other", p.name, p.cost || p.price, p.paidBy);
            }
          }
        }
      }

      // --- MANUAL EXPENSES (Shared) ---
      if (mode === "shared") {
        const sharedRes = await storage.list(`expense:${tripId}:shared:`);
        if (sharedRes?.keys) {
          for (const key of sharedRes.keys) {
            const d = await storage.get(key);
            if (d?.value) {
              const e = JSON.parse(d.value);
              addItem((e.category as keyof BudgetState) || "other", e.label, e.amount, e.paidBy);
            }
          }
        }
      }

      // --- MANUAL EXPENSES (Personal) ---
      if (mode === "mine" && myUid) {
        const myRes = await storage.list(`expense:${tripId}:user:${myUid}:`);
        if (myRes?.keys) {
          for (const key of myRes.keys) {
            const d = await storage.get(key);
            if (d?.value) {
              const e = JSON.parse(d.value);
              addItem((e.category as keyof BudgetState) || "other", e.label, e.amount);
            }
          }
        }
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
    <div className="space-y-6">
      <h2 className="text-3xl font-serif text-gray-900">Budget</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("shared")}
          className={`px-3 py-1 rounded ${
            mode === "shared" ? "bg-gray-900 text-white" : "bg-gray-200"
          }`}
        >
          Trip Budget
        </button>

        <button
          onClick={() => setMode("mine")}
          className={`px-3 py-1 rounded ${
            mode === "mine" ? "bg-gray-900 text-white" : "bg-gray-200"
          }`}
        >
          My Spending
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowExpenseDialog(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          Add Expense
        </button>

        <button
          onClick={() => setEditingBudget((v) => !v)}
          className="px-4 py-2 border rounded-lg"
        >
          {editingBudget ? "Done" : "Modify Budget"}
        </button>
      </div>

      {!editingBudget && limits.total > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4 text-sm flex justify-between">
          <span>Total budget</span>
          <span>
            £{limits.total.toFixed(2)}
            <span className="text-gray-500 ml-2">
              Remaining £{totalRemaining.toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {editingBudget && (
        <div className="bg-white border-2 rounded-lg p-4 space-y-3">
          <div className="font-semibold">Budget Limits</div>

          <div className="flex justify-between items-center">
            <span>Total budget</span>
            <input
              type="number"
              value={limits.total}
              onChange={(e) =>
                saveLimits({ ...limits, total: Number(e.target.value) })
              }
              className="w-32 border rounded px-2 py-1 text-right"
            />
          </div>

          {Object.keys(budget).map((cat) => (
            <div key={cat} className="flex justify-between items-center">
              <span>{cat[0].toUpperCase() + cat.slice(1)}</span>

              <input
                type="number"
                value={limits[cat as keyof BudgetLimits]}
                onChange={(e) =>
                  saveLimits({
                    ...limits,
                    [cat]: Number(e.target.value),
                  })
                }
                className="w-32 border rounded px-2 py-1 text-right"
              />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border-2 rounded-lg p-6 space-y-6">
        {Object.entries(budget).map(([name, data]) => (
          <div key={name}>
            <Row
              label={name[0].toUpperCase() + name.slice(1)}
              value={data.total}
            />

            {data.items.map((i, idx) => (
              <div
                key={idx}
                className="ml-6 text-sm text-gray-600 flex justify-between"
              >
                <span>{i.label}</span>
                <span>£{i.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
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
