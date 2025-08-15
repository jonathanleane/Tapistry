export class Storage {
  private cookiesEnabled: boolean;
  private localStorageEnabled: boolean;

  constructor() {
    this.cookiesEnabled = this.testCookies();
    this.localStorageEnabled = this.testLocalStorage();
  }

  async get(key: string): Promise<string | null> {
    if (this.localStorageEnabled) {
      try {
        return localStorage.getItem(key);
      } catch {
        // Fall through to cookies
      }
    }

    if (this.cookiesEnabled) {
      return this.getCookie(key);
    }

    return null;
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    if (this.localStorageEnabled) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // Fall through to cookies
      }
    }

    if (this.cookiesEnabled) {
      this.setCookie(key, value, expiryMs);
    }
  }

  remove(key: string): void {
    if (this.localStorageEnabled) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }

    if (this.cookiesEnabled) {
      this.deleteCookie(key);
    }
  }

  private testLocalStorage(): boolean {
    try {
      const test = '__tapistry_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testCookies(): boolean {
    try {
      document.cookie = '__tapistry_test__=1; SameSite=Lax';
      const hasCookie = document.cookie.includes('__tapistry_test__');
      this.deleteCookie('__tapistry_test__');
      return hasCookie;
    } catch {
      return false;
    }
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  private setCookie(name: string, value: string, expiryMs?: number): void {
    let cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
    
    if (expiryMs) {
      const date = new Date();
      date.setTime(date.getTime() + expiryMs);
      cookie += `; expires=${date.toUTCString()}`;
    }
    
    if (window.location.protocol === 'https:') {
      cookie += '; Secure';
    }
    
    document.cookie = cookie;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}