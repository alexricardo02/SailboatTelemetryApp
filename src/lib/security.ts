import crypto from 'crypto';

/**
 * Constant-time comparison between two strings to prevent timing side-channel attacks.
 * Uses SHA-256 hashing to normalize string lengths before comparing.
 */
export function timingSafeEqualStrings(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;

  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Sanitizes and extracts client IP from request headers securely,
 * prioritizing trusted proxy headers (Vercel, Cloudflare) and validating IP format.
 */
export function extractClientIp(req: Request): string {
  // Check trusted proxy headers first
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp.trim())) return cfIp.trim();

  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    const ip = vercelIp.split(',')[0].trim();
    if (isValidIp(ip)) return ip;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (isValidIp(ip)) return ip;
  }

  return '127.0.0.1';
}

function isValidIp(ip: string): boolean {
  // IPv4 simple regex
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 simple regex
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;

  return ipv4Pattern.test(ip) || (ip.includes(':') && ipv6Pattern.test(ip));
}
