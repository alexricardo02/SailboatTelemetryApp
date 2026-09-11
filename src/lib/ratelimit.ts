import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory sliding window rate limiter fallback for local development or when Redis is unconfigured
class MemoryRateLimiter {
  private hits: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = (this.hits.get(identifier) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const reset = oldest + this.windowMs;
      this.hits.set(identifier, timestamps);
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
      };
    }

    timestamps.push(now);
    this.hits.set(identifier, timestamps);

    // Garbage collection for stale keys
    if (this.hits.size > 2000) {
      const entries = Array.from(this.hits.entries());
      entries.forEach(([key, list]) => {
        const active = list.filter((ts) => ts > windowStart);
        if (active.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, active);
        }
      });
    }

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      reset: now + this.windowMs,
    };
  }
}

// Check if Upstash Redis credentials are provided
const hasUpstash =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN) &&
  !process.env.UPSTASH_REDIS_REST_URL?.includes('example.com') &&
  !process.env.UPSTASH_REDIS_REST_URL?.includes('placeholder');

let redisClient: Redis | null = null;
if (hasUpstash) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch {
    redisClient = null;
  }
}

function createLimiter(
  requests: number,
  windowDuration: `${number} s` | `${number} m` | `${number} h`,
  windowMs: number
) {
  if (redisClient) {
    const upstashLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(requests, windowDuration),
      analytics: false,
    });
    return async (identifier: string): Promise<RateLimitResult> => {
      try {
        const res = await upstashLimiter.limit(identifier);
        return {
          success: res.success,
          limit: res.limit,
          remaining: res.remaining,
          reset: res.reset,
        };
      } catch {
        // Redis connection error fallback
        const fallback = new MemoryRateLimiter(requests, windowMs);
        return fallback.limit(identifier);
      }
    };
  }

  const memoryLimiter = new MemoryRateLimiter(requests, windowMs);
  return (identifier: string) => memoryLimiter.limit(identifier);
}

// 1. ESP32 Telemetry intake: 1 request per 2 minutes (120,000 ms)
export const telemetryLimiter = createLimiter(1, '2 m', 120_000);

// 2. ESP32 Downlink command fetch: 1 request per 1 minute (60,000 ms)
export const commandsDeviceLimiter = createLimiter(1, '1 m', 60_000);

// 3. User Downlink command update: 10 requests per 1 minute
export const commandsUserLimiter = createLimiter(10, '1 m', 60_000);

// 4. Auth login attempts: 5 requests per 15 minutes (900,000 ms)
export const authLimiter = createLimiter(5, '15 m', 900_000);

// 5. Dashboard Data API: 60 requests per 1 minute
export const dashboardApiLimiter = createLimiter(60, '1 m', 60_000);
