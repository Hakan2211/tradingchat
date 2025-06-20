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

type LoaderData = {
  honeyProps: any;
  ENV: any;
  csrfToken: string;
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
  const data: LoaderData = { honeyProps, ENV: getEnv(), csrfToken };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...(csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : {}),
    },
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

  return (
    <Document>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(typedData.ENV)}`,
        }}
      />
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
