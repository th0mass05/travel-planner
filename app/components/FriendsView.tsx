import React, { useState, useEffect } from "react";
import { ChevronLeft, Search, UserPlus, Users, Check, X, MapPin, Plane, Heart, Package, CheckCircle} from "lucide-react";
import { auth, db } from "../../firebase"; // Adjust path
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { storage } from "../../firebaseStore"; // Adjust path
import { StoredPlace, TripData } from "../types"; // Adjust path

type FriendData = {
  uid: string;
  username: string;
  name: string;
  photoUrl: string;
  status: "accepted" | "pending_sent" | "pending_received";
};

export default function FriendsView({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<"list" | "search">("list");
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<FriendData | null>(null);
  const [searchError, setSearchError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
    const [hasUsername, setHasUsername] = useState<boolean | null>(null); // null = loading
    useEffect(() => {
    const checkUsername = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setHasUsername(!!snap.data()?.username);
    };
    checkUsername();
  }, []);

  // 1. Loading state (so it doesn't flicker)
  if (hasUsername === null) return <div className="min-h-screen bg-[#FDFCF8]" />;

  // 2. Beautiful Prompt if username is missing
  if (!hasUsername) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-10 shadow-sm text-center animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 border border-amber-100">
            <Users size={40} />
          </div>
          <h2 className="text-3xl font-serif text-stone-900 mb-3">Claim your Username</h2>
          <p className="text-stone-500 mb-8 leading-relaxed">
            To join the Traveler Network and add friends, you need to set a unique username in your account settings first.
          </p>
          <div className="space-y-3">
            <button 
              onClick={onBack}
              className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-all shadow-md"
            >
              Go to Account Settings
            </button>
            <button 
              onClick={onBack}
              className="w-full py-3 text-stone-400 font-bold text-sm hover:text-stone-600 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };
  // Public Profile State
  const [viewingFriend, setViewingFriend] = useState<FriendData | null>(null);
  const [friendTrips, setFriendTrips] = useState<TripData[]>([]);
  const [friendFavs, setFriendFavs] = useState<StoredPlace[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      // Using Firestore subcollection for robust social relations
      const friendsSnap = await getDocs(collection(db, "users", user.uid, "friends"));
      const friendsList: FriendData[] = [];
      
      friendsSnap.forEach(doc => {
        friendsList.push(doc.data() as FriendData);
      });
      
      setFriends(friendsList);
    } catch (e) {
      console.error("Failed to load friends", e);
    }
  };

  const handleSearch = async () => {
    setSearchError("");
    setSearchResult(null);
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return;
    if (cleanQuery === auth.currentUser?.email || cleanQuery === "your_username") {
      setSearchError("You cannot search for yourself.");
      return;
    }

    try {
      // 1. Lookup username
      const usernameSnap = await getDoc(doc(db, "usernames", cleanQuery));
      if (!usernameSnap.exists()) {
        setSearchError("User not found.");
        return;
      }

      const targetUid = usernameSnap.data().uid;

      // 2. Get user details
      const userSnap = await getDoc(doc(db, "users", targetUid));
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      
      // 3. Check if already friends
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
      // Get my own data to send to them
      const mySnap = await getDoc(doc(db, "users", me.uid));
      const myData = mySnap.data() || {};

      // 1. Save 'pending_sent' to my profile
      const myFriendRef = doc(db, "users", me.uid, "friends", targetUser.uid);
      await setDoc(myFriendRef, { ...targetUser, status: "pending_sent" });

      // 2. Save 'pending_received' to their profile
      const theirFriendRef = doc(db, "users", targetUser.uid, "friends", me.uid);
      await setDoc(theirFriendRef, {
        uid: me.uid,
        username: myData.username,
        name: myData.name,
        photoUrl: myData.photoUrl || "",
        status: "pending_received"
      });

      showToast(`Request sent to @${targetUser.username}`);
      loadFriends();
      setSearchResult(null);
      setSearchQuery("");
    } catch (e) {
      showToast("Failed to send request.");
    }
  };

  const acceptRequest = async (targetUser: FriendData) => {
    const me = auth.currentUser;
    if (!me) return;

    try {
      // 1. Get MY latest data (to give to them)
      const mySnap = await getDoc(doc(db, "users", me.uid));
      const myData = mySnap.data() || {};

      // 2. Get THEIR latest data (to save for myself)
      const theirSnap = await getDoc(doc(db, "users", targetUser.uid));
      const theirData = theirSnap.data() || {};
        if (!myData.username || !theirData.username) {
        showToast("Both users must have usernames to become friends.");
        return;
      }
      // 3. Update MY friends list with THEIR latest info
      await setDoc(doc(db, "users", me.uid, "friends", targetUser.uid), {
        uid: targetUser.uid,
        username: theirData.username || targetUser.username || "traveler",
        name: theirData.name || targetUser.name || "Traveler",
        photoUrl: theirData.photoUrl || "",
        status: "accepted"
      });
      
      // 4. Update THEIR friends list with MY latest info
      await setDoc(doc(db, "users", targetUser.uid, "friends", me.uid), { 
        uid: me.uid,
        username: myData.username || "",
        name: myData.name || "",
        photoUrl: myData.photoUrl || "",
        status: "accepted" 
      });

      showToast(`You are now friends with ${theirData.name || targetUser.name}!`);
      // No need to call loadFriends() if you added the onSnapshot listener!
    } catch (e) {
      console.error(e);
      showToast("Failed to accept request.");
    }
  };

  const loadPublicProfile = async (friend: FriendData) => {
    setViewingFriend(friend);
    setLoadingProfile(true);

    try {
      // Load Friend's Favorites
      const favList = await storage.getAll<StoredPlace>(`user:${friend.uid}:favorite:`);
      setFriendFavs(favList);

      // Load Friend's Trips (This assumes storage.getAll fetches trips they own)
      const allTrips = await storage.getAll<TripData>("trip:");
      const theirTrips = allTrips.filter(t => t.ownerId === friend.uid);
      setFriendTrips(theirTrips);

    } catch (e) {
      console.error("Failed to load friend profile", e);
    }
    setLoadingProfile(false);
  };

  // --- RENDER LOGIC ---
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
          
          {viewingFriend ? (
            <button
              onClick={() => setViewingFriend(null)}
              className="mb-6 px-4 py-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-all text-xs font-bold text-stone-600 flex items-center gap-2 uppercase tracking-wider w-fit mx-auto"
            >
              <ChevronLeft size={14} /> Back to Friends
            </button>
          ) : (
            <button
              onClick={onBack}
              className="mb-6 px-4 py-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-all text-xs font-bold text-stone-600 flex items-center gap-2 uppercase tracking-wider w-fit mx-auto"
            >
              <ChevronLeft size={14} /> Home
            </button>
          )}

          {viewingFriend ? (
            <>
              {/* Centered Friend Profile Header */}
              <div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden shadow-sm border border-stone-200 flex items-center justify-center shrink-0 mb-4">
                {viewingFriend.photoUrl ? (
                  <img src={viewingFriend.photoUrl} alt={viewingFriend.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-serif text-stone-400">
                    {viewingFriend.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-stone-900 tracking-tight mb-1">
                {viewingFriend.name}
              </h1>
              <p className="text-stone-500 font-medium">@{viewingFriend.username}</p>
            </>
          ) : (
            <>
              {/* Main Network Header */}
              <h1 className="text-4xl md:text-5xl font-serif text-stone-900 tracking-tight mb-2">
                Traveler Network
              </h1>
              <p className="text-stone-500 font-light text-lg">
                Connect with friends and discover new destinations.
              </p>

              {/* Centered Tabs */}
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
            </>
          )}
        </div>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        
        {viewingFriend ? (
          /* --- VIEWING FRIEND PROFILE --- */
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
            {/* Friend's Trips */}
            {/* Friend's Trips (Split into Upcoming and Past) */}
            <section className="space-y-8">
              {/* UPCOMING TRIPS */}
              <div>
                <h2 className="text-2xl font-serif text-stone-900 mb-6 flex items-center gap-2 border-b border-stone-100 pb-2">
                  <Plane size={20} className="text-stone-400" /> Upcoming Journeys
                </h2>
                {loadingProfile ? (
                  <div className="h-32 bg-stone-100 rounded-2xl animate-pulse"></div>
                ) : friendTrips.filter(t => new Date(t.startDate) >= new Date()).length === 0 ? (
                  <p className="text-stone-500 italic text-sm">No upcoming trips planned.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {friendTrips.filter(t => new Date(t.startDate) >= new Date()).map(trip => (
                      <div key={trip.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                        {trip.imageUrl ? (
                          <img src={trip.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                        ) : (
                          <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-300"><Plane size={20}/></div>
                        )}
                        <div>
                          <h4 className="font-serif font-bold text-stone-900 leading-tight mb-1">{trip.destination}</h4>
                          <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                            {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAST TRIPS */}
              <div>
                <h2 className="text-2xl font-serif text-stone-900 mb-6 flex items-center gap-2 border-b border-stone-100 pb-2 mt-8">
                  <Package size={20} className="text-stone-400" /> Past Adventures
                </h2>
                {loadingProfile ? (
                  <div className="h-32 bg-stone-100 rounded-2xl animate-pulse"></div>
                ) : friendTrips.filter(t => new Date(t.startDate) < new Date()).length === 0 ? (
                  <p className="text-stone-500 italic text-sm">No past trips recorded.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    {friendTrips.filter(t => new Date(t.startDate) < new Date()).map(trip => (
                      <div key={trip.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        {trip.imageUrl ? (
                          <img src={trip.imageUrl} className="w-16 h-16 rounded-xl object-cover grayscale-[30%]" />
                        ) : (
                          <div className="w-16 h-16 bg-stone-200 rounded-xl flex items-center justify-center text-stone-400"><Plane size={20}/></div>
                        )}
                        <div>
                          <h4 className="font-serif font-bold text-stone-900 leading-tight mb-1">{trip.destination}</h4>
                          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{trip.country} • {trip.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Friend's Favorites */}
            <section>
              <h2 className="text-2xl font-serif text-stone-900 mb-6 flex items-center gap-2 border-b border-stone-100 pb-2">
                <Heart size={20} className="text-rose-400 fill-rose-100" /> Favorite Places
              </h2>
              {loadingProfile ? (
                <div className="h-32 bg-stone-100 rounded-2xl animate-pulse"></div>
              ) : friendFavs.length === 0 ? (
                <p className="text-stone-500 italic text-sm">No favorites saved yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {friendFavs.map(place => (
                    <div key={place.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                      {place.imageUrl ? (
                        <img src={place.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-stone-100 rounded-xl flex items-center justify-center text-stone-300"><MapPin size={20}/></div>
                      )}
                      <div>
                        <h4 className="font-serif font-bold text-stone-900 leading-tight mb-1 line-clamp-1">{place.name}</h4>
                        <p className="text-xs font-bold uppercase tracking-wider text-stone-400 line-clamp-1">{place.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

        ) : activeTab === "search" ? (
          /* --- SEARCH TAB --- */
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-900 transition-colors shadow-sm"
                />
              </div>
              <button 
                onClick={handleSearch}
                className="px-6 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>

            {searchError && (
              <p className="text-rose-500 font-medium text-sm bg-rose-50 border border-rose-100 p-4 rounded-xl text-center">
                {searchError}
              </p>
            )}

            {searchResult && (
              <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 bg-stone-100 rounded-full overflow-hidden flex items-center justify-center border border-stone-200 shrink-0">
                    {searchResult.photoUrl ? (
                      <img src={searchResult.photoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={20} className="text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h4 className="font-serif text-lg font-bold text-stone-900 leading-tight">{searchResult.name}</h4>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400">@{searchResult.username}</p>
                  </div>
                </div>
                
                {searchResult.status === "accepted" ? (
                  <span className="text-emerald-600 font-bold text-xs uppercase tracking-widest px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 w-full sm:w-auto text-center">
                    Friends
                  </span>
                ) : searchResult.status === "pending_sent" ? (
                  <span className="text-stone-500 font-bold text-xs uppercase tracking-widest px-4 py-2 bg-stone-100 rounded-full border border-stone-200 w-full sm:w-auto text-center">
                    Request Sent
                  </span>
                ) : (
                  <button 
                    onClick={() => sendFriendRequest(searchResult)}
                    className="px-6 py-2.5 bg-stone-900 text-white hover:bg-stone-800 font-bold text-xs rounded-full flex items-center justify-center gap-2 uppercase tracking-wider transition-colors shadow-sm w-full sm:w-auto"
                  >
                    <UserPlus size={16} /> Add Friend
                  </button>
                )}
              </div>
            )}
          </div>

        ) : (
          /* --- FRIENDS LIST TAB --- */
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-10">
            
            {/* Pending Requests */}
            {pendingReceived.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4 border-b border-stone-100 pb-2">
                  Friend Requests ({pendingReceived.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingReceived.map(req => (
                    <div key={req.uid} className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex justify-between items-center hover:border-stone-300 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-stone-100 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-stone-200">
                            {req.photoUrl ? <img src={req.photoUrl} className="w-full h-full object-cover" /> : <Users size={18} className="text-stone-400" />}
                         </div>
                         <div>
                           <p className="font-serif font-bold text-stone-900 text-lg leading-tight">{req.name}</p>
                           <p className="text-xs font-bold uppercase tracking-wider text-stone-400">@{req.username}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => acceptRequest(req)}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs uppercase tracking-wider"
                      >
                        <Check size={14} /> Accept
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Friends */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4 border-b border-stone-100 pb-2">
                Your Network
              </h3>
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed border-stone-200 rounded-2xl">
                  <Users size={32} className="mx-auto mb-4 text-stone-300" />
                  <p className="font-serif text-xl text-stone-900 mb-2">It's quiet in here.</p>
                  <button onClick={() => setActiveTab("search")} className="text-stone-500 text-sm hover:text-stone-900 font-bold underline transition-colors">
                    Find your travel buddies &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {acceptedFriends.map(friend => (
                    <div 
                      key={friend.uid} 
                      onClick={() => loadPublicProfile(friend)}
                      className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group flex items-center gap-4"
                    >
                      <div className="w-14 h-14 bg-stone-100 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-stone-200 group-hover:border-stone-400 transition-colors">
                         {friend.photoUrl ? <img src={friend.photoUrl} className="w-full h-full object-cover" /> : <Users size={20} className="text-stone-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-bold text-stone-900 text-lg truncate group-hover:text-rose-600 transition-colors leading-tight mb-1">{friend.name}</p>
                        <p className="text-xs font-bold uppercase tracking-wider text-stone-400 truncate">@{friend.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
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