// app/utils/verification.server.ts
import { createCookieSessionStorage } from 'react-router';

export const verifySessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'en_verification',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    maxAge: 10 * 60, // 10 minutes
    secrets: [process.env.SESSION_SECRET || 'default-secret'],
    secure: process.env.NODE_ENV === 'production',
  },
});
