import { createRequestHandler } from '@react-router/express';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import morgan from 'morgan';
import http from 'node:http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { type ServerBuild } from 'react-router';

const MODE = process.env.NODE_ENV;
const IS_PROD = MODE === 'production';

const viteDevServer = IS_PROD
  ? undefined
  : await import('vite').then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
        // THIS IS THE CRITICAL FIX for the browser not loading
        appType: 'custom',
      })
    );

const app = express();
const httpServer = http.createServer(app);

// Your Socket.IO setup remains the same
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// Standard middleware
app.use(compression());
app.disable('x-powered-by');
app.use(morgan('tiny'));

// Vite middleware is the key to serving the app in development
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Production static asset serving
  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' })
  );
  app.use(express.static('build/client', { maxAge: '1h' }));
}

// Your Rate Limiting logic remains the same
const limitMultiple = process.env.TESTING ? 10_000 : 1;
const rateLimitDefault = {
  windowMs: 60 * 1000,
  limit: 1000 * limitMultiple,
  standardHeaders: true,
  legacyHeaders: false,
};
const strongestRateLimit = rateLimit({
  ...rateLimitDefault,
  limit: 10 * limitMultiple,
});
const strongRateLimit = rateLimit({
  ...rateLimitDefault,
  limit: 100 * limitMultiple,
});
const generalRateLimit = rateLimit(rateLimitDefault);

app.use((req, res, next) => {
  const strongPaths = ['/register'];
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (strongPaths.some((path) => req.path.includes(path))) {
      return strongestRateLimit(req, res, next);
    }
    return strongRateLimit(req, res, next);
  }
  return generalRateLimit(req, res, next);
});

// A resilient build loader function like the Epic Stack's
async function getBuild() {
  try {
    const build = viteDevServer
      ? await viteDevServer.ssrLoadModule('virtual:react-router/server-build')
      : // @ts-expect-error - this will exist in production
        await import('../build/server/index.js');
    return build as ServerBuild;
  } catch (error) {
    console.error('Failed to load server build:', error);
    // In dev, Vite will show an error overlay, so we can throw
    if (!IS_PROD) throw error;
    // In prod, we should not crash the server
    return undefined;
  }
}

// The final request handler, using the correct Express 5 regex wildcard
const handler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const build = await getBuild();
    if (!build) {
      // If the build fails in prod, send a 500
      res.status(500).send('Server Error');
      return;
    }
    const handler = createRequestHandler({
      build,
      getLoadContext: () => ({ io: io }),
    });
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

app.all(/(.*)/, handler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Express server listening on http://localhost:${PORT}`);
});
