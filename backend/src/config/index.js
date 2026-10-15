import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().min(8).default('super_secret_dev_campus_jwt_key_2026_xyz987'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().default(5000),
  AI_MOCK_FALLBACK: z.coerce.boolean().default(true),
  DEFAULT_GRID_EMISSION_FACTOR: z.coerce.number().default(0.82), // kg CO2e / kWh
  DEFAULT_WATER_EMISSION_FACTOR: z.coerce.number().default(0.0003), // kg CO2e / Litre
  DEFAULT_ENERGY_TARIFF_PER_KWH: z.coerce.number().default(0.14) // USD per kWh
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const config = {
  ...parsedEnv.data,
  isDev: parsedEnv.data.NODE_ENV === 'development',
  isProd: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',
  corsOrigins: parsedEnv.data.CORS_ORIGIN === '*' 
    ? '*' 
    : parsedEnv.data.CORS_ORIGIN.split(',').map((origin) => origin.trim())
};
