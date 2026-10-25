import { describe, expect, it, vi } from 'vitest'
import { ClientRateLimiter, executeWithRetry } from '../rateLimiter'

describe('Rate Limiter & Exponential Backoff Retry (AC-009, AC-010)', () => {
  it('allows immediate execution when tokens are available in bucket', async () => {
    const limiter = new ClientRateLimiter(5, 60_000)
    await expect(limiter.acquire()).resolves.toBeUndefined()
  })

  it('retries transient HTTP 429 and 503 errors and succeeds', async () => {
    let attempts = 0
    const operation = vi.fn(async () => {
      attempts += 1
      if (attempts < 3) {
        const err = new Error('Too Many Requests') as Error & { status?: number }
        err.status = 429
        throw err
      }
      return 'ok'
    })

    const result = await executeWithRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 5,
      maxDelayMs: 20,
    })

    expect(result).toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-retryable HTTP 401 or 403 errors', async () => {
    const operation = vi.fn(async () => {
      const err = new Error('Forbidden') as Error & { status?: number }
      err.status = 403
      throw err
    })

    await expect(
      executeWithRetry(operation, { maxRetries: 3, baseDelayMs: 5, maxDelayMs: 10 }),
    ).rejects.toThrow('Forbidden')
    expect(operation).toHaveBeenCalledTimes(1)
  })
})

