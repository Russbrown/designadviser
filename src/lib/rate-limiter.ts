interface RateLimitState {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitState>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export function rateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const state = rateLimitCache.get(key);

  if (!state || now > state.resetTime) {
    const newState: RateLimitState = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitCache.set(key, newState);
    
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: newState.resetTime,
    };
  }

  if (state.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: state.resetTime,
    };
  }

  state.count++;
  rateLimitCache.set(key, state);

  return {
    success: true,
    limit,
    remaining: limit - state.count,
    resetTime: state.resetTime,
  };
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
  return `rate_limit:${ip}`;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, state] of rateLimitCache.entries()) {
    if (now > state.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}, 60000);