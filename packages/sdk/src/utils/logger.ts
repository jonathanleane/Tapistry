import type { ConfigManager } from '../core/config';

export class Logger {
  private debug: boolean;
  private prefix = '[Tapistry]';

  constructor(private config: ConfigManager) {
    this.debug = config.get('debug') || false;
  }

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  log(...args: any[]): void {
    if (this.debug) {
      console.log(this.prefix, ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.debug) {
      console.warn(this.prefix, ...args);
    }
  }

  error(...args: any[]): void {
    console.error(this.prefix, ...args);
  }
}