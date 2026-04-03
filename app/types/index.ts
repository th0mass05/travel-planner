export type TransportData = {
  type: string;
  code?: string;
  departure: string;
  arrival: string;
  date?: string;
  time?: string;
  price?: string;
  link?: string;
  details?: string;
  status?: "potential" | "confirmed";

};

export type DocumentData = {
  id: number;
  name: string;
  category: "Tickets" | "Reservations" | "Insurance" | "ID" | "Other";
  fileUrl: string;      // Base64 string of the file
  fileName: string;     // Original filename (e.g., "flight-ticket.pdf")
  fileType: string;     // MIME type (e.g., "application/pdf")
  createdByUid?: string | null;
  createdAt?: string;
};

export type StoredTransport = TransportData & {
  id:number;
  createdByUid?:string|null;
  createdAt?:string;
  cost?:string;
  price?: string | number; 
  paidBy?:{uid:string,amount:number}[];
};


export type PlaceType = 
  | "eat" 
  | "visit" 
  | "day-trip" 
  | "landmark" 
  | "shopping" 
  | "experience" 
  | "nature" 
  | "nightlife";

export type PlaceData = {
  id: number;              // REQUIRED for storage, delete, confirm, sorting
  name: string;
  description: string;
  address: string;

  rating?: string;         // optional
  imageUrl?: string;       // optional
  link?: string;           // optional

  visited: boolean;
  confirmed?: boolean;
  createdAt?: string;        // ISO date string
  createdByUid?: string | null;
  googleMapsUrl?: string;
  locationPath?: string[];
  lat?: number;
  lng?: number;
};


export type PhotoData = {
  url: string;         // base64 or URL
  caption: string;
  date: string;        // yyyy-mm-dd
  location: string;
  createdByUid?: string | null;
};

export type FlightData = {
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;

  date: string;
  time: string;

  // ⭐ NEW FIELDS
  arrivalDate?: string;
  arrivalTime?: string;
  duration?: string;

  returnDate?: string;
  returnTime?: string;

  link?: string;
  status: string;

  price?: string;
  details?: string;
  createdAt?: string;
  createdByUid?: string | null;
};



export type HotelData = {
  id?: number;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  confirmationNumber: string;
  link: string;
  status: "potential" | "confirmed";
  price?: string;      // NEW
  details?: string;    // NEW
  createdByUid?: string | null;
  createdAt?: string;
  googleMapsUrl?: string;

};


export type PackingData = {
  category: string;
  item: string;
  packed?: boolean;
  createdByUid?: string | null;
  createdAt?: string;
};

export type ShoppingData = {
  id?: number;
  bought?: boolean;
  item: string;
  category: string;
  link?: string;
  notes?: string;
  linkedPlaces?: { id: number; name: string }[];
  createdByUid?: string | null;
  createdAt?: string;
};


export type ActivityData = {
  time: string;
  activity: string;
  location: string;
  notes?: string;
  iconType: string;
  createdAt?: string;
};

export type View = "home" | "trip";

export type TripStatus = "upcoming" | "ongoing" | "completed";

export type TripFormData = {
  destination: string;
  country: string;
  year: number;
  tagline: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  imageUrl: string;
  bgGradient: string;
};

// Add this near your other types
export type TripSegment = {
  id: string;
  location: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  color: string;     // e.g., "bg-blue-100"
};

// Update TripData
export type TripData = TripFormData & {
  id: number;
  createdAt: string;
  ownerId: string;
  members: string[];
  createdByUid?: string | null;
  segments?: TripSegment[];
  invites?: string[]; // ⭐ NEW: Stores emails of invited people
  isPendingInvite?: boolean; // ⭐ NEW: Local helper flag for UI
};

export type StoredFlight = FlightData & { 
  id: number;
  cost?: string | number;               // Add this
  price?: string | number;              // Add this
  paidBy?: { uid: string; amount: number }[]; // Add this
};

export type StoredHotel = HotelData & { 
  id: number;
  cost?: string | number;               // Add this
  price?: string | number;              // Add this
  paidBy?: { uid: string; amount: number }[]; // Add this
};
export type StoredPacking = PackingData & { id: number; packed: boolean };

