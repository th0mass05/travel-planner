import { useState } from "react";
import { 
  PlaceType, ConfirmToItineraryDialogProps 
} from "../../types"; 
import { getAvailableLocations } from "../../helpers/helpers";

export default function ConfirmToItineraryDialog({
  onClose,
  onConfirm,
  title,
}: ConfirmToItineraryDialogProps) {

  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h3 className="text-xl font-serif mb-4">Confirm "{title}"</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Time</label>
            <input
              type="time"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer"
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