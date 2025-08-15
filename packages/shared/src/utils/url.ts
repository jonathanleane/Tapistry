const DEFAULT_QUERY_ALLOWLIST = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'variant',
  'lang',
];

export function normalizePath(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname.toLowerCase();
    
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    path = path.replace(/\/index(\.html?)?$/, '');
    
    return path || '/';
  } catch {
    return '/';
  }
}

export function sanitizeUrl(
  url: string,
  allowlist: string[] = DEFAULT_QUERY_ALLOWLIST,
): string {
  try {
    const u = new URL(url);
    const keep = new URLSearchParams();
    
    for (const [key, value] of u.searchParams) {
      if (allowlist.includes(key)) {
        keep.append(key, value);
      }
    }
    
    u.search = keep.toString();
    u.hash = '';
    
    return u.toString();
  } catch {
    return url;
  }
}

export function extractUTMParams(url: string): Record<string, string> {
  const utm: Record<string, string> = {};
  
  try {
    const u = new URL(url);
    for (const [key, value] of u.searchParams) {
      if (key.startsWith('utm_')) {
        utm[key] = value;
      }
    }
  } catch {
    // Invalid URL
  }
  
  return utm;
}