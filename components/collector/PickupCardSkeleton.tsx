export default function PickupCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5">
      <div className="h-5 w-3/4 rounded bg-gray-200" />
      <div className="mt-3 h-4 w-1/2 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-200" />
        <div className="h-6 w-20 rounded-full bg-gray-200" />
      </div>
      <div className="mt-4 h-6 w-24 rounded bg-gray-200" />
    </div>
  );
}
