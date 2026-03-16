// app/components/themes/theme-form.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ThemeStatus = 'ACTIVE' | 'INACTIVE';

export type ThemeFormData = {
  id: string;
  name: string;
  description: string | null;
  status: ThemeStatus;
  sortOrder: number;
};

interface ThemeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ThemeFormData | null;
}

export function ThemeForm({
  open,
  onOpenChange,
  initialData,
}: ThemeFormProps) {
  const fetcher = useFetcher();
  const isEditing = !!initialData;
  const isSubmitting = fetcher.state !== 'idle';

  const lastHandledData = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (
      fetcher.data &&
      fetcher.state === 'idle' &&
      fetcher.data !== lastHandledData.current
    ) {
      const fetcherData = fetcher.data as { success?: boolean; result?: { error?: Record<string, string[]> } };
      if (fetcherData.success) {
        lastHandledData.current = fetcher.data;
        toast.success(
          isEditing ? 'Theme updated successfully' : 'Theme created successfully'
        );
        onOpenChange(false);
      } else if (fetcherData.result?.error) {
        lastHandledData.current = fetcher.data;
      }
    }
  }, [fetcher.data, fetcher.state, isEditing, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Theme' : 'Create Theme'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the theme name, description, or status.'
              : 'Create a new theme to group related tickers.'}
          </DialogDescription>
        </DialogHeader>

        <fetcher.Form method="post" action="/resources/themes">
          <input
            type="hidden"
            name="intent"
            value={isEditing ? 'updateTheme' : 'createTheme'}
          />
          {isEditing && (
            <input type="hidden" name="id" value={initialData.id} />
          )}

          <div className="space-y-5 py-4">
            {/* Theme Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Theme Name *
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Oil, Blockchain, Weed"
                required
                className="h-10"
                defaultValue={initialData?.name ?? ''}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe what this theme is about..."
                rows={3}
                className="resize-none"
                defaultValue={initialData?.description ?? ''}
              />
            </div>

            {/* Status (only shown when editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status
                </Label>
                <Select name="status" defaultValue={initialData.status}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="INACTIVE">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-400" />
                        Inactive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort Order (only shown when editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="sortOrder" className="text-sm font-medium">
                  Sort Order
                </Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  className="h-10"
                  defaultValue={initialData.sortOrder}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Theme'
                  : 'Create Theme'}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
