import { getDatabase } from '../database/schema.js';

export function checkRateLimits(ipAddress, username) {
  const db = getDatabase();
  const lockoutAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS) || 5;
  const lockoutDurationMinutes = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES) || 15;
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15;

  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const ipFailedAttempts = db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts
    WHERE ip_address = ? AND success = 0 AND attempted_at > ?
  `).get(ipAddress, cutoffTime);

  const usernameFailedAttempts = db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts
    WHERE username = ? AND success = 0 AND attempted_at > ?
  `).get(username, cutoffTime);

  return {
    ipLimitReached: ipFailedAttempts.count >= lockoutAttempts,
    usernameLimitReached: usernameFailedAttempts.count >= lockoutAttempts,
    attemptsRemaining: lockoutAttempts - Math.max(ipFailedAttempts.count, usernameFailedAttempts.count)
  };
}

export function isAccountLocked(username) {
  const db = getDatabase();
  const user = db.prepare('SELECT locked_until FROM users WHERE username = ?').get(username);

  if (!user || !user.locked_until) {
    return false;
  }

  const lockedUntil = new Date(user.locked_until);
  const now = new Date();

  if (now > lockedUntil) {
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE username = ?').run(username);
    return false;
  }

  return true;
}

export function recordLoginAttempt(username, ipAddress, success) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO login_attempts (username, ip_address, success)
    VALUES (?, ?, ?)
  `).run(username, ipAddress, success ? 1 : 0);

  if (!success) {
    const user = db.prepare('SELECT id, failed_attempts FROM users WHERE username = ?').get(username);

    if (user) {
      const lockoutAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS) || 5;
      const lockoutDurationMinutes = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES) || 15;

      const newFailedAttempts = (user.failed_attempts || 0) + 1;

      if (newFailedAttempts >= lockoutAttempts) {
        const lockedUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000).toISOString();
        db.prepare(`
          UPDATE users
          SET failed_attempts = ?, locked_until = ?
          WHERE id = ?
        `).run(newFailedAttempts, lockedUntil, user.id);
      } else {
        db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(newFailedAttempts, user.id);
      }
    }
  }
}

export function validatePassword(password) {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;

  if (!password || password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters long`
    };
  }

  return { valid: true };
}

export function updateLastActivity(userId) {
  const db = getDatabase();
  db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
}

export function isSessionValid(userId) {
  const db = getDatabase();
  const sessionTimeoutHours = parseInt(process.env.SESSION_TIMEOUT_HOURS) || 24;

  const user = db.prepare('SELECT last_activity FROM users WHERE id = ?').get(userId);

  if (!user || !user.last_activity) {
    return false;
  }

  const lastActivity = new Date(user.last_activity);
  const now = new Date();
  const diffHours = (now - lastActivity) / (1000 * 60 * 60);

  return diffHours < sessionTimeoutHours;
}
