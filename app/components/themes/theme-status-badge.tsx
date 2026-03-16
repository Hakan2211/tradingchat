// app/components/themes/theme-status-badge.tsx
import { Badge } from '#/components/ui/badge';
import { cn } from '#/lib/utils';
import { Circle, CircleOff } from 'lucide-react';

type ThemeStatus = 'ACTIVE' | 'INACTIVE';

const statusConfig: Record<
  ThemeStatus,
  { label: string; className: string; icon: typeof Circle }
> = {
  ACTIVE: {
    label: 'Active',
    className:
      'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30',
    icon: Circle,
  },
  INACTIVE: {
    label: 'Inactive',
    className:
      'bg-zinc-500/15 text-zinc-600 border-zinc-500/30 dark:text-zinc-400 dark:border-zinc-500/30',
    icon: CircleOff,
  },
};

export function ThemeStatusBadge({ status }: { status: ThemeStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium text-xs', config.className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
