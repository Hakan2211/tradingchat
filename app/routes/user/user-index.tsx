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
import { getInitials, getUserImagePath } from '#/utils/misc';
import { useUser, userHasPermission } from '#/utils/userPermissionRole';
import { RedirectBackButton } from '#/components/navigationTracker/redirect-back-button';

export default function UserIndexView() {
  const loggedInUser = useUser();

  const { user } = useRouteLoaderData('routes/user/user') as Awaited<
    ReturnType<typeof loader>
  >;

  const canUpdateAny = userHasPermission(loggedInUser, 'update:user:any');
  const canUpdateOwn = userHasPermission(loggedInUser, 'update:user:own');

  const canEdit = canUpdateAny || (canUpdateOwn && loggedInUser.id === user.id);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });

  return (
    <>
      {/* Header - Fixed at top */}
      <header className="flex-shrink-0 border-b border-border/60 p-4 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            {user?.name ?? 'Unknown User'}'s Profile
          </h1>
          {canEdit && (
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link to="edit">Edit Profile</Link>
            </Button>
          )}
        </div>
        <RedirectBackButton className="mt-4" fallback="/home" />
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2 flex flex-col items-center">
              <Avatar className="w-40 h-40 rounded-full ring-4 ring-border overflow-hidden">
                <AvatarImage
                  src={user?.image ? getUserImagePath(user.image.id) : ''}
                  alt={user?.name ?? ''}
                />
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                  {getInitials(user?.name ?? '')}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {user?.name ?? 'Unknown User'}
                </h2>
                <Badge variant="secondary" className="text-sm">
                  {user?.username ? `@${user.username}` : 'No username'}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                  <span className="text-lg">{user?.email}</span>
                </div>

                {user?.bio ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Bio</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {user.bio}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Bio</h3>
                    <p className="text-muted-foreground italic">
                      No bio available
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  Member Since
                </h3>
                {user?.createdAt ? (
                  <p className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No join date available
                  </p>
                )}
              </div>
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
