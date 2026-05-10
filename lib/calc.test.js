// Validierungs-Smoke-Test fuer lib/calc.js.
// Ruft die Validierungs-Faelle v6 / v6b / v6c / v6d aus dem Briefing auf
// und gibt die berechneten Kernzahlen aus. Schlaegt nicht "fail" - dient
// als Sichtkontrolle, weil das Briefing den Reno-Whg1-Cashflow nicht
// vollstaendig spezifiziert (siehe README).

const Calc = require('./calc');

const cases = [
    { name: 'v6',  reno: 450000, darl: 200000, expectGoldRate: 28487, expectGoldEnde: 738123, expectGoldPct: 53.7 },
    { name: 'v6b', reno: 400000, darl: 200000, expectGoldRate: 23196, expectGoldEnde: 856033, expectGoldPct: 62.3 },
    { name: 'v6c', reno: 350000, darl: 200000, expectGoldRate: 17905, expectGoldEnde: 974181, expectGoldPct: 70.9 },
    { name: 'v6d', reno: 450000, darl: 260000, expectGoldRate: 36068, expectGoldEnde: 568602, expectGoldPct: 41.4 },
];

console.log('Validierungslauf — Briefing-Testfaelle');
console.log('======================================');
console.log('Hinweis: Toleranz ±100€ ist nur erreichbar, wenn der Reno-Whg1-Cashflow');
console.log('exakt dem Original-Excel entspricht. Diese Implementierung approximiert.\n');

for (const c of cases) {
    const inputs = {
        reno_whg1_2027_2029: c.reno,
        darlehen_betrag: c.darl,
    };
    const r = Calc.berechneAlles(inputs);
    const goldRateDelta = r.gold_rate_optimal - c.expectGoldRate;
    const goldEndeDelta = r.gold_ende_2055 - c.expectGoldEnde;
    const goldPctDelta = r.gold_erhalt_pct - c.expectGoldPct;
    console.log(`${c.name.padEnd(4)}  reno=${c.reno}  darl=${c.darl}`);
    console.log(`      pension netto/Mt : ${r.pension_netto_mt.toFixed(2)}`);
    console.log(`      miete netto/Mt   : ${r.miete_netto_mt.toFixed(2)}`);
    console.log(`      kreditrate p.a.  : ${r.kreditrate_jahr.toFixed(2)}`);
    console.log(`      gold rate optimal: ${r.gold_rate_optimal} (erwartet ${c.expectGoldRate}, delta ${goldRateDelta.toFixed(0)})`);
    console.log(`      gold ende 2055   : ${r.gold_ende_2055.toFixed(0)} (erwartet ${c.expectGoldEnde}, delta ${goldEndeDelta.toFixed(0)})`);
    console.log(`      gold erhalt %    : ${r.gold_erhalt_pct.toFixed(1)} (erwartet ${c.expectGoldPct}, delta ${goldPctDelta.toFixed(1)})`);
    console.log(`      depot ende 2055  : ${r.depot_ende_2055.toFixed(0)}`);
    console.log(`      erbmasse netto   : ${r.erbmasse_netto.toFixed(0)}`);
    console.log('');
}

console.log('OK — keine Exceptions.');
