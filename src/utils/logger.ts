import pino from 'pino';
import { config } from '../config';

const pinoConfig: pino.LoggerOptions = {
  level: config.logLevel,
};

if (config.nodeEnv === 'development') {
  pinoConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
      hideObject: false,
      messageFormat: '{msg}',
    },
  };
}

export const logger = pino(pinoConfig);

export default logger;
