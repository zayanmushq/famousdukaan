import { Suspense } from "react";
import TrackClient from "./TrackClient";

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16 text-neutral-500">Loading tracker...</div>}>
      <TrackClient />
    </Suspense>
  );
}
