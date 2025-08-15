import type { Transport } from '../transport/transport';
import type { ConfigManager } from '../core/config';

export abstract class EventCollector {
  protected active = false;

  constructor(
    protected transport: Transport,
    protected config: ConfigManager,
  ) {}

  abstract start(): void;
  abstract stop(): void;
  
  reset?(): void;
}