import { LogLevel } from '../log-level';
import { ITransport } from '../transport';

export class ConsoleTransport implements ITransport {
  public console: Console;

  constructor(console: Console) {
    this.console = console;
  }

  public write(line: string, level?: LogLevel) {
    switch (level) {
      case LogLevel.Trace:
        this.console.trace(line);
        break;
      case LogLevel.Debug:
        this.console.debug(line);
        break;
      case LogLevel.Info:
        this.console.info(line);
        break;
      case LogLevel.Warn:
        this.console.warn(line);
        break;
      case LogLevel.Error:
        this.console.error(line);
        break;
      default:
        this.console.log(line);
    }
  }
}
