// src/frontend/error-tracking.ts
// Lightweight error tracking for crash reporting

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  tripSlug?: string;
  timestamp: string;
}

function getTripSlugFromUrl(): string | undefined {
  const path = window.location.pathname;
  if (path && path !== '/' && path !== '/admin') {
    return path.slice(1); // Remove leading slash
  }
  return undefined;
}

function reportError(error: ErrorReport): void {
  // Fire and forget - don't let error reporting cause more errors
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(error),
  }).catch(() => {
    // Silently fail - we don't want error reporting to cause cascading failures
  });
}

// Capture unhandled exceptions
window.addEventListener('error', (event) => {
  reportError({
    message: event.message,
    stack: event.error?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    tripSlug: getTripSlugFromUrl(),
    timestamp: new Date().toISOString(),
  });
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  reportError({
    message: reason?.message || String(reason) || 'Unhandled promise rejection',
    stack: reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    tripSlug: getTripSlugFromUrl(),
    timestamp: new Date().toISOString(),
  });
});

// Export for potential manual error reporting
export function trackError(error: Error, context?: Record<string, unknown>): void {
  reportError({
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    tripSlug: getTripSlugFromUrl(),
    timestamp: new Date().toISOString(),
    ...context,
  });
}
