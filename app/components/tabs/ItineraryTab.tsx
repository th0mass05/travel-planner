import React, { useEffect, useState } from "react";
import { Plus, Download, MapPin, Clock } from "lucide-react";
import { TripData, ItineraryDay, TripSegment, ActivityData, ItineraryItem, IconType } from "@/app/types";
import { getDatesInRange, createGoogleCalendarLink } from "../../helpers/helpers";
import { storage } from "../../../firebaseStore";
import { auth } from "../../../firebase";
import emailjs from "@emailjs/browser";
import LinkedItemDetails from "../shared/LinkedItemDetails";
import { categoryIcons, iconMap } from "../../styling/styling";
import { TripAuthorInfo } from "../../helpers";
import {ActivityDialog, LocationManagerDialog} from "../dialogs";
import DayMinimap from "../shared/DayMinimap";
import TransitMinimap from "../shared/TransitMinimap";
import ProTipWidget from "../shared/AITips";
export default function ItineraryTab({ trip }: { trip: TripData }) {
  // ... existing state ...
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Location Manager State
  const [showLocDialog, setShowLocDialog] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  // ⭐ UPDATE: Initialize with trip.segments
  const [tripSegments, setTripSegments] = useState<TripSegment[]>(trip.segments || []);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);
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
  const handlePinClick = (itemId: number) => {
    // 1. Scroll nicely to the item
    const element = document.getElementById(`itinerary-item-${itemId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // 2. Set highlight state
    setHighlightedItemId(itemId);

    // 3. Remove highlight after 2.5 seconds to create the fade-out effect
    setTimeout(() => {
      setHighlightedItemId(null);
    }, 2500); 
  };
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
              Day {currentDayData.day} <span className="text-stone-300 mx-2">•</span> {currentDayData.date.split("-").reverse().join("/")}
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
        <div className="space-y-8">
          
          {/* ⭐ FULL WIDTH HEADER SECTION: Day Navigation & Location Banner */}
          <div className="space-y-4">
            {/* Day Navigation Pills */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar w-full">
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
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
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
          </div>

          {/* ⭐ SPLIT SECTION: Itinerary Cards (Left) vs Map (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 items-start relative">
            
            {/* LEFT COLUMN: Activity Cards */}
            <div>
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
                    const isExpanded = expandedItemId === item.id;
                    const isHighlighted = highlightedItemId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        id={`itinerary-item-${item.id}`} // ⭐ NEW: Attach ID for scroll targeting
                        className="relative group"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-[#FDFCF8] bg-stone-300 group-hover:bg-stone-900 transition-colors" />
                        
                        {/* Clickable Card Wrapper */}
                        <div 
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          // ⭐ NEW: Adjusted classes to include a smooth transition and a highlighted border/shadow state
                          className={`bg-white rounded-xl p-6 border transition-all duration-700 ease-out cursor-pointer ${
                            isHighlighted 
                              ? "border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.3)] scale-[1.01]" // Glow effect
                              : isExpanded 
                                ? "border-stone-400 shadow-md" 
                                : "border-stone-100 shadow-sm hover:shadow-md group-hover:border-stone-300"
                          }`}
                        >
                            <div className="flex gap-4 sm:gap-5">
                                {/* Time Column */}
                                <div className="flex-shrink-0 w-14 sm:w-16 pt-1">
                                    <span className="block text-base sm:text-lg font-bold text-stone-900">{item.time || "—"}</span>
                                    <div className={`mt-2 transition-colors ${isExpanded ? "text-rose-500" : "text-stone-300"}`}>
                                        <Icon size={20} />
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2 sm:gap-0">
                                        <h3 className="text-xl font-serif text-stone-900 group-hover:text-rose-900 transition-colors pr-4">
                                            {item.activity}
                                        </h3>
                                        <div className="flex gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingActivity(item); }} className="text-xs font-bold text-stone-400 hover:text-stone-900 uppercase tracking-wide">Edit</button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteActivity(currentDayData.date, item.id); }} className="text-xs font-bold text-red-300 hover:text-red-500 uppercase tracking-wide">Delete</button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                                      <a 
                                          onClick={(e) => e.stopPropagation()} 
                                          href={item.googleMapsUrl || `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(`${item.activity}, ${item.location}`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-stone-500 hover:text-rose-500 transition-colors text-sm font-medium flex items-center gap-1.5 w-fit group/loclink"
                                      >
                                          <MapPin size={14} className="text-rose-400 flex-shrink-0 group-hover/loclink:scale-110 transition-transform" />
                                          <span className={`group-hover/loclink:underline ${isExpanded ? "" : "line-clamp-1"}`}>
                                            {item.location}
                                          </span>
                                      </a>
                                    </div>

                                    {isExpanded && (
                                      <div className="mt-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                        {/* ⭐ TRIGGER THE MAP: Only if it has the transit data */}
                                        

                                        {item.sourceId && (
                                          <LinkedItemDetails sourceId={item.sourceId} tripId={trip.id} />
                                        )}
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
            </div>

           {/* RIGHT COLUMN: Sticky Minimap */}
            <div className="hidden lg:block sticky top-32 space-y-6"> {/* Added space-y-6 for stacking */}
    
              {/* Primary Day Map */}
              <div className="w-full aspect-[4/3] shadow-sm rounded-2xl overflow-hidden border border-stone-200">
                <DayMinimap 
                  dayData={currentDayData} 
                  date={currentDayData.date}
                  tripId={trip.id} 
                  onPinClick={handlePinClick}
                />
              </div>

              {/* ⭐ NEW: AI Pro Tip Widget */}
              <ProTipWidget 
                key={currentDayData.date}
                dayLocations={currentDayData.items.map(i => i.location).filter(Boolean)}
                city={currentLocations.length > 0 ? currentLocations[0].location : trip.destination}
                tripId={trip.id}
                dayDate={currentDayData.date}
              />

              {/* Transit Map Stack (If you add it later) */}
              
            </div>
            
          </div>
        </div>
      )}

      {/* ================= CALENDAR VIEW ================= */}
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
                  {/* Segmented Color Bar at the Top */}
                  {dayLocs.length > 0 ? (
                    <div className="absolute top-0 left-0 right-0 h-3 flex w-full">
                      {dayLocs.map((loc) => (
                        <div 
                          key={loc.id} 
                          className={`flex-1 h-full ${loc.color.split(" ")[0]}`} 
                          title={loc.location} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="absolute top-0 left-0 right-0 h-3 bg-stone-50" />
                  )}

                  {/* Card Content */}
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
                        {day.items.slice(0, 4).map(i => {
                            // ⭐ Grabs the exact icon (replaces the old colored dot logic)
                            const CalIcon = iconMap[i.iconType] || Clock;
                            return (
                              <div key={i.id} className="text-xs text-stone-600 truncate flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-stone-50 transition-colors">
                                  <CalIcon size={12} className="text-stone-400 flex-shrink-0" />
                                  <span className="truncate">{i.activity}</span>
                              </div>
                            );
                        })}
                        
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

      {/* Dialogs */}
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
          initialData={{ 
            time: editingActivity.time,
            activity: editingActivity.activity,
            location: editingActivity.location,
            notes: editingActivity.notes,
            iconType: editingActivity.iconType,
          }}
          onClose={() => setEditingActivity(null)}
          onAdd={handleEditActivity} 
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
