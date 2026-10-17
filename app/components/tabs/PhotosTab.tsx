import { auth } from "../../../firebase";  
import React, { useState, useEffect} from "react";
import {
  PhotoDialog
} from "../../components/dialogs" ; 
import { 
  PhotoData, PhotosTabProps
} from "../../types"; 
import { uploadDualImages } from "../../helpers/helpers";
import {
  Plus, Calendar, MapPin, Camera, Download
} from "lucide-react";
import { storage } from "../../../firebaseStore";
import TripAuthorInfo from "../../helpers/TripAuthorInfo";
export default function PhotosTab({ tripId }: PhotosTabProps) {
  type PhotoItem = PhotoData & {
    id: number;
    createdByUid?: string | null;
    createdAt?: string;
    originalUrl?: string;
  };
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = storage.subscribeToList(
      `photo:${tripId}:`, 
      (newPhotos) => {
        setPhotos(newPhotos.sort((a: PhotoItem, b: PhotoItem) => b.id - a.id));
      }
    );

    return () => unsubscribe();
  }, [tripId]);

  

  const addPhoto = async (photoData: PhotoData, file: File) => {
    // 1. Upload both versions to Cloud Storage
    const { thumbnailUrl, originalUrl } = await uploadDualImages(file, tripId.toString());

    // 2. Save the URLs to your database
    const photo: PhotoItem = {
      ...photoData,
      url: thumbnailUrl,       // Feed loads the fast thumbnail
      originalUrl: originalUrl, // Kept safely for downloads
      id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
    };

    await storage.set(`photo:${tripId}:${photo.id}`, photo);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-serif text-stone-900">Photo Gallery</h2>
          <p className="text-stone-500 mt-3">The places, people and moments from your journey.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          <Plus size={16} />
          Add Photo
        </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-2xl px-6 py-16 sm:py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-5 mx-auto">
            <Camera size={24} className="text-rose-500" />
          </div>
          <h3 className="text-2xl font-serif text-stone-900 mb-2">
            Every journey has a story
          </h3>
          <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">
            Add your first photo and keep your favourite moments together.
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 text-sm font-bold shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            <Plus size={16} />
            Upload First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo: PhotoItem) => (
            <div
              key={photo.id}
              className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col min-w-0"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                <img
                  src={photo.url} // Renders the fast 80% quality thumbnail
                  alt={photo.caption || (photo.location ? `Trip photo in ${photo.location}` : "Trip memory")}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
              </div>

              <div className="p-5 flex flex-col flex-grow">
                <p className="font-serif text-xl leading-snug text-stone-900 mb-2 break-words">
                  {photo.caption || "A moment to remember"}
                </p>
                <div className="mb-4">
                  <TripAuthorInfo uid={photo.createdByUid} createdAt={photo.createdAt} className="flex-wrap !text-stone-400" />
                </div>

                {/* Add a flex container to push the download button to the right */}
                <div className="mt-auto pt-4 border-t border-stone-100 flex items-end justify-between gap-3 text-xs text-stone-500">
                  <div className="space-y-2 min-w-0">
                    {photo.date && <div className="flex items-center gap-2">
                      <Calendar size={14} className="shrink-0 text-stone-400" />
                      <span>{photo.date}</span>
                    </div>}
                    {photo.location && <div className="flex items-start gap-2">
                      <MapPin size={14} className="shrink-0 text-rose-400" />
                      <span className="break-words">{photo.location}</span>
                    </div>}
                  </div>

                  {/* DOWNLOAD BUTTON */}
                  {photo.originalUrl && (
                    <a
                      href={photo.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="p-2.5 shrink-0 bg-stone-50 border border-stone-200 text-stone-500 hover:bg-stone-900 hover:border-stone-900 hover:text-white rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                      title="Download High-Res Original"
                      aria-label={`Download original photo: ${photo.caption || "Trip memory"}`}
                    >
                      <Download size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <PhotoDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(data, file) => { 
            addPhoto(data, file);
            setShowAddDialog(false);
          }}
        />
      )}
    </div>
  );

}
