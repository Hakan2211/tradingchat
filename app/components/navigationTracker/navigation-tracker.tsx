import { useLocation } from 'react-router';
import { useEffect } from 'react';
import { trackPath } from '#/utils/client-history';

/**
 * This component has no UI. It just listens for route changes
 * and records them to our session history.
 */
export function NavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPath(location.pathname + location.search);
  }, [location]);

  return null; // This component renders nothing.
}
