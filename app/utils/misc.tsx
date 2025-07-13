import { useFormAction, useNavigation, useResolvedPath } from 'react-router';

/**
 * Does its best to get a string error message from an unknown error.
 */
export function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  console.error('Unable to get error message for error', error);
  return 'Unknown Error';
}

/**
 * Provide a condition and if that condition is falsey, this throws a 400
 * Response with the given message.
 *
 * inspired by invariant from 'tiny-invariant'
 *
 * @example
 * invariantResponse(typeof value === 'string', `value must be a string`)
 *
 * @param condition The condition to check
 * @param message The message to throw
 * @param responseInit Additional response init options if a response is thrown
 *
 * @throws {Response} if condition is falsey
 */
export function invariantResponse(
  condition: any,
  message?: string | (() => string),
  responseInit?: ResponseInit
): asserts condition {
  if (!condition) {
    throw new Response(
      typeof message === 'function'
        ? message()
        : message ||
          'An invariant failed, please provide a message to explain why.',
      { status: 400, ...responseInit }
    );
  }
}

// Example usage
// invariantResponse(user, 'User not found', { status: 404 });

/**
 * Returns true if the current navigation is submitting the current route's
 * form. Defaults to the current route's form action and method POST.
 */
export function useIsSubmitting({
  formAction,
  formMethod = 'POST',
}: {
  formAction?: string;
  formMethod?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
} = {}) {
  const contextualFormAction = useFormAction();
  const navigation = useNavigation();
  return (
    navigation.state === 'submitting' &&
    navigation.formAction === (formAction ?? contextualFormAction) &&
    navigation.formMethod === formMethod
  );
}

/**
 * Returns true if the app is currently navigating to a specific GET route.
 * This is useful for showing loading states on links.
 * @param path The destination path to check for (e.g., '/resources/create-customer-portal')
 */
export function useIsLoading({ path }: { path: string }) {
  const navigation = useNavigation();
  const resolvedPath = useResolvedPath(path);

  const isLoading =
    navigation.state === 'loading' &&
    navigation.location.pathname === resolvedPath.pathname;

  return isLoading;
}

export function getUserImagePath(imageId: string) {
  return `/resources/images/${imageId}`;
}

export function getChatImagePath(imageId: string) {
  return `/resources/chat-images/${imageId}`;
}

export function getDomainUrl(request: Request) {
  const host =
    request.headers.get('X-Forwarded-Host') ??
    request.headers.get('host') ??
    new URL(request.url).host;
  const protocol = request.headers.get('X-Forwarded-Proto') ?? 'http';
  return `${protocol}://${host}`;
}

/**
 * Combine multiple header objects into one (uses append so headers are not overridden)
 */
export function combineHeaders(
  ...headers: Array<ResponseInit['headers'] | null | undefined>
) {
  const combined = new Headers();
  for (const header of headers) {
    if (!header) continue;
    for (const [key, value] of new Headers(header).entries()) {
      combined.append(key, value);
    }
  }
  return combined;
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const formatPrice = (amount: number, interval: string) => {
  return `$${amount / 100} / ${interval}`;
};

/**
 * Extract price info from Polar API price object
 * Handles the actual field names from the Polar API
 */
export function extractPriceInfo(price: any) {
  if (!price) return null;

  // Use the actual field names from Polar API
  const amount =
    price.priceAmount || price.price_amount || price.amount || price.centAmount;
  const currency =
    price.priceCurrency || price.price_currency || price.currency || 'USD';
  const interval =
    price.recurringInterval ||
    price.recurring_interval ||
    price.interval ||
    'month';

  return { amount, currency, interval };
}
