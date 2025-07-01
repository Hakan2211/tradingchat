import { Skeleton } from '#/components/ui/skeleton';

export function DeletedMessage() {
  return (
    <div className="flex flex-col gap-1">
      {/* Header part with skeleton avatar and name */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg aspect-square" />
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Body part with the deleted message text */}
      <div className="pl-11">
        <div className="rounded-lg bg-muted/50 px-3 py-2 w-fit">
          <p className="text-sm italic text-muted-foreground">
            Image was deleted
          </p>
        </div>
      </div>
    </div>
  );
}
