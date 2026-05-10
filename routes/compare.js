const express = require('express');
const prisma = require('../lib/db');
const { plain } = require('../lib/serialize');

const router = express.Router();

router.post('/compare', async (req, res, next) => {
    try {
        const ids = (req.body && Array.isArray(req.body.scenario_ids)) ? req.body.scenario_ids : [];
        if (ids.length < 2 || ids.length > 6) {
            return res.status(400).json({ error: 'between 2 and 6 scenarios required' });
        }
        const scenarios = await prisma.scenario.findMany({
            where: { id: { in: ids } },
            include: { inputs: true, results: true },
        });
        const ordered = ids.map(id => scenarios.find(s => s.id === id)).filter(Boolean);
        res.json(plain(ordered));
    } catch (e) { next(e); }
});

module.exports = router;
