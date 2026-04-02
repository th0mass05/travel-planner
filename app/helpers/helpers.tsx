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
} from "../types";
import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ShoppingBag, Check, MapPin } from "lucide-react";
import { auth, db } from "../../firebase"; 
import { storage } from "../../firebaseStore";
import { doc, getDoc } from "firebase/firestore";
// Helper to generate a "Add to Google Calendar" URL
export const createGoogleCalendarLink = (
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

export const deleteKey = async (key: string) => {
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

// Helper to get all dates between start and end
export const getDatesInRange = (startDate: string, endDate: string) => {
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

// Helper to compress images before saving
export const compressImage = (file: File): Promise<string> => {
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


// ⭐ NEW: Remove from Itinerary if Unconfirmed/Deleted
export const removeFromItineraryBySource = async (tripId: number, sourceId: string) => {
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
export const updateItineraryBySource = async (tripId: number, sourceId: string, newName: string, newLoc: string) => {
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

export const getAvailableLocations = (places: StoredPlace[], depth: number, currentPath: string[]) => {
  const locations = new Set<string>();
  places.forEach((p) => {
    const path = p.locationPath || [];
    // Ensure this place matches our current active path up to the requested depth
    let matches = true;
    for (let i = 0; i < depth; i++) {
      if (path[i] !== currentPath[i]) {
        matches = false;
        break;
      }
    }
    // If it matches and has a location at this specific depth, add it
    if (matches && path.length > depth) {
      locations.add(path[depth]);
    }
  });
  return Array.from(locations).sort();
};

export const mapLibraries: ("places")[] = ["places"];