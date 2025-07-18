import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LinksFunction,
  type LoaderFunction,
  type LoaderFunctionArgs,
} from 'react-router';

import './styles/font.css';
import './app.css';
import { GeneralErrorBoundary } from './components/errorBoundary/errorBoundary';
import { honeypot } from './utils/honeypot.server';
import { HoneypotProvider } from 'remix-utils/honeypot/react';
import { getEnv } from './utils/env.server';
import { csrf } from './utils/csrf.server';
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react';
import { getUserId } from './utils/auth.server';
import { prisma } from './utils/db.server';
import { getToast, type Toast } from '#/utils/toaster.server';
import { Toaster } from '#/components/ui/sonner';
import { useToast } from '#/components/sonnerToaster/toaster';
import { getDomainUrl } from '#/utils/misc';
import { useTheme } from './routes/resources/theme-switch';
import { ClientHintCheck, getHints } from './utils/client-hints';
import { getTheme, type Theme } from './utils/theme.server';
import { NavigationTracker } from '#/components/navigationTracker/navigation-tracker';
import { combineHeaders } from '#/utils/misc';
import { cn } from './lib/utils';

type RequestInfo = {
  hints: {
    theme: Theme | null;
    timeZone: string;
  };
  origin: string;
  pathname: string;
  userPrefs: {
    theme: Theme | null;
  };
};

type LoaderData = {
  honeyProps: any;
  ENV: any;
  csrfToken: string;
  toast: Toast | null;
  requestInfo: RequestInfo;
  user: {
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
    subscription: {
      status: string;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    } | null;
  } | null;
  headers?: Record<string, string>;
};

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  // { rel: 'stylesheet', href: '/app/styles/font.css' },
];

export const loader = (async ({ request }: LoaderFunctionArgs) => {
  const honeyProps = await honeypot.getInputProps();
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request);
  const { toast, headers: toastHeaders } = await getToast(request);

  const userId = await getUserId(request);
  const user = userId
    ? await prisma.user.findUniqueOrThrow({
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: { select: { id: true, updatedAt: true } },
          roles: {
            select: {
              name: true,
              permissions: {
                select: { action: true, entity: true, access: true },
              },
            },
          },
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
        where: { id: userId },
      })
    : null;

  const loaderData: LoaderData = {
    honeyProps,
    ENV: getEnv(),
    csrfToken,
    user,
    toast,
    requestInfo: {
      hints: getHints(request),
      origin: getDomainUrl(request),
      pathname: new URL(request.url).pathname,
      userPrefs: {
        theme: await getTheme(request),
      },
    },
  };

  const headers = combineHeaders(
    csrfCookieHeader ? new Headers({ 'set-cookie': csrfCookieHeader }) : null,
    toastHeaders
  );

  return data(loaderData, { headers });
}) satisfies LoaderFunction;

export const meta = ({ data }: { data: LoaderData }) => {
  const origin = data?.requestInfo?.origin || 'https://bullbearz.com';
  const imageUrl =
    'https://pub-9c15a0205a1d42c8acc549a0dd7d568e.r2.dev/og-image.jpg';

  const title = 'BullBearz | The Winning Edge for Traders';
  const description =
    'Join a community of elite traders who turn market volatility into opportunity. Learn, share, and forge your winning edge.';

  return [
    { title: title },
    { name: 'description', content: description },

    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: origin },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'BullBearz' },

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:site', content: '@hakanbilgo' },
    { name: 'twitter:creator', content: '@hakanbilgo' },
  ];
};

function Document({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme?: Theme | null;
}) {
  return (
    <html lang="en" className={cn(theme ?? '', 'relative')}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ClientHintCheck nonce="" />
      </head>
      <body className="font-sans">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  const data = useLoaderData<typeof loader>();
  if (!data) throw new Error('No data available');
  const typedData = data as unknown as LoaderData;

  const theme = useTheme();

  useToast(typedData.toast);

  return (
    <Document theme={theme}>
      <Outlet />
      <NavigationTracker />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(typedData.ENV)}`,
        }}
      />
      <Toaster position="top-center" closeButton theme={theme ?? 'light'} />
    </Document>
  );
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();
  if (!data) throw new Error('No data available');
  const typedData = data as unknown as LoaderData;

  return (
    <AuthenticityTokenProvider token={typedData.csrfToken}>
      <HoneypotProvider {...typedData.honeyProps}>
        <App />
      </HoneypotProvider>
    </AuthenticityTokenProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  return (
    <Document>
      <GeneralErrorBoundary />
    </Document>
  );
}
