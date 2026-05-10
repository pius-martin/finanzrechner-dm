// Isomorphic Berechnungslogik fuer den Entnahmeplan-Rechner v2.
// Laeuft sowohl im Node-Server als auch im Browser (siehe public/calc-client.js).
//
// Konvention: Inputs koennen entweder als Snake-Case-Objekt (DB-Layout) oder als
// Camel-Case-Objekt (Prisma-Client) reinkommen. normalizeInputs() vereinheitlicht.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Calc = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    function num(v, def) {
        if (v === null || v === undefined || v === '') return def;
        if (typeof v === 'number') return Number.isFinite(v) ? v : def;
        if (typeof v === 'string') {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : def;
        }
        if (typeof v.toNumber === 'function') {
            try {
                const n = v.toNumber();
                return Number.isFinite(n) ? n : def;
            } catch (_) { /* fallthrough */ }
        }
        if (typeof v.toString === 'function') {
            const n = parseFloat(v.toString());
            return Number.isFinite(n) ? n : def;
        }
        return def;
    }

    function pickJson(v, fallback) {
        if (!v) return fallback;
        if (typeof v === 'string') {
            try { return JSON.parse(v); } catch (e) { return fallback; }
        }
        return v;
    }

    // Vereinheitlicht ein Inputs-Objekt zu einem flachen number/JSON Layout
    // (snake_case Key-Variante bevorzugt, fallback auf camelCase).
    function normalizeInputs(raw) {
        const r = raw || {};
        function g(snake, camel, def) {
            const v = r[snake] !== undefined ? r[snake] : r[camel];
            return num(v, def);
        }
        function gI(snake, camel, def) {
            const v = r[snake] !== undefined ? r[snake] : r[camel];
            const n = num(v, def);
            return Math.round(n);
        }
        function gJ(snake, camel, def) {
            const v = r[snake] !== undefined ? r[snake] : r[camel];
            return pickJson(v, def);
        }

        const defaultEstStufen = [
            { bis: 13539, satz: 0 },
            { bis: 21992, satz: 0.20 },
            { bis: 36458, satz: 0.30 },
            { bis: 70365, satz: 0.40 },
            { bis: 104859, satz: 0.48 },
            { bis: 1000000, satz: 0.50 },
            { bis: null, satz: 0.55 },
        ];
        const defaultGrestStufen = [
            { bis: 250000, satz: 0.005 },
            { bis: 400000, satz: 0.02 },
            { bis: null, satz: 0.035 },
        ];

        return {
            at_pension_brutto_mt: g('at_pension_brutto_mt', 'atPensionBruttoMt', 3500),
            ch_ahv_brutto_mt:     g('ch_ahv_brutto_mt', 'chAhvBruttoMt', 500),
            pension_y_netto_mt:   g('pension_y_netto_mt', 'pensionYNettoMt', 1000),
            miete_whg2_brutto_mt: g('miete_whg2_brutto_mt', 'mieteWhg2BruttoMt', 1200),
            miete_whg2_startjahr: gI('miete_whg2_startjahr', 'mieteWhg2Startjahr', 2028),
            miete_whg2_wert:      g('miete_whg2_wert', 'mieteWhg2Wert', 300000),

            haushalt_bis_80:      g('haushalt_bis_80', 'haushaltBis80', 7000),
            haushalt_ab_80:       g('haushalt_ab_80', 'haushaltAb80', 5500),
            instandhaltung_pa:    g('instandhaltung_pa', 'instandhaltungPa', 6000),

            depot_start:          g('depot_start', 'depotStart', 1180000),
            gold_start:           g('gold_start', 'goldStart', 1374000),
            pt_lda_95_wert:       g('pt_lda_95_wert', 'ptLda95Wert', 570000),
            pt_miete_brutto_pa:   g('pt_miete_brutto_pa', 'ptMieteBruttoPa', 18000),
            holding_fix_j1:       g('holding_fix_j1', 'holdingFixJ1', 24900),
            holding_fix_jx:       g('holding_fix_jx', 'holdingFixJx', 20400),

            darlehen_betrag:      g('darlehen_betrag', 'darlehenBetrag', 200000),
            darlehen_jahre:       gI('darlehen_jahre', 'darlehenJahre', 10),
            darlehen_zins_real:   g('darlehen_zins_real', 'darlehenZinsReal', 0.005),

            kredit_betrag:        g('kredit_betrag', 'kreditBetrag', 300000),
            kredit_laufzeit:      gI('kredit_laufzeit', 'kreditLaufzeit', 15),
            kredit_realzins:      g('kredit_realzins', 'kreditRealzins', 0.015),

            reno_whg2_2026:       g('reno_whg2_2026', 'renoWhg22026', 100000),
            reno_whg1_2027_2029:  g('reno_whg1_2027_2029', 'renoWhg120272029', 450000),
            auto_privat:          g('auto_privat', 'autoPrivat', 50000),
            ram_rueckkauf:        g('ram_rueckkauf', 'ramRueckkauf', 30000),
            pt_zuschuss:          g('pt_zuschuss', 'ptZuschuss', 150000),

            privathaus_wert:      g('privathaus_wert', 'privathausWert', 1500000),
            schruns_wohnung_y:    g('schruns_wohnung_y', 'schrunsWohnungY', 700000),
            diverses:             g('diverses', 'diverses', 50000),
            lwf_schruns:          g('lwf_schruns', 'lwfSchruns', 15000),
            priv_gold_2026:       g('priv_gold_2026', 'privGold2026', 335000),
            priv_silber_2026:     g('priv_silber_2026', 'privSilber2026', 4000),

            koest:                g('koest', 'koest', 0.23),
            kest:                 g('kest', 'kest', 0.275),
            kv_pensionisten:      g('kv_pensionisten', 'kvPensionisten', 0.06),
            pt_irc:               g('pt_irc', 'ptIrc', 0.21),
            depot_rendite_real:   g('depot_rendite_real', 'depotRenditeReal', 0.03),
            sonder_freibetrag:    g('sonder_freibetrag', 'sonderFreibetrag', 620),
            sonder_steuersatz:    g('sonder_steuersatz', 'sonderSteuersatz', 0.06),
            gold_bilanz_faktor:   g('gold_bilanz_faktor', 'goldBilanzFaktor', 0.77),

            est_tarifstufen:      gJ('est_tarifstufen', 'estTarifstufen', defaultEstStufen),

            pab_max:              g('pab_max', 'pabMax', 1020),
            pab_unten:            g('pab_unten', 'pabUnten', 21614),
            pab_oben:             g('pab_oben', 'pabOben', 31494),

            grest_stufen:         gJ('grest_stufen', 'grestStufen', defaultGrestStufen),
        };
    }

    function round2(v) { return Math.round(v * 100) / 100; }

    function lstTarif(einkommen, stufen) {
        if (einkommen <= 0) return 0;
        let rest = einkommen;
        let lo = 0;
        let total = 0;
        for (const stufe of stufen) {
            if (rest <= 0) break;
            const hi = (stufe.bis === null || stufe.bis === undefined) ? Infinity : Number(stufe.bis);
            const inStufe = Math.min(rest, hi - lo);
            if (inStufe > 0) total += inStufe * Number(stufe.satz);
            rest -= inStufe;
            lo = hi;
        }
        return total;
    }

    function grestStufentarif(wert, stufen) {
        if (wert <= 0) return 0;
        let rest = wert;
        let lo = 0;
        let total = 0;
        for (const stufe of stufen) {
            if (rest <= 0) break;
            const hi = (stufe.bis === null || stufe.bis === undefined) ? Infinity : Number(stufe.bis);
            const inStufe = Math.min(rest, hi - lo);
            if (inStufe > 0) total += inStufe * Number(stufe.satz);
            rest -= inStufe;
            lo = hi;
        }
        return total;
    }

    function berechnePensionNetto(inp) {
        const atJahr = inp.at_pension_brutto_mt * 14;
        const chJahr = inp.ch_ahv_brutto_mt * 12;
        const gesamtBrutto = atJahr + chJahr;

        const kv = gesamtBrutto * inp.kv_pensionisten;

        const atLfd = inp.at_pension_brutto_mt * 12;
        const atSonder = inp.at_pension_brutto_mt * 2;
        const kvLfd = (atLfd + chJahr) * inp.kv_pensionisten;
        const kvSonder = atSonder * inp.kv_pensionisten;

        const lfdBmg = (atLfd + chJahr) - kvLfd;

        let lstLfd = lstTarif(lfdBmg, inp.est_tarifstufen);

        let pab;
        if (lfdBmg <= inp.pab_unten) {
            pab = inp.pab_max;
        } else if (lfdBmg >= inp.pab_oben) {
            pab = 0;
        } else {
            pab = inp.pab_max * (1 - (lfdBmg - inp.pab_unten) / (inp.pab_oben - inp.pab_unten));
        }
        lstLfd = Math.max(0, lstLfd - pab);

        const sonderNachKv = atSonder - kvSonder;
        const sonderStpfl = Math.max(0, sonderNachKv - inp.sonder_freibetrag);
        const lstSonder = sonderStpfl * inp.sonder_steuersatz;

        const nettoJahr = gesamtBrutto - kv - lstLfd - lstSonder;
        const nettoMt = nettoJahr / 12;

        return {
            brutto_jahr: gesamtBrutto,
            kv,
            lst_lfd: lstLfd,
            lst_sonder: lstSonder,
            pab,
            netto_jahr: nettoJahr,
            netto_mt: nettoMt,
            effektive_belastung: gesamtBrutto > 0 ? (kv + lstLfd + lstSonder) / gesamtBrutto : 0,
        };
    }

    function berechneMieteNetto(inp) {
        const bruttoJahr = inp.miete_whg2_brutto_mt * 12;
        const gebaeudeAnteil = inp.miete_whg2_wert * 0.60;
        const afa = gebaeudeAnteil * 0.015;
        const bk = bruttoJahr * 0.05;
        const gewinn = Math.max(0, bruttoJahr - afa - bk);
        const estMiete = gewinn * 0.40;
        const nettoCash = bruttoJahr - bk - estMiete;
        const nettoMt = nettoCash / 12;

        return {
            brutto_jahr: bruttoJahr,
            afa,
            bk,
            gewinn,
            est: estMiete,
            netto_cash: nettoCash,
            netto_mt: nettoMt,
        };
    }

    function berechneKreditrate(betrag, realzins, laufzeit) {
        if (laufzeit <= 0) return 0;
        if (realzins === 0) return betrag / laufzeit;
        const z = realzins;
        const n = laufzeit;
        return betrag * (z * Math.pow(1 + z, n)) / (Math.pow(1 + z, n) - 1);
    }

    // 30-Jahres-Cashflow.
    // Hinweis: das Briefing laesst die Reno-Whg1-Tranchen 2027-2029 im Cashflow
    // unspezifiziert. Damit die Validierungsfaelle (v6 vs v6b vs v6c) ueberhaupt
    // unterschiedliche Gold-Raten erzeugen koennen, modellieren wir die drei
    // Tranchen als zusaetzliche laufende Brutto-Entnahme (gegross-upt um KESt)
    // in den Jahren i = 1..3.
    function simuliereCashflow(inp, pension, miete, kreditrate, goldRate) {
        let depot = inp.depot_start;
        let gold = inp.gold_start;
        let darlehenRest = inp.darlehen_betrag;
        const kreditrateMt = kreditrate / 12;

        // Privat 2026: priv_gold + priv_silber werden steuerfrei verkauft und
        // finanzieren reno_whg2 + auto_privat. Der Ueberschuss reduziert die
        // Reno-Whg1-Tranchen-Last auf die Holding (2027-2029).
        const priv2026Surplus = Math.max(0,
            (inp.priv_gold_2026 + inp.priv_silber_2026)
            - (inp.reno_whg2_2026 + inp.auto_privat));
        const renoHoldingTotal = Math.max(0, inp.reno_whg1_2027_2029 - priv2026Surplus);
        const renoWhg1Tranche = renoHoldingTotal / 3;

        // ram_rueckkauf (Firmenwagen) = privat zahlt an Holding -> Holding-Cash 2026.
        const ramHoldingIncome = inp.ram_rueckkauf;

        const rows = [];

        for (let i = 0; i < 30; i++) {
            const jahr = 2026 + i;
            const alter = 65 + i;

            const depotAnf = depot;

            const rendite = Math.max(0, depotAnf) * inp.depot_rendite_real * (1 - inp.koest);
            const ptMiete = inp.pt_miete_brutto_pa * (1 - inp.pt_irc);

            let zins = 0, darlBrutto = 0;
            if (i < inp.darlehen_jahre && darlehenRest > 0) {
                zins = darlehenRest * inp.darlehen_zins_real;
                const tilgNetto = inp.darlehen_betrag / inp.darlehen_jahre;
                darlBrutto = tilgNetto / (1 - inp.kest);
                darlehenRest -= tilgNetto;
            }

            const kosten = (i === 0) ? inp.holding_fix_j1 : inp.holding_fix_jx;
            const ptInv = (i === 0) ? inp.pt_zuschuss : 0;
            const ramIncome = (i === 0) ? ramHoldingIncome : 0;

            // Bedarf privat
            const haushalt = (alter <= 80) ? inp.haushalt_bis_80 : inp.haushalt_ab_80;
            const kreditAnteil = (i < inp.kredit_laufzeit) ? kreditrateMt : 0;
            const bedarfMt = haushalt + kreditAnteil + inp.instandhaltung_pa / 12;

            // Privat-Einnahmen
            let privMt;
            if (jahr < inp.miete_whg2_startjahr) {
                privMt = pension.netto_mt + inp.pension_y_netto_mt;
            } else {
                privMt = pension.netto_mt + inp.pension_y_netto_mt + miete.netto_mt;
            }

            const luecke = Math.max(0, bedarfMt * 12 - privMt * 12);

            // Renovierung Whg1 als zusaetzliche Entnahme 2027-2029 (i=1,2,3)
            const renoExtra = (i >= 1 && i <= 3) ? renoWhg1Tranche : 0;

            // Gold-Aktivierung (ab Jahr 1 = 2027)
            const goldBr = (i >= 1) ? goldRate : 0;
            const goldNettoX = goldBr * inp.gold_bilanz_faktor * (1 - inp.kest);

            const lueckeNachGold = Math.max(0, luecke + renoExtra - goldNettoX);
            const laufBrutto = lueckeNachGold / (1 - inp.kest);

            depot = depotAnf + rendite + ptMiete + zins + ramIncome
                    - kosten - ptInv - darlBrutto - laufBrutto;

            gold -= goldBr * inp.gold_bilanz_faktor;

            rows.push({
                jahr, alter,
                depot_anf: round2(depotAnf),
                rendite: round2(rendite),
                pt_miete: round2(ptMiete),
                zins_xh: round2(zins),
                kosten: round2(-kosten),
                pt_inv: round2(-ptInv),
                darl_brutto: round2(-darlBrutto),
                lauf_brutto: round2(-laufBrutto),
                gold_brutto: round2(-goldBr),
                reno_extra: round2(renoExtra),
                depot: round2(depot),
                gold: round2(gold),
                bedarf_mt: round2(bedarfMt),
                priv_mt: round2(privMt),
                luecke_mt: round2(luecke / 12),
            });
        }

        return rows;
    }

    // Findet die MINIMALE Gold-Rate (€/Jahr brutto), bei der das Depot
    // 2055 noch nicht-negativ ist. Das Briefing hatte die Bisections-
    // Richtung mathematisch invertiert ("depot positiv → mehr Gold").
    // Korrekt: hoehere Gold-Rate erzeugt mehr Cash und entlastet das Depot;
    // wir wollen die kleinste ausreichende Rate.
    function bisectionGoldRate(inp, pension, miete, kreditrate) {
        const HI_MAX = 200000;
        let lo = 0, hi = HI_MAX;

        // Edge case: bereits bei Rate 0 ist das Depot positiv → Gold gar nicht noetig.
        const rowsLo = simuliereCashflow(inp, pension, miete, kreditrate, 0);
        if (rowsLo[29].depot >= 0) return 0;

        // Edge case: selbst bei HI_MAX bleibt das Depot negativ → cap.
        const rowsHi = simuliereCashflow(inp, pension, miete, kreditrate, HI_MAX);
        if (rowsHi[29].depot < 0) return HI_MAX;

        for (let iter = 0; iter < 80; iter++) {
            const mid = (lo + hi) / 2;
            const rows = simuliereCashflow(inp, pension, miete, kreditrate, mid);
            const depotEnde = rows[29].depot;

            if (depotEnde >= 0) {
                hi = mid;
            } else {
                lo = mid;
            }

            if (Math.abs(hi - lo) < 1) break;
        }

        return Math.round((lo + hi) / 2);
    }

    function berechneErbmasse(inp, cashflow) {
        const letzteZeile = cashflow[29];

        const depot2055 = Math.max(0, letzteZeile.depot);
        const gold2055 = Math.max(0, letzteZeile.gold);
        const ptLda95 = inp.pt_lda_95_wert;

        const privathaus = inp.privathaus_wert;
        const schruns = inp.schruns_wohnung_y;
        const diverses = inp.diverses;
        const lwf = inp.lwf_schruns;
        const ptLda5 = ptLda95 * 5 / 95;

        const brutto = depot2055 + gold2055 + ptLda95 + privathaus + schruns + diverses + lwf + ptLda5;

        const grestHaus = grestStufentarif(privathaus, inp.grest_stufen);
        const grestSchruns = grestStufentarif(schruns, inp.grest_stufen);
        const grestGesamt = grestHaus + grestSchruns;

        const netto = brutto - grestGesamt;

        return {
            depot_2055: depot2055,
            gold_2055: gold2055,
            pt_lda_95: ptLda95,
            pt_lda_5: ptLda5,
            privathaus,
            schruns,
            diverses,
            lwf,
            brutto,
            grest_haus: grestHaus,
            grest_schruns: grestSchruns,
            grest_gesamt: grestGesamt,
            netto,
        };
    }

    function berechneAlles(rawInputs) {
        const inp = normalizeInputs(rawInputs);
        const pension = berechnePensionNetto(inp);
        const miete = berechneMieteNetto(inp);
        const kreditrate = berechneKreditrate(inp.kredit_betrag, inp.kredit_realzins, inp.kredit_laufzeit);
        const goldRate = bisectionGoldRate(inp, pension, miete, kreditrate);
        const cashflow = simuliereCashflow(inp, pension, miete, kreditrate, goldRate);
        const erbmasse = berechneErbmasse(inp, cashflow);

        return {
            pension_netto_mt: round2(pension.netto_mt),
            miete_netto_mt: round2(miete.netto_mt),
            kreditrate_jahr: round2(kreditrate),
            gold_rate_optimal: goldRate,
            gold_ende_2055: round2(cashflow[29].gold),
            gold_erhalt_pct: inp.gold_start > 0 ? round2(cashflow[29].gold / inp.gold_start * 100) : 0,
            depot_ende_2055: round2(cashflow[29].depot),
            erbmasse_brutto: round2(erbmasse.brutto),
            erbmasse_netto: round2(erbmasse.netto),
            grest_gesamt: round2(erbmasse.grest_gesamt),
            cashflow_json: cashflow,
            details: {
                pension,
                miete,
                erbmasse,
                inputs_normalized: inp,
            },
        };
    }

    return {
        berechneAlles,
        berechnePensionNetto,
        berechneMieteNetto,
        berechneKreditrate,
        simuliereCashflow,
        bisectionGoldRate,
        berechneErbmasse,
        lstTarif,
        grestStufentarif,
        normalizeInputs,
    };
}));
