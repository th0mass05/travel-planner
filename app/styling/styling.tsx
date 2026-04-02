import { 
  Landmark, Car, TreePine, 
  Ticket, Palette, Wine
} from 'lucide-react';
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
  FileText, // Add this
  Download, // Add this
  Trash2,   // Add this (optional, for cleaner delete icons)
  Bell,
  BellOff,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PlaceType, StoredPlace, ShoppingData } from "../types";
export const iconMap: Record<string, any> = {
  flight: Plane,
  hotel: Hotel,
  eat: Utensils,
  visit: MapPin,
  activity: Clock,
  custom: Star,
  transport: Train,
  landmark: Landmark,
  "day-trip": Car,
  shopping: ShoppingBag,
  experience: Star,
  nature: TreePine,
  entertainment: Ticket,
  culture: Palette,
  nightlife: Wine,
};

export const categoryIcons: Record<string, any> = {
  eat: Utensils,
  landmark: Landmark,
  "day-trip": Car,
  shopping: ShoppingBag,
  experience: Star,
  nature: TreePine,
  entertainment: Ticket,
  culture: Palette,
  nightlife: Wine,
  visit: MapPin,
};

export const CATEGORY_COLORS: Record<string, string> = {
  eat: "#b87a3d",         // Caramel / Ochre
  landmark: "#5c7080",    // Steel Blue
  "day-trip": "#826b7a",  // Dusty Mauve
  shopping: "#b36666",    // Faded Brick / Rose
  experience: "#4b7f75",  // Muted Pine / Deep Teal
  nature: "#6b8259",      // Sage Green
  nightlife: "#455b7d",   // Denim Blue
  visit: "#6e6b66"        // Warm Charcoal
};
// Map categories for the UI sub-nav
export const PLACE_CATEGORIES: { id: PlaceType | "all"; label: string }[] = [
  { id: "all", label: "All Places" },
  { id: "eat", label: "Food & Drink" },
  { id: "landmark", label: "Landmarks" },
  { id: "day-trip", label: "Areas / Day Trips" },
  { id: "shopping", label: "Shopping" },
  { id: "experience", label: "Experiences" },
  { id: "nature", label: "Nature" },
  { id: "nightlife", label: "Nightlife" },
];