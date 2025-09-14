// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH0_DOMAIN = 'test-domain.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://test-api.com';
process.env.LOG_LEVEL = 'silent';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
