import { EventCollector } from './base';
import { normalizePath, extractUTMParams } from '@tapistry/shared';
import type { PageViewEvent } from '@tapistry/shared';

export class PageViewCollector extends EventCollector {
  private previousPath?: string;
  private pageStartTime?: number;
  private observer?: MutationObserver;

  start(): void {
    if (this.active) return;
    this.active = true;

    this.trackCurrentPage();
    this.setupRouteTracking();
  }

  stop(): void {
    this.active = false;
    
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  trackPage(path?: string, properties?: Record<string, any>): void {
    if (!this.active) return;

    const currentPath = path || window.location.pathname;
    const normalizedPath = normalizePath(window.location.href);

    const event: Partial<PageViewEvent> = {
      type: 'page_view',
      path: normalizedPath,
      title: document.title,
      referrer: document.referrer,
      utm: extractUTMParams(window.location.href),
      prev_path: this.previousPath,
      ...properties,
    };

    if (this.pageStartTime) {
      event.duration = Date.now() - this.pageStartTime;
    }

    this.transport.send(event);
    
    this.previousPath = normalizedPath;
    this.pageStartTime = Date.now();
  }

  private trackCurrentPage(): void {
    this.trackPage();
  }

  private setupRouteTracking(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    let lastUrl = window.location.href;
    let debounceTimer: number | undefined;

    const handleRouteChange = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = window.setTimeout(() => {
        const newUrl = window.location.href;
        if (newUrl !== lastUrl) {
          lastUrl = newUrl;
          this.trackPage();
        }
      }, 200) as unknown as number;
    };

    history.pushState = function(...args) {
      const result = originalPushState.apply(history, args);
      handleRouteChange();
      return result;
    };

    history.replaceState = function(...args) {
      const result = originalReplaceState.apply(history, args);
      handleRouteChange();
      return result;
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    const detectSPAChanges = () => {
      this.observer = new MutationObserver(() => {
        handleRouteChange();
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', detectSPAChanges);
    } else {
      detectSPAChanges();
    }
  }
}