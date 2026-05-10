const express = require('express');
const { createSession, destroySession, checkPin, isValidSession } = require('../middleware/auth');

const router = express.Router();

router.post('/auth', (req, res) => {
    const { pin } = req.body || {};
    if (!checkPin(pin)) {
        return res.status(401).json({ error: 'invalid_pin' });
    }
    const token = createSession();
    res.cookie('session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ ok: true, token });
});

router.post('/logout', (req, res) => {
    const token = req.cookies && req.cookies.session;
    if (token) destroySession(token);
    res.clearCookie('session');
    res.json({ ok: true });
});

router.get('/auth/status', (req, res) => {
    const token = req.cookies && req.cookies.session;
    res.json({ authenticated: isValidSession(token) });
});

module.exports = router;
