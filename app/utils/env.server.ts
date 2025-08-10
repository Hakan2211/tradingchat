import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test'] as const),
  HONEYPOT_SECRET: z.string(),
  DATABASE_URL: z.string(),
  CSRF_SESSION_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'STRIPE_PUBLISHABLE_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  // Make Polar variables optional for transition period
  POLAR_ACCESS_TOKEN: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {}
  }
}

export function init() {
  const parsed = schema.safeParse(process.env);

  if (parsed.success === false) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors
    );

    // During transition period, log the error but don't crash the app
    // TODO: Restore throw after all env vars are properly set
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Environment validation failed, but continuing to allow debugging...');
      return; // Don't throw in production during transition
    }
    
    throw new Error('Invalid envirmonment variables');
  }
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
  return {
    MODE: process.env.NODE_ENV,
  };
}

type ENV = ReturnType<typeof getEnv>;

declare global {
  var ENV: ENV;
  interface Window {
    ENV: ENV;
  }
}
