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
  Utensils,
  ChevronLeft,
  ExternalLink,
  Link as LinkIcon,
  ShoppingBag,
} from "lucide-react";
import { storage } from "../firebaseStore";

const deleteKey = async (key) => {
  if (storage.delete) {
    await storage.delete(key);
  } else {
    // Firebase fallback: overwrite with empty object instead of null
    await storage.set(key, { __deleted: true });
  }
};



const iconMap = {
  flight: Plane,
  hotel: Hotel,
  eat: Utensils,
  visit: MapPin,
  activity: Clock,
  custom: Star, // fallback for manual picks
};


// Helper to get all dates between start and end
const getDatesInRange = (startDate, endDate) => {
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
function PlaceDialog({ onClose, onAdd, type }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    rating: "",
    imageUrl: "",
    link: "",
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

function FlightDialog({ onClose, onAdd, initialData })
 {
  const [formData, setFormData] = useState(
  initialData || {
    airline: "",
    flightNumber: "",
    departure: "",
    arrival: "",
    date: "",
    time: "",
    link: "",
    status: "potential",
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
              rows="2"
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

function HotelDialog({ onClose, onAdd, initialData })
 {
  const [formData, setFormData] = useState(
  initialData || {
    name: "",
    address: "",
    checkIn: "",
    checkOut: "",
    confirmationNumber: "",
    link: "",
    status: "potential",
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
              rows="2"
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

function ShoppingDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    item: "",
    category: "",
    link: "",
    notes: "",
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
              rows="2"
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

function ActivityDialog({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    time: "",
    activity: "",
    location: "",
    notes: "",
    iconType: "activity",
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

function ConfirmToItineraryDialog({ onClose, onConfirm, title }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

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


const addToItineraryStorage = async (
  tripId,
  date,
  time,
  activity,
  location,
  notes = "",
  iconType = "activity"
) => {
  if (!date) return;

  const key = `itinerary:${tripId}:date:${date}`;

  // load existing day (if any)
  const existing = await storage.get(key);
  let targetDay = null;

  if (existing?.value) {
    targetDay = JSON.parse(existing.value);
  } else {
    targetDay = { date, items: [] };
  }

  targetDay.items.push({
    id: Date.now(),
    time,
    activity,
    location,
    notes,
    iconType
  });

  targetDay.items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  await storage.set(key, targetDay);
};



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
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: "itinerary", label: "Itinerary", icon: Calendar },
              { id: "places-visit", label: "Places to Visit", icon: MapPin },
              { id: "places-eat", label: "Places to Eat", icon: Utensils },
              { id: "shopping", label: "Shopping", icon: ShoppingBag },
              { id: "photos", label: "Photos", icon: Camera },
              { id: "scrapbook", label: "Scrapbook", icon: Sparkles },
              { id: "admin", label: "Admin", icon: PackageCheck },
            ].map((tab) => {
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
      </div>
    </div>
  );
}

function ItineraryTab({ trip }) {
  const [days, setDays] = useState([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadDays();
  }, [trip.id, trip.startDate, trip.endDate]);

  const loadDays = async () => {
    const allDates = getDatesInRange(trip.startDate, trip.endDate);

    const result = await storage.list(`itinerary:${trip.id}:date:`);
    const storedByDate = {};

    if (result?.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data?.value) {
          const parsed = JSON.parse(data.value);
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


  const addActivity = async (dayNum, activity) => {
    const dayData = days.find((d) => d.day === dayNum);
    const date = dayData?.date;
    if (!date) return;

    const key = `itinerary:${trip.id}:date:${date}`;

    // Load existing stored data
    const existing = await storage.get(key);
    const parsed = existing?.value
      ? JSON.parse(existing.value)
      : { date, items: [] };

    // Add the new activity
    const updatedItems = [
      ...(parsed.items || []),
      {
        id: Date.now(),
        ...activity,
        iconType: activity.iconType || "activity",
      },
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
  const currentDayData = days[currentDayIndex] || {
    day: 1,
    date: "",
    items: [],
  };

  const deleteActivity = async (date, activityId) => {
    const key = `itinerary:${trip.id}:date:${date}`;
    const existing = await storage.get(key);
    if (!existing?.value) return;

    const parsed = JSON.parse(existing.value);

    parsed.items = parsed.items.filter(i => i.id !== activityId);

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
            .map((item) => {
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
                        <h3 className="text-2xl font-serif text-gray-800 mb-2">
                          {item.activity}
                        </h3>

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

function PlacesTab({ tripId, type }) {
  const [places, setPlaces] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [confirmingPlace,setConfirmingPlace]=useState(null);


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

  const confirmPlace = async (place,date,time)=>{
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

  const deletePlace = async (placeId) => {
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
                      onChange={()=>toggleVisited(place.id)}
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
          onClose={()=>setConfirmingPlace(null)}
          onConfirm={(date,time)=>confirmPlace(confirmingPlace,date,time)}
        />
      )}
    </div>
  );
  
}

function ShoppingTab({ tripId }) {
  const [items, setItems] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadItems();
  }, [tripId]);

  const loadItems = async () => {
    const result = await storage.list(`shopping:${tripId}:`);
    const loadedItems = [];

    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedItems.push(JSON.parse(data.value));
        }
      }
    }
    // Sort by id (created time)
    setItems(loadedItems.sort((a, b) => b.id - a.id));
  };

  const addItem = async (itemData) => {
    const newItem = { id: Date.now(), bought: false, ...itemData };
    await storage.set(`shopping:${tripId}:${newItem.id}`, newItem);
    await loadItems();
  };

  const toggleBought = async (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      item.bought = !item.bought;
      await storage.set(`shopping:${tripId}:${itemId}`, item);
      await loadItems();
    }
  };

  // Group items by category
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const boughtCount = items.filter((i) => i.bought).length;
  const deleteItem = async (id) => {
    await deleteKey(`shopping:${tripId}:${id}`);
    await loadItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif text-gray-900">Shopping List</h2>
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
            Start Your Wishlist
          </h3>
          <p className="text-gray-800 mb-4">
            Keep track of souvenirs, gifts, and essentials you want to buy.
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
                        onChange={() => toggleBought(item.id)}
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

                            {/* DELETE BUTTON */}
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

  const deletePhoto = async (photoId) => {
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
          {photos.map((photo) => (
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

                {/* DELETE BUTTON */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="text-sm text-red-500 hover:text-red-700"
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
          <p className="text-gray-700">No scrapbook entries yet</p>
        </div>
      ) : (
        entries.map((entry) => (
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



function AdminTab({ tripId }) {

  const [flights,setFlights]=useState([]);
  const [hotels,setHotels]=useState([]);
  const [packing,setPacking]=useState([]);
  const [editingFlight,setEditingFlight]=useState(null);
  const [editingHotel,setEditingHotel]=useState(null);

  const [activeSubTab,setActiveSubTab]=useState("flights");
  const [showFlightDialog,setShowFlightDialog]=useState(false);
  const [showHotelDialog,setShowHotelDialog]=useState(false);
  const [showPackingDialog,setShowPackingDialog]=useState(false);

  useEffect(()=>{
    loadAdminData();
  },[tripId]);

  const loadAdminData=async()=>{

    const load=async(prefix)=>{
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

    setFlights(await load("flight"));
    setHotels(await load("hotel"));
    setPacking(await load("packing"));
  };

  const addFlight = async (data) => {

    // If editing → keep same ID
    const flight = editingFlight
      ? { ...editingFlight, ...data }
      : { id: Date.now(), ...data };

    await storage.set(`flight:${tripId}:${flight.id}`, flight);

    // itinerary logic unchanged
    if (flight.status === "confirmed" && flight.date && flight.time) {
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

    setEditingFlight(null);
    await loadAdminData();
  };



  const addHotel = async (data) => {

    const hotel = editingHotel
      ? { ...editingHotel, ...data }
      : { id: Date.now(), ...data };

    await storage.set(`hotel:${tripId}:${hotel.id}`, hotel);

    if (hotel.status === "confirmed" && hotel.checkIn) {
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

    setEditingHotel(null);
    await loadAdminData();
  };



  const addPackingItem=async(data)=>{
    const item={id:Date.now(),packed:false,...data};
    await storage.set(`packing:${tripId}:${item.id}`,item);
    await loadAdminData();
  };

  const deleteFlight=async(id)=>{
    await deleteKey(`flight:${tripId}:${id}`);
    setFlights(prev=>prev.filter(f=>f.id!==id)); // instant UI update
  };

  const deleteHotel=async(id)=>{
    await deleteKey(`hotel:${tripId}:${id}`);
    setHotels(prev=>prev.filter(h=>h.id!==id));
  };

  const togglePacked=async(id)=>{
    const item=packing.find(p=>p.id===id);
    if(!item)return;
    item.packed=!item.packed;
    await storage.set(`packing:${tripId}:${id}`,item);
    await loadAdminData();
  };

  const toggleFlightStatus = async (flightId) => {
    const flight = flights.find(f => f.id === flightId);
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

  const toggleHotelStatus = async (hotelId) => {
    const hotel = hotels.find(h => h.id === hotelId);
    if (!hotel) return;

    // mark confirmed
    hotel.status = "confirmed";

    // save updated hotel
    await storage.set(`hotel:${tripId}:${hotelId}`, hotel);

    // 🔥 ADD CHECK-IN TO ITINERARY
    if (hotel.checkIn) {
      await addToItineraryStorage(
        tripId,
        hotel.checkIn,
        "15:00",                      // default check-in time
        `Check-in: ${hotel.name}`,    // activity title
        hotel.address || "",          // location
        "",                           // notes
        "hotel"                       // iconType
      );
    }

    await loadAdminData();
  };

  
  const packedCount=packing.filter(p=>p.packed).length;

  return(
<div className="space-y-6">

  <div>
    <h2 className="text-3xl font-serif text-gray-900">Trip Administration</h2>
    <p className="text-gray-800 mt-1">All your important trip details in one place</p>
  </div>

  {/* SUBTABS */}
  <div className="flex gap-2 border-b-2 border-gray-200">
    {[
      {id:"flights",label:"Flights",icon:Plane},
      {id:"hotels",label:"Hotels",icon:Hotel},
      {id:"packing",label:"Packing",icon:PackageCheck}
    ].map(tab=>{
      const Icon=tab.icon;
      return(
        <button key={tab.id}
          onClick={()=>setActiveSubTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 border-b-4 ${
            activeSubTab===tab.id
              ?"border-gray-900 text-gray-900"
              :"border-transparent text-gray-800 hover:text-gray-900"
          }`}
        >
          <Icon size={18}/>
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
<div key={f.id}
className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-lg transition-all">

<div className="flex items-start justify-between">

  <div>
    <h3 className="text-xl font-serif text-gray-800">
      {f.airline} {f.flightNumber}
    </h3>

    <p className="text-gray-700 mt-1">
      {f.departure} → {f.arrival}
    </p>

    <div className="text-sm text-gray-600 mt-2 space-y-1">

      {f.date && <div>Date: {f.date}</div>}
      {f.time && <div>Time: {f.time}</div>}
      {f.price && <div className="font-medium">Price: {f.price}</div>}
      {f.details && <div className="text-gray-500">{f.details}</div>}

    </div>

  </div>

  <div className="flex flex-col items-end gap-2">

    {/* ✅ CONFIRM BUTTON */}
    {f.status !== "confirmed" && (
      <button
        onClick={() => toggleFlightStatus(f.id)}
        className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
      >
        Confirm
      </button>
    )}
    <button
      onClick={()=>{
        setEditingFlight(f);
        setShowFlightDialog(true);
      }}
      className="text-blue-600 hover:text-blue-800 text-sm"
    >
    Edit
    </button>

    {/* DELETE */}
    <button
      onClick={()=>deleteFlight(f.id)}
      className="text-red-500 hover:text-red-700 text-sm"
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
<div key={h.id}
className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-amber-300 hover:shadow-lg transition-all">

<div className="flex items-start justify-between">

  <div>
    <h3 className="text-xl font-serif text-gray-800">
      {h.name}
    </h3>

    {h.address && (
      <p className="text-gray-700 mt-1">{h.address}</p>
    )}

    <div className="text-sm text-gray-600 mt-2 space-y-1">

      {h.checkIn && <div>Check-in: {h.checkIn}</div>}
      {h.checkOut && <div>Check-out: {h.checkOut}</div>}
      {h.price && <div className="font-medium">Price: {h.price}</div>}
      {h.details && <div className="text-gray-500">{h.details}</div>}

    </div>

  </div>

  <div className="flex flex-col items-end gap-2">

    {/* ✅ CONFIRM BUTTON */}
    {h.status !== "confirmed" && (
      <button
        onClick={() => toggleHotelStatus(h.id)}
        className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
      >
        Confirm
      </button>
    )}
    <button
      onClick={()=>{
        setEditingHotel(h);
        setShowHotelDialog(true);
      }}
      className="text-blue-600 hover:text-blue-800 text-sm"
    >
    Edit
    </button>

    <button
      onClick={()=>deleteHotel(h.id)}
      className="text-red-500 hover:text-red-700 text-sm"
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

<span className={item.packed?"line-through text-gray-500":"text-gray-800"}>
{item.item}
</span>

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
    initialData={editingFlight}
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
    initialData={editingHotel}
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

