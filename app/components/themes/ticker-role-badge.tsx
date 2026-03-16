// app/components/themes/ticker-role-badge.tsx
import { Badge } from '#/components/ui/badge';
import { cn } from '#/lib/utils';
import { Crown, Users } from 'lucide-react';

type TickerRole = 'LEADER' | 'SYMPATHY';

const roleConfig: Record<
  TickerRole,
  { label: string; className: string; icon: typeof Crown }
> = {
  LEADER: {
    label: 'Leader',
    className:
      'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30',
    icon: Crown,
  },
  SYMPATHY: {
    label: 'Sympathy',
    className:
      'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400 dark:border-blue-500/30',
    icon: Users,
  },
};

export function TickerRoleBadge({ role }: { role: TickerRole }) {
  const config = roleConfig[role];
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
