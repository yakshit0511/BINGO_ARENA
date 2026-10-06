import http from 'http';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { connectDatabase, getDatabaseStatus } from './config/database';
import apiRoutes from './routes';
import { initSocketServer } from './sockets';

const app: Express = express();

// Middleware
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging for development
if (!config.isProduction) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });
}

// Mount API routes
app.use('/api', apiRoutes);

// Fallback 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Create HTTP server & bind Socket.IO
const httpServer = http.createServer(app);
const io = initSocketServer(httpServer);

/**
 * Bootstrap and start server after connecting to MongoDB Atlas.
 */
async function startServer(): Promise<void> {
  console.log('🔄 Initializing Bingo Arena server components...');

  // Connect to MongoDB Atlas
  const dbConnected = await connectDatabase();

  if (!dbConnected) {
    console.warn('⚠️  Proceeding with server startup; database status is currently:', getDatabaseStatus());
  }

  // Start HTTP Server
  httpServer.listen(config.port, () => {
    console.log('==============================================');
    console.log(`🎮 BINGO ARENA Server running on port ${config.port}`);
    console.log(`🌐 Health endpoint: http://localhost:${config.port}/api/health`);
    console.log(`⚡ Real-time Socket.IO initialized`);
    console.log(`🔗 Configured Client URL: ${config.clientUrl}`);
    console.log(`🍃 Database Status: ${getDatabaseStatus()}`);
    console.log('==============================================');
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down Bingo Arena server...');
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});

export { app, httpServer, io };
