type SecurityEventType =
  | 'device_auth_failed'
  | 'user_auth_failed'
  | 'rate_limit_hit'
  | 'invalid_payload'
  | 'bilge_alert'
  | 'command_updated'
  | 'watchdog_alert'
  | 'unauthorized_access';

interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  path?: string;
  reason?: string;
  timestamp?: string;
  readingId?: string;
  resetAt?: string;
  contentLength?: string;
  issues?: string[];
  [key: string]: unknown;
}

/**
 * Sanitizes an object before logging to prevent leaking secrets, passwords, or full API keys
 */
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('auth')
    ) {
      if (typeof value === 'string' && value.length > 4) {
        sanitized[key] = `${value.substring(0, 3)}...[REDACTED]`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const sanitized = sanitize({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });
  console.warn(`[SECURITY] ${event.type.toUpperCase()}:`, JSON.stringify(sanitized));
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  const sanitized = meta ? sanitize(meta) : undefined;
  console.log(`[INFO] ${message}`, sanitized ? JSON.stringify(sanitized) : '');
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  const sanitized = meta ? sanitize(meta) : undefined;
  console.warn(`[WARN] ${message}`, sanitized ? JSON.stringify(sanitized) : '');
}

export function logError(message: string, error?: unknown, meta?: Record<string, unknown>): void {
  const sanitized = meta ? sanitize(meta) : undefined;
  const errorDetails =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error: String(error) };
  console.error(`[ERROR] ${message}`, JSON.stringify({ ...errorDetails, ...sanitized }));
}
