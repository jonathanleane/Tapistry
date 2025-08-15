import type { TapistryEvent, EventBatch } from '@tapistry/shared';
import { generateUUID, normalizePath, sanitizeUrl } from '@tapistry/shared';
import type { ConfigManager } from '../core/config';
import type { SessionManager } from '../core/session';

interface QueuedEvent extends Partial<TapistryEvent> {
  id?: string;
  ts?: number;
  session_id?: string;
  anonymous_id?: string;
  user_id?: string | null;
  url?: string;
  path?: string;
}

export class Transport {
  private queue: QueuedEvent[] = [];
  private batchTimer?: number;
  private retryCount = 0;
  private active = false;
  private sending = false;
  private eventCount = 0;

  constructor(
    private config: ConfigManager,
    private session: SessionManager,
  ) {}

  start(): void {
    this.active = true;
    this.setupUnloadHandlers();
    this.scheduleBatch();
  }

  stop(): void {
    this.active = false;
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }

  send(event: Partial<TapistryEvent>): void {
    if (!this.active) return;

    const maxEvents = this.config.get('maxEventsPerSession') || 5000;
    if (this.eventCount >= maxEvents) {
      return;
    }

    const enrichedEvent: QueuedEvent = {
      ...event,
      id: generateUUID(),
      ts: Date.now(),
      session_id: this.session.getSessionId(),
      anonymous_id: this.session.getAnonymousId(),
      user_id: this.session.getUserId(),
      url: sanitizeUrl(window.location.href),
      path: normalizePath(window.location.href),
      viewport: {
        w: window.innerWidth,
        h: window.innerHeight,
      },
    };

    this.queue.push(enrichedEvent);
    this.eventCount++;

    const batchSize = this.config.get('transport')?.batchSize || 50;
    if (this.queue.length >= batchSize) {
      this.flush();
    } else {
      this.scheduleBatch();
    }
  }

  private scheduleBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    const timeout = this.config.get('transport')?.batchTimeout || 1000;
    this.batchTimer = window.setTimeout(() => {
      this.flush();
    }, timeout) as unknown as number;
  }

  private async flush(): Promise<void> {
    if (!this.active || this.sending || this.queue.length === 0) {
      return;
    }

    this.sending = true;
    const events = [...this.queue];
    this.queue = [];

    const batch: EventBatch = {
      sdk: {
        name: '@tapistry/sdk',
        version: '0.1.0',
      },
      client: {
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lang: navigator.language,
        screen: {
          w: window.screen.width,
          h: window.screen.height,
        },
      },
      events: events as TapistryEvent[],
    };

    try {
      await this.sendBatch(batch);
      this.retryCount = 0;
    } catch (error) {
      this.handleError(events, error);
    } finally {
      this.sending = false;
      
      if (this.queue.length > 0) {
        this.scheduleBatch();
      }
    }
  }

  private async sendBatch(batch: EventBatch): Promise<void> {
    const apiUrl = this.config.get('apiUrl') || 'https://ingest.tapistry.app';
    const projectKey = this.config.get('projectKey');
    
    if (!projectKey) {
      throw new Error('Project key not configured');
    }

    const url = `${apiUrl}/i`;
    const body = JSON.stringify(batch);

    if (navigator.sendBeacon && body.length < 64000) {
      const blob = new Blob([body], { type: 'application/json' });
      const success = navigator.sendBeacon(url, blob);
      
      if (success) {
        return;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': projectKey,
        'X-Client-Time': Date.now().toString(),
      },
      body,
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  private handleError(events: QueuedEvent[], error: unknown): void {
    const maxRetries = this.config.get('transport')?.maxRetries || 3;
    
    if (this.retryCount < maxRetries) {
      this.queue.unshift(...events);
      this.retryCount++;
      
      const backoff = Math.min(10000, 200 * Math.pow(2, this.retryCount));
      const jitter = Math.random() * backoff * 0.1;
      
      setTimeout(() => {
        this.flush();
      }, backoff + jitter);
    }
  }

  private setupUnloadHandlers(): void {
    const flushOnUnload = () => {
      if (this.queue.length > 0) {
        const batch: EventBatch = {
          sdk: {
            name: '@tapistry/sdk',
            version: '0.1.0',
          },
          client: {
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lang: navigator.language,
          },
          events: this.queue as TapistryEvent[],
        };

        const apiUrl = this.config.get('apiUrl') || 'https://ingest.tapistry.app';
        const projectKey = this.config.get('projectKey');
        
        if (projectKey) {
          const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
          navigator.sendBeacon(`${apiUrl}/i`, blob);
        }
      }
    };

    window.addEventListener('pagehide', flushOnUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushOnUnload();
      }
    });
  }
}