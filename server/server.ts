import { createRequestHandler } from '@remix-run/express';
import type { ServerBuild } from '@remix-run/node';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import rateLimit from 'express-rate-limit';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

(async () => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const app = express();
    const http = createHttpServer(app);

    // Initialize Socket.IO with explicit configuration
    const io = new Server(http, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('✅ New client connected:', socket.id);

      socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });

    //Rate Limiting
    const limitMultiple = process.env.TESTING ? 10_000 : 1;
    const rateLimitDefault = {
      windowMs: 60 * 1000,
      limit: 1000 * limitMultiple,
      standardHeaders: true,
      legacyHeaders: false,
    };

    const strongestRateLimit = rateLimit({
      ...rateLimitDefault,
      limit: 2,
    });

    const strongRateLimit = rateLimit({
      ...rateLimitDefault,
      limit: 100 * limitMultiple,
    });

    const generalRateLimit = rateLimit({
      ...rateLimitDefault,
    });

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

    app.use((_, res, next) => {
      res.locals.io = io;
      next();
    });

    if (isProd) {
      const build = await import(
        path.join(__dirname, '../build/server/index.js')
      );

      app.use('/assets', express.static('build/client', { immutable: true }));
      app.use(
        '/',
        createRequestHandler({
          build,
          getLoadContext: (_, res) => ({ io: res.locals.io }),
        })
      );
    } else {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);
      app.use(
        '/',
        createRequestHandler({
          build: () =>
            vite.ssrLoadModule(
              'virtual:react-router/server-build'
            ) as Promise<ServerBuild>,
          getLoadContext: (_, res) => ({ io: res.locals.io }),
        })
      );
    }

    http.listen(3000, () => {
      console.log('✅ Server running at http://localhost:3000');
      console.log('✅ Socket.IO server initialized');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();
