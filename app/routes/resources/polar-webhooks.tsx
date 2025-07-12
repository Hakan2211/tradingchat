import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

// Note: Webhooks are now handled directly in Express (server/server.ts)
// This React Router handler is kept for backwards compatibility

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(
    JSON.stringify({
      status: 'info',
      message: 'Webhooks are handled directly in Express',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  // Webhooks should not reach this handler since they're processed in Express first
  console.log(
    '⚠️ Webhook reached React Router handler - this should not happen'
  );

  return new Response(
    JSON.stringify({
      status: 'error',
      message: 'Webhooks should be handled in Express',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
