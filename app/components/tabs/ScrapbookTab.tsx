import React, { useEffect, useState } from "react";
import { storage } from "../../../firebaseStore";
import { ScrapbookEntry, ScrapbookTabProps } from "../../types"; // Adjust this path if your types folder is somewhere else!

export default function ScrapbookTab({ tripId }: ScrapbookTabProps) {

  const [entries, setEntries] = useState<ScrapbookEntry[]>([]);


  useEffect(() => {
    loadEntries();
  }, [tripId]);

  const loadEntries = async () => {
    const result = await storage.list(`scrapbook:${tripId}:`);
    const loadedEntries: ScrapbookEntry[] = [];


    if (result && result.keys) {
      for (const key of result.keys) {
        const data = await storage.get(key);
        if (data && data.value) {
          loadedEntries.push(JSON.parse(data.value));
        }
      }
    }

    setEntries(
      loadedEntries.sort((a: ScrapbookEntry, b: ScrapbookEntry) => a.day - b.day)
    );

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
        entries.map((entry: ScrapbookEntry) => (

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