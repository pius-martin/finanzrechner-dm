// Seed-Funktion - aufrufbar von server.js (Auto-Seed) oder per CLI
// (scripts/seed-szenarien.js).
//
// Idempotent: bestehende Szenarien werden ueber den Namen identifiziert
// und ihre Inputs auf die Soll-Werte gesetzt. Results werden neu gerechnet.

const Calc = require('../lib/calc');
const prisma = require('../lib/db');

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

const COMMON = {
    atPensionBruttoMt:  3500,
    chAhvBruttoMt:      500,
    pensionYNettoMt:    1000,
    mieteWhg2BruttoMt:  1200,
    mieteWhg2Startjahr: 2028,
    mieteWhg2Wert:      300000,

    haushaltBis80:      7000,
    haushaltAb80:       5500,
    instandhaltungPa:   6000,

    depotStart:         1180000,
    goldStart:          1374000,
    ptLda95Wert:        570000,
    ptMieteBruttoPa:    18000,
    holdingFixJ1:       24900,
    holdingFixJx:       20400,

    darlehenJahre:      10,
    darlehenZinsReal:   0.005,

    kreditBetrag:       300000,
    kreditLaufzeit:     15,
    kreditRealzins:     0.015,

    renoWhg22026:       100000,
    autoPrivat:         50000,
    ramRueckkauf:       30000,
    ptZuschuss:         150000,

    privathausWert:     1500000,
    schrunsWohnungY:    700000,
    diverses:           50000,
    lwfSchruns:         15000,
    privGold2026:       335000,
    privSilber2026:     4000,

    koest:              0.23,
    kest:               0.275,
    kvPensionisten:     0.06,
    ptIrc:              0.21,
    depotRenditeReal:   0.03,
    sonderFreibetrag:   620,
    sonderSteuersatz:   0.06,
    goldBilanzFaktor:   0.77,

    estTarifstufen:     DEFAULT_EST_STUFEN,
    pabMax:             1020,
    pabUnten:           21614,
    pabOben:            31494,

    grestStufen:        DEFAULT_GREST_STUFEN,
};

const SZENARIEN = [
    { name: 'v6 Standard',          description: 'Reno 450k, Darlehen 200k',
      inputs: { ...COMMON, renoWhg120272029: 450000, darlehenBetrag: 200000 } },
    { name: 'v6b Reno reduziert',   description: 'Reno 400k, Darlehen 200k',
      inputs: { ...COMMON, renoWhg120272029: 400000, darlehenBetrag: 200000 } },
    { name: 'v6c Reno minimal',     description: 'Reno 350k, Darlehen 200k',
      inputs: { ...COMMON, renoWhg120272029: 350000, darlehenBetrag: 200000 } },
    { name: 'v6d Darlehen erhoeht', description: 'Reno 450k, Darlehen 260k - aus Excel',
      inputs: { ...COMMON, renoWhg120272029: 450000, darlehenBetrag: 260000 } },
];

function camelToSnake(o) {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
        const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
        out[snake] = v;
    }
    return out;
}

async function upsertSzenario(s) {
    let scenario = await prisma.scenario.findFirst({
        where: { name: s.name },
    });

    if (!scenario) {
        scenario = await prisma.scenario.create({
            data: {
                name: s.name,
                description: s.description,
                inputs: { create: s.inputs },
            },
        });
        console.log(`  + neu angelegt: ${s.name}`);
    } else {
        await prisma.scenarioInputs.upsert({
            where:  { scenarioId: scenario.id },
            create: { scenarioId: scenario.id, ...s.inputs },
            update: s.inputs,
        });
        await prisma.scenario.update({
            where: { id: scenario.id },
            data: { description: s.description, updatedAt: new Date() },
        });
        console.log(`  ~ aktualisiert: ${s.name}`);
    }

    const r = Calc.berechneAlles(camelToSnake(s.inputs));
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
        where:  { scenarioId: scenario.id },
        create: { scenarioId: scenario.id, ...data },
        update: data,
    });
    console.log(`    -> gold-rate=${r.gold_rate_optimal}, depot-ende=${Math.round(r.depot_ende_2055)}, erbmasse-netto=${Math.round(r.erbmasse_netto)}`);
}

async function seedAll() {
    console.log('Seed: Briefing-Szenarien v6 / v6b / v6c / v6d');
    for (const s of SZENARIEN) await upsertSzenario(s);
    console.log('Seed fertig.');
}

module.exports = seedAll;
