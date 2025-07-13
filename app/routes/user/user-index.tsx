import {
  Link,
  useRouteLoaderData,
  Form,
  type LoaderFunctionArgs,
} from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import { CalendarDays, Info, Mail, Loader2 } from 'lucide-react';
import type { loader } from './user';
import { GeneralErrorBoundary } from '#/components/errorBoundary/errorBoundary';
import { getInitials, getUserImagePath, useIsLoading } from '#/utils/misc';
import { useUser, userHasPermission } from '#/utils/userPermissionRole';
import { RedirectBackButton } from '#/components/navigationTracker/redirect-back-button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { ChangePasswordDialog } from '#/components/changePasswordDialog/change-password-dialog';

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

  const isRedirecting = useIsLoading({
    path: '/resources/create-customer-portal',
  });

  const canUpdateAny = userHasPermission(loggedInUser, 'update:user:any');
  const canUpdateOwn = userHasPermission(loggedInUser, 'update:user:own');
  const canEdit = canUpdateAny || (canUpdateOwn && loggedInUser.id === user.id);

  const isOwnProfile = loggedInUser.id === user.id;
  const canManageSubscription = canUpdateOwn && isOwnProfile;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const subscription = loggedInUser?.subscription;
  const isTrialing = subscription?.status === 'trialing';

  return (
    <>
      <header className="flex-shrink-0 border-b border-border/60 p-4 z-10">
        <RedirectBackButton fallback="/home" />
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6">
          {isTrialing && subscription && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <Info className="size-6 text-blue-900 dark:text-blue-300" />
                <CardTitle className="text-blue-900 dark:text-blue-300">
                  You are on a Free Trial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-900/80 dark:text-blue-300/80 mb-4">
                  Your trial access expires on{' '}
                  <strong>
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </strong>
                  . Upgrade now to keep your access.
                </p>
                <Button
                  className="bg-blue-900 dark:bg-blue-300 text-white dark:text-blue-900 hover:bg-blue-900/80 dark:hover:bg-blue-300/80"
                  asChild
                >
                  <Link to="/pricing">Upgrade to a Paid Plan</Link>
                </Button>
              </CardContent>
            </Card>
          )}

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
              {isOwnProfile && (
                <CardFooter>
                  <ChangePasswordDialog />
                </CardFooter>
              )}
            </Card>

            {canManageSubscription && subscription && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Subscription Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      variant={
                        subscription.status === 'active' ||
                        subscription.status === 'trialing'
                          ? 'default'
                          : subscription.status === 'complimentary'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="capitalize"
                    >
                      {subscription.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {subscription.status !== 'complimentary' && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {subscription.cancelAtPeriodEnd
                          ? 'Expires on'
                          : 'Renews on'}
                      </p>
                      <p className="text-foreground">
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {/* <Form method="GET" action="/resources/create-customer-portal"> */}
                  {subscription.status === 'active' && (
                    <Button asChild type="submit">
                      <Link
                        // target="_blank"
                        // rel="noreferrer noopener"
                        to="/resources/create-customer-portal"
                        aria-disabled={isRedirecting}
                      >
                        {isRedirecting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          'Manage Subscription'
                        )}
                      </Link>
                    </Button>
                  )}
                  {/* </Form> */}
                  {subscription.status === 'active' && (
                    <p className="text-xs text-muted-foreground">
                      You'll be redirected to our secure payment partner to
                      update your plan, payment method, or cancel.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
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
