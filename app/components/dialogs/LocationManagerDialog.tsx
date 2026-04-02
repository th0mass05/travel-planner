import { useState } from "react";
import { TripData, TripSegment } from "../../types"; 

export default function LocationManagerDialog({
  trip,
  onClose,
  onSave,
}: {
  trip: TripData;
  onClose: () => void;
  onSave: (segments: TripSegment[]) => void;
}) {
  const [segments, setSegments] = useState<TripSegment[]>(trip.segments || []);
  const [newLoc, setNewLoc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [color, setColor] = useState("bg-blue-100");

  const colors = [
    { label: "Blue", val: "bg-blue-100 text-blue-800 border-blue-200" },
    { label: "Rose", val: "bg-rose-100 text-rose-800 border-rose-200" },
    { label: "Green", val: "bg-green-100 text-green-800 border-green-200" },
    { label: "Amber", val: "bg-amber-100 text-amber-800 border-amber-200" },
    { label: "Purple", val: "bg-purple-100 text-purple-800 border-purple-200" },
  ];

  const add = () => {
    if (!newLoc || !start || !end) return;
    setSegments([
      ...segments,
      { id: Date.now().toString(), location: newLoc, startDate: start, endDate: end, color },
    ]);
    setNewLoc("");
    setStart("");
    setEnd("");
  };

  const remove = (id: string) => {
    setSegments(segments.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-2xl font-serif mb-4">Manage Trip Locations</h3>
        
        {/* Existing Segments */}
        <div className="space-y-2 mb-6">
          {segments.map((s) => (
            <div key={s.id} className={`flex justify-between items-center p-3 rounded border ${s.color}`}>
              <div>
                <span className="font-bold">{s.location}</span>
                <span className="text-sm ml-2 opacity-80">{s.startDate} → {s.endDate}</span>
              </div>
              <button onClick={() => remove(s.id)} className="text-sm font-bold hover:underline">
                Remove
              </button>
            </div>
          ))}
          {segments.length === 0 && <p className="text-gray-500 italic">No locations defined yet.</p>}
        </div>

        {/* Add New */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Add New Segment</h4>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="Location (e.g., Tokyo)"
            value={newLoc}
            onChange={(e) => setNewLoc(e.target.value)}
          />
          <div className="flex gap-2">
            <input type="date" className="border rounded px-2 py-1 w-1/2" value={start} onChange={(e) => setStart(e.target.value)} />
            <input type="date" className="border rounded px-2 py-1 w-1/2" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c.val}
                onClick={() => setColor(c.val)}
                className={`w-6 h-6 rounded-full border-2 ${c.val.split(" ")[0]} ${color === c.val ? "border-black" : "border-transparent"}`}
              />
            ))}
          </div>
          <button onClick={add} className="w-full bg-gray-900 text-white py-2 rounded">Add Segment</button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={() => onSave(segments)} className="px-4 py-2 bg-gray-900 text-white rounded">Save Changes</button>
        </div>
      </div>
    </div>
  );
}