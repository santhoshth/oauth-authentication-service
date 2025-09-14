import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config: AppConfig = {
  port: getEnvNumber('PORT', 8080),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
  
  database: {
    path: getEnvVar('DATABASE_PATH', './data/permissions.db'),
  },
  
  oauth: {
    auth0: {
      domain: getEnvVar('AUTH0_DOMAIN', ''),
      audience: getEnvVar('AUTH0_AUDIENCE', ''),
    },
  },
  
  security: {
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  
  jwt: {
    clockTolerance: getEnvNumber('JWT_CLOCK_TOLERANCE', 5),
  },
};

export default config;
