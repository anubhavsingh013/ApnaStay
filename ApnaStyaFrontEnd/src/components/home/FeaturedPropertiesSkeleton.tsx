/**
 * Skeleton grid shown while featured properties are fetched — clearer than a lone spinner.
 */
export function FeaturedPropertiesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" aria-busy aria-label="Loading featured properties">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm"
        >
          <div className="aspect-[4/3] bg-muted animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded-md w-3/4 animate-pulse" />
            <div className="h-3 bg-muted/80 rounded-md w-1/2 animate-pulse" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 bg-muted rounded-md w-16 animate-pulse" />
              <div className="h-6 bg-muted rounded-md w-20 animate-pulse" />
            </div>
            <div className="h-9 bg-muted/70 rounded-lg w-full animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
