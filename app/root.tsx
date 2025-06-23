import {
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
import { combineHeaders } from '#/utils/misc';

type LoaderData = {
  honeyProps: any;
  ENV: any;
  csrfToken: string;
  toast: Toast | null;
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
  } | null;
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
        },
        where: { id: userId },
      })
    : null;

  const data: LoaderData = {
    honeyProps,
    ENV: getEnv(),
    csrfToken,
    user,
    toast,
  };

  const csrfHeader = csrfCookieHeader
    ? new Headers({ 'set-cookie': csrfCookieHeader })
    : null;

  // Combine the CSRF headers and the Toast headers
  const combined = combineHeaders(csrfHeader, toastHeaders);
  combined.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(data), {
    headers: combined,
  });
}) satisfies LoaderFunction;

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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

  useToast(typedData.toast);

  return (
    <Document>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(typedData.ENV)}`,
        }}
      />
      <Toaster position="top-center" closeButton />
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
