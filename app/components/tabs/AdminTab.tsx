
import { auth } from "../../../firebase";   // adjust path if needed
import { db } from "../../../firebase";   // adjust path if needed
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from "firebase/firestore"; // ⭐ ADDED collection, getDocsimport CreatorBadge from "../../hooks/CreatorBadge";
import CreatorBadge from "@/app/hooks/CreatorBadge";
import React, { useState, useEffect} from "react";
import { FlightCard, HotelCard, TransportCard, PlaceCard, TripCard } from "../../components/cards";
import {
  ActivityDialog, ConfirmToItineraryDialog, CostDialog, FlightDialog, HotelDialog, LocationManagerDialog, PackingDialog, PlaceDialog, PhotoDialog, ShoppingDialog, TransportDialog, TripDialog, ExpenseDialog, PlaceShoppingListDialog, SimpleCostDialog, DocumentDialog
} from "../../components/dialogs" ; // Adjust this path if your dialogs are in a different folder
import { 
  TransportData, DocumentData, StoredTransport, FlightData, HotelData, PackingData,
  StoredFlight, StoredHotel, StoredPacking, ItineraryItem 
} from "../../types"; // <-- Adjust this path if your types folder is somewhere else!
import { 
  deleteKey,
  removeFromItineraryBySource,
} from "../../helpers/helpers"; // Adjust this path to match your folder structure
 // Adjust this path to match your folder structure
import {
  Plane,
  Hotel,
  PackageCheck,
  Plus,
  Train,
  FileText, // Add this
  Download, // Add this
  Trash2,   // Add this (optional, for cleaner delete icons)
  Users,
  CheckCircle,
  XCircle,
  UserPlus,
} from "lucide-react";
import { storage } from "../../../firebaseStore";

