import type { TapistryConfig, ConsentState } from '@tapistry/shared';
import { SessionManager } from './session';
import { EventCollector } from '../collectors/base';
import { PageViewCollector } from '../collectors/pageview';
import { ClickCollector } from '../collectors/click';
import { ScrollCollector } from '../collectors/scroll';
import { Transport } from '../transport/transport';
import { ConfigManager } from './config';
import { Logger } from '../utils/logger';

export class TapistrySDK {
  public initialized = false;
  private config: ConfigManager;
  private session: SessionManager;
  private transport: Transport;
  private collectors: EventCollector[] = [];
  private logger: Logger;
  private consent: ConsentState = { analytics: true, replay: true };

  constructor() {
    this.config = new ConfigManager();
    this.logger = new Logger(this.config);
    this.session = new SessionManager(this.config);
    this.transport = new Transport(this.config, this.session);
  }

  async initialize(): Promise<void> {
    try {
      if (this.shouldRespectDNT()) {
        this.logger.log('DNT enabled, not tracking');
        return;
      }

      await this.session.initialize();
      
      this.collectors = [
        new PageViewCollector(this.transport, this.config),
        new ClickCollector(this.transport, this.config),
        new ScrollCollector(this.transport, this.config),
      ];
      
      for (const collector of this.collectors) {
        collector.start();
      }
      
      this.transport.start();
      this.initialized = true;
      
      this.logger.log('SDK initialized');
    } catch (error) {
      this.logger.error('Failed to initialize SDK', error);
    }
  }

  execute(command: string, args: any[]): void {
    switch (command) {
      case 'config':
        this.handleConfig(args[0]);
        break;
      case 'identify':
        this.handleIdentify(args[0], args[1]);
        break;
      case 'track':
        this.handleTrack(args[0], args[1]);
        break;
      case 'page':
        this.handlePage(args[0], args[1]);
        break;
      case 'setConsent':
        this.handleSetConsent(args[0]);
        break;
      case 'reset':
        this.handleReset();
        break;
      case 'debug':
        this.handleDebug(args[0]);
        break;
      default:
        this.logger.warn(`Unknown command: ${command}`);
    }
  }

  private handleConfig(options: Partial<TapistryConfig>): void {
    this.config.update(options);
    
    if (options.debug !== undefined) {
      this.logger.setDebug(options.debug);
    }
  }

  private handleIdentify(userId: string, traits?: Record<string, any>): void {
    if (!this.consent.analytics) return;
    
    this.session.setUserId(userId);
    this.transport.send({
      type: 'identify',
      traits,
    });
  }

  private handleTrack(name: string, properties?: Record<string, any>): void {
    if (!this.consent.analytics) return;
    
    this.transport.send({
      type: 'custom',
      name,
      properties,
    });
  }

  private handlePage(nameOrPath?: string, properties?: Record<string, any>): void {
    if (!this.consent.analytics) return;
    
    const path = typeof nameOrPath === 'string' ? nameOrPath : window.location.pathname;
    
    for (const collector of this.collectors) {
      if (collector instanceof PageViewCollector) {
        collector.trackPage(path, properties);
        break;
      }
    }
  }

  private handleSetConsent(consent: Partial<ConsentState>): void {
    this.consent = { ...this.consent, ...consent };
    
    if (!consent.analytics) {
      for (const collector of this.collectors) {
        collector.stop();
      }
      this.transport.stop();
    } else if (this.initialized && consent.analytics) {
      for (const collector of this.collectors) {
        collector.start();
      }
      this.transport.start();
    }
  }

  private handleReset(): void {
    this.session.reset();
    
    for (const collector of this.collectors) {
      collector.reset?.();
    }
  }

  private handleDebug(enable: boolean): void {
    this.config.update({ debug: enable });
    this.logger.setDebug(enable);
  }

  private shouldRespectDNT(): boolean {
    if (!this.config.get('respectDNT')) return false;
    
    return navigator.doNotTrack === '1' || 
           (window as any).doNotTrack === '1' || 
           navigator.doNotTrack === 'yes';
  }
}