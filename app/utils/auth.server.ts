// app/utils/auth.server.ts

import { redirect } from 'react-router';
import type { User } from '#/types/userTypes';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) {
    return { error: 'User with that email or username already exists' };
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
