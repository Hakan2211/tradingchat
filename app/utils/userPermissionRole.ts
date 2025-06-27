import { useRouteLoaderData } from 'react-router';

// Define the user type based on the root loader structure
type User = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: { id: string; updatedAt: Date } | null;
  roles: {
    name: string;
    permissions: {
      action: string;
      entity: string;
      access: string;
    }[];
  }[];
};

// Define the root loader data type
type RootLoaderData = {
  honeyProps: any;
  ENV: any;
  csrfToken: string;
  user: User | null;
};

function isUser(user: any): user is User {
  return user && typeof user === 'object' && typeof user.id === 'string';
}

export function useOptionalUser() {
  const data = useRouteLoaderData('root') as RootLoaderData | null;
  if (!data || !isUser(data.user)) {
    return undefined;
  }
  return data.user;
}

export function useUser() {
  const maybeUser = useOptionalUser();
  if (!maybeUser) {
    throw new Error(
      'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.'
    );
  }
  return maybeUser;
}

type Action = 'create' | 'read' | 'update' | 'delete';
type Entity = 'user' | 'note' | 'message';
type Access = 'own' | 'any' | 'own,any' | 'any,own';
export type PermissionString =
  | `${Action}:${Entity}`
  | `${Action}:${Entity}:${Access}`;

export function parsePermissionString(permissionString: PermissionString) {
  const [action, entity, access] = permissionString.split(':') as [
    Action,
    Entity,
    Access | undefined
  ];
  return {
    action,
    entity,
    access: access ? (access.split(',') as Array<Access>) : undefined,
  };
}

export function userHasPermission(
  user: Pick<User, 'roles'> | null | undefined,
  permission: PermissionString
) {
  if (!user) return false;
  const { action, entity, access } = parsePermissionString(permission);
  return user.roles.some(
    (role: {
      name: string;
      permissions: { action: string; entity: string; access: string }[];
    }) =>
      role.permissions.some(
        (permission: { action: string; entity: string; access: string }) =>
          permission.entity === entity &&
          permission.action === action &&
          (!access || access.includes(permission.access as Access))
      )
  );
}

export function userHasRole(user: Pick<User, 'roles'> | null, role: string) {
  if (!user) return false;
  return user.roles.some((r: { name: string }) => r.name === role);
}
