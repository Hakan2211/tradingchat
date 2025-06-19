import { createCookieSessionStorage } from 'react-router';

// This is the key that will be used to store the session id in the cookie
export const sessionKey = 'sessionId';

// Define the session expiration time (e.g., 30 days)
export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30;
export const getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME);

// Renaming to sessionStorage to better reflect its purpose
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session-id', // Changed name to reflect it only holds the ID
    httpOnly: true,
    maxAge: SESSION_EXPIRATION_TIME / 1000, // maxAge in seconds
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'default-secret'],
    secure: process.env.NODE_ENV === 'production',
  },
});

// We have to do this because every time you commit the session you overwrite it
// so we store the expiration time in the cookie and reset it every time we commit
// This is the "sliding expiration" implementation
const {
  getSession,
  commitSession: originalCommitSession,
  destroySession,
} = sessionStorage;

// Override the commitSession to handle sliding expiration
sessionStorage.commitSession = async function commitSession(
  ...args: Parameters<typeof originalCommitSession>
) {
  const [session, options] = args;
  if (options?.expires) {
    session.set('expires', options.expires);
  }
  if (options?.maxAge) {
    session.set('expires', new Date(Date.now() + options.maxAge * 1000));
  }
  const expires = session.has('expires')
    ? new Date(session.get('expires'))
    : undefined;
  const setCookieHeader = await originalCommitSession(session, {
    ...options,
    expires,
  });
  return setCookieHeader;
};

// Re-export the methods for use in other files
export { getSession, destroySession };
