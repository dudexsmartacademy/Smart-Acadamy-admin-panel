export function getStorageData<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

export function setStorageData<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing key "${key}" to localStorage:`, error);
    return false;
  }
}

export function removeStorageData(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing key "${key}" from localStorage:`, error);
    return false;
  }
}

export function clearStoragePattern(prefix: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {
    console.error('Error clearing storage pattern:', e);
  }
}
