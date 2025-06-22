import { data } from 'react-router';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import {
  type PermissionString,
  parsePermissionString,
} from '#/utils/userPermissionRole';

export async function requireUserWithPermission(
  request: Request,
  permission: PermissionString
) {
  const userId = await requireUserId(request);
  const permissionData = parsePermissionString(permission);
  const user = await prisma.user.findFirst({
    select: { id: true },
    where: {
      id: userId,
      roles: {
        some: {
          permissions: {
            some: {
              ...permissionData,
              access: permissionData.access
                ? { in: permissionData.access }
                : undefined,
            },
          },
        },
      },
    },
  });
  if (!user) {
    throw data(
      {
        error: 'Unauthorized',
        requiredPermission: permissionData,
        message: `Unauthorized: required permissions: ${permission}`,
      },
      { status: 403 }
    );
  }
  return user.id;
}

export async function requireUserWithRole(request: Request, name: string) {
  const userId = await requireUserId(request);
  const user = await prisma.user.findFirst({
    select: { id: true },
    where: { id: userId, roles: { some: { name } } },
  });
  if (!user) {
    throw data(
      {
        error: 'Unauthorized',
        requiredRole: name,
        message: `Unauthorized: required role: ${name}`,
      },
      { status: 403 }
    );
  }
  return user.id;
}

/**
 * Checks if a user has permission for an action, including ownership.
 * Throws a 403 Forbidden error if not authorized.
 * @returns The user's ID if authorized.
 */
export async function requirePermission(
  request: Request,
  permission: 'update:user' | 'delete:user', // etc.
  ownerId?: string
) {
  const userId = await requireUserId(request);
  const [action, entity] = permission.split(':');

  // First, check if the user has 'any' access (the admin case)
  const hasAnyPermission = await prisma.user.findFirst({
    where: {
      id: userId,
      roles: {
        some: { permissions: { some: { action, entity, access: 'any' } } },
      },
    },
  });

  if (hasAnyPermission) {
    return userId; // Admin is authorized, let them proceed.
  }

  // If they're not an admin, check if they have 'own' access AND they are the owner
  if (ownerId) {
    const isOwner = userId === ownerId;
    if (isOwner) {
      const hasOwnPermission = await prisma.user.findFirst({
        where: {
          id: userId,
          roles: {
            some: { permissions: { some: { action, entity, access: 'own' } } },
          },
        },
      });
      if (hasOwnPermission) {
        return userId; // User is the owner and has 'own' permission, let them proceed.
      }
    }
  }

  // If neither of the above conditions were met, they are not authorized.
  throw data(
    {
      error: 'Forbidden',
      message: `Unauthorized: You do not have permission to ${action} this ${entity}.`,
    },
    { status: 403 }
  );
}
