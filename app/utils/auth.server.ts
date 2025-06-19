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

async function getSessionId(request: Request) {
  const cookie = request.headers.get('Cookie');
  const session = await getSession(cookie);
  const sessionId = session.get(sessionKey);
  if (!sessionId) return null;
  return sessionId;
}

/**
 * Returns the userId from the request session or throws a redirect
 * to the login page if the user is not authenticated.
 */
export async function requireUserId(request: Request): Promise<string> {
  const cookie = request.headers.get('Cookie');
  const session = await getSession(cookie);
  const sessionId = session.get(sessionKey);

  if (!sessionId) {
    throw redirect('/login');
  }

  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId, expirationDate: { gt: new Date() } },
    select: { userId: true },
  });

  if (!dbSession) {
    // The session is invalid or expired, destroy the cookie and redirect
    throw redirect('/login', {
      headers: {
        'Set-Cookie': await destroySession(session),
      },
    });
  }

  return dbSession.userId;
}

/**
 * Returns the user object from the request session or null if not logged in.
 */
export async function getUser(request: Request): Promise<User | null> {
  const userId = await requireUserId(request).catch(() => null);
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

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

  const session = await getSession();
  session.set(sessionKey, dbSession.id);

  return redirect('/home', {
    headers: {
      // Use the overridden commitSession from sessionStorage
      'Set-Cookie': await sessionStorage.commitSession(session, {
        expires: getSessionExpirationDate(),
      }),
    },
  });
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
    data: {
      email,
      username,
      name,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
    select: { id: true },
  });

  // Create a new session for the new user
  const dbSession = await prisma.session.create({
    data: {
      expirationDate: getSessionExpirationDate(),
      userId: user.id,
    },
    select: { id: true },
  });

  const session = await getSession();
  session.set(sessionKey, dbSession.id);

  return redirect('/home', {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        expires: getSessionExpirationDate(),
      }),
    },
  });
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
