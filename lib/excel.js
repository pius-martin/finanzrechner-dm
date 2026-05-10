const ExcelJS = require('exceljs');
const Calc = require('./calc');

const CASHFLOW_COLS = [
    { header: 'Jahr',          key: 'jahr',        width: 8 },
    { header: 'Alter',         key: 'alter',       width: 8 },
    { header: 'Depot Anf.',    key: 'depot_anf',   width: 14 },
    { header: 'Rendite',       key: 'rendite',     width: 12 },
    { header: 'PT Miete',      key: 'pt_miete',    width: 12 },
    { header: 'Zinsen X-H',    key: 'zins_xh',     width: 12 },
    { header: 'Kosten',        key: 'kosten',      width: 12 },
    { header: 'PT Inv.',       key: 'pt_inv',      width: 12 },
    { header: 'Darl. brutto',  key: 'darl_brutto', width: 14 },
    { header: 'Lauf. brutto',  key: 'lauf_brutto', width: 14 },
    { header: 'Gold brutto',   key: 'gold_brutto', width: 14 },
    { header: 'Reno extra',    key: 'reno_extra',  width: 12 },
    { header: 'Depot Ende',    key: 'depot',       width: 14 },
    { header: 'Gold Rest',     key: 'gold',        width: 14 },
    { header: 'Bedarf/Mt',     key: 'bedarf_mt',   width: 12 },
    { header: 'Privat/Mt',     key: 'priv_mt',     width: 12 },
    { header: 'Luecke/Mt',     key: 'luecke_mt',   width: 12 },
];

function applyHeader(ws) {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
}

function fmtEur(cell) {
    cell.numFmt = '#,##0 "€";[Red]-#,##0 "€"';
}

