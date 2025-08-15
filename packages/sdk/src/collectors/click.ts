import { EventCollector } from './base';
import type { ClickEvent } from '@tapistry/shared';
import { generateSelector, hashSelector } from '../utils/selector';

export class ClickCollector extends EventCollector {
  private listeners: Array<{ element: Element; handler: EventListener }> = [];
  private lastClickTime = 0;
  private lastClickTarget: EventTarget | null = null;

  start(): void {
    if (this.active) return;
    this.active = true;

    this.attachListeners();
  }

  stop(): void {
    this.active = false;
    this.removeListeners();
  }

  private attachListeners(): void {
    const handler = this.handleClick.bind(this);
    
    ['click', 'pointerdown', 'touchend'].forEach(eventType => {
      document.addEventListener(eventType, handler, { 
        capture: true, 
        passive: true 
      });
      
      this.listeners.push({ 
        element: document.documentElement, 
        handler 
      });
    });
  }

  private removeListeners(): void {
    for (const { element, handler } of this.listeners) {
      ['click', 'pointerdown', 'touchend'].forEach(eventType => {
        element.removeEventListener(eventType, handler, { capture: true });
      });
    }
    this.listeners = [];
  }

  private handleClick(event: Event): void {
    if (!this.active) return;

    const now = Date.now();
    if (now - this.lastClickTime < 100 && event.target === this.lastClickTarget) {
      return;
    }
    
    this.lastClickTime = now;
    this.lastClickTarget = event.target;

    const target = event.target as HTMLElement;
    
    if (this.shouldIgnoreElement(target)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const viewport = {
      w: window.innerWidth,
      h: window.innerHeight,
    };

    const x = (event as MouseEvent).clientX || (event as TouchEvent).touches?.[0]?.clientX || 0;
    const y = (event as MouseEvent).clientY || (event as TouchEvent).touches?.[0]?.clientY || 0;

    const normalizedX = Math.min(1, Math.max(0, x / viewport.w));
    const normalizedY = Math.min(1, Math.max(0, y / viewport.h));

    const selector = generateSelector(target);
    const selectorHash = hashSelector(selector);

    const clickEvent: Partial<ClickEvent> = {
      type: 'click',
      x: normalizedX,
      y: normalizedY,
      selector_hash: selectorHash,
      selector: this.config.get('debug') ? selector : undefined,
      button: (event as MouseEvent).button,
      element_text: this.getElementText(target),
    };

    this.transport.send(clickEvent);
  }

  private shouldIgnoreElement(element: HTMLElement): boolean {
    if (element.closest('[data-tapistry-ignore]')) {
      return true;
    }

    if (element.closest('input[type="password"]')) {
      return true;
    }

    return false;
  }

  private getElementText(element: HTMLElement): string | undefined {
    if (this.config.get('maskText')) {
      return undefined;
    }

    const text = element.textContent?.trim().slice(0, 100);
    return text || undefined;
  }
}