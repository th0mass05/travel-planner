import React, { useState, useEffect } from "react";
import { ChevronLeft, Search, UserPlus, Users, Check, X, MapPin, Plane, Heart, Package, CheckCircle } from "lucide-react";
import { auth, db } from "../../firebase"; 
import { doc, getDoc, setDoc, collection, onSnapshot, getDocs } from "firebase/firestore";
import { storage } from "../../firebaseStore"; 
import { StoredPlace, TripData } from "../types"; 

type FriendData = {
  uid: string;
  username: string;
  name: string;
  photoUrl: string;
  status: "accepted" | "pending_sent" | "pending_received";
};

export default function FriendsView({ onBack }: { onBack: () => void }) {
  // --- 1. ALL STATES AT THE VERY TOP ---
  const [activeTab, setActiveTab] = useState<"list" | "search">("list");
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<FriendData | null>(null);
  const [searchError, setSearchError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [hasUsername, setHasUsername] = useState<boolean | null>(null); 
  const [viewingFriend, setViewingFriend] = useState<FriendData | null>(null);
  const [friendTrips, setFriendTrips] = useState<TripData[]>([]);
  const [friendFavs, setFriendFavs] = useState<StoredPlace[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // --- 2. HELPER FUNCTIONS (Must be defined BEFORE early returns) ---
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleSearch = async () => {
    setSearchError("");
    setSearchResult(null);
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return;
    if (cleanQuery === auth.currentUser?.email) {
      setSearchError("You cannot search for yourself.");
      return;
    }

    try {
      const usernameSnap = await getDoc(doc(db, "usernames", cleanQuery));
      if (!usernameSnap.exists()) {
        setSearchError("User not found.");
        return;
      }
      const targetUid = usernameSnap.data().uid;
      const userSnap = await getDoc(doc(db, "users", targetUid));
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const existingFriend = friends.find(f => f.uid === targetUid);

      setSearchResult({
        uid: targetUid,
        username: userData.username,
        name: userData.name,
        photoUrl: userData.photoUrl || "",
        status: existingFriend ? existingFriend.status : ("none" as any)
      });
    } catch (e) {
      setSearchError("An error occurred while searching.");
    }
  };

  const sendFriendRequest = async (targetUser: FriendData) => {
    const me = auth.currentUser;
    if (!me) return;
    try {
      const mySnap = await getDoc(doc(db, "users", me.uid));
      const myData = mySnap.data() || {};
      await setDoc(doc(db, "users", me.uid, "friends", targetUser.uid), { ...targetUser, status: "pending_sent" });
      await setDoc(doc(db, "users", targetUser.uid, "friends", me.uid), {
        uid: me.uid,
        username: myData.username,
        name: myData.name,
        photoUrl: myData.photoUrl || "",
        status: "pending_received"
      });
      showToast(`Request sent to @${targetUser.username}`);
      setSearchResult(null);
      setSearchQuery("");
    } catch (e) { showToast("Failed to send request."); }
  };

  const acceptRequest = async (targetUser: FriendData) => {
    const me = auth.currentUser;
    if (!me) return;
    try {
      const mySnap = await getDoc(doc(db, "users", me.uid));
      const myData = mySnap.data() || {};
      const theirSnap = await getDoc(doc(db, "users", targetUser.uid));
      const theirData = theirSnap.data() || {};

      if (!myData.username || !theirData.username) {
        showToast("Both users must have usernames.");
        return;
      }

      await setDoc(doc(db, "users", me.uid, "friends", targetUser.uid), {
        uid: targetUser.uid,
        username: theirData.username,
        name: theirData.name || "Traveler",
        photoUrl: theirData.photoUrl || "",
        status: "accepted"
      });
      await setDoc(doc(db, "users", targetUser.uid, "friends", me.uid), { 
        uid: me.uid,
        username: myData.username,
        name: myData.name || "Traveler",
        photoUrl: myData.photoUrl || "",
        status: "accepted" 
      });
      showToast(`You are now friends!`);
    } catch (e) { showToast("Failed to accept request."); }
  };

  const loadPublicProfile = async (friend: FriendData) => {
    setViewingFriend(friend);
    setLoadingProfile(true);
    try {
      const favList = await storage.getAll<StoredPlace>(`user:${friend.uid}:favorite:`);
      setFriendFavs(favList);
      const allTrips = await storage.getAll<TripData>("trip:");
      setFriendTrips(allTrips.filter(t => t.ownerId === friend.uid));
    } catch (e) { console.error(e); }
    setLoadingProfile(false);
  };

  // --- 3. ALL EFFECTS ---
  useEffect(() => {
    const checkUsername = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setHasUsername(!!snap.data()?.username);
    };
    checkUsername();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !hasUsername) return;

    // ⭐ Using onSnapshot for real-time updates (replaces loadFriends)
    const unsub = onSnapshot(collection(db, "users", user.uid, "friends"), (snap) => {
      const friendsList: FriendData[] = [];
      snap.forEach(doc => {
        friendsList.push(doc.data() as FriendData);
      });
      setFriends(friendsList);
    });

    return () => unsub();
  }, [hasUsername]);

  // --- 4. CONDITIONAL EARLY RETURNS ---
  if (hasUsername === null) return <div className="min-h-screen bg-[#FDFCF8]" />;

  if (!hasUsername) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] font-sans flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-10 shadow-sm animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 border border-amber-100">
            <Users size={40} />
          </div>
          <h2 className="text-3xl font-serif text-stone-900 mb-3">Claim your Username</h2>
          <p className="text-stone-500 mb-8 text-sm leading-relaxed">
            To join the Traveler Network and add friends, you need to set a unique username in your account settings first.
          </p>
          <button 
            onClick={onBack}
            className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-all shadow-md"
          >
            Go to Account Settings
          </button>
        </div>
      </div>
    );
  }

  // --- 5. FINAL RENDER LOGIC ---
  const acceptedFriends = friends.filter(f => f.status === "accepted");
  const pendingReceived = friends.filter(f => f.status === "pending_received");

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-stone-900 selection:bg-rose-100 [&_button]:cursor-pointer">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* 1. HEADER */}
      <div className="bg-white border-b border-stone-200 pt-12 pb-8 px-6 md:px-12 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <button
            onClick={() => viewingFriend ? setViewingFriend(null) : onBack()}
            className="mb-6 px-4 py-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-all text-xs font-bold text-stone-600 flex items-center gap-2 uppercase tracking-wider w-fit mx-auto"
          >
            <ChevronLeft size={14} /> {viewingFriend ? "Back to Friends" : "Home"}
          </button>

          <h1 className="text-4xl md:text-5xl font-serif text-stone-900 tracking-tight mb-2">
            {viewingFriend ? viewingFriend.name : "Traveler Network"}
          </h1>

          {!viewingFriend && (
            <div className="flex justify-center gap-6 mt-8 border-b border-stone-100 w-full overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("list")}
                className={`pb-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "list" ? "border-stone-900 text-stone-900 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <Users size={18} /> My Friends ({acceptedFriends.length})
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`pb-4 flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "search" ? "border-stone-900 text-stone-900 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <Search size={18} /> Find Travelers
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {viewingFriend ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
            {/* Friends Profile Sections (Upcoming Trips / Favorites) */}
            <section className="space-y-8">
              <h2 className="text-2xl font-serif text-stone-900 mb-6 flex items-center gap-2 border-b border-stone-100 pb-2">
                <Plane size={20} className="text-stone-400" /> Upcoming Journeys
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {friendTrips.length === 0 ? (
                  <p className="text-stone-500 italic text-sm">No trips to show.</p>
                ) : (
                  friendTrips.map(trip => (
                    <div key={trip.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                      {trip.imageUrl ? <img src={trip.imageUrl} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 bg-stone-100 rounded-xl" />}
                      <h4 className="font-serif font-bold text-stone-900">{trip.destination}</h4>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : activeTab === "search" ? (
          <div className="max-w-xl mx-auto animate-in fade-in">
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Search username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border border-stone-200 rounded-xl outline-none" 
              />
              <button onClick={handleSearch} className="px-6 py-3 bg-stone-900 text-white font-bold rounded-xl">Search</button>
            </div>
            {searchError && <p className="text-rose-500 text-sm">{searchError}</p>}
            {searchResult && (
              <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex justify-between items-center mt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center border overflow-hidden">
                    {searchResult.photoUrl ? <img src={searchResult.photoUrl} className="w-full h-full object-cover" /> : <Users className="text-stone-300" />}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold">{searchResult.name}</h4>
                    <p className="text-xs text-stone-400">@{searchResult.username}</p>
                  </div>
                </div>
                <button onClick={() => sendFriendRequest(searchResult)} className="px-6 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-full uppercase">Add Friend</button>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in space-y-10">
            {pendingReceived.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Requests ({pendingReceived.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingReceived.map(req => (
                    <div key={req.uid} className="bg-white border border-stone-200 p-4 rounded-2xl flex justify-between items-center">
                      <p className="font-bold">{req.name}</p>
                      <button onClick={() => acceptRequest(req)} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs uppercase tracking-wider border border-emerald-100">Accept</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Friends ({acceptedFriends.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {acceptedFriends.map(friend => (
                  <div key={friend.uid} onClick={() => loadPublicProfile(friend)} className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm cursor-pointer flex items-center gap-4">
                    <div className="w-12 h-12 bg-stone-100 rounded-full overflow-hidden shrink-0">
                      {friend.photoUrl ? <img src={friend.photoUrl} className="w-full h-full object-cover" /> : <Users className="text-stone-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif font-bold truncate">{friend.name}</p>
                      <p className="text-xs text-stone-400">@{friend.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-bottom-5 font-bold text-sm">
          <CheckCircle size={18} className="text-emerald-400" /> {toastMsg}
        </div>
      )}
    </div>
  );
}