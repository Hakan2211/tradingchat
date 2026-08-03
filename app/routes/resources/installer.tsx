import type { LoaderFunctionArgs } from 'react-router';
import {
  getChartLogAccess,
  INSTALLER_FILENAME,
} from '#/utils/chartlog.server';
import { getInstallerFromR2 } from '#/utils/r2.server';

/**
 * Serves the ChartLog installer to members.
 *
 * This route sits outside the app layout, so it has to run the membership check
 * itself — `getChartLogAccess` redirects to /login when signed out and returns
 * `allowed: false` for anyone whose plan does not include ChartLog.
 *
 * The R2 object stays private: the bytes are proxied through here and the
 * bucket URL is never exposed to the browser.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const access = await getChartLogAccess(request);

  if (!access.allowed) {
    return new Response(
      'ChartLog is included with a yearly BullBearz membership.',
      { status: 403 }
    );
  }

  const objectKey = process.env.R2_INSTALLER_KEY;
  if (!objectKey) {
    console.error('[chartlog] R2_INSTALLER_KEY is not set.');
    return new Response('The download is not available yet.', { status: 503 });
  }

  const installer = await getInstallerFromR2(objectKey);
  if (!installer) {
    return new Response('The installer could not be retrieved.', {
      status: 502,
    });
  }

  console.log(`[chartlog] installer downloaded by user ${access.userId}`);

  return new Response(installer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.microsoft.portable-executable',
      'Content-Length': String(installer.length),
      'Content-Disposition': `attachment; filename="${INSTALLER_FILENAME}"`,
      // Never let a proxy or the browser hold a copy of a member-only binary.
      'Cache-Control': 'private, no-store',
    },
  });
}
