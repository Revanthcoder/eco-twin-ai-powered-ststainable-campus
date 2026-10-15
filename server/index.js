import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSchema } from './db/database.js';
import { seedDatabase } from './db/seedData.js';
import twinRoutes from './routes/twinRoutes.js';
import legacyRoutes from './routes/legacyRoutes.js';
import simulator from './services/simulator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') && !req.path.includes('/simulator/status')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount Routes
app.use('/api/twin', twinRoutes);
app.use('/api', legacyRoutes);
app.use('/', legacyRoutes); // handles /health directly

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server and Initialize Database
async function bootstrap() {
  try {
    console.log('[Server] Initializing database...');
    await initSchema();
    await seedDatabase(false);

    // Auto-start sensor simulator with 10s interval for immediate live telemetry
    console.log('[Server] Starting real-time sensor simulator...');
    await simulator.start(10);

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('====================================================');
      console.log(`  🌿 EcoPulse Digital Twin API Server running!`);
      console.log(`  🚀 URL: http://127.0.0.1:${PORT}`);
      console.log(`  📡 Health Check: http://127.0.0.1:${PORT}/api/health`);
      console.log(`  🗺️ Twin Overview: http://127.0.0.1:${PORT}/api/twin/overview`);
      console.log(`  🏢 Buildings API: http://127.0.0.1:${PORT}/api/twin/buildings`);
      console.log('====================================================');
    });

    // Graceful shutdown
    const cleanup = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      await simulator.stop();
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    return server;
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

// Export for testing
export { app, bootstrap };

// Run if called directly
if (process.argv[1]?.endsWith('index.js')) {
  bootstrap();
}
