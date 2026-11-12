"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, rating, comment }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not submit review");
        return;
      }
      setComment("");
      router.refresh();
    } catch {
      setError("Could not submit review");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 max-w-xl border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
      <h2 className="text-lg font-medium mb-3">Write a review</h2>
      <label className="block text-sm text-neutral-600 mb-2" htmlFor="review-rating">
        Rating
      </label>
      <select
        id="review-rating"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="mb-4 px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white dark:bg-neutral-900"
      >
        {[5, 4, 3, 2, 1].map((value) => (
          <option key={value} value={value}>
            {value} star{value === 1 ? "" : "s"}
          </option>
        ))}
      </select>
      <label className="block text-sm text-neutral-600 mb-2" htmlFor="review-comment">
        Comment (optional)
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={4}
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white dark:bg-neutral-900"
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 px-6 py-2 text-sm font-medium bg-neutral-900 text-white rounded-full disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
