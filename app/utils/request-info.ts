import { invariantResponse } from './misc';
import { useRouteLoaderData } from 'react-router';
import { type loader as rootLoader } from '../root';

/**
 * @returns the request info from the root loader (throws an error if it does not exist)
 */
export function useRequestInfo() {
  const maybeRequestInfo = useOptionalRequestInfo();
  invariantResponse(maybeRequestInfo, 'No requestInfo found in root loader');

  return maybeRequestInfo;
}

export function useOptionalRequestInfo() {
  const data = useRouteLoaderData<typeof rootLoader>('root');

  return data?.requestInfo;
}
