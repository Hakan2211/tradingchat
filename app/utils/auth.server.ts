// app/utils/auth.server.ts

import { redirect } from 'react-router';
import type { User } from '#/types/userTypes';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isUserAuthorized } from '#/utils/permission.server';

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
      password: { select: { hash: true } },
      roles: { select: { name: true } },
      subscription: { select: { status: true, currentPeriodEnd: true } },
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

  if (!isUserAuthorized(userWithPassword)) {
    return {
      error:
        'No active subscription found. Please complete the sign-up process.',
    };
  }

  // if (userWithPassword.subscription?.status !== 'active') {
  //   return {
  //     error:
  //       'No active subscription found. Please complete the sign-up process.',
  //   };
  // }

  const dbSession = await createFreshSession(userWithPassword.id);
  return { dbSession };
}

export async function createFreshSession(userId: string) {
  // A Prisma transaction ensures both operations complete or neither do.
  return prisma.$transaction(async ($prisma) => {
    // 1. Delete all previous sessions for this user.
    await $prisma.session.deleteMany({
      where: { userId },
    });

    // 2. Create a single new session.
    const dbSession = await $prisma.session.create({
      data: {
        userId,
        expirationDate: getSessionExpirationDate(),
      },
      select: { id: true },
    });

    return dbSession;
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
  const lowercaseUsername = username?.toLowerCase();
  const lowercaseEmail = email.toLowerCase();

  // --- CONFLICT CHECKS (BEFORE ANY WRITES) ---

  // Check 1: Is this username already in use by anyone?
  // This is the check that was failing to stop the execution flow.
  if (lowercaseUsername) {
    const userWithUsername = await prisma.user.findUnique({
      where: { username: lowercaseUsername },
    });
    if (userWithUsername) {
      // If a user is found, STOP and return the client-side error.
      return { error: 'This username is already taken.', field: 'username' };
    }
  }

  // Check 2: Is this email already in use?
  const userWithEmail = await prisma.user.findUnique({
    where: { email: lowercaseEmail },
    select: { id: true, email: true, subscription: { select: { id: true } } },
  });

  // If the email is being used...
  if (userWithEmail) {
    // Case A: The user is an active subscriber. Hard stop.
    if (userWithEmail.subscription) {
      return {
        error: 'A user with this email already has an active subscription.',
        field: 'email',
      };
    } else {
      // Case B: The user is a "limbo" user. Let's get them to checkout.
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await prisma.user.update({
        where: { id: userWithEmail.id },
        select: { id: true, email: true },
        data: {
          name,
          username: lowercaseUsername,
          password: {
            update: {
              hash: hashedPassword,
            },
          },
        },
      });
      return { user: updatedUser };
    }
  }

  // --- CREATE NEW USER ---
  // This block is now UNREACHABLE if there is any username or email conflict.

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    select: { id: true, email: true },
    data: {
      email: lowercaseEmail,
      username: lowercaseUsername,
      name,
      roles: { connect: { name: 'user' } },
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
  return { user };
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
