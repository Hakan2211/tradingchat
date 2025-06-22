import {
  Link,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import { Mail } from 'lucide-react';
import type { loader } from './user';
import { GeneralErrorBoundary } from '#/components/errorBoundary/errorBoundary';
import { getUserImagePath } from '#/utils/misc';
import { useUser, userHasPermission } from '#/utils/userPermissionRole';

export default function UserIndexView() {
  const loggedInUser = useUser();

  const { user } = useRouteLoaderData('routes/user/user') as Awaited<
    ReturnType<typeof loader>
  >;

  const canUpdateAny = userHasPermission(loggedInUser, 'update:user:any');
  const canUpdateOwn = userHasPermission(loggedInUser, 'update:user:own');

  const canEdit = canUpdateAny || (canUpdateOwn && loggedInUser.id === user.id);

  const getInitials = (name: string): string => {
    const words = name
      .trim()
      .split(/\s+/) // split on any whitespace
      .filter(Boolean); // remove empty strings

    if (words.length === 0) {
      return ''; // no name given
    }

    if (words.length === 1) {
      // Single word: take its first two characters
      return words[0].slice(0, 2).toUpperCase();
    }

    // Multiple words: take the first letter of the first two words
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });

  return (
    <>
      <div className="px-8 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>

          {canEdit && (
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link to="edit">Edit Profile</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="p-8">
        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 flex flex-col items-center">
            <Avatar className="w-40 h-40 rounded-full ring-4 ring-gray-100 overflow-hidden">
              <AvatarImage
                src={user?.image ? getUserImagePath(user.image.id) : ''}
                alt={user?.name ?? ''}
              />
              <AvatarFallback className="text-2xl ...">
                {getInitials(user?.name ?? '')}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {user?.name ?? 'Unknown User'}
              </h2>
              <Badge variant="secondary" className="...">
                {user?.username ? `@${user.username}` : 'No username'}
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5" />
                <span className="text-lg">{user?.email}</span>
              </div>
              {user?.bio ? (
                <p className="text-gray-700">{user.bio}</p>
              ) : (
                <p className="text-gray-700">No bio available</p>
              )}
            </div>
            <div className="space-y-4">
              {user?.createdAt ? (
                <p className="text-gray-700">
                  Joined: {formatDate(user.createdAt)}
                </p>
              ) : (
                <p className="text-gray-700">No join date available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
