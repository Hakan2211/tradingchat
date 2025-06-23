// app/utils/auth.server.ts

import { redirect } from 'react-router';
import type { User } from '#/types/userTypes';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import {
  getSession,
  destroySession,
  sessionStorage,
  sessionKey,
  getSessionExpirationDate,
} from '#/utils/session.server';

const prisma = new PrismaClient();

export async function getUserId(request: Request) {
  const authSession = await sessionStorage.getSession(
    request.headers.get('cookie')
  );
  const sessionId = authSession.get(sessionKey);
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    select: { userId: true },
    where: { id: sessionId, expirationDate: { gt: new Date() } },
  });
  if (!session?.userId) {
    throw redirect('/', {
      headers: {
        'set-cookie': await sessionStorage.destroySession(authSession),
      },
    });
  }
  return session.userId;
}

export async function requireAnonymous(request: Request) {
  const userId = await getUserId(request);
  if (userId) {
    throw redirect('/home');
  }
}

/**
 * Returns the userId from the request session or throws a redirect
 * to the login page if the user is not authenticated.
 */
export async function requireUserId(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {}
) {
  const userId = await getUserId(request);
  if (!userId) {
    const requestUrl = new URL(request.url);
    redirectTo =
      redirectTo === null
        ? null
        : redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`;
    const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null;
    const loginRedirect = ['/login', loginParams?.toString()]
      .filter(Boolean)
      .join('?');
    throw redirect(loginRedirect);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
    },
  });
  if (!user) {
    throw await logout(request);
  }
  return user;
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      // Select the nested password hash
      password: { select: { hash: true } },
    },
  });

  // Check if the user or their password exists
  if (!userWithPassword || !userWithPassword.password) {
    return { error: 'Invalid email or password' };
  }

  const isValidPassword = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValidPassword) {
    return { error: 'Invalid email or password' };
  }

  // Create a new session in the database
  const dbSession = await prisma.session.create({
    data: {
      expirationDate: getSessionExpirationDate(),
      userId: userWithPassword.id,
    },
    select: { id: true },
  });
  // const session = await getSession();
  // session.set(sessionKey, dbSession.id);
  return { dbSession };
}

export async function signup({
  email,
  password,
  name,
  username,
}: {
  email: string;
  password: string;
  name: string;
  username?: string;
}) {
  // 1. Check for the email specifically.
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUserByEmail) {
    // Return a structured error for the email
    return { error: 'A user with this email already exists.', field: 'email' };
  }

  // 2. Check for the username specifically.
  if (username) {
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUserByUsername) {
      // Return a structured error for the username
      return { error: 'This username is already taken.', field: 'username' };
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    select: { id: true },
    data: {
      email: email.toLowerCase(),
      username: username?.toLowerCase(),
      name,
      roles: { connect: { name: 'user' } },
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });

  // Create a new session for the new user
  const dbSession = await prisma.session.create({
    data: {
      expirationDate: getSessionExpirationDate(),
      userId: user.id,
    },
    select: { id: true },
  });
  // const session = await getSession();
  // session.set(sessionKey, dbSession.id);
  return { dbSession };
}

export async function resetUserPassword({
  email,
  password,
}: {
  email: User['email'];
  password: string;
}) {
  const hashedPassword = await getPasswordHash(password);
  return prisma.user.update({
    where: { email: email ?? undefined },
    data: {
      password: {
        update: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function verifyUserPassword(
  where: { username: string } | { id: string },
  password: string
) {
  const userWithPassword = await prisma.user.findUnique({
    where,
    select: { id: true, password: { select: { hash: true } } },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  return { id: userWithPassword.id };
}

export async function getPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

export async function logout(request: Request) {
  const cookie = request.headers.get('Cookie');
  const session = await getSession(cookie);
  const sessionId = session.get(sessionKey);

  // If there's a session ID in the cookie, try to delete it from the DB
  if (sessionId) {
    // We use .catch() because we don't want to block the user from
    // logging out if the DB call fails for some reason (e.g., session already deleted).
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }

  // Always destroy the cookie and redirect
  return redirect('/', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
}

export function getPasswordHashParts(password: string) {
  const hash = crypto
    .createHash('sha1')
    .update(password, 'utf8')
    .digest('hex')
    .toUpperCase();
  return [hash.slice(0, 5), hash.slice(5)] as const;
}

export async function checkIsCommonPassword(password: string) {
  const [prefix, suffix] = getPasswordHashParts(password);

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { signal: AbortSignal.timeout(1000) }
    );

    if (!response.ok) return false;

    const data = await response.text();
    return data.split(/\r?\n/).some((line) => {
      const [hashSuffix, ignoredPrevalenceCount] = line.split(':');
      return hashSuffix === suffix;
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.warn('Password check timed out');
      return false;
    }

    console.warn('Unknown error during password check', error);
    return false;
  }
}
