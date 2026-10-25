/**
 * Token-bucket rate limiter & exponential backoff with full jitter for Google Sheets API v4 (AC-009, AC-010).
 */

export class ClientRateLimiter {
  private tokens: number
  private readonly maxTokens: number
  private readonly refillRatePerMs: number
  private lastRefill: number
  private queue: Promise<void> = Promise.resolve()

  constructor(maxTokens = 50, windowMs = 60_000) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.refillRatePerMs = maxTokens / windowMs
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = Math.max(0, now - this.lastRefill)
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs)
    this.lastRefill = now
  }

  private async acquireNext(): Promise<void> {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRatePerMs)
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.refill()
        this.tokens = Math.max(0, this.tokens - 1)
        resolve()
      }, waitMs)
    })
  }

  public acquire(): Promise<void> {
    const next = this.queue.then(() => this.acquireNext())
    this.queue = next.catch(() => undefined)
    return next
  }
}

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  limiter?: ClientRateLimiter
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3
  const baseDelayMs = options.baseDelayMs ?? 400
  const maxDelayMs = options.maxDelayMs ?? 8000
  const limiter = options.limiter

  let attempt = 0
  for (;;) {
    try {
      if (limiter) {
        await limiter.acquire()
      }
      return await operation()
    } catch (error: unknown) {
      attempt += 1
      const status = (error as { status?: number })?.status
      const isRetryable =
        status === 429 || (typeof status === 'number' && status >= 500 && status <= 504)
      if (!isRetryable || attempt > maxRetries) {
        throw error
      }
      const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      const jitteredDelay = Math.max(1, Math.floor(Math.random() * expDelay))
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay))
    }
  }
}
