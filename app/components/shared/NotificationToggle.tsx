import React, { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { auth } from "../../../firebase";
import { storage } from "../../../firebaseStore";

export default function NotificationToggle({ tripId }: { tripId: number }) {
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