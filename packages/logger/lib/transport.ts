import { LogLevel } from './log-level';

export interface ITransport {
  write(line: string, level?: LogLevel, error?: Error): void;
}