export default function AdminTab({ tripId }: { tripId: number }) {
  // 1. Update ActiveSubTab type
  const [activeSubTab, setActiveSubTab] = useState<
    "members" | "flights" | "hotels" | "transport" | "packing" | "documents"
  >("flights"); // Default to members or flights, your choice
  // --- TOAST NOTIFICATION STATE ---
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };
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
  // --- TEMPLATE STATE ---
  const [profileTemplates, setProfileTemplates] = useState<any[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Helper to load templates when opening a dialog
  const loadProfileTemplates = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const tempList = await storage.getAll(`user:${user.uid}:template:`);
    setProfileTemplates(tempList.sort((a: any, b: any) => b.id - a.id));
  };
  // 2. Add State for Members Tab
  type MemberDisplay = {
    id: string; // uid or email
    name: string;
    email?: string; // only for invites
    status: "Member" | "Invited";
    isMe?: boolean;
    photoUrl?: string;
  };
  // --- TEMPLATE ACTIONS ---
  const handleExportPacking = async (mode: "new" | "update", templateName: string, templateId: number | null) => {
    const user = auth.currentUser;
    if (!user) return;

    // Format current items for the template
    const itemsToExport = packing.map(p => ({ category: p.category || "Other", item: p.item }));

    if (mode === "new" && templateName) {
      const newTemplate = {
        id: Date.now(),
        name: templateName,
        items: itemsToExport,
        type: packingMode,
        createdAt: new Date().toISOString()
      };
      await storage.set(`user:${user.uid}:template:${newTemplate.id}`, newTemplate);
      showToast("Saved as new preset in your profile!"); // ⭐ NEW
    } else if (mode === "update" && templateId) {
      const existingSnap = await storage.get(`user:${user.uid}:template:${templateId}`);
      if (existingSnap?.value) {
        const existing = JSON.parse(existingSnap.value);
        
        // Merge items safely (prevent exact duplicates)
        const existingStrs = existing.items.map((i: any) => typeof i === 'string' ? i : `${i.category}:${i.item}`);
        const merged = [...existing.items];

        itemsToExport.forEach(newItem => {
          const str = `${newItem.category}:${newItem.item}`;
          if (!existingStrs.includes(str)) {
            merged.push(newItem);
            existingStrs.push(str);
          }
        });

        existing.items = merged;
        await storage.set(`user:${user.uid}:template:${templateId}`, existing);
        showToast("Preset updated successfully!"); // ⭐ NEW
      }
    }
    setShowExportDialog(false);
  };

  const handleImportTemplate = async (templateId: number) => {
    const user = auth.currentUser;
    if (!user) return;

    const template = profileTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Create a new packing item for every item in the template
    const prefix = packingMode === "shared" ? `packing:${tripId}:shared` : `packing:${tripId}:user:${user.uid}`;
    
    // We use Promise.all to save them all rapidly
    const promises = template.items.map((tItem: any, index: number) => {
      const cat = typeof tItem === 'string' ? 'Other' : tItem.category;
      const name = typeof tItem === 'string' ? tItem : tItem.item;
      
      const newItem: StoredPacking = {
        id: Date.now() + index, // Ensure unique IDs
        category: cat,
        item: name,
        packed: false,
        createdByUid: user.uid,
        createdAt: new Date().toISOString(),
      };
      return storage.set(`${prefix}:${newItem.id}`, newItem);
    });

    await Promise.all(promises);
    setShowImportDialog(false);
  };
  const syncItineraryItem = async (
    sourceId: string, 
    newDate: string, 
    updatedData: Partial<ItineraryItem>
  ) => {
    // 1. Get all itinerary dates for this trip
    const prefix = `itinerary:${tripId}:date:`;
    const result = await storage.list(prefix);
    if (!result?.keys) return;

    let existingItem: ItineraryItem | null = null;

    // 2. Scan through all dates to find the old linked item
    for (const key of result.keys) {
      const snap = await storage.get(key);
      if (snap?.value) {
        const dayData = JSON.parse(snap.value);
        const itemIndex = dayData.items.findIndex((i: any) => i.sourceId === sourceId);

        if (itemIndex > -1) {
          // Found it! Save a copy and remove it from the old date
          existingItem = dayData.items[itemIndex];
          dayData.items.splice(itemIndex, 1);
          await storage.set(key, dayData); 
          break; // Stop searching once found
        }
      }
    }

    // If we didn't find it, it was never confirmed to the itinerary anyway.
    if (!existingItem) return;

    // 3. Update the item and place it in the correct (possibly new) date
    const targetKey = `itinerary:${tripId}:date:${newDate}`;
    const targetSnap = await storage.get(targetKey);
    const targetDay = targetSnap?.value ? JSON.parse(targetSnap.value) : { date: newDate, items: [] };

    const syncedItem = {
      ...existingItem,
      ...updatedData // Overwrite with new name, location, time, etc.
    };

    targetDay.items.push(syncedItem);
    targetDay.items.sort((a: any, b: any) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    
    await storage.set(targetKey, targetDay);
  };
  const addToItinerary = async (date: string, item: Omit<ItineraryItem, 'id'>) => {
    if (!date) return;
    const key = `itinerary:${tripId}:date:${date}`;
    const existing = await storage.get(key);
    const targetDay = existing?.value ? JSON.parse(existing.value) : { date, items: [] };

    targetDay.items.push({ id: Date.now(), ...item });
    targetDay.items.sort((a: any, b: any) => (a.time || "").localeCompare(b.time || ""));
    await storage.set(key, targetDay);
  };
  const [memberList, setMemberList] = useState<MemberDisplay[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle");
  const [inviteMsg, setInviteMsg] = useState("");

  // ⭐ NEW: Friends Network State
  const [myFriends, setMyFriends] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  // 3. Load Members Effect
 // ⭐ UPDATED: Real-time Friends Listener
  useEffect(() => {
    if (activeSubTab !== "members") return;

    loadMembers();

    const user = auth.currentUser;
    if (!user) return;

    // Use onSnapshot instead of getDocs for real-time updates
    const unsubFriends = onSnapshot(
      collection(db, "users", user.uid, "friends"),
      (snap) => {
        const friends: any[] = [];
        snap.forEach((d) => friends.push(d.data()));
        setMyFriends(friends);
      },
      (err) => console.error("Friends listener error:", err)
    );

    return () => unsubFriends(); // Cleanup listener when tab changes
  }, [activeSubTab, tripId]);

  // ⭐ NEW: Send Friend Request directly from the Member list
  const handleSendFriendRequest = async (targetUid: string) => {
    const me = auth.currentUser;
    if (!me) return;
    try {
      const mySnap = await getDoc(doc(db, "users", me.uid));
      const myData = mySnap.data();
      
      if (!myData?.username) {
        showToast("Please set a username in your Profile first!");
        return;
      }
      const targetSnap = await getDoc(doc(db, "users", targetUid));
      if (!targetSnap.exists()) return;
      const targetData = targetSnap.data();

      

      // Write to my profile
      await setDoc(doc(db, "users", me.uid, "friends", targetUid), {
        uid: targetUid,
        username: targetData.username || "",
        name: targetData.name || "",
        photoUrl: targetData.photoUrl || "",
        status: "pending_sent"
      });

      // Write to their profile
      await setDoc(doc(db, "users", targetUid, "friends", me.uid), {
        uid: me.uid,
        username: myData?.username || "",
        name: myData?.name || "",
        photoUrl: myData?.photoUrl || "",
        status: "pending_received"
      });

      setSentRequests(prev => [...prev, targetUid]);
      showToast("Friend request sent!");
    } catch (e) {
      console.error(e);
      alert("Failed to send request.");
    }
  };
  const loadMembers = async () => {
    try {
      const tripSnap = await storage.get(`trip:${tripId}`);
      if (!tripSnap?.value) return;
      const tripData = JSON.parse(tripSnap.value);
      const currentUid = auth.currentUser?.uid;

      const list: MemberDisplay[] = [];
      const seenIds = new Set<string>(); // ⭐ NEW: Track IDs to instantly catch duplicates

      // A. Process Actual Members
      if (tripData.members) {
        for (const uid of tripData.members) {
          
          // ⭐ NEW: If we've already added this person, skip them!
          if (seenIds.has(uid)) continue; 
          seenIds.add(uid);
          let photoUrl = "";
          // Fetch user details from Firestore 'users' collection
          let name = "Unknown User";
          try {
             const userDoc = await getDoc(doc(db, "users", uid));
             if (userDoc.exists()) {
               name = userDoc.data().name || userDoc.data().email || "User";
               photoUrl = userDoc.data().photoUrl || "";
             }
          } catch(e) { console.log("User fetch error", e)}

          list.push({
            id: uid,
            name: name,
            status: "Member",
            isMe: uid === currentUid,
            photoUrl: photoUrl
          });
        }
      }

      // B. Process Invites
      if (tripData.invites) {
        tripData.invites.forEach((email: string) => {
          
          // ⭐ NEW: Skip duplicate invites
          if (seenIds.has(email)) return;
          seenIds.add(email);

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
  const unconfirmFlight = async (flight: StoredFlight) => {
    await removeFromItineraryBySource(tripId, `flight:${flight.id}`);
    const updated = { ...flight, status: "potential" as any };
    delete updated.cost;
    delete updated.paidBy;
    await storage.set(`flight:${tripId}:${flight.id}`, updated);
  };

  const unconfirmHotel = async (hotel: StoredHotel) => {
    await removeFromItineraryBySource(tripId, `hotel:${hotel.id}`);
    const updated = { ...hotel, status: "potential" as any };
    delete updated.cost;
    delete updated.paidBy;
    await storage.set(`hotel:${tripId}:${hotel.id}`, updated);
  };

  const unconfirmTransport = async (transport: StoredTransport) => {
    await removeFromItineraryBySource(tripId, `transport:${transport.id}`);
    const updated = { ...transport, status: "potential" as any };
    delete updated.cost;
    delete updated.paidBy;
    await storage.set(`transport:${tripId}:${transport.id}`, updated);
  };
  // --- ACTIONS ---

  // FLIGHTS
  const addFlight = async (data: FlightData) => {
    const user = auth.currentUser;
    const isEditing = !!editingFlight;
    const newFlight: StoredFlight = {
      ...(editingFlight || {}), // 👈 ADD THIS: Preserves status, cost, paidBy, etc.
      ...data,
      id: editingFlight ? editingFlight.id : Date.now(),
      createdByUid: editingFlight?.createdByUid || user?.uid || null,
      createdAt: editingFlight?.createdAt || new Date().toISOString()
    };
    await storage.set(`flight:${tripId}:${newFlight.id}`, newFlight);
    if (isEditing && newFlight.status === "confirmed") {
      await syncItineraryItem(`flight:${newFlight.id}`, newFlight.date, {
        time: newFlight.time || "",
        activity: `Flight: ${newFlight.airline} ${newFlight.flightNumber}`,
        location: newFlight.departure,
        notes: `Arriving at ${newFlight.arrival}`
      });
    }
    setEditingFlight(null);
  };

  const deleteFlight = async (id: number) => {
    if (confirm("Delete this flight?")) await deleteKey(`flight:${tripId}:${id}`);
  };

  // HOTELS
  const addHotel = async (data: HotelData) => {
    const user = auth.currentUser;
    const isEditing = !!editingHotel;
    const newHotel: StoredHotel = {
      ...(editingHotel || {}), // 👈 ADD THIS
      ...data,
      id: editingHotel ? editingHotel.id : Date.now(),
      createdByUid: editingHotel?.createdByUid || user?.uid || null,
      createdAt: editingHotel?.createdAt || new Date().toISOString(),
    };
    await storage.set(`hotel:${tripId}:${newHotel.id}`, newHotel);
    if (isEditing && newHotel.status === "confirmed") {
      await syncItineraryItem(`hotel:${newHotel.id}`, newHotel.checkIn, {
        time: "15:00", 
        activity: `Check-in: ${newHotel.name}`,
        location: newHotel.address,
        notes: `Conf: ${newHotel.confirmationNumber || "N/A"}`
      });
    }
    setEditingHotel(null);
  };

  const deleteHotel = async (id: number) => {
    if (confirm("Delete this hotel?")) await deleteKey(`hotel:${tripId}:${id}`);
  };

  // TRANSPORT
  const addTransport = async (data: TransportData) => {
    const user = auth.currentUser;
    const isEditing = !!editingTransport;
    const newTransport: StoredTransport = {
      ...(editingTransport || {}), // 👈 ADD THIS
      ...data,
      id: editingTransport ? editingTransport.id : Date.now(),
      createdByUid: editingTransport?.createdByUid || user?.uid || null,
      createdAt: editingTransport?.createdAt || new Date().toISOString(),
    };
    await storage.set(`transport:${tripId}:${newTransport.id}`, newTransport);
    if (isEditing && newTransport.status === "confirmed") {
      await syncItineraryItem(`transport:${newTransport.id}`, newTransport.date || "", {
        time: newTransport.time || "",
        activity: `${newTransport.type} to ${newTransport.arrival}`,
        location: newTransport.departure,
        notes: newTransport.details || ""
      });
    }
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
  // Helper to render a packing card (keeps JSX clean)
  const renderPackingCard = (category: string) => {
    const items = groupedPacking[category];
    const catPacked = items.filter(i => i.packed).length;
    
    return (
      <div key={category} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
         <div className="flex justify-between items-baseline mb-4 border-b border-stone-100 pb-2">
           <h4 className="font-serif text-lg text-stone-900">{category}</h4>
           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-full">
              {catPacked}/{items.length}
           </span>
         </div>
         
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
  };
  
  // Estimates the height of a category and puts it in the shortest available column
  const distributeCategories = (numCols: number) => {
    const cols: string[][] = Array.from({ length: numCols }, () => []);
    const heights = Array.from({ length: numCols }, () => 0);

    categories.forEach(category => {
      const items = groupedPacking[category] || [];
      // Estimate height: base card padding/header (weight of ~5) + 1 per item
      const estimatedHeight = 5 + items.length; 
      
      // Find the currently shortest column
      let minIdx = 0;
      for (let i = 1; i < numCols; i++) {
        if (heights[i] < heights[minIdx]) {
          minIdx = i;
        }
      }

      // Add the category to the shortest column and update its new height
      cols[minIdx].push(category);
      heights[minIdx] += estimatedHeight;
    });

    return cols;
  };

  // Pre-calculate the layouts for Mobile (1), Tablet (2), and Desktop (3)
  const cols1 = distributeCategories(1);
  const cols2 = distributeCategories(2);
  const cols3 = distributeCategories(3);
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
          
          {/* 1. Invite Section */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xl font-serif text-stone-900 mb-2">Invite Travelers</h3>
            <p className="text-stone-500 text-sm mb-6">
              Invite friends by email or their unique username.
            </p>
            
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Email or @username"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteStatus("idle");
                }}
                className="flex-1 border border-stone-300 rounded-lg px-4 py-3 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all placeholder:text-stone-400"
              />
              <button
                onClick={async () => {
                   if (!inviteEmail) return;
                   const user = auth.currentUser;
                   if (!user) return;
                   
                   try {
                     let targetEmail = inviteEmail.trim().toLowerCase();
                     
                     // ⭐ If it doesn't look like an email, assume it's a username!
                     if (!targetEmail.includes("@")) {
                       // Strip the @ if they typed it
                       const cleanUsername = targetEmail.replace("@", "");
                       const usernameSnap = await getDoc(doc(db, "usernames", cleanUsername));
                       if (!usernameSnap.exists()) {
                         setInviteStatus("error");
                         setInviteMsg("Username not found.");
                         return;
                       }
                       // Get the user's actual email using their UID
                       const targetUid = usernameSnap.data().uid;
                       const userSnap = await getDoc(doc(db, "users", targetUid));
                       if (!userSnap.exists() || !userSnap.data().email) {
                         setInviteStatus("error");
                         setInviteMsg("User email not found.");
                         return;
                       }
                       targetEmail = userSnap.data().email;
                     }

                     const tripSnap = await storage.get(`trip:${tripId}`);
                     if (tripSnap?.value) {
                       const tripData = JSON.parse(tripSnap.value);
                       const currentInvites = tripData.invites || [];
                       if (currentInvites.includes(targetEmail)) {
                          setInviteStatus("error");
                          setInviteMsg("User already invited.");
                          return;
                       }
                       const updated = {
                         ...tripData,
                         invites: [...currentInvites, targetEmail],
                       };
                       await storage.set(`trip:${tripId}`, updated);
                       setInviteStatus("success");
                       setInviteMsg(`Invite sent!`);
                       setInviteEmail("");
                       loadMembers(); 
                     }
                   } catch (e) {
                     setInviteStatus("error");
                     setInviteMsg("Failed to send invite.");
                   }
                }}
                className="px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                Send Invite
              </button>
            </div>

            {/* ⭐ NEW: Quick-select Friends */}
            {myFriends.filter(f => f.status === "accepted").length > 0 && (
              <div className="mt-6 pt-5 border-t border-stone-100">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Quick Invite Friends</p>
                <div className="flex flex-wrap gap-2">
                  {myFriends.filter(f => f.status === "accepted").map(friend => {
                    // Don't show friends who are already in the trip
                    const isMember = memberList.some(m => m.id === friend.uid || m.email === friend.username); // loose check
                    if (isMember) return null;
                    
                    return (
                      <button 
                        key={friend.uid} 
                        onClick={() => {
                          setInviteEmail(friend.username);
                          setInviteStatus("idle");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 rounded-full text-xs font-bold transition-colors border border-stone-200"
                      >
                        <Users size={12} /> {friend.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            
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

          {/* 2. Members List */}
          <div>
            <h3 className="text-xl font-serif text-stone-900 mb-4">Who's going?</h3>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 shadow-sm">
              {memberList.map((member) => {
                const friendRecord = myFriends.find(f => f.uid === member.id);
                const isFriend = friendRecord?.status === "accepted";
                const isPending = sentRequests.includes(member.id) || friendRecord?.status === "pending_sent";

                return (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* ⭐ UPDATED: Profile Picture Container */}
                      <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg shadow-sm shrink-0 border border-stone-200 ${
                        member.status === "Member" 
                          ? "bg-stone-100 text-stone-500" 
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}>
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 leading-tight mb-0.5">
                          {member.name} {member.isMe && <span className="text-stone-400 font-normal">(You)</span>}
                        </p>
                        {member.status === "Invited" && (
                          <p className="text-xs text-stone-500">{member.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* ⭐ NEW: Add Friend Button */}
                      {!member.isMe && member.status === "Member" && (
                        isFriend ? (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">Friends</span>
                        ) : isPending ? (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Request Sent</span>
                        ) : (
                            <button 
                            onClick={() => handleSendFriendRequest(member.id)} 
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors" 
                            >
                            <UserPlus size={18} />
                            </button>
                        )
                        )}

                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        member.status === "Member" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                );
              })}
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
                onUnconfirm={() => unconfirmFlight(flight)}
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
                onUnconfirm={() => unconfirmHotel(hotel)}
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
                onUnconfirm={() => unconfirmTransport(t)}
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
                <button
                  onClick={() => setPackingMode("shared")}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${packingMode === "shared" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
                >
                  Shared
                </button>
                <button
                  onClick={() => setPackingMode("personal")}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${packingMode === "personal" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
                >
                  Personal
                </button>
              </div>
              
              {/* ⭐ NEW BUTTONS */}
              <button
                onClick={() => { loadProfileTemplates(); setShowImportDialog(true); }}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 text-sm font-bold transition-all flex items-center gap-2"
              >
                <Download size={16} /> Import Preset
              </button>
              <button
                onClick={() => { loadProfileTemplates(); setShowExportDialog(true); }}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 text-sm font-bold transition-all flex items-center gap-2"
              >
                <FileText size={16} /> Save as Preset
              </button>
              <button
                onClick={() => setShowPackingDialog(true)}
                className="px-5 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Add Item
              </button>
            </div>
          </div>

          {/* MASONRY GRID */}
          {packing.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-xl border border-dashed border-stone-200">
               <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
                  <PackageCheck size={24} />
               </div>
               <p className="text-stone-500 text-sm mb-4">List is empty.</p>
               <button 
                  onClick={() => { loadProfileTemplates(); setShowImportDialog(true); }}
                  className="text-stone-900 font-bold underline hover:text-rose-600 text-sm"
                >
                  Import a preset to get started
               </button>
             </div>
          ) : (
             <>
               {/* MOBILE: 1 Column */}
               <div className="grid md:hidden grid-cols-1 gap-6">
                 {cols1.map((col, colIdx) => (
                   <div key={colIdx} className="flex flex-col gap-6">
                     {col.map(renderPackingCard)}
                   </div>
                 ))}
               </div>

               {/* TABLET: 2 Columns */}
               <div className="hidden md:grid lg:hidden grid-cols-2 gap-6 items-start">
                 {cols2.map((col, colIdx) => (
                   <div key={colIdx} className="flex flex-col gap-6">
                     {col.map(renderPackingCard)}
                   </div>
                 ))}
               </div>

               {/* DESKTOP: 3 Columns */}
               <div className="hidden lg:grid grid-cols-3 gap-6 items-start">
                 {cols3.map((col, colIdx) => (
                   <div key={colIdx} className="flex flex-col gap-6">
                     {col.map(renderPackingCard)}
                   </div>
                 ))}
               </div>
             </>
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
      {/* === EXPORT TEMPLATE DIALOG === */}
      {showExportDialog && (() => {
        // ⭐ Filter templates to only show ones matching the current tab
        const compatibleTemplates = profileTemplates.filter(t => (t.type || "personal") === packingMode);

        return (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-serif text-stone-900 mb-6">
                Save as {packingMode === "shared" ? "Shared" : "Personal"} Preset
              </h3>
              
              <div className="space-y-4 mb-6">
                <p className="text-sm text-stone-500">
                  Save your current list of <b>{packing.length} items</b> to your profile so you can reuse it on future trips.
                </p>

                {compatibleTemplates.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 mt-4">Update Existing Preset</label>
                    <select 
                      onChange={(e) => {
                        if(e.target.value) handleExportPacking("update", "", Number(e.target.value));
                      }}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-900 cursor-pointer text-sm"
                    >
                      <option value="">-- Select preset to update --</option>
                      {compatibleTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-4 my-4">
                  <div className="h-px bg-stone-100 flex-1"></div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">OR</span>
                  <div className="h-px bg-stone-100 flex-1"></div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Save as New Preset</label>
                  <input
                    type="text"
                    id="new-preset-name"
                    placeholder="e.g. Summer Beach Trip"
                    className="w-full px-4 py-3 border border-stone-200 rounded-lg outline-none focus:border-stone-900 transition-colors text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleExportPacking("new", (e.target as HTMLInputElement).value, null);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const name = (document.getElementById('new-preset-name') as HTMLInputElement)?.value;
                    handleExportPacking("new", name, null);
                  }}
                  className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Save New
                </button>
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* === IMPORT TEMPLATE DIALOG === */}
      {showImportDialog && (() => {
        // ⭐ Filter templates to only show ones matching the current tab
        const compatibleTemplates = profileTemplates.filter(t => (t.type || "personal") === packingMode);

        return (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-serif text-stone-900 mb-6">
                Import {packingMode === "shared" ? "Shared" : "Personal"} Preset
              </h3>
              
              <div className="space-y-4 mb-6">
                {compatibleTemplates.length === 0 ? (
                  <p className="text-sm text-stone-500 italic">
                    You don't have any {packingMode} presets saved in your profile yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                    {compatibleTemplates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg hover:border-stone-400 transition-colors">
                        <div>
                          <p className="font-bold text-stone-900">{t.name}</p>
                          <p className="text-xs text-stone-500">{t.items?.length || 0} items</p>
                        </div>
                        <button 
                          onClick={() => handleImportTemplate(t.id)}
                          className="px-4 py-2 bg-stone-100 text-stone-700 text-xs font-bold rounded hover:bg-stone-200 uppercase tracking-wider"
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowImportDialog(false)}
                className="w-full px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

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
            
            // Save the master flight record
            await storage.set(`flight:${tripId}:${costDialogFlight.id}`, updated);

            // 1. CREATE DEPARTURE ITEM
            await addToItinerary(updated.date, {
              time: updated.time || "", // Departure Time
              activity: `🛫 Departure: ${updated.airline} ${updated.flightNumber}`,
              location: updated.departure,
              transitStart: updated.departure, 
              transitEnd: updated.arrival,
              iconType: "flight" as any,
              sourceId: `flight:${updated.id}`,
              createdAt: new Date().toISOString()
            });

            // 2. CREATE ARRIVAL ITEM (Always created now)
            // We use updated.arrivalDate if it exists, otherwise fallback to updated.date
            const landingDate = updated.arrivalDate || updated.date;
            
            await addToItinerary(landingDate, {
              time: updated.arrivalTime || "", // Arrival Time
              activity: `🛬 Arrival: ${updated.airline} ${updated.flightNumber}`,
              location: updated.arrival,
              transitStart: updated.departure, 
              transitEnd: updated.arrival,
              iconType: "flight" as any,
              sourceId: `flight:${updated.id}`,
              createdAt: new Date().toISOString()
            });

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
            await addToItinerary(updated.checkIn, {
              time: "15:00", // Default standard check-in time
              activity: `Check-in: ${updated.name}`,
              location: updated.address,
              notes: `Conf: ${updated.confirmationNumber || "N/A"}`,
              iconType: "hotel",
              sourceId: `hotel:${updated.id}`,
              createdAt: new Date().toISOString()
            });
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
            await addToItinerary(updated.date || "", {
              time: updated.time || "",
              activity: `${updated.type} to ${updated.arrival}`,
              location: updated.departure,
              notes: updated.details || "",
              iconType: "transport", 
              transitStart: updated.departure, // Map these for the minimap
              transitEnd: updated.arrival,
              sourceId: `transport:${updated.id}`,
              createdAt: new Date().toISOString()
            });
            setCostDialogTransport(null);
          }}
        />
      )}
      {/* === TOAST NOTIFICATION === */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in font-bold text-sm whitespace-nowrap">
          <CheckCircle size={18} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}