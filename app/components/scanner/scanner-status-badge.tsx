// app/components/scanner/scanner-status-badge.tsx
import { Badge } from '#/components/ui/badge';
import { cn } from '#/lib/utils';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

type ScannerStatus = 'WATCHING' | 'PLAYED_OUT' | 'DIDNT_PLAY_OUT';

const statusConfig: Record<
  ScannerStatus,
  { label: string; className: string; icon: typeof Eye }
> = {
  WATCHING: {
    label: 'Watching',
    className:
      'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30',
    icon: Eye,
  },
  PLAYED_OUT: {
    label: 'Played Out',
    className:
      'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30',
    icon: CheckCircle,
  },
  DIDNT_PLAY_OUT: {
    label: "Didn't Play Out",
    className:
      'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400 dark:border-red-500/30',
    icon: XCircle,
  },
};

export function ScannerStatusBadge({ status }: { status: ScannerStatus }) {
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

export function getStatusLabel(status: ScannerStatus) {
  return statusConfig[status].label;
}
