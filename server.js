const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const scenarioRoutes = require('./routes/scenarios');
const compareRoutes = require('./routes/compare');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());

// Static frontend
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Auth (unprotected)
app.use('/api', authRoutes);

// Protected API
app.use('/api', requireAuth, scenarioRoutes);
app.use('/api', requireAuth, compareRoutes);

// Error handler
app.use((err, req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('[err]', err && err.stack || err);
    res.status(500).json({ error: 'internal_error', message: err && err.message });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Entnahmeplan-Rechner läuft auf Port ${PORT}`);
});
