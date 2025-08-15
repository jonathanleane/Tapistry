import { generateUUID } from '@tapistry/shared';
import type { ConfigManager } from './config';
import { Storage } from '../utils/storage';

export class SessionManager {
  private anonymousId: string;
  private sessionId: string;
  private userId: string | null = null;
  private lastActivity: number;
  private storage: Storage;
  private config: ConfigManager;
  private activityTimer?: number;

  constructor(config: ConfigManager) {
    this.config = config;
    this.storage = new Storage();
    this.anonymousId = '';
    this.sessionId = '';
    this.lastActivity = Date.now();
  }

  async initialize(): Promise<void> {
    this.anonymousId = await this.getOrCreateAnonymousId();
    this.sessionId = this.createNewSession();
    this.startActivityTracking();
  }

  private async getOrCreateAnonymousId(): Promise<string> {
    const stored = await this.storage.get('tapistry_aid');
    
    if (stored) {
      return stored;
    }
    
    const newId = generateUUID();
    await this.storage.set('tapistry_aid', newId, 365 * 24 * 60 * 60 * 1000); // 1 year
    return newId;
  }

  private createNewSession(): string {
    const sessionId = generateUUID();
    this.lastActivity = Date.now();
    return sessionId;
  }

  private startActivityTracking(): void {
    const checkActivity = () => {
      const now = Date.now();
      const timeout = this.config.get('sessionTimeout') || 30 * 60 * 1000;
      
      if (now - this.lastActivity > timeout) {
        this.sessionId = this.createNewSession();
      }
    };
    
    this.activityTimer = window.setInterval(checkActivity, 60 * 1000) as unknown as number;
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkActivity();
      }
    });
    
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      }, { passive: true });
    });
  }

  getAnonymousId(): string {
    return this.anonymousId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.storage.set('tapistry_uid', userId, 365 * 24 * 60 * 60 * 1000);
  }

  reset(): void {
    this.userId = null;
    this.sessionId = this.createNewSession();
    this.anonymousId = generateUUID();
    
    this.storage.remove('tapistry_uid');
    this.storage.set('tapistry_aid', this.anonymousId, 365 * 24 * 60 * 60 * 1000);
  }

  destroy(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
  }
}