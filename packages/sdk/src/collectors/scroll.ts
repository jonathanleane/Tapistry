import { EventCollector } from './base';
import type { ScrollEvent } from '@tapistry/shared';

export class ScrollCollector extends EventCollector {
  private scrollHandler?: EventListener;
  private rafId?: number;
  private lastScrollTime = 0;
  private maxScrollDepth = 0;
  private recordedMilestones = new Set<number>();
  private pageHeight = 0;

  start(): void {
    if (this.active) return;
    this.active = true;

    this.reset();
    this.attachListeners();
  }

  stop(): void {
    this.active = false;
    this.removeListeners();
  }

  reset(): void {
    this.maxScrollDepth = 0;
    this.recordedMilestones.clear();
    this.updatePageHeight();
  }

  private attachListeners(): void {
    this.scrollHandler = this.handleScroll.bind(this);
    
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('resize', () => this.updatePageHeight(), { passive: true });
    
    this.updatePageHeight();
    this.checkScrollDepth();
  }

  private removeListeners(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private handleScroll(): void {
    if (!this.active) return;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.checkScrollDepth();
    });
  }

  private updatePageHeight(): void {
    this.pageHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
  }

  private checkScrollDepth(): void {
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollableHeight = this.pageHeight - viewportHeight;
    
    if (scrollableHeight <= 0) {
      this.recordMilestone(100);
      return;
    }

    const scrollDepthPct = Math.min(100, Math.round((scrollTop / scrollableHeight) * 100));
    
    if (scrollDepthPct > this.maxScrollDepth) {
      this.maxScrollDepth = scrollDepthPct;
      
      const milestones = this.config.get('scroll')?.milestones || [25, 50, 75, 90, 100];
      
      for (const milestone of milestones) {
        if (scrollDepthPct >= milestone && !this.recordedMilestones.has(milestone)) {
          this.recordMilestone(milestone);
        }
      }
    }
  }

  private recordMilestone(milestone: number): void {
    if (this.recordedMilestones.has(milestone)) {
      return;
    }

    this.recordedMilestones.add(milestone);

    const now = Date.now();
    if (now - this.lastScrollTime < 100) {
      return;
    }
    
    this.lastScrollTime = now;

    const scrollEvent: Partial<ScrollEvent> = {
      type: 'scroll',
      max_depth_pct: milestone,
      milestones: Array.from(this.recordedMilestones).sort((a, b) => a - b),
    };

    this.transport.send(scrollEvent);
  }
}