import { storage } from "../../firebaseStore";
import type { ItineraryDay } from "../types";

// Update the itinerary and its linked place together so a failed write cannot
// leave one saved without the other. Visiting/rating a place is independent.
export async function deleteItineraryActivity(tripId: number, date: string, activityId: number) {
  const dayKey = `itinerary:${tripId}:date:${date}`;
  const snapshot = await storage.get(dayKey);
  if (!snapshot?.value) return;
  const day: ItineraryDay = JSON.parse(snapshot.value);
  const removed = day.items?.find(item => item.id === activityId);
  if (!removed) return;
  const remainingItems = day.items.filter(item => item.id !== activityId);
  const updates: { key: string; value: Record<string, unknown> }[] = [
    { key: dayKey, value: { items: remainingItems } },
  ];

  if (removed.sourceId?.startsWith("place:")) {
    const sourceId = removed.sourceId;
    const placeId = sourceId.slice("place:".length);
    const [days, placeKeys] = await Promise.all([
      storage.getAll<ItineraryDay>(`itinerary:${tripId}:date:`),
      storage.list(`place:${tripId}:`),
    ]);
    const confirmed = remainingItems.some(item => item.sourceId === sourceId)
      || days.some(other => other.date !== date && other.items?.some(item => item.sourceId === sourceId));
    // Find the stored key instead of assuming a category; places can move categories.
    for (const key of placeKeys.keys.filter(key => key.endsWith(`:${placeId}`))) {
      updates.push({ key, value: { confirmed } });
    }
  }
  await storage.updateMany(updates);
}

export function confirmedPlaceSources(days: Pick<ItineraryDay, "items">[]): Set<string> {
  return new Set(days.flatMap(day => (day.items || [])
    .flatMap(item => item.sourceId?.startsWith("place:") ? [item.sourceId] : [])));
}
