import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { isUserAuthorized } from '#/utils/permission.server';

/**
 * ChartLog — the desktop trading journal bundled with a yearly membership.
 *
 * The app itself is ungated: once installed it runs offline forever and never
 * checks a licence. Membership buys the *download*, not permission to run it,
 * so everything here only guards who may fetch the installer.
 */

export const CHARTLOG_VERSION = '0.1.0';
export const INSTALLER_FILENAME = `ChartLog_${CHARTLOG_VERSION}_x64-setup.exe`;

export type ChartLogAccess =
  | { allowed: true; userId: string }
  | { allowed: false; userId: string; reason: 'inactive' | 'not-yearly' };

/**
 * Who may download ChartLog: admins, and members on the yearly plan.
 *
 * Redirects to /login when signed out (via `requireUserId`), so callers only
 * ever see an answer for a real, logged-in user.
 */
export async function getChartLogAccess(
  request: Request
): Promise<ChartLogAccess> {
  const userId = await requireUserId(request);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: { select: { name: true } },
      subscription: {
        select: { status: true, currentPeriodEnd: true, priceId: true },
      },
    },
  });

  // Same rule the app layout uses, so an expired member can never slip through
  // here just because they kept the URL.
  if (!isUserAuthorized(user)) {
    return { allowed: false, userId, reason: 'inactive' };
  }

  if (user!.roles.some((role) => role.name === 'admin')) {
    return { allowed: true, userId };
  }

  // A list, not a single id: old prices stay active in Stripe long after they
  // stop being sold, and a member grandfathered onto one still bought a year.
  const yearlyPriceIds = (process.env.STRIPE_YEARLY_PRICE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (yearlyPriceIds.length === 0) {
    // Fail open rather than locking every member out of a perk they paid for.
    console.warn(
      '[chartlog] STRIPE_YEARLY_PRICE_IDS is not set — every active member can download ChartLog.'
    );
    return { allowed: true, userId };
  }

  const priceId = user!.subscription?.priceId;
  if (!priceId || !yearlyPriceIds.includes(priceId)) {
    return { allowed: false, userId, reason: 'not-yearly' };
  }

  return { allowed: true, userId };
}
