import { ConsoleTransport, Logger, LogLevel } from '@node-dlc/logger';

export function parseConfig(configData) {
  return JSON.parse(JSON.stringify(configData));
}

export function getLogLevel(level: string): LogLevel {
  switch (level) {
    case 'trace':
      return LogLevel.Trace;
    case 'debug':
      return LogLevel.Debug;
    case 'info':
      return LogLevel.Info;
    case 'warn':
      return LogLevel.Warn;
    case 'error':
      return LogLevel.Error;
    default:
      return LogLevel.Info;
  }
}

export function getLogger(level: string): Logger {
  const logger = new Logger('', '', false);
  logger.transports.push(new ConsoleTransport(console));
  logger.level = getLogLevel(level);
  return logger;
}
