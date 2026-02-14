"use client";

import React, { useState, useEffect } from "react";
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
  List,
  Utensils,
  ChevronLeft,
} from "lucide-react";
import { storage } from "../firebaseStore";
import { db } from "../firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// Dialog Components
function PlaceDialog({ onClose, onAdd, type }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    rating: "",
    imageUrl: "",
    visited: false,
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, imageUrl: event.target.result });
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
              rows="2"
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

function PhotoDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    url: "",
    caption: "",
    date: "",
    location: "",
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, url: event.target.result });
      };
      reader.readAsDataURL(file);
    }
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

function FlightDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    airline: "",
    flightNumber: "",
    departure: "",
    arrival: "",
    date: "",
    time: "",
  });

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

function HotelDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    checkIn: "",
    checkOut: "",
    confirmationNumber: "",
  });

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

function PackingDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    category: "Clothing",
    item: "",
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

function ActivityDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    time: "",
    activity: "",
    location: "",
    notes: "",
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
            <label className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
              rows="3"
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

function NewTripDialog({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, imageUrl: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
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
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Create Journey
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TravelJournal() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const result = await storage.list("trip:");
      const loadedTrips = [];

      if (result && result.keys) {
        for (const key of result.keys) {
          const data = await storage.get(key);
          if (data && data.value) {
            loadedTrips.push(JSON.parse(data.value));
          }
        }
      }

      setTrips(loadedTrips.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Error loading trips:", error);
    }
    setLoading(false);
  };

  const createTrip = async (tripData) => {
    const trip = {
      id: Date.now(),
      ...tripData,
      createdAt: new Date().toISOString(),
    };

    await storage.set(`trip:${trip.id}`, trip);
    setSelectedTrip(trip);
    setCurrentView("trip");
    loadTrips();

    return trip;
  };

  if (currentView === "home") {
    return (
      <HomePage
        trips={trips}
        loading={loading}
        onSelectTrip={(trip) => {
          setSelectedTrip(trip);
          setCurrentView("trip");
        }}
        onCreateTrip={createTrip}
      />
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

function HomePage({ trips, loading, onSelectTrip, onCreateTrip }) {
  const [filter, setFilter] = useState("all");
  const [showNewTripDialog, setShowNewTripDialog] = useState(false);

  const filteredTrips = trips.filter((trip) => {
    if (filter === "all") return true;
    return trip.status === filter;
  });

  const handleCreateTrip = async (data) => {
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

function TripCard({ trip, onClick }) {
  const statusColors = {
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
      </div>
    </div>
  );
}

function TripView({ trip, onBack }) {
  const [activeTab, setActiveTab] = useState("itinerary");

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
              <h1 className="text-4xl font-serif text-gray-900">
                {trip.destination} Trip {trip.year}
              </h1>
              <p className="text-gray-800 italic mt-2">
                {trip.startDate} - {trip.endDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-8">
            {[
              { id: "itinerary", label: "Itinerary", icon: Calendar },
              { id: "places-visit", label: "Places to Visit", icon: MapPin },
              { id: "places-eat", label: "Places to Eat", icon: Utensils },
              { id: "photos", label: "Photos", icon: Camera },
              { id: "scrapbook", label: "Scrapbook", icon: Sparkles },
              { id: "admin", label: "Admin", icon: PackageCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-4 transition-colors ${
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
        {activeTab === "itinerary" && <ItineraryTab tripId={trip.id} />}
        {activeTab === "places-visit" && (
          <PlacesTab tripId={trip.id} type="visit" />
        )}
        {activeTab === "places-eat" && (
          <PlacesTab tripId={trip.id} type="eat" />
        )}
        {activeTab === "photos" && <PhotosTab tripId={trip.id} />}
        {activeTab === "scrapbook" && <ScrapbookTab tripId={trip.id} />}
        {activeTab === "admin" && <AdminTab tripId={trip.id} />}
      </div>
    </div>
  );
}

function ItineraryTab({ tripId }) {
  const [days, setDays] = useState([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadDays();
  }, [tripId]);

  const loadDays = async () => {
    const result = await storage.list(`itinerary:${tripId}:`);
    const loadedDays = [];

    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedDays.push(JSON.parse(data.value));
        }
      }
    }

    setDays(loadedDays.sort((a, b) => a.day - b.day));
  };

  const addActivity = async (dayNum, activity) => {
    const dayKey = `itinerary:${tripId}:day${dayNum}`;
    let dayData = await storage.get(dayKey);

    if (!dayData || !dayData.value) {
      dayData = { day: dayNum, date: "", items: [] };
    } else {
      dayData = JSON.parse(dayData.value);
    }

    dayData.items.push({ id: Date.now(), ...activity });
    await storage.set(dayKey, dayData);
    await loadDays();
  };

  const currentDayData = days[currentDay] || { items: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif text-gray-900">
            Today's Itinerary
          </h2>
          <p className="text-gray-800 mt-1">
            {currentDayData.date} • Day {currentDay + 1}
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

      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day, index) => (
          <button
            key={day.day}
            onClick={() => setCurrentDay(index)}
            className={`px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap ${
              currentDay === index
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-gray-700 border-gray-200 hover:border-rose-300"
            }`}
          >
            Day {day.day}
          </button>
        ))}
      </div>

      {currentDayData.items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-700 mb-4">
            No activities planned for this day yet
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
          {currentDayData.items.map((item) => (
            <div
              key={item.id}
              className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-rose-300 hover:shadow-lg transition-all"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-purple-400 text-white shadow-lg">
                    <Clock size={24} />
                  </div>
                  <p className="text-lg font-semibold mt-2">{item.time}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-serif text-gray-800 mb-2">
                    {item.activity}
                  </h3>
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
          ))}
        </div>
      )}

      {showAddDialog && (
        <ActivityDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(activity) => {
            addActivity(currentDay + 1, activity);
            setShowAddDialog(false);
          }}
        />
      )}
    </div>
  );
}

function PlacesTab({ tripId, type }) {
  const [places, setPlaces] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadPlaces();
  }, [tripId, type]);

  const loadPlaces = async () => {
    const result = await storage.list(`place:${tripId}:${type}:`);
    const loadedPlaces = [];

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

  const addPlace = async (placeData) => {
    const place = { id: Date.now(), ...placeData };
    await storage.set(`place:${tripId}:${type}:${place.id}`, place);
    await loadPlaces();
  };

  const toggleVisited = async (placeId) => {
    const place = places.find((p) => p.id === placeId);
    if (place) {
      place.visited = !place.visited;
      await storage.set(`place:${tripId}:${type}:${placeId}`, place);
      await loadPlaces();
    }
  };

  const visitedCount = places.filter((p) => p.visited).length;
  const bgColor =
    type === "eat"
      ? "from-amber-100 to-rose-100"
      : "from-green-100 to-teal-100";
  const checkColor = type === "eat" ? "bg-amber-500" : "bg-green-500";

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
              className={`border-2 rounded-lg overflow-hidden transition-all hover:shadow-xl ${
                place.visited
                  ? `bg-gradient-to-br ${bgColor} border-gray-300`
                  : "bg-white border-gray-200"
              }`}
            >
              {place.imageUrl && (
                <div className="relative h-48 overflow-hidden">
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
                  {place.rating && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200">
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
                <p className="text-gray-700 mb-4 text-sm">
                  {place.description}
                </p>
                <div className="flex items-start gap-2 text-gray-800 mb-4">
                  <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                  <span className="text-xs">{place.address}</span>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <input
                    type="checkbox"
                    id={`visited-${place.id}`}
                    checked={place.visited}
                    onChange={() => toggleVisited(place.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor={`visited-${place.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {place.visited
                      ? type === "eat"
                        ? "Tried it!"
                        : "Visited"
                      : type === "eat"
                        ? "Mark as tried"
                        : "Mark as visited"}
                  </label>
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
    </div>
  );
}

function PhotosTab({ tripId }) {
  const [photos, setPhotos] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [tripId]);

  const loadPhotos = async () => {
    const result = await storage.list(`photo:${tripId}:`);
    const loadedPhotos = [];

    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedPhotos.push(JSON.parse(data.value));
        }
      }
    }

    setPhotos(loadedPhotos.sort((a, b) => b.id - a.id));
  };

  const addPhoto = async (photoData) => {
    const photo = { id: Date.now(), ...photoData };
    await storage.set(`photo:${tripId}:${photo.id}`, photo);
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
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 hover:shadow-2xl transition-all group"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <p className="font-medium text-gray-800 mb-2">
                  {photo.caption}
                </p>
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

function ScrapbookTab({ tripId }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadEntries();
  }, [tripId]);

  const loadEntries = async () => {
    const result = await storage.list(`scrapbook:${tripId}:`);
    const loadedEntries = [];

    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedEntries.push(JSON.parse(data.value));
        }
      }
    }

    setEntries(loadedEntries.sort((a, b) => a.day - b.day));
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
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4 mx-auto">
            <Sparkles size={32} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Create Today's Entry
          </h3>
          <p className="text-gray-800 mb-4">
            Document your experiences and memories from today's adventures
          </p>
        </div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-gradient-to-br from-white to-amber-50/30 border-2 rounded-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-rose-500 to-purple-500 px-6 py-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl">
                    {entry.day}
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif">{entry.title}</h3>
                    <div className="flex items-center gap-2 mt-1 opacity-90">
                      <Calendar size={14} />
                      <span className="text-sm">{entry.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed font-serif italic">
                  "{entry.content}"
                </p>
              </div>
              {entry.locations && entry.locations.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start gap-2">
                    <MapPin size={18} className="text-rose-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Locations Visited
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.locations.map((loc, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                          >
                            {loc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AdminTab({ tripId }) {
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [packing, setPacking] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("flights");
  const [showFlightDialog, setShowFlightDialog] = useState(false);
  const [showHotelDialog, setShowHotelDialog] = useState(false);
  const [showPackingDialog, setShowPackingDialog] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, [tripId]);

  const loadAdminData = async () => {
    const flightsResult = await storage.list(`flight:${tripId}:`);
    const loadedFlights = [];
    if (flightsResult && flightsResult.keys) {
      for (const key of flightsResult.keys) {
        const data = await storage.get(key);
        if (data && data.value) loadedFlights.push(JSON.parse(data.value));
      }
    }
    setFlights(loadedFlights);

    const hotelsResult = await storage.list(`hotel:${tripId}:`);
    const loadedHotels = [];
    if (hotelsResult && hotelsResult.keys) {
      for (const key of hotelsResult.keys) {
        const data = await storage.get(key);
        if (data && data.value) loadedHotels.push(JSON.parse(data.value));
      }
    }
    setHotels(loadedHotels);

    const packingResult = await storage.list(`packing:${tripId}:`);
    const loadedPacking = [];
    if (packingResult && packingResult.keys) {
      for (const key of packingResult.keys) {
        const data = await storage.get(key);
        if (data && data.value) loadedPacking.push(JSON.parse(data.value));
      }
    }
    setPacking(loadedPacking);
  };

  const addFlight = async (flightData) => {
    const flight = { id: Date.now(), ...flightData };
    await storage.set(`flight:${tripId}:${flight.id}`, flight);
    await loadAdminData();
  };

  const addHotel = async (hotelData) => {
    const hotel = { id: Date.now(), ...hotelData };
    await storage.set(`hotel:${tripId}:${hotel.id}`, hotel);
    await loadAdminData();
  };

  const addPackingItem = async (itemData) => {
    const item = { id: Date.now(), packed: false, ...itemData };
    await storage.set(`packing:${tripId}:${item.id}`, item);
    await loadAdminData();
  };

  const togglePacked = async (itemId) => {
    const item = packing.find((p) => p.id === itemId);
    if (item) {
      item.packed = !item.packed;
      await storage.set(`packing:${tripId}:${itemId}`, item);
      await loadAdminData();
    }
  };

  const packedCount = packing.filter((p) => p.packed).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif text-gray-900">
          Trip Administration
        </h2>
        <p className="text-gray-800 mt-1">
          All your important trip details in one place
        </p>
      </div>

      <div className="flex gap-2 border-b-2 border-gray-200">
        {[
          { id: "flights", label: "Flights", icon: Plane },
          { id: "hotels", label: "Hotels", icon: Hotel },
          { id: "packing", label: "Packing", icon: PackageCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-4 transition-colors ${
                activeSubTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-800 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === "flights" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowFlightDialog(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Flight
            </button>
          </div>
          {flights.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-700 mb-4">No flights added yet</p>
              <button
                onClick={() => setShowFlightDialog(true)}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg"
              >
                Add Your First Flight
              </button>
            </div>
          ) : (
            flights.map((flight) => (
              <div
                key={flight.id}
                className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Plane size={24} className="text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {flight.airline} {flight.flightNumber}
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-sm border border-gray-200">
                        {flight.departure} → {flight.arrival}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-800">Date</p>
                      <p className="font-semibold">{flight.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-800">Time</p>
                      <p className="font-semibold">{flight.time}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSubTab === "hotels" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowHotelDialog(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Hotel
            </button>
          </div>
          {hotels.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-700 mb-4">No hotels added yet</p>
              <button
                onClick={() => setShowHotelDialog(true)}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg"
              >
                Add Your First Hotel
              </button>
            </div>
          ) : (
            hotels.map((hotel) => (
              <div
                key={hotel.id}
                className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gradient-to-r from-amber-50 to-rose-50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Hotel size={24} className="text-amber-600" />
                    </div>
                    <span className="font-semibold text-lg">{hotel.name}</span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">Address</p>
                      <p className="font-medium">{hotel.address}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-800">Check-in</p>
                      <p className="font-semibold text-green-600">
                        {hotel.checkIn}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">Check-out</p>
                      <p className="font-semibold text-red-600">
                        {hotel.checkOut}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">Confirmation</p>
                      <p className="font-mono font-semibold text-sm">
                        {hotel.confirmationNumber}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSubTab === "packing" && (
        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PackageCheck size={24} className="text-purple-600" />
                </div>
                <span className="font-semibold text-lg">Packing List</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-1 bg-white rounded-full text-sm border border-gray-200 font-medium">
                  {packedCount} / {packing.length} packed
                </span>
                <button
                  onClick={() => setShowPackingDialog(true)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {packing.length === 0 ? (
              <div className="text-center py-12 text-gray-700">
                <p className="mb-4">No packing items yet</p>
                <button
                  onClick={() => setShowPackingDialog(true)}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg"
                >
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(new Set(packing.map((p) => p.category))).map(
                  (category) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        {category}
                      </h3>
                      <div className="space-y-2 ml-6">
                        {packing
                          .filter((p) => p.category === category)
                          .map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                item.packed
                                  ? "bg-green-50 border-green-200"
                                  : "bg-white border-gray-200 hover:border-purple-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`pack-${item.id}`}
                                checked={item.packed}
                                onChange={() => togglePacked(item.id)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <label
                                htmlFor={`pack-${item.id}`}
                                className={`flex-1 cursor-pointer ${item.packed ? "line-through text-gray-700" : "text-gray-800"}`}
                              >
                                {item.item}
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showFlightDialog && (
        <FlightDialog
          onClose={() => setShowFlightDialog(false)}
          onAdd={(data) => {
            addFlight(data);
            setShowFlightDialog(false);
          }}
        />
      )}
      {showHotelDialog && (
        <HotelDialog
          onClose={() => setShowHotelDialog(false)}
          onAdd={(data) => {
            addHotel(data);
            setShowHotelDialog(false);
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
    </div>
  );
}
