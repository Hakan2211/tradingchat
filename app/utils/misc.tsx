import { useFormAction, useNavigation } from 'react-router';

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

export function getUserImagePath(imageId: string) {
  return `/resources/images/${imageId}`;
}
