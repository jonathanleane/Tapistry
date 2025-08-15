export function generateSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.nodeName.toLowerCase();
    
    if (current.id && isValidId(current.id)) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    const dataTestId = current.getAttribute('data-testid') || 
                      current.getAttribute('data-test-id') ||
                      current.getAttribute('data-test');
    
    if (dataTestId) {
      selector += `[data-testid="${dataTestId}"]`;
    } else if (current.getAttribute('role')) {
      selector += `[role="${current.getAttribute('role')}"]`;
    } else if (current.getAttribute('name')) {
      selector += `[name="${current.getAttribute('name')}"]`;
    } else if (current.className) {
      const classes = current.className
        .split(' ')
        .filter(c => c && !isDynamicClass(c))
        .slice(0, 2);
      
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    const siblings = current.parentElement?.children;
    if (siblings && siblings.length > 1) {
      const index = Array.from(siblings).indexOf(current);
      if (index > 0) {
        selector += `:nth-child(${index + 1})`;
      }
    }
    
    path.unshift(selector);
    
    if (path.length >= 5) {
      break;
    }
    
    current = current.parentElement;
  }
  
  const fullSelector = path.join(' > ');
  return fullSelector.slice(0, 128);
}

export function hashSelector(selector: string): number {
  let hash = 0;
  
  for (let i = 0; i < selector.length; i++) {
    const char = selector.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash);
}

function isValidId(id: string): boolean {
  return /^[a-zA-Z][\w-]*$/.test(id) && !isDynamicId(id);
}

function isDynamicId(id: string): boolean {
  return /\d{4,}/.test(id) || 
         /[0-9a-f]{8,}/i.test(id) ||
         /temp|dynamic|random/i.test(id);
}

function isDynamicClass(className: string): boolean {
  return /^(css|sc|emotion|styled)-/.test(className) ||
         /[0-9a-f]{6,}/i.test(className) ||
         /-\d{4,}$/.test(className);
}