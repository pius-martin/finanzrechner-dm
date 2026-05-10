const express = require('express');
const prisma = require('../lib/db');
const Calc = require('../lib/calc');
const { plain } = require('../lib/serialize');
const { exportXlsx } = require('../lib/excel');

const router = express.Router();

// Mapping von Snake-Case (API/DB) zu Camel-Case (Prisma model)
const INPUT_FIELD_MAP = {
    at_pension_brutto_mt:  'atPensionBruttoMt',
    ch_ahv_brutto_mt:      'chAhvBruttoMt',
    pension_y_netto_mt:    'pensionYNettoMt',
    miete_whg2_brutto_mt:  'mieteWhg2BruttoMt',
    miete_whg2_startjahr:  'mieteWhg2Startjahr',
    miete_whg2_wert:       'mieteWhg2Wert',
    haushalt_bis_80:       'haushaltBis80',
    haushalt_ab_80:        'haushaltAb80',
    instandhaltung_pa:     'instandhaltungPa',
    depot_start:           'depotStart',
    gold_start:            'goldStart',
    pt_lda_95_wert:        'ptLda95Wert',
    pt_miete_brutto_pa:    'ptMieteBruttoPa',
    holding_fix_j1:        'holdingFixJ1',
    holding_fix_jx:        'holdingFixJx',
    darlehen_betrag:       'darlehenBetrag',
    darlehen_jahre:        'darlehenJahre',
    darlehen_zins_real:    'darlehenZinsReal',
    kredit_betrag:         'kreditBetrag',
    kredit_laufzeit:       'kreditLaufzeit',
    kredit_realzins:       'kreditRealzins',
    reno_whg2_2026:        'renoWhg22026',
    reno_whg1_2027_2029:   'renoWhg120272029',
    auto_privat:           'autoPrivat',
    ram_rueckkauf:         'ramRueckkauf',
    pt_zuschuss:           'ptZuschuss',
    privathaus_wert:       'privathausWert',
    schruns_wohnung_y:     'schrunsWohnungY',
    diverses:              'diverses',
    lwf_schruns:           'lwfSchruns',
    priv_gold_2026:        'privGold2026',
    priv_silber_2026:      'privSilber2026',
    koest:                 'koest',
    kest:                  'kest',
    kv_pensionisten:       'kvPensionisten',
    pt_irc:                'ptIrc',
    depot_rendite_real:    'depotRenditeReal',
    sonder_freibetrag:     'sonderFreibetrag',
    sonder_steuersatz:     'sonderSteuersatz',
    gold_bilanz_faktor:    'goldBilanzFaktor',
    est_tarifstufen:       'estTarifstufen',
    pab_max:               'pabMax',
    pab_unten:             'pabUnten',
    pab_oben:              'pabOben',
    grest_stufen:          'grestStufen',
};

const INTEGER_FIELDS = new Set(['mieteWhg2Startjahr', 'darlehenJahre', 'kreditLaufzeit']);
const JSON_FIELDS = new Set(['estTarifstufen', 'grestStufen']);

const DEFAULT_EST_STUFEN = [
    { bis: 13539, satz: 0 },
    { bis: 21992, satz: 0.20 },
    { bis: 36458, satz: 0.30 },
    { bis: 70365, satz: 0.40 },
    { bis: 104859, satz: 0.48 },
    { bis: 1000000, satz: 0.50 },
    { bis: null, satz: 0.55 },
];
const DEFAULT_GREST_STUFEN = [
    { bis: 250000, satz: 0.005 },
    { bis: 400000, satz: 0.02 },
    { bis: null, satz: 0.035 },
];

function normalizeInputPatch(rawPatch) {
    const out = {};
    if (!rawPatch || typeof rawPatch !== 'object') return out;
    for (const [k, v] of Object.entries(rawPatch)) {
        const camel = INPUT_FIELD_MAP[k] || (Object.values(INPUT_FIELD_MAP).includes(k) ? k : null);
        if (!camel) continue;
        if (v === null || v === undefined || v === '') continue;
        if (JSON_FIELDS.has(camel)) {
            out[camel] = (typeof v === 'string') ? JSON.parse(v) : v;
        } else if (INTEGER_FIELDS.has(camel)) {
            out[camel] = parseInt(v, 10);
        } else {
            out[camel] = Number(v);
        }
    }
    return out;
}

async function recomputeAndStore(scenarioId) {
    const inputs = await prisma.scenarioInputs.findUnique({ where: { scenarioId } });
    if (!inputs) throw new Error('inputs missing');
    const r = Calc.berechneAlles(plain(inputs));

    const data = {
        pensionNettoMt:  r.pension_netto_mt,
        mieteNettoMt:    r.miete_netto_mt,
        goldRateOptimal: r.gold_rate_optimal,
        goldEnde2055:    r.gold_ende_2055,
        goldErhaltPct:   r.gold_erhalt_pct,
        depotEnde2055:   r.depot_ende_2055,
        erbmasseBrutto:  r.erbmasse_brutto,
        erbmasseNetto:   r.erbmasse_netto,
        grestGesamt:     r.grest_gesamt,
        cashflowJson:    r.cashflow_json,
        calculatedAt:    new Date(),
    };

    await prisma.scenarioResults.upsert({
        where:  { scenarioId },
        create: { scenarioId, ...data },
        update: data,
    });

    return r;
}

