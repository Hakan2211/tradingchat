const HISTORY_KEY = 'navigation-history';

/**
 * Adds a new path to our tab's session history.
 */
export function trackPath(path: string) {
  // Use a try/catch block in case sessionStorage is disabled (e.g., private browsing)
  try {
    const historyJson = window.sessionStorage.getItem(HISTORY_KEY);
    const history: string[] = historyJson ? JSON.parse(historyJson) : [];
    history.push(path);
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Could not access session storage:', error);
  }
}

/**
 * Checks if there is more than one entry in our history, meaning we can safely go back.
 */
export function hasInAppHistory(): boolean {
  try {
    const historyJson = window.sessionStorage.getItem(HISTORY_KEY);
    if (!historyJson) return false;
    const history: string[] = JSON.parse(historyJson);
    return history.length > 1;
  } catch (error) {
    console.error('Could not access session storage:', error);
    return false;
  }
}
