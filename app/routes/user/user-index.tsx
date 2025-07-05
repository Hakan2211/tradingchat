import {
  Link,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import { CalendarDays, Mail } from 'lucide-react';
import type { loader } from './user';
import { GeneralErrorBoundary } from '#/components/errorBoundary/errorBoundary';
import { getInitials, getUserImagePath } from '#/utils/misc';
import { useUser, userHasPermission } from '#/utils/userPermissionRole';
import { RedirectBackButton } from '#/components/navigationTracker/redirect-back-button';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';

// A small reusable component for displaying info with an icon
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-5 text-muted-foreground mt-1 flex-shrink-0" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-foreground">{value || 'Not available'}</span>
      </div>
    </div>
  );
}

export default function UserIndexView() {
  const loggedInUser = useUser();

  const { user } = useRouteLoaderData('routes/user/user') as Awaited<
    ReturnType<typeof loader>
  >;

  const canUpdateAny = userHasPermission(loggedInUser, 'update:user:any');
  const canUpdateOwn = userHasPermission(loggedInUser, 'update:user:own');
  const canEdit = canUpdateAny || (canUpdateOwn && loggedInUser.id === user.id);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <>
      <header className="flex-shrink-0 border-b border-border/60 p-4 z-10">
        <RedirectBackButton fallback="/home" />
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* --- User Profile Header --- */}

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-24 rounded-full ring-4 ring-primary/20">
              <AvatarImage
                src={user?.image ? getUserImagePath(user.image.id) : undefined}
                alt={user?.name ?? ''}
              />
              <AvatarFallback className="text-3xl bg-muted">
                {getInitials(user?.name ?? '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-foreground">
                {user?.name ?? 'Unknown User'}
              </h1>
              <p className="text-muted-foreground">
                {user?.username ? `@${user.username}` : 'No username'}
              </p>
            </div>

            {canEdit && (
              <Button asChild>
                <Link to="edit">Edit Profile</Link>
              </Button>
            )}
          </div>

          {/* --- User Details Grid --- */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* About Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>About {user.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {user.bio || (
                    <span className="italic">
                      This user hasn't added a bio yet.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Account Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow
                  icon={CalendarDays}
                  label="Member Since"
                  value={memberSince}
                />
              </CardContent>
            </Card>
          </div>

          {/* 
            FUTURE EXPANSION:
            This is where you would add new cards for other features.
            For example, a "Subscription Status" card or an "Account Actions" card.
            Or, you could wrap this section in a <Tabs> component.
          */}
        </div>
      </main>
    </>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
