import { cn } from '#/lib/utils';
import { Badge } from '../ui/badge';

export const PresenceIndicator = ({ isOnline }: { isOnline: boolean }) => {
  return (
    <Badge
      className={cn(
        // Base styles for the dot
        'absolute bottom-0 right-0 p-0 h-3 w-3 rounded-full border-2 border-background',
        // Conditional background color
        isOnline ? 'bg-green-600' : 'bg-slate-300'
      )}
    />
  );
};