async function exportXlsx(scenario) {
    const inputs  = scenario.inputs  || {};
    const results = scenario.results || Calc.berechneAlles(inputs);
    const cashflow = (results && results.cashflowJson) || results.cashflow_json || results.cashflow_json;
    const cashflowRows = cashflow || Calc.berechneAlles(inputs).cashflow_json;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Entnahmeplan-Rechner v2';
    wb.created = new Date();

    // === Sheet 1: Zusammenfassung ===
    const s1 = wb.addWorksheet('Zusammenfassung');
    s1.columns = [{ width: 32 }, { width: 22 }];
    s1.addRow([scenario.name || 'Szenario']).font = { size: 16, bold: true };
    if (scenario.description) s1.addRow([scenario.description]);
    s1.addRow([]);
    s1.addRow(['Kennzahl', 'Wert']).font = { bold: true };
    const r = results || {};
    const kennzahlen = [
        ['Pension X netto / Monat',     Number(r.pensionNettoMt  || r.pension_netto_mt)],
        ['Miete Whg2 netto / Monat',    Number(r.mieteNettoMt    || r.miete_netto_mt)],
        ['Gold-Aktivierung / Jahr',     Number(r.goldRateOptimal || r.gold_rate_optimal)],
        ['Gold Ende 2055',              Number(r.goldEnde2055    || r.gold_ende_2055)],
        ['Gold-Erhalt %',               Number(r.goldErhaltPct   || r.gold_erhalt_pct)],
        ['Depot Ende 2055',             Number(r.depotEnde2055   || r.depot_ende_2055)],
        ['Erbmasse brutto',             Number(r.erbmasseBrutto  || r.erbmasse_brutto)],
        ['GrESt gesamt',                Number(r.grestGesamt     || r.grest_gesamt)],
        ['Erbmasse netto',              Number(r.erbmasseNetto   || r.erbmasse_netto)],
    ];
    for (const [k, v] of kennzahlen) {
        const row = s1.addRow([k, v]);
        fmtEur(row.getCell(2));
    }
    s1.addRow([]);
    s1.addRow(['Disclaimer:']).font = { italic: true };
    s1.addRow(['Keine Steuerberatung. Modellrechnung auf Basis oeffentlich zugaenglicher Rechtslage AT 2026.']);
    s1.addRow(['Umsetzung zwingend mit Steuerberater + Notar abstimmen.']);

    // === Sheet 2: Annahmen ===
    const s2 = wb.addWorksheet('Annahmen');
    s2.columns = [{ width: 36 }, { width: 18 }, { width: 60 }];
    s2.addRow(['Parameter', 'Wert', 'Hinweis']).font = { bold: true };
    const annahmen = [
        ['AT Pension brutto/Monat',  inputs.atPensionBruttoMt,  '14x ausbezahlt (ASVG)'],
        ['CH AHV brutto/Monat',      inputs.chAhvBruttoMt,      '12x ausbezahlt'],
        ['Pension Y netto/Monat',    inputs.pensionYNettoMt,    'Partnerin'],
        ['Miete Whg2 brutto/Monat',  inputs.mieteWhg2BruttoMt,  ''],
        ['Miete Whg2 Startjahr',     inputs.mieteWhg2Startjahr, ''],
        ['Miete Whg2 Wert',          inputs.mieteWhg2Wert,      'Fuer AfA-Berechnung'],
        ['Haushalt bis 80 €/Mt',     inputs.haushaltBis80,      'PUR (ohne Kredit/Reno)'],
        ['Haushalt ab 80 €/Mt',      inputs.haushaltAb80,       'PUR'],
        ['Instandhaltung p.a.',      inputs.instandhaltungPa,   ''],
        ['Depot Holding Start',      inputs.depotStart,         'Wertpapiere'],
        ['Gold Holding Start',       inputs.goldStart,          'Physisches Gold'],
        ['PT LDA 95% Wert',          inputs.ptLda95Wert,        ''],
        ['PT Miete brutto p.a.',     inputs.ptMieteBruttoPa,    'Schachtelprivileg'],
        ['Holding Kosten Jahr 1',    inputs.holdingFixJ1,       'Uebergang'],
        ['Holding Kosten ab Jahr 2', inputs.holdingFixJx,       ''],
        ['Darlehen X→Holding Betrag',inputs.darlehenBetrag,     ''],
        ['Darlehen Jahre',           inputs.darlehenJahre,      ''],
        ['Darlehen Realzins',        inputs.darlehenZinsReal,   'fremduebliche Verzinsung'],
        ['Bankkredit Betrag',        inputs.kreditBetrag,       'Hypothek Privathaus'],
        ['Bankkredit Laufzeit',      inputs.kreditLaufzeit,     ''],
        ['Bankkredit Realzins',      inputs.kreditRealzins,     '~3.5% nominal'],
        ['Reno Whg2 (2026)',         inputs.renoWhg22026,       'einmalig'],
        ['Reno Whg1 (2027-2029)',    inputs.renoWhg120272029,   '3 Tranchen'],
        ['Auto privat (2026)',       inputs.autoPrivat,         ''],
        ['RAM Rueckkauf (2026)',     inputs.ramRueckkauf,       'Firmenwagen'],
        ['PT Zuschuss (2026)',       inputs.ptZuschuss,         'Kapitaleinlage LDA'],
        ['KoeSt',                    inputs.koest,              '23%'],
        ['KESt',                     inputs.kest,               '27.5%'],
        ['KV Pensionisten',          inputs.kvPensionisten,     '6% ab 2026'],
        ['PT IRC',                   inputs.ptIrc,              '21%'],
        ['Depot Rendite real',       inputs.depotRenditeReal,   '3% nach Inflation'],
        ['Pensionistenabsetzbetrag', inputs.pabMax,             'einschleifend'],
        ['Sonderzahlung Freibetrag', inputs.sonderFreibetrag,   '§67 Abs 1 EStG'],
        ['Sonderzahlung Steuersatz', inputs.sonderSteuersatz,   '6%'],
        ['Gold Bilanz-Faktor',       inputs.goldBilanzFaktor,   'Anteil Bilanzabbau'],
    ];
    for (const [k, v, h] of annahmen) {
        const row = s2.addRow([k, Number(v), h]);
        row.getCell(2).font = { color: { argb: 'FF1E40AF' } };
        if (typeof v === 'number' || (typeof v === 'string' && /^[0-9.-]+$/.test(v))) {
            // numeric format depending on magnitude
            const n = Number(v);
            if (Math.abs(n) < 2 && n !== 0 && !Number.isInteger(n)) {
                row.getCell(2).numFmt = '0.000%';
                row.getCell(2).value = n;
            } else {
                row.getCell(2).numFmt = '#,##0';
            }
        }
    }
    applyHeader(s2);

    // === Sheet 3: Vermoegen 2026 ===
    const s3 = wb.addWorksheet('Vermoegen_2026');
    s3.columns = [{ width: 36 }, { width: 18 }];
    s3.addRow(['Position', 'Wert']).font = { bold: true };
    const vermoegen = [
        ['HOLDING'],
        ['Depot Wertpapiere',     Number(inputs.depotStart)],
        ['Gold (physisch)',       Number(inputs.goldStart)],
        ['PT LDA 95%',            Number(inputs.ptLda95Wert)],
        [],
        ['PRIVAT'],
        ['Privathaus',            Number(inputs.privathausWert)],
        ['Schruns Wohnung Y',     Number(inputs.schrunsWohnungY)],
        ['Diverses',              Number(inputs.diverses)],
        ['LWF Schruns',           Number(inputs.lwfSchruns)],
        ['Privates Gold (2026)',  Number(inputs.privGold2026)],
        ['Silber (2026)',         Number(inputs.privSilber2026)],
        [],
        ['VERBINDLICHKEITEN'],
        ['Hypothek Privathaus',  -Number(inputs.kreditBetrag)],
        ['Darlehen X → Holding', -Number(inputs.darlehenBetrag)],
    ];
    for (const v of vermoegen) {
        if (v.length === 0) { s3.addRow([]); continue; }
        if (v.length === 1) {
            const r = s3.addRow([v[0]]);
            r.font = { bold: true };
            continue;
        }
        const r = s3.addRow(v);
        fmtEur(r.getCell(2));
    }
    applyHeader(s3);

    // === Sheet 4: Cashflow ===
    const s4 = wb.addWorksheet('Cashflow');
    s4.columns = CASHFLOW_COLS;
    for (const row of cashflowRows) s4.addRow(row);
    for (let c = 3; c <= CASHFLOW_COLS.length; c++) {
        s4.getColumn(c).numFmt = '#,##0 "€";[Red]-#,##0 "€"';
    }
    applyHeader(s4);
    s4.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

    // === Sheet 5: Erbmasse ===
    const s5 = wb.addWorksheet('Erbmasse');
    s5.columns = [{ width: 36 }, { width: 18 }];
    s5.addRow(['Position', 'Wert']).font = { bold: true };
    const last = cashflowRows[cashflowRows.length - 1];
    const ptLda95 = Number(inputs.ptLda95Wert);
    const ptLda5 = ptLda95 * 5 / 95;
    const erbItems = [
        ['Depot 2055',        Math.max(0, last.depot)],
        ['Gold 2055',         Math.max(0, last.gold)],
        ['PT LDA 95%',        ptLda95],
        ['PT LDA 5%',         ptLda5],
        ['Privathaus',        Number(inputs.privathausWert)],
        ['Schruns Y',         Number(inputs.schrunsWohnungY)],
        ['Diverses',          Number(inputs.diverses)],
        ['LWF Schruns',       Number(inputs.lwfSchruns)],
    ];
    for (const [k, v] of erbItems) {
        const r = s5.addRow([k, v]);
        fmtEur(r.getCell(2));
    }
    s5.addRow([]);
    const brutto = Number(r.erbmasseBrutto || r.erbmasse_brutto || results.erbmasse_brutto);
    const grest = Number(r.grestGesamt || r.grest_gesamt || results.grest_gesamt);
    const netto = Number(r.erbmasseNetto || r.erbmasse_netto || results.erbmasse_netto);
    const rB = s5.addRow(['Brutto', brutto]); rB.font = { bold: true }; fmtEur(rB.getCell(2));
    const rG = s5.addRow(['./. GrESt (Stufentarif)', -grest]); fmtEur(rG.getCell(2));
    const rN = s5.addRow(['NETTO ERBMASSE', netto]); rN.font = { bold: true, color: { argb: 'FF059669' } }; fmtEur(rN.getCell(2));
    applyHeader(s5);

    return wb.xlsx.writeBuffer();
}

module.exports = { exportXlsx };
