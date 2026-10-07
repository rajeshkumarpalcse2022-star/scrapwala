export default function ScrapRateCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-[#F5F6F8] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_16px_40px_-24px_rgba(16,24,40,0.25)]"
      aria-hidden="true"
    >
      <div className="px-5 pt-6 pb-1">
        <div className="mx-auto h-6 w-1/2 animate-pulse rounded-md bg-black/[0.06] motion-reduce:animate-none" />
      </div>

      <div className="flex h-44 items-center justify-center px-6 pb-3 sm:h-52">
        <div className="h-32 w-32 animate-pulse rounded-3xl bg-black/[0.05] motion-reduce:animate-none" />
      </div>

      <div className="mx-3 mb-3 h-12 animate-pulse rounded-2xl bg-[#E4E7EC] motion-reduce:animate-none" />
    </div>
  );
}
