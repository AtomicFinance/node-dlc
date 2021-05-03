export interface ILogger {
  area: string;
  instance: string;
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  sub(area: string, instance?: string): ILogger;
}
