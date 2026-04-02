import { auth } from "../../../firebase";   // adjust path if needed
import React, { useState, useEffect} from "react";
import {
  PhotoDialog
} from "../../components/dialogs" ; // Adjust this path if your dialogs are in a different folder
import { 
  PhotoData, PhotosTabProps
} from "../../types"; // <-- Adjust this path if your types folder is somewhere else!
import { 
  deleteKey,
} from "../../helpers/helpers"; // Adjust this path to match your folder structure
 // Adjust this path to match your folder structure
import {
  Plus, Calendar, MapPin, Camera
} from "lucide-react";
import { storage } from "../../../firebaseStore";
import TripAuthorInfo from "../../helpers/TripAuthorInfo";
export default function PhotosTab({ tripId }: PhotosTabProps) {
  type PhotoItem = PhotoData & {
    id: number;
    createdByUid?: string | null;
    createdAt?: string;
  };
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = storage.subscribeToList(
      `photo:${tripId}:`, 
      (newPhotos) => {
        setPhotos(newPhotos.sort((a: any, b: any) => b.id - a.id));
      }
    );

    return () => unsubscribe();
  }, [tripId]);

  

  const addPhoto = async (photoData: PhotoData) => {
      const photo: PhotoItem = {
    ...photoData,
    id: Date.now(),
      createdByUid: auth.currentUser?.uid || null,
      createdAt: new Date().toISOString(),
  };

    await storage.set(`photo:${tripId}:${photo.id}`, photo);
    
  };

  const deletePhoto = async (photoId: number) => {

    await deleteKey(`photo:${tripId}:${photoId}`);
    
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
          {photos.map((photo: PhotoItem) => (

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
                <div className="mb-2">
                  <TripAuthorInfo uid={photo.createdByUid} createdAt={photo.createdAt} />
                </div>

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