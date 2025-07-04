import { cn } from '#/lib/utils';
import { Badge } from '../ui/badge';
import { UserStatus } from '@prisma/client';

export const PresenceIndicator = ({
  isOnline,
  status,
}: {
  isOnline: boolean;
  status: UserStatus;
}) => {
  const statusColor = {
    ONLINE: 'bg-green-600',
    AWAY: 'bg-yellow-600',
    DO_NOT_DISTURB: 'bg-red-600',
  };
  return (
    <Badge
      className={cn(
        // Base styles for the dot
        'absolute bottom-0 right-0 p-0 h-3 w-3 rounded-full border-2 border-sidebar-border',
        // Conditional background color
        isOnline ? statusColor[status] : 'bg-slate-300 border-sidebar'
      )}
    />
  );
};
