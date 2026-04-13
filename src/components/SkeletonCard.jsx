export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 animate-pulse">
      <div className="aspect-square bg-secondary" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-secondary rounded-full w-16" />
        <div className="h-4 bg-secondary rounded-full w-3/4" />
        <div className="flex gap-2">
          <div className="h-4 bg-secondary rounded-full w-12" />
          <div className="h-4 bg-secondary rounded-full w-12" />
        </div>
        <div className="flex justify-between">
          <div className="h-5 bg-secondary rounded-full w-16" />
          <div className="h-4 bg-secondary rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}