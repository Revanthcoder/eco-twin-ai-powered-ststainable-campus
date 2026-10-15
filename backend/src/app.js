import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { NotFoundError } from './utils/errors.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import buildingRoutes from './routes/buildingRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';
import energyRoutes from './routes/energyRoutes.js';
import waterRoutes from './routes/waterRoutes.js';
import wasteRoutes from './routes/wasteRoutes.js';
import carbonRoutes from './routes/carbonRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import scoreRoutes from './routes/scoreRoutes.js';
import simulatorRoutes from './routes/simulatorRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();

// Security and standard middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI inline scripts
}));

app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logger (skip during automated tests)
if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter for general endpoints in production
if (config.NODE_ENV === 'production') {
  app.use(config.API_PREFIX, apiLimiter);
}

// Static folder for uploaded files
app.use('/uploads', express.static('uploads'));

// Swagger / OpenAPI documentation
try {
  const swaggerSpecPath = new URL('../docs/swagger.json', import.meta.url);
  const swaggerSpec = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));
  app.use(`${config.API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get(`${config.API_PREFIX}/docs/json`, (req, res) => res.json(swaggerSpec));
} catch (e) {
  console.warn('⚠️ Could not load swagger.json for documentation route:', e.message);
}

// Base health check alias at root
app.get('/health', (req, res) => res.redirect(`${config.API_PREFIX}/health`));

// Core Domain Route Mounts
app.use(config.API_PREFIX, healthRoutes);
app.use(`${config.API_PREFIX}/auth`, authRoutes);
app.use(`${config.API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${config.API_PREFIX}/buildings`, buildingRoutes);
app.use(`${config.API_PREFIX}/zones`, zoneRoutes);
app.use(`${config.API_PREFIX}/energy`, energyRoutes);
app.use(`${config.API_PREFIX}/water`, waterRoutes);
app.use(`${config.API_PREFIX}/waste`, wasteRoutes);
app.use(`${config.API_PREFIX}/carbon`, carbonRoutes);
app.use(`${config.API_PREFIX}/alerts`, alertRoutes);
app.use(`${config.API_PREFIX}/sustainability-score`, scoreRoutes);
app.use(`${config.API_PREFIX}/simulator`, simulatorRoutes);
app.use(`${config.API_PREFIX}/maintenance`, maintenanceRoutes);
app.use(`${config.API_PREFIX}/reports`, reportRoutes);
app.use(`${config.API_PREFIX}/settings`, settingRoutes);
app.use(`${config.API_PREFIX}/ai`, aiRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  next(new NotFoundError(`API endpoint '${req.method} ${req.originalUrl}'`));
});

// Centralized error handler
app.use(errorHandler);

export default app;
