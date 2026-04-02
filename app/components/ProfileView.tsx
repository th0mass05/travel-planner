import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Heart, Package, Plus, MapPin, Trash2, ExternalLink, PackageCheck, CheckCircle, Camera } from "lucide-react";
import { auth } from "../../firebase"; // Adjust path
import { storage } from "../../firebaseStore"; // Adjust path
import { StoredPlace, PackingData } from "../types"; // Adjust path
import { PackingDialog } from "./dialogs"; // Adjust path if needed
import { updateEmail, updatePassword } from "firebase/auth"; // Add to auth imports
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"; // Add to firestore imports
import { db } from "../../firebase"; // Make sure db is imported
import { compressImage } from "../helpers/helpers"; // Adjust this path to match your folder structure
// Local types for the Profile
type ProfileTab = "favorites" | "templates" | "account"; // ⭐ ADDED ACCOUNT
// ⭐ UPDATED: Items now have categories
export type TemplateItem = {
  category: string;
  item: string;
};

export type PackingTemplate = {
  id: number;
  name: string;
  items: (TemplateItem | string)[];
  type?: "shared" | "personal"; // ⭐ NEW FIELD
  createdAt: string;
};

// ... inside ProfileView component:

export default function ProfileView({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("favorites");
  const [favorites, setFavorites] = useState<StoredPlace[]>([]);
    const [templates, setTemplates] = useState<PackingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
    const [newTemplateType, setNewTemplateType] = useState<"shared" | "personal">("personal");
    const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };
  // Template creation & view state
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PackingTemplate | null>(null);
  const [showPackingDialog, setShowPackingDialog] = useState(false);
  const [accountData, setAccountData] = useState({ name: "", username: "", email: "", photoUrl: "" });
    const [originalUsername, setOriginalUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [accountSaveStatus, setAccountSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  useEffect(() => {
    loadProfileData();
  }, []);
  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setAccountData(prev => ({ ...prev, photoUrl: compressedBase64 }));
    } catch (err) {
      console.error("Failed to compress image:", err);
      alert("Failed to process image. Please try another one.");
    }
  };
  const loadProfileData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);

    try {
      const favList = await storage.getAll<StoredPlace>(`user:${user.uid}:favorite:`);
      setFavorites(favList.sort((a, b) => b.id - a.id));

      const tempList = await storage.getAll<PackingTemplate>(`user:${user.uid}:template:`);
      setTemplates(tempList.sort((a, b) => b.id - a.id));
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setAccountData({
          name: data.name || "",
          username: data.username || "",
          email: user.email || "",
          photoUrl: data.photoUrl || "" // ⭐ NEW
        });
        setOriginalUsername(data.username || "");
      } else {
        setAccountData(prev => ({ ...prev, email: user.email || "" }));
      }
    } catch (err) {
      console.error("Failed to load profile data", err);
    }
    setLoading(false);
  };

  // --- TEMPLATE LOGIC ---
  const handleCreateTemplate = async () => {
    const user = auth.currentUser;
    if (!user || !newTemplateName.trim()) return;

    const newTemplate: PackingTemplate = {
      id: Date.now(),
      name: newTemplateName.trim(),
      items: [],
      type: newTemplateType, // ⭐ ADDED THIS
      createdAt: new Date().toISOString()
    };

    await storage.set(`user:${user.uid}:template:${newTemplate.id}`, newTemplate);
    setTemplates([newTemplate, ...templates]);
    setNewTemplateName("");
    setShowNewTemplate(false);
    setSelectedTemplate(newTemplate); // Auto-open the new template
  };

  const confirmDeleteTemplate = async () => {
    const user = auth.currentUser;
    if (!user || !templateToDelete) return;

    await storage.delete(`user:${user.uid}:template:${templateToDelete}`);
    setTemplates(templates.filter(t => t.id !== templateToDelete));
    
    if (selectedTemplate?.id === templateToDelete) {
      setSelectedTemplate(null);
    }
    
    setTemplateToDelete(null);
    showToast("Preset deleted successfully.");
  };

  // ⭐ UPDATED: Takes full PackingData from the dialog
  const handleAddItemToTemplate = async (data: PackingData) => {
    const user = auth.currentUser;
    if (!user || !selectedTemplate) return;

    const newItem: TemplateItem = { category: data.category, item: data.item };
    const updated = { ...selectedTemplate, items: [...selectedTemplate.items, newItem] };
    
    await storage.set(`user:${user.uid}:template:${selectedTemplate.id}`, updated);
    
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updated : t));
    setSelectedTemplate(updated);
    setShowPackingDialog(false);
  };

  const handleRemoveItemFromTemplate = async (itemIndex: number) => {
    const user = auth.currentUser;
    if (!user || !selectedTemplate) return;

    const newItems = [...selectedTemplate.items];
    newItems.splice(itemIndex, 1);
    
    const updated = { ...selectedTemplate, items: newItems };
    await storage.set(`user:${user.uid}:template:${selectedTemplate.id}`, updated);
    
    setTemplates(templates.map(t => t.id === selectedTemplate.id ? updated : t));
    setSelectedTemplate(updated);
  };

  const removeFavorite = async (placeId: number) => {
    const user = auth.currentUser;
    if (!user) return;
    await storage.delete(`user:${user.uid}:favorite:${placeId}`);
    setFavorites(favorites.filter(f => f.id !== placeId));
  };

  // --- MASONRY GRID LOGIC FOR SELECTED TEMPLATE ---
  const masonryCols = useMemo(() => {
    if (!selectedTemplate) return { cols1: [], cols2: [], cols3: [] };

    // Group items by category, handling legacy string data
    const grouped = selectedTemplate.items.reduce((acc, curr, index) => {
      const cat = typeof curr === 'string' ? 'Other' : curr.category;
      const itemName = typeof curr === 'string' ? curr : curr.item;
      
      if (!acc[cat]) acc[cat] = { category: cat, items: [] };
      acc[cat].items.push({ name: itemName, originalIndex: index });
      return acc;
    }, {} as Record<string, { category: string, items: { name: string, originalIndex: number }[] }>);

    const categories = Object.values(grouped).sort((a, b) => a.category.localeCompare(b.category));

    const cols1 = [categories];
    const cols2: typeof categories[] = [[], []];
    const cols3: typeof categories[] = [[], [], []];

    categories.forEach((group, i) => {
      cols2[i % 2].push(group);
      cols3[i % 3].push(group);
    });

    return { cols1, cols2, cols3 };
  }, [selectedTemplate]);

  // Render a single category block for the Masonry Grid
  // Render a single category block for the Masonry Grid
  const renderCategoryBlock = (group: { category: string, items: { name: string, originalIndex: number }[] }) => (
    <div key={group.category} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-stone-50 px-5 py-3.5 border-b border-stone-200">
        {/* ⭐ UPDATED: Using font-serif and larger text to match admin headers */}
        <h4 className="font-serif font-bold text-stone-900 text-lg tracking-tight">
          {group.category}
        </h4>
      </div>
      <div className="p-2 space-y-1">
        {group.items.map((item) => (
          <div key={item.originalIndex} className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 group/item transition-colors">
            {/* ⭐ UPDATED: Explicitly using font-sans and adjusting weight/color */}
            <span className="font-sans text-sm font-medium text-stone-700">
              {item.name}
            </span>
            <button 
              onClick={() => handleRemoveItemFromTemplate(item.originalIndex)}
              className="text-stone-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all cursor-pointer"
              title="Remove item"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
  // --- ACCOUNT LOGIC ---
  const handleSaveAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setAccountSaveStatus("saving");

    try {
      const cleanUsername = accountData.username.trim().toLowerCase();

      // 1. Handle Username Change (or claiming for legacy users)
      if (cleanUsername !== originalUsername) {
        if (!cleanUsername || cleanUsername.length < 3 || /[^a-z0-9_]/.test(cleanUsername)) {
          throw new Error("Invalid username format. Use 3+ letters, numbers, or underscores.");
        }
        
        // Check availability
        const usernameRef = doc(db, "usernames", cleanUsername);
        const snap = await getDoc(usernameRef);
        if (snap.exists()) {
          throw new Error("Username is already taken!");
        }

        // Claim new username
        await setDoc(usernameRef, { uid: user.uid });
        
        // Free up old username if they had one
        if (originalUsername) {
          await deleteDoc(doc(db, "usernames", originalUsername));
        }
        setOriginalUsername(cleanUsername);
      }

      // 2. Update Firestore User Doc
      await setDoc(doc(db, "users", user.uid), {
        name: accountData.name,
        username: cleanUsername,
        email: accountData.email,
        photoUrl: accountData.photoUrl // ⭐ NEW
      }, { merge: true });
      // 3. Update Firebase Auth (Email & Password)
      if (accountData.email !== user.email) {
        await updateEmail(user, accountData.email);
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
        setNewPassword(""); // clear field
      }

      setAccountSaveStatus("idle");
      showToast("Account updated successfully!");

    } catch (e: any) {
      setAccountSaveStatus("error");
      if (e.code === "auth/requires-recent-login") {
        alert("For security, please log out and log back in to change your email or password.");
      } else {
        alert(e.message);
      }
    }
  };
  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-stone-900 selection:bg-rose-100 [&_button]:cursor-pointer">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* 1. HEADER */}
      <div className="bg-white border-b border-stone-200 pt-12 pb-8 px-6 md:px-12 sticky top-0 z-30 shadow-sm">
        {/* ⭐ UPDATED: Added flex column and center alignment classes to this wrapper */}
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          
          {selectedTemplate ? (
            <button
              onClick={() => setSelectedTemplate(null)}
              className="mb-6 px-4 py-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-all text-xs font-bold text-stone-600 flex items-center gap-2 uppercase tracking-wider w-fit mx-auto"
            >
              <ChevronLeft size={14} /> Back to Presets
            </button>
          ) : (
            <button
              onClick={onBack}
              className="mb-6 px-4 py-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-all text-xs font-bold text-stone-600 flex items-center gap-2 uppercase tracking-wider w-fit mx-auto"
            >
              <ChevronLeft size={14} /> Back to Journeys
            </button>
          )}
          
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900 tracking-tight mb-2">
            {selectedTemplate ? selectedTemplate.name : "Traveler Profile"}
          </h1>
          <p className="text-stone-500 font-light text-lg">
            {selectedTemplate 
              ? `${selectedTemplate.items.length} items saved in this template.` 
              : "Manage your saved places and packing presets."}
          </p>

          {/* Hide tabs if we are deep inside a specific template */}
          {!selectedTemplate && (
            <div className="flex justify-center gap-6 mt-8 border-b border-stone-100 w-full overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("favorites")}
                className={`pb-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "favorites" ? "border-rose-500 text-stone-900 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <Heart size={18} className={activeTab === "favorites" ? "fill-rose-500 text-rose-500" : ""} /> 
                Saved Places ({favorites.length})
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`pb-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "templates" ? "border-stone-900 text-stone-900 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <Package size={18} /> Packing Templates ({templates.length})
              </button>
              <button
                onClick={() => setActiveTab("account")}
                className={`pb-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "account" ? "border-stone-900 text-stone-900 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {loading ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-40 w-full bg-stone-200 rounded-2xl"></div>
            <div className="h-40 w-full bg-stone-200 rounded-2xl hidden md:block"></div>
          </div>
        ) : selectedTemplate ? (
          /* --- INDIVIDUAL TEMPLATE VIEW (MASONRY GRID) --- */
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowPackingDialog(true)}
                className="px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Add Item
              </button>
            </div>

            {selectedTemplate.items.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-stone-200">
                <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
                  <PackageCheck size={24} />
                </div>
                <p className="text-stone-500 text-sm">This template is empty. Start adding essentials!</p>
              </div>
            ) : (
              <>
                {/* MOBILE: 1 Column */}
                <div className="grid md:hidden grid-cols-1 gap-6">
                  {masonryCols.cols1.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-6">
                      {col.map(renderCategoryBlock)}
                    </div>
                  ))}
                </div>

                {/* TABLET: 2 Columns */}
                <div className="hidden md:grid lg:hidden grid-cols-2 gap-6 items-start">
                  {masonryCols.cols2.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-6">
                      {col.map(renderCategoryBlock)}
                    </div>
                  ))}
                </div>

                {/* DESKTOP: 3 Columns */}
                <div className="hidden lg:grid grid-cols-3 gap-6 items-start">
                  {masonryCols.cols3.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-6">
                      {col.map(renderCategoryBlock)}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Reused Packing Dialog */}
            {showPackingDialog && (
              <PackingDialog
                onClose={() => setShowPackingDialog(false)}
                onAdd={handleAddItemToTemplate}
              />
            )}
          </div>
        ) : activeTab === "favorites" ? (
          /* --- FAVORITES TAB --- */
          favorites.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-200">
              <Heart size={32} className="mx-auto mb-4 text-stone-300" />
              <p className="text-stone-900 font-serif text-xl mb-2">No favorites yet</p>
              <p className="text-stone-500 text-sm">Tap the heart on a place card during your trips to save it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((place) => (
                <div key={place.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {place.imageUrl ? (
                    <img src={place.imageUrl} alt={place.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-stone-100 flex items-center justify-center text-stone-300"><MapPin size={32} /></div>
                  )}
                  <div className="p-5">
                    <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight mb-1">{place.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 line-clamp-1">{place.address}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                      {place.link && (
                        <a href={place.link} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-stone-900">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button onClick={() => removeFavorite(place.id)} className="text-rose-400 hover:text-rose-600 text-xs font-bold uppercase tracking-wide flex items-center gap-1 ml-auto">
                        <Heart size={14} className="fill-current" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "account" ? (
          /* --- ACCOUNT TAB --- */
          <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Legacy User Banner */}
            {!originalUsername && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <span className="text-xl">👋</span>
                <div>
                  <h4 className="text-amber-800 font-bold text-sm">Claim your Username!</h4>
                  <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                    We've added a new friends feature. Claim a unique username below so your travel buddies can find you and share trips with you!
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <h2 className="text-2xl font-serif text-stone-900 border-b border-stone-100 pb-4">Profile Settings</h2>
              {/* ⭐ UPDATED: Profile Picture Section with Upload Helper */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-stone-100">
                <div className="relative w-24 h-24 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shadow-sm shrink-0 group">
                  {accountData.photoUrl ? (
                    <img src={accountData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-stone-400 font-serif">
                      {accountData.name ? accountData.name.charAt(0).toUpperCase() : "?"}
                    </span>
                  )}
                  
                  {/* Hover Overlay so clicking the circle directly opens the file picker */}
                  <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                    <Camera size={20} />
                  </label>
                </div>
                
                <div className="flex-1 w-full text-center sm:text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Profile Picture</label>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    {/* The Hidden File Input */}
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    
                    {/* The Stylish Upload Button */}
                    <label 
                      htmlFor="avatar-upload"
                      className="px-4 py-2 bg-stone-100 text-stone-700 text-sm font-bold rounded-lg border border-stone-200 hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Camera size={16} /> Upload Image
                    </label>

                    {/* Quick Remove Button */}
                    {accountData.photoUrl && (
                      <button
                        onClick={() => setAccountData(prev => ({ ...prev, photoUrl: "" }))}
                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">Upload a picture so your travel buddies can recognize you!</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-900"
                    placeholder="Your actual name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Unique Username</label>
                  <input
                    type="text"
                    value={accountData.username}
                    onChange={(e) => setAccountData({...accountData, username: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-stone-50 border rounded-lg outline-none focus:border-stone-900 transition-all ${!originalUsername && !accountData.username ? "border-amber-300 ring-2 ring-amber-100" : "border-stone-200"}`}
                    placeholder="e.g. unsafeminor67"
                  />
                </div>
              </div>

              <div className="pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Email Address</label>
                <input
                  type="email"
                  value={accountData.email}
                  onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">New Password (Optional)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-900"
                />
              </div>

              <div className="pt-6 border-t border-stone-100 flex justify-end">
                <button
                  onClick={handleSaveAccount}
                  disabled={accountSaveStatus === "saving"}
                  className="px-8 py-3 bg-stone-900 text-white font-bold rounded-full hover:bg-stone-800 transition-colors shadow-md disabled:opacity-50"
                >
                  {accountSaveStatus === "saving" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* --- TEMPLATES GRID OVERVIEW --- */
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif text-stone-900">Your Presets</h2>
              <button 
                onClick={() => setShowNewTemplate(true)}
                className="px-5 py-2.5 bg-stone-900 text-white rounded-full text-sm font-bold flex items-center gap-2 hover:bg-stone-800 transition-colors shadow-sm"
              >
                <Plus size={16} /> New Preset
              </button>
            </div>

            {showNewTemplate && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-end gap-4 animate-in fade-in zoom-in-95">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Ski Trip Essentials, Beach Weekend..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-900 transition-colors"
                    autoFocus
                  />
                </div>
                {/* ⭐ NEW: Type Toggle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Type</label>
                  <div className="flex bg-stone-100 p-1 rounded-lg">
                    <button
                      onClick={() => setNewTemplateType("personal")}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${newTemplateType === "personal" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      Personal
                    </button>
                    <button
                      onClick={() => setNewTemplateType("shared")}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${newTemplateType === "shared" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      Shared
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateTemplate} className="px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors">
                    Save
                  </button>
                  <button onClick={() => setShowNewTemplate(false)} className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  onClick={() => setSelectedTemplate(template)}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-colors mb-4">
                    <Package size={20} />
                  </div>
                  {/* ⭐ NEW: Name and Badge Wrapper */}
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-serif text-xl font-bold text-stone-900">{template.name}</h3>
                    <span className={`mt-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      (template.type || "personal") === "shared" 
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}>
                      {template.type || "personal"}
                    </span>
                  </div>
                  <p className="text-stone-500 text-sm mb-6">{template.items.length} items saved</p>
                  
                  <div className="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400 group-hover:text-stone-900 transition-colors">
                      Edit List &rarr;
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTemplateToDelete(template.id); }} 
                      className="text-stone-300 hover:text-red-500 transition-colors p-2 -mr-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === DELETE CONFIRMATION MODAL === */}
      {templateToDelete && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500 shadow-sm border border-rose-100">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-serif text-stone-900 mb-2">Delete Preset?</h3>
            <p className="text-sm text-stone-500 mb-6">
              Are you sure you want to delete this preset? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={confirmDeleteTemplate}
                className="flex-1 px-4 py-2.5 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-sm"
              >
                Delete
              </button>
              <button
                onClick={() => setTemplateToDelete(null)}
                className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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