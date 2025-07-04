import { createId as cuid } from '@paralleldrive/cuid2';
import { createCookieSessionStorage, redirect } from 'react-router';
import { z } from 'zod';
import { combineHeaders } from '#/utils/misc';

export const toastKey = 'toast';

const ToastSchema = z.object({
  description: z.string(),
  id: z.string().default(() => cuid()),
  title: z.string().optional(),
  type: z.enum(['message', 'success', 'error']).default('message'),
});

export type Toast = z.infer<typeof ToastSchema>;
export type ToastInput = z.input<typeof ToastSchema>;

// Make sure to set SESSION_SECRET in your .env file
// const SESSION_SECRET = process.env.SESSION_SECRET;
// if (!SESSION_SECRET) {
//   throw new Error('SESSION_SECRET must be set');
// }

export const toastSessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'en_toast',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET || 'default-secret'],
    secure: process.env.NODE_ENV === 'production',
  },
});

export async function redirectWithToast(
  url: string,
  toast: ToastInput,
  init?: ResponseInit
) {
  return redirect(url, {
    ...init,
    headers: combineHeaders(init?.headers, await createToastHeaders(toast)),
  });
}

export async function createToastHeaders(toastInput: ToastInput) {
  const session = await toastSessionStorage.getSession();
  const toast = ToastSchema.parse(toastInput);
  session.flash(toastKey, toast);
  const cookie = await toastSessionStorage.commitSession(session);
  return new Headers({ 'set-cookie': cookie });
}

export async function getToast(request: Request) {
  const session = await toastSessionStorage.getSession(
    request.headers.get('cookie')
  );
  const result = ToastSchema.safeParse(session.get(toastKey));
  const toast = result.success ? result.data : null;
  const headers = toast
    ? new Headers({
        'set-cookie': await toastSessionStorage.destroySession(session),
      })
    : null;
  return {
    toast,
    headers,
  };
}
