import type { DeviceClass } from '../types';

export function getDeviceClass(viewport: { w: number; h: number }): DeviceClass {
  const width = viewport.w;
  
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

export function getViewportBucket(width: number): string {
  if (width < 480) return '0-479';
  if (width < 768) return '480-767';
  if (width < 1024) return '768-1023';
  if (width < 1440) return '1024-1439';
  return '1440+';
}