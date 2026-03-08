interface RateLimitBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number; // tokens per ms
  lastRefill: number;
}

class RateLimiter {
  private buckets = new Map<string, RateLimitBucket>();

  configure(key: string, requests: number, windowMs: number): void {
    this.buckets.set(key, {
      tokens: requests,
      maxTokens: requests,
      refillRate: requests / windowMs,
      lastRefill: Date.now(),
    });
  }

  async acquire(key: string): Promise<void> {
    const bucket = this.buckets.get(key);
    if (!bucket) return; // no limit configured

    this.refill(bucket);

    if (bucket.tokens < 1) {
      const waitMs = Math.ceil((1 - bucket.tokens) / bucket.refillRate);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 30000)));
      this.refill(bucket);
    }

    bucket.tokens -= 1;
  }

  private refill(bucket: RateLimitBucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
    bucket.lastRefill = now;
  }
}

export const rateLimiter = new RateLimiter();
