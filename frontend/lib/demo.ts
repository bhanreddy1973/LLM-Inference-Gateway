/**
 * Demo mode utilities.
 *
 * When demo mode is active, the dashboard shows sample data
 * and all mutating actions are disabled (read-only view).
 */

const DEMO_KEY = "demo_mode";

export function enterDemoMode() {
  localStorage.setItem(DEMO_KEY, "true");
}

export function exitDemoMode() {
  localStorage.removeItem(DEMO_KEY);
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_KEY) === "true";
}
