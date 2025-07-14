import { createRequestHandler } from '@react-router/express';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import morgan from 'morgan';
import http from 'node:http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { type ServerBuild } from 'react-router';
import { prisma } from '#/utils/db.server';
import { UserStatus } from '@prisma/client';

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

// app.get('/healthz', (req, res) => {
//   res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
// });
const onlineUsers = new Map<string, Set<string>>();

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  const userId = socket.handshake.auth.userId as string | undefined;

  socket.on('client.ready.get_users', async () => {
    console.log(`Server: Received request for user list from ${socket.id}`);

    try {
      // This is the same logic as before, but now it only runs when requested.
      const onlineUserIds = Array.from(onlineUsers.keys());
      const userStatuses = await prisma.user.findMany({
        where: { id: { in: onlineUserIds } },
        select: { id: true, status: true },
      });
      const statusesMap = new Map<string, UserStatus>();
      userStatuses.forEach((u) => statusesMap.set(u.id, u.status));

      // Emit back to the specific client that asked for it.
      socket.emit('online.users', {
        userIds: onlineUserIds,
        statuses: Object.fromEntries(statusesMap),
      });

      console.log(
        `Server: Sent user list to ${socket.id} (${onlineUserIds.length} users)`
      );
    } catch (error) {
      console.error(`Server: Error sending user list to ${socket.id}:`, error);
      // Send an empty response to prevent client from hanging
      socket.emit('online.users', {
        userIds: [],
        statuses: {},
      });
    }
  });

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
    if (userId) {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        // If the user has no more active connections, they are "offline"
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast that this user is now offline
          io.emit('user.offline', { userId });
          console.log(`User ${userId} went offline.`);
        }
      }
    }
  });
  if (userId) {
    (async () => {
      socket.join(`user:${userId}`);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
        if (user) {
          io.emit('user.online', { userId, status: user.status });
          console.log(`User ${userId} came online.`);
        }
      }
      onlineUsers.get(userId)?.add(socket.id);
    })();
  }
});

// Standard middleware
app.use(compression());
app.disable('x-powered-by');
app.use(morgan('tiny'));

// Direct Express webhook handler (bypasses React Router)
app.post('/resources/api/polar-webhooks', express.json(), async (req, res) => {
  console.log('🔵 Webhook received:', req.body.type);

  try {
    const { validateEvent } = await import('@polar-sh/sdk/webhooks');
    const { prisma } = await import('#/utils/db.server');

    const body = JSON.stringify(req.body);
    const headers: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });

    if (!process.env.POLAR_WEBHOOK_SECRET) {
      console.error('❌ POLAR_WEBHOOK_SECRET is not configured');
      res.status(500).json({ error: 'Webhook secret missing' });
      return;
    }

    const event = validateEvent(
      body,
      headers,
      process.env.POLAR_WEBHOOK_SECRET
    );
    console.log('✅ Webhook validated:', event.type);

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated': {
        const data = event.data;
        const userId = data.metadata?.userId || data.customer?.metadata?.userId;

        if (!userId) {
          console.warn('⚠️ No userId found in webhook data');
          res.status(200).json({
            status: 'ok',
            warning: 'No userId found in metadata',
          });
          return;
        }

        // Check if user exists before creating subscription
        const user = await prisma.user.findUnique({
          where: { id: String(userId) },
          select: { id: true },
        });

        if (!user) {
          console.warn(`⚠️ User ${userId} not found, skipping subscription`);
          res.status(200).json({
            status: 'ok',
            warning: 'User not found',
          });
          return;
        }

        const subscriptionData = {
          userId: String(userId),
          polarSubscriptionId: data.id,
          polarCustomerId: data.customer?.id || '',
          status: (data.status || 'active') as
            | 'active'
            | 'canceled'
            | 'incomplete'
            | 'incomplete_expired'
            | 'past_due'
            | 'trialing'
            | 'paused',
          tierId: data.productId || data.product?.id || '',
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          currentPeriodStart: new Date(data.currentPeriodStart || Date.now()),
          currentPeriodEnd: new Date(data.currentPeriodEnd || Date.now()),
          startedAt: new Date(data.startedAt || Date.now()),
          endedAt: data.endedAt ? new Date(data.endedAt) : null,
        };

        await prisma.subscription.upsert({
          where: { polarSubscriptionId: data.id },
          create: subscriptionData,
          update: subscriptionData,
        });

        console.log(`✅ Subscription ${data.status} for user: ${userId}`);
        break;
      }
      default:
        console.log('📌 Unhandled event type:', event.type);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
