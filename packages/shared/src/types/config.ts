export interface TapistryConfig {
  projectKey?: string;
  apiUrl?: string;
  cdnUrl?: string;
  
  sampleRate?: number;
  replaySampleRate?: number;
  
  maskText?: boolean;
  maskSelectors?: string[];
  allowSelectors?: string[];
  
  respectDNT?: boolean;
  debug?: boolean;
  
  maxEventsPerSession?: number;
  maxReplayBytesPerSession?: number;
  
  sessionTimeout?: number;
  
  urlSanitizer?: (url: string) => string;
  
  mousemove?: {
    enabled: boolean;
    hz?: number;
  };
  
  scroll?: {
    milestones?: number[];
  };
  
  transport?: {
    batchSize?: number;
    batchTimeout?: number;
    maxRetries?: number;
  };
}

export interface ConsentState {
  analytics: boolean;
  replay: boolean;
}