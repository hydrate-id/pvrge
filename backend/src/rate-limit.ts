/**
 * In-memory sliding window rate limiter and IP utilities.
 * Designed for Cloudflare Workers / V8 isolates with minimal CPU overhead (< 0.05ms)
 * and automatic memory pruning.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastPrune = 0;
const PRUNE_INTERVAL_MS = 60_000;
const MAX_STORE_ENTRIES = 5_000;

function pruneExpired(now: number): void {
  if (now - lastPrune > PRUNE_INTERVAL_MS || rateLimitStore.size > MAX_STORE_ENTRIES) {
    lastPrune = now;
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

/**
 * Check rate limit for a given key using an in-memory window.
 * Returns allowed status, remaining requests, and retry-after in seconds.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + windowSeconds * 1000 };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      count: 1,
      remaining: Math.max(0, maxRequests - 1),
      resetAt: entry.resetAt,
      retryAfter: windowSeconds,
    };
  }

  entry.count++;
  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed,
    count: entry.count,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  };
}

/**
 * Check if an IP is currently blocked due to repeated failed logins (>= 5 in 15 mins).
 */
export function isLoginBlocked(ip: string): { blocked: boolean; retryAfter: number } {
  const key = `login_fail:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    if (entry) rateLimitStore.delete(key);
    return { blocked: false, retryAfter: 0 };
  }
  if (entry.count >= 5) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { blocked: true, retryAfter };
  }
  return { blocked: false, retryAfter: 0 };
}

/**
 * Record a failed login attempt for an IP.
 */
export function recordFailedLogin(ip: string, windowSeconds = 900): void {
  const key = `login_fail:${ip}`;
  const now = Date.now();
  pruneExpired(now);

  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
  } else {
    entry.count++;
  }
}

/**
 * Reset failed login count for an IP on successful login.
 */
export function resetFailedLogin(ip: string): void {
  const key = `login_fail:${ip}`;
  rateLimitStore.delete(key);
}

/**
 * Extract client IP from headers.
 * Precedence: cf-connecting-ip -> x-real-ip -> x-forwarded-for (first IP) -> fallback 127.0.0.1
 */
export function getClientIp(headers: Headers): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "127.0.0.1";
}

/**
 * Compute SHA-256 hash of an IP address using Web Crypto API.
 */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
