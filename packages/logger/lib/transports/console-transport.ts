import { LogLevel } from "../log-level";
import { ITransport } from "../transport";

export class ConsoleTransport implements ITransport {
    public console: Console;

    constructor(console: Console) {
        this.console = console;
    }

    public write(line: string, level?: LogLevel) {
        switch (level) {
            case LogLevel.Trace:
                this.console.trace(line);
            case LogLevel.Debug:
                this.console.debug(line);
            case LogLevel.Info:
                this.console.info(line);
            case LogLevel.Warn:
                this.console.warn(line);
            case LogLevel.Error:
                this.console.error(line);
            default:
                this.console.log(line);
        }
    }
}
