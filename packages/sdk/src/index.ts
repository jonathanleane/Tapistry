import { TapistrySDK } from './core/sdk';
import type { TapistryConfig } from '@tapistry/shared';

declare global {
  interface Window {
    tapistry: TapistryInstance;
  }
}

export interface TapistryInstance {
  (command: string, ...args: any[]): void;
  q?: Array<[string, ...any[]]>;
  initialized?: boolean;
  sdk?: TapistrySDK;
}

function initializeTapistry(): void {
  const existingInstance = window.tapistry as TapistryInstance | undefined;
  const queue = existingInstance?.q || [];
  
  const sdk = new TapistrySDK();
  
  const tapistryFunction: TapistryInstance = function(command: string, ...args: any[]) {
    if (!sdk.initialized) {
      tapistryFunction.q = tapistryFunction.q || [];
      tapistryFunction.q.push([command, ...args]);
      return;
    }
    
    sdk.execute(command, args);
  };
  
  tapistryFunction.q = queue;
  tapistryFunction.sdk = sdk;
  tapistryFunction.initialized = false;
  
  window.tapistry = tapistryFunction;
  
  const projectKey = document.currentScript?.getAttribute('data-project') || 
                     document.querySelector('script[data-project]')?.getAttribute('data-project');
  
  if (projectKey) {
    sdk.config({ projectKey });
  }
  
  sdk.initialize().then(() => {
    tapistryFunction.initialized = true;
    
    if (tapistryFunction.q && tapistryFunction.q.length > 0) {
      for (const [command, ...args] of tapistryFunction.q) {
        sdk.execute(command, args);
      }
      tapistryFunction.q = [];
    }
  });
}

if (typeof window !== 'undefined' && !window.tapistry?.sdk) {
  initializeTapistry();
}

export { TapistrySDK } from './core/sdk';
export type { TapistryConfig };