export type ScrapbookEntry = {
  id: number;
  day: number;
  title: string;
  date: string;
  content: string;
};

export type ScrapbookTabProps = {
  tripId: number;
};

export type StoredPlace = PlaceData & {
  id: number;
  category: PlaceType;
  createdByUid?: string | null;
  createdAt?: string;
  cost?: number;
  price?: string | number; 
  paidBy?: {
    uid: string;
    amount: number;}[]
};

export type PlacesTabProps = {
  tripId: number;
  country: string;
};

export type PhotosTabProps = {
  tripId: number;
};

export type DocumentDialogProps = {
  onClose: () => void;
  onAdd: (data: Omit<DocumentData, "id" | "createdAt" | "createdByUid">) => void;
};

export type PlaceFormData = {
  name: string;
  description: string;
  address: string;
  rating: string;
  imageUrl: string;
  link: string;
  visited: boolean;
  googleMapsUrl?: string;
  category: PlaceType;
  locationPath?: string[]; // ⭐ NEW: Store the full location path for better filtering and display
  lat?: number;
  lng?: number;
};

export type PlaceDialogProps = {
  onClose: () => void;
  onAdd: (data: PlaceFormData) => void;
  initialData?: PlaceFormData;
  initialCategory?: PlaceType;
  initialLocationPath?: string[];
  allPlaces?: StoredPlace[];
};

export type PhotoDialogProps = {
  onClose: () => void;
  onAdd: (data: PhotoData) => void;
};

export type FlightDialogProps = {
  onClose: () => void;
  onAdd: (data: FlightData) => void;
  initialData?: FlightData; // optional, used for edit mode
};

export type HotelDialogProps = {
  onClose: () => void;
  onAdd: (data: HotelData) => void;
  initialData?: HotelData;
};

export type PackingDialogProps = {
  onClose: () => void;
  onAdd: (data: PackingData) => void;
};

export type ShoppingDialogProps = {
  onClose: () => void;
  onAdd: (data: ShoppingData) => void;
  shoppingPlaces: StoredPlace[];
  existingCategories: string[];
};

export type ActivityDialogProps = {
  onClose: () => void;
  onAdd: (data: ActivityData) => void;
  initialData?: ActivityData; // ⭐ NEW PROP
};

export type TripDialogProps = {
  initialData?: TripData; // If present, we are editing
  onClose: () => void;
  onSubmit: (data: TripFormData) => Promise<void>;
};

export type ConfirmToItineraryDialogProps = {
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  title: string;
};

export type IconType = "activity" | "visit" | "eat" | "flight" | "hotel" | "transport" | "landmark" | "day-trip" | "shopping" | "experience" | "nature" | "entertainment" | "culture" | "nightlife";

export type ItineraryItem = {
  id: number;
  time: string;
  activity: string;
  location: string;
  notes: string;
  iconType: IconType;
  createdByUid?: string | null;
  createdAt?: string;
  sourceId?: string; // ⭐ NEW: Links to original Place ID (e.g., "place:123")
  googleMapsUrl?: string;
  transitStart?: string; 
  transitEnd?: string;
};

export type ItineraryDay = {
  day: number;
  date: string;
  items: ItineraryItem[];
};

export type HomePageProps = {
  trips: TripData[];
  loading: boolean;
  onSelectTrip: (trip: TripData) => void;
  onCreateTrip: (trip: TripFormData) => Promise<TripData>;
  onUpdateTrip: (tripId: number, data: TripFormData) => Promise<void>;
  onDeleteTrip: (tripId: number) => void;
  onRespondInvite: (trip: TripData, accept: boolean) => void; // ⭐ NEW PROP
  onOpenFriends: () => void;
};

export type TripCardProps = {
  trip: TripData;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void; // ⭐ Add this
  isInvited: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
};

export type TripViewProps = {
  trip: TripData;
  onBack: () => void;
};

export type TabId =
  | "itinerary"
  | "places"
  | "shopping"
  | "photos"
  | "scrapbook"
  | "admin"
  | "budget";
