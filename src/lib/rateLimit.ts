// Simple in-memory rate limiter for the login endpoint.
// Tracks failed attempts per IP. After MAX_ATTEMPTS failures within the window,
// that IP is blocked for BLOCK_DURATION_MS.
//
// Note: This resets if the server restarts, which is acceptable for a single-server
// deployment. It does not coordinate across multiple server instances.

const MAX_ATTEMPTS = 10                    // failed attempts before blocking
const WINDOW_MS    = 15 * 60 * 1000       // 15-minute sliding window
const BLOCK_MS     = 15 * 60 * 1000       // block duration after too many failures

interface AttemptRecord {
    timestamps: number[]   // timestamps of recent failed attempts
    blockedUntil?: number  // epoch ms when block expires
}

const attempts = new Map<string, AttemptRecord>()

// Periodically remove stale entries to prevent unbounded memory growth
setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of attempts.entries()) {
        const isBlocked = record.blockedUntil && record.blockedUntil > now
        const hasRecentAttempts = record.timestamps.some(t => now - t < WINDOW_MS)
        if (!isBlocked && !hasRecentAttempts) {
            attempts.delete(ip)
        }
    }
}, 5 * 60 * 1000) // run cleanup every 5 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now()
    const record = attempts.get(ip) ?? { timestamps: [] }

    // If currently blocked, reject immediately
    if (record.blockedUntil && record.blockedUntil > now) {
        const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000)
        return { allowed: false, retryAfterSeconds }
    }

    // Prune timestamps outside the window
    record.timestamps = record.timestamps.filter(t => now - t < WINDOW_MS)

    if (record.timestamps.length >= MAX_ATTEMPTS) {
        record.blockedUntil = now + BLOCK_MS
        attempts.set(ip, record)
        return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) }
    }

    attempts.set(ip, record)
    return { allowed: true }
}

export function recordFailedAttempt(ip: string): void {
    const now = Date.now()
    const record = attempts.get(ip) ?? { timestamps: [] }
    record.timestamps.push(now)
    attempts.set(ip, record)
}

export function clearAttempts(ip: string): void {
    attempts.delete(ip)
}
