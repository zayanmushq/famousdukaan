export default function RatingSummary({
  rating,
  count,
  className = "text-sm text-neutral-500",
}: {
  rating: number;
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  const display = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  return (
    <div className={className}>
      ★ {display} · {count} {count === 1 ? "review" : "reviews"}
    </div>
  );
}