// GET /api/scenarios
router.get('/scenarios', async (_req, res, next) => {
    try {
        const list = await prisma.scenario.findMany({
            where: { archived: false },
            orderBy: { updatedAt: 'desc' },
            include: { results: true },
        });
        res.json(plain(list));
    } catch (e) { next(e); }
});

// POST /api/scenarios
router.post('/scenarios', async (req, res, next) => {
    try {
        const name = (req.body && req.body.name) || 'Neues Szenario';
        const description = (req.body && req.body.description) || null;
        const scenario = await prisma.scenario.create({
            data: {
                name,
                description,
                inputs: {
                    create: {
                        estTarifstufen: DEFAULT_EST_STUFEN,
                        grestStufen:    DEFAULT_GREST_STUFEN,
                    },
                },
            },
            include: { inputs: true },
        });
        await recomputeAndStore(scenario.id);
        const full = await prisma.scenario.findUnique({
            where: { id: scenario.id },
            include: { inputs: true, results: true },
        });
        res.status(201).json(plain(full));
    } catch (e) { next(e); }
});

// GET /api/scenarios/:id
router.get('/scenarios/:id', async (req, res, next) => {
    try {
        const scenario = await prisma.scenario.findUnique({
            where: { id: req.params.id },
            include: { inputs: true, results: true },
        });
        if (!scenario) return res.status(404).json({ error: 'not_found' });
        res.json(plain(scenario));
    } catch (e) { next(e); }
});

// PUT /api/scenarios/:id
router.put('/scenarios/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const body = req.body || {};
        const scenarioPatch = {};
        if (typeof body.name === 'string') scenarioPatch.name = body.name;
        if (typeof body.description === 'string' || body.description === null) scenarioPatch.description = body.description;

        const inputPatch = normalizeInputPatch(body.inputs);

        const scenario = await prisma.scenario.findUnique({ where: { id } });
        if (!scenario) return res.status(404).json({ error: 'not_found' });

        const updates = [];
        if (Object.keys(scenarioPatch).length > 0) {
            updates.push(prisma.scenario.update({
                where: { id },
                data: { ...scenarioPatch, updatedAt: new Date() },
            }));
        }
        if (Object.keys(inputPatch).length > 0) {
            updates.push(prisma.scenarioInputs.update({
                where: { scenarioId: id },
                data: inputPatch,
            }));
        } else {
            // Touch updatedAt anyway if only name changed handled above
        }
        if (updates.length > 0) await Promise.all(updates);

        await recomputeAndStore(id);

        const full = await prisma.scenario.findUnique({
            where: { id },
            include: { inputs: true, results: true },
        });
        res.json(plain(full));
    } catch (e) { next(e); }
});

// POST /api/scenarios/:id/duplicate
router.post('/scenarios/:id/duplicate', async (req, res, next) => {
    try {
        const id = req.params.id;
        const src = await prisma.scenario.findUnique({
            where: { id },
            include: { inputs: true },
        });
        if (!src) return res.status(404).json({ error: 'not_found' });

        const inputData = { ...src.inputs };
        delete inputData.id;
        delete inputData.scenarioId;

        const dup = await prisma.scenario.create({
            data: {
                name: `Kopie von ${src.name}`,
                description: src.description,
                inputs: { create: inputData },
            },
        });
        await recomputeAndStore(dup.id);
        const full = await prisma.scenario.findUnique({
            where: { id: dup.id },
            include: { inputs: true, results: true },
        });
        res.status(201).json(plain(full));
    } catch (e) { next(e); }
});

// DELETE /api/scenarios/:id
router.delete('/scenarios/:id', async (req, res, next) => {
    try {
        await prisma.scenario.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    } catch (e) {
        if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
        next(e);
    }
});

// POST /api/scenarios/:id/calculate
router.post('/scenarios/:id/calculate', async (req, res, next) => {
    try {
        const r = await recomputeAndStore(req.params.id);
        res.json(plain(r));
    } catch (e) { next(e); }
});

// GET /api/scenarios/:id/export-xlsx
router.get('/scenarios/:id/export-xlsx', async (req, res, next) => {
    try {
        const scenario = await prisma.scenario.findUnique({
            where: { id: req.params.id },
            include: { inputs: true, results: true },
        });
        if (!scenario) return res.status(404).json({ error: 'not_found' });

        const buf = await exportXlsx(plain(scenario));
        const safeName = (scenario.name || 'szenario').replace(/[^a-zA-Z0-9_-]+/g, '_');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="entnahmeplan_${safeName}.xlsx"`);
        res.send(buf);
    } catch (e) { next(e); }
});

module.exports = router;
