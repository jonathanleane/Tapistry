import type { TapistryConfig } from '@tapistry/shared';

const DEFAULT_CONFIG: TapistryConfig = {
  apiUrl: 'https://ingest.tapistry.app',
  cdnUrl: 'https://cdn.tapistry.app',
  sampleRate: 1.0,
  replaySampleRate: 0.3,
  maskText: true,
  respectDNT: true,
  debug: false,
  maxEventsPerSession: 5000,
  maxReplayBytesPerSession: 3_000_000,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  mousemove: {
    enabled: false,
    hz: 5,
  },
  scroll: {
    milestones: [25, 50, 75, 90, 100],
  },
  transport: {
    batchSize: 50,
    batchTimeout: 1000,
    maxRetries: 3,
  },
};

export class ConfigManager {
  private config: TapistryConfig;

  constructor(initial?: Partial<TapistryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initial };
  }

  update(options: Partial<TapistryConfig>): void {
    this.config = { ...this.config, ...options };
  }

  get<K extends keyof TapistryConfig>(key: K): TapistryConfig[K] {
    return this.config[key];
  }

  getAll(): TapistryConfig {
    return { ...this.config };
  }
}