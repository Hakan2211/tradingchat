import { createRequestHandler } from '@remix-run/express';
import type { Server } from 'socket.io';
import path from 'path';
import { getEnv } from '../app/utils/env.server';

// Define the type for our custom context that will be passed to loaders/actions
export interface AppLoadContext {
  io: Server;
}

const BUILD_DIR = path.resolve(__dirname, '../build');

// This is the core of your React Router server-side logic
export const app = createRequestHandler({
  // The 'build' property is a magic import that references the output
  // of the Vite build. Vite handles this automatically.
  build: require(BUILD_DIR),

  // This function is the key! It's called on every request.
  // We'll get `res.locals.io` from the middleware in server.ts
  getLoadContext: (_req, res) => {
    global.ENV = getEnv();
    return {
      io: res.locals.io as Server,
    };
  },
});
