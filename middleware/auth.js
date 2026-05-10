const crypto = require('crypto');

// In-Memory Session Store. Genuegt fuer Single-Instance Railway Deploy.
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage

function createSession() {
    const token = crypto.randomUUID();
    sessions.set(token, { createdAt: Date.now() });
    return token;
}

function destroySession(token) {
    sessions.delete(token);
}

function isValidSession(token) {
    if (!token) return false;
    const s = sessions.get(token);
    if (!s) return false;
    if (Date.now() - s.createdAt > SESSION_TTL_MS) {
        sessions.delete(token);
        return false;
    }
    return true;
}

function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies.session;
    if (!isValidSession(token)) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}

function checkPin(pin) {
    const expected = process.env.APP_PIN;
    if (!expected) {
        // Dev-Modus: kein PIN gesetzt → akzeptieren
        return true;
    }
    if (typeof pin !== 'string') return false;
    if (pin.length !== expected.length) return false;
    // Constant-time compare
    return crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
}

module.exports = { createSession, destroySession, isValidSession, requireAuth, checkPin };
