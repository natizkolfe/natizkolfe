const LIMIT = 8;
const LOCK_MS = 15 * 60 * 1000;

type Attempt = { fails: number; until: number };
const attempts = new Map<string, Attempt>();

export function adminAttemptKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "local";
  return ip.slice(0, 120);
}

export function adminAttemptBlocked(key: string, now = Date.now()): boolean {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (now >= attempt.until) {
    attempts.delete(key);
    return false;
  }
  return attempt.fails >= LIMIT;
}

export function recordAdminFailure(key: string, now = Date.now()) {
  const attempt = attempts.get(key);
  if (!attempt || now >= attempt.until) {
    attempts.set(key, { fails: 1, until: now + LOCK_MS });
    return;
  }
  attempt.fails += 1;
  if (attempt.fails >= LIMIT) attempt.until = now + LOCK_MS;
}

export function clearAdminAttempts(key: string) {
  attempts.delete(key);
}
