/* global Calc */
(function () {
    'use strict';

    const fmtEur = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const fmtPct = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    function eur(n)   { if (n == null || isNaN(n)) return '–'; return fmtEur.format(Math.round(Number(n))) + ' €'; }
    function eurMt(n) { return eur(n) + '/Mt'; }
    function eurY(n)  { return eur(n) + '/J'; }
    function pct(n)   { if (n == null || isNaN(n)) return '–'; return fmtPct.format(Number(n)) + ' %'; }

    // ---------- INPUT-DEFINITIONEN ----------
    const SECTIONS = [
        {
            title: 'Pension & Einkommen',
            fields: [
                { key: 'at_pension_brutto_mt',  label: 'AT Pension brutto/Mt',     step: 50 },
                { key: 'ch_ahv_brutto_mt',      label: 'CH AHV brutto/Mt',         step: 50 },
                { key: 'pension_y_netto_mt',    label: 'Pension Y netto/Mt',       step: 50 },
                { key: 'miete_whg2_brutto_mt',  label: 'Miete Whg2 brutto/Mt',     step: 50 },
                { key: 'miete_whg2_startjahr',  label: 'Miete Whg2 Startjahr',     step: 1 },
                { key: 'miete_whg2_wert',       label: 'Whg2 Wert (für AfA)',      step: 10000 },
            ],
        },
        {
            title: 'Haushalt & Bedarf',
            fields: [
                { key: 'haushalt_bis_80', label: 'Haushalt bis 80 €/Mt', step: 100 },
                { key: 'haushalt_ab_80',  label: 'Haushalt ab 80 €/Mt',  step: 100 },
                { key: 'instandhaltung_pa', label: 'Instandhaltung €/J', step: 500 },
            ],
        },
        {
            title: 'Holding & Depot',
            fields: [
                { key: 'depot_start',         label: 'Depot Start',           step: 10000 },
                { key: 'gold_start',          label: 'Gold Start',            step: 10000 },
                { key: 'pt_lda_95_wert',      label: 'PT LDA 95% Wert',       step: 10000 },
                { key: 'pt_miete_brutto_pa',  label: 'PT Miete brutto/J',     step: 500 },
                { key: 'holding_fix_j1',      label: 'Holding-Kosten J1',     step: 500 },
                { key: 'holding_fix_jx',      label: 'Holding-Kosten ab J2',  step: 500 },
            ],
        },
        {
            title: 'Darlehen X → Holding',
            fields: [
                { key: 'darlehen_betrag',    label: 'Darlehen Betrag', step: 10000 },
                { key: 'darlehen_jahre',     label: 'Tilgungsdauer (J)', step: 1 },
                { key: 'darlehen_zins_real', label: 'Zinssatz real',     step: 0.0005 },
            ],
        },
        {
            title: 'Bankkredit (Hypothek)',
            fields: [
                { key: 'kredit_betrag',    label: 'Kreditbetrag',  step: 10000 },
                { key: 'kredit_laufzeit',  label: 'Laufzeit (J)',  step: 1 },
                { key: 'kredit_realzins',  label: 'Realzins',      step: 0.0005 },
            ],
        },
        {
            title: 'Renovierung & Einmalinvestitionen',
            fields: [
                { key: 'reno_whg2_2026',      label: 'Reno Whg2 (2026)',          step: 5000 },
                { key: 'reno_whg1_2027_2029', label: 'Reno Whg1 (2027-2029)',     step: 25000 },
                { key: 'auto_privat',         label: 'Auto privat (2026)',        step: 5000 },
                { key: 'ram_rueckkauf',       label: 'RAM Rückkauf (2026)',       step: 5000 },
                { key: 'pt_zuschuss',         label: 'PT Zuschuss (2026)',        step: 10000 },
            ],
        },
        {
            title: 'Vermögen Privat (für Erbmasse)',
            fields: [
                { key: 'privathaus_wert',    label: 'Privathaus',     step: 25000 },
                { key: 'schruns_wohnung_y',  label: 'Schruns Y',      step: 25000 },
                { key: 'diverses',           label: 'Diverses',       step: 5000 },
                { key: 'lwf_schruns',        label: 'LWF Schruns',    step: 1000 },
                { key: 'priv_gold_2026',     label: 'Priv. Gold 2026',step: 5000 },
                { key: 'priv_silber_2026',   label: 'Priv. Silber 2026',step: 1000 },
            ],
        },
        {
            title: 'Steuer-Parameter',
            collapsed: true,
            fields: [
                { key: 'koest',              label: 'KöSt',              step: 0.005 },
                { key: 'kest',               label: 'KESt',              step: 0.005 },
                { key: 'kv_pensionisten',    label: 'KV Pensionisten',   step: 0.005 },
                { key: 'pt_irc',             label: 'PT IRC',            step: 0.005 },
                { key: 'depot_rendite_real', label: 'Depot Rendite real',step: 0.005 },
                { key: 'sonder_freibetrag',  label: 'Sonder-Freibetrag', step: 10 },
                { key: 'sonder_steuersatz',  label: 'Sonder-Steuersatz', step: 0.005 },
                { key: 'gold_bilanz_faktor', label: 'Gold Bilanz-Faktor',step: 0.005 },
                { key: 'pab_max',            label: 'Pens.-Absetzbetrag',step: 10 },
                { key: 'pab_unten',          label: 'PAB unten',         step: 100 },
                { key: 'pab_oben',           label: 'PAB oben',          step: 100 },
            ],
        },
    ];

    // Snake-case → camelCase fuer Patch-Calls.
    const SNAKE_TO_CAMEL = {};
    for (const sec of SECTIONS) for (const f of sec.fields) SNAKE_TO_CAMEL[f.key] = f.key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

    // ---------- STATE ----------
    const state = {
        scenarios: [],
        currentId: null,
        currentInputs: {},   // snake_case keys
        currentResults: {},
        dirty: false,
        debounceTimer: null,
    };

    // ---------- API ----------
    async function api(path, opts = {}) {
        const init = Object.assign({ credentials: 'include' }, opts);
        if (init.body && typeof init.body !== 'string') {
            init.headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {});
            init.body = JSON.stringify(init.body);
        }
        const r = await fetch('/api' + path, init);
        if (r.status === 401) {
            showPinGate();
            throw new Error('unauthorized');
        }
        if (!r.ok) {
            const t = await r.text();
            throw new Error(`HTTP ${r.status}: ${t}`);
        }
        if (r.headers.get('content-type')?.includes('application/json')) return r.json();
        return r;
    }

    // ---------- AUTH ----------
    async function showPinGate() {
        document.getElementById('pin-gate').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        setTimeout(() => document.getElementById('pin-input').focus(), 50);
    }
    async function hidePinGate() {
        document.getElementById('pin-gate').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }
    async function attemptAuth() {
        const pin = document.getElementById('pin-input').value;
        const errEl = document.getElementById('pin-error');
        errEl.textContent = '';
        try {
            const r = await fetch('/api/auth', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            });
            if (!r.ok) { errEl.textContent = 'Falscher PIN.'; return; }
            await hidePinGate();
            await bootstrapApp();
        } catch (e) {
            errEl.textContent = 'Fehler: ' + e.message;
        }
    }

    // ---------- RENDER INPUT FORM ----------
    function buildInputForm() {
        const root = document.getElementById('input-sections');
        root.innerHTML = '';
        for (const sec of SECTIONS) {
            const wrap = document.createElement('div');
            wrap.className = 'input-section';
            const h3 = document.createElement('h3');
            h3.textContent = sec.title;
            wrap.appendChild(h3);
            for (const f of sec.fields) {
                const row = document.createElement('div');
                row.className = 'input-row';
                const label = document.createElement('label');
                label.textContent = f.label;
                label.htmlFor = `inp-${f.key}`;
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `inp-${f.key}`;
                input.step = f.step;
                input.dataset.key = f.key;
                input.addEventListener('input', onInputChange);
                row.appendChild(label);
                row.appendChild(input);
                wrap.appendChild(row);
            }
            root.appendChild(wrap);
        }
    }

    function fillInputForm(inputs) {
        for (const sec of SECTIONS) for (const f of sec.fields) {
            const el = document.getElementById(`inp-${f.key}`);
            if (!el) continue;
            const v = inputs[f.key];
            el.value = v === null || v === undefined ? '' : v;
        }
    }

    function readInputForm() {
        const out = {};
        for (const sec of SECTIONS) for (const f of sec.fields) {
            const el = document.getElementById(`inp-${f.key}`);
            if (!el) continue;
            const v = el.value;
            if (v === '' || v === null) continue;
            out[f.key] = Number(v);
        }
        return out;
    }

    // ---------- LIVE-RECOMPUTE ----------
    function onInputChange() {
        state.dirty = true;
        showSave('• ungespeichert', 'red');
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(recomputeLocal, 300);
    }

    function recomputeLocal() {
        const inp = readInputForm();
        // mit defaults aus aktuellem state mergen, damit z.B. JSON-Felder bleiben
        const merged = Object.assign({}, state.currentInputs, inp);
        try {
            const r = Calc.berechneAlles(merged);
            state.currentResults = r;
            renderResults(r);
        } catch (e) {
            console.error('Calc error:', e);
        }
    }

    // ---------- RENDER RESULTS ----------
    function renderResults(r) {
        renderCards(r);
        renderCashflow(r.cashflow_json || []);
        renderErbmasse(r);
    }

    function renderCards(r) {
        const cards = [
            { label: 'Pension Netto/Mt', value: eur(r.pension_netto_mt), cls: '' },
            { label: 'Miete Netto/Mt',   value: eur(r.miete_netto_mt), cls: '' },
            { label: 'Gold-Rate /J',     value: eur(r.gold_rate_optimal), cls: 'gold' },
            { label: 'Gold Ende 2055',   value: eur(r.gold_ende_2055), cls: r.gold_ende_2055 < 0 ? 'neg' : 'gold' },
            { label: 'Gold Erhalt %',    value: pct(r.gold_erhalt_pct), cls: r.gold_erhalt_pct < 0 ? 'neg' : 'gold' },
            { label: 'Depot Ende 2055',  value: eur(r.depot_ende_2055), cls: r.depot_ende_2055 < 0 ? 'neg' : 'pos' },
            { label: 'Erbmasse Brutto',  value: eur(r.erbmasse_brutto), cls: '' },
            { label: 'GrESt',            value: eur(r.grest_gesamt), cls: 'neg' },
            { label: 'Erbmasse Netto',   value: eur(r.erbmasse_netto), cls: 'pos' },
        ];
        const root = document.getElementById('cards');
        root.innerHTML = '';
        for (const c of cards) {
            const div = document.createElement('div');
            div.className = 'card pulse';
            div.innerHTML = `<div class="card-label">${c.label}</div><div class="card-value ${c.cls}">${c.value}</div>`;
            root.appendChild(div);
        }
    }

    const CASHFLOW_COLS = [
        { k: 'jahr',        h: 'Jahr',        money: false },
        { k: 'alter',       h: 'Alter',       money: false },
        { k: 'depot_anf',   h: 'Depot Anf',   money: true },
        { k: 'rendite',     h: 'Rendite',     money: true },
        { k: 'pt_miete',    h: 'PT Miete',    money: true },
        { k: 'zins_xh',     h: 'Zins X-H',    money: true },
        { k: 'kosten',      h: 'Kosten',      money: true },
        { k: 'pt_inv',      h: 'PT Inv',      money: true },
        { k: 'darl_brutto', h: 'Darl Br.',    money: true },
        { k: 'lauf_brutto', h: 'Lauf Br.',    money: true },
        { k: 'gold_brutto', h: 'Gold Br.',    money: true, gold: true },
        { k: 'reno_extra',  h: 'Reno extra',  money: true },
        { k: 'depot',       h: 'Depot End',   money: true },
        { k: 'gold',        h: 'Gold Rest',   money: true, gold: true },
        { k: 'bedarf_mt',   h: 'Bedarf/Mt',   money: true },
        { k: 'priv_mt',     h: 'Priv./Mt',    money: true },
        { k: 'luecke_mt',   h: 'Lücke/Mt',    money: true },
    ];

    function renderCashflow(rows) {
        const thead = document.querySelector('#cashflow-table thead');
        const tbody = document.querySelector('#cashflow-table tbody');
        thead.innerHTML = '<tr>' + CASHFLOW_COLS.map(c => `<th>${c.h}</th>`).join('') + '</tr>';
        tbody.innerHTML = '';
        for (const row of rows) {
            const tr = document.createElement('tr');
            if (row.jahr === 2026 || row.jahr === 2041 || row.jahr === 2055) tr.className = 'highlight';
            tr.innerHTML = CASHFLOW_COLS.map(c => {
                const v = row[c.k];
                if (!c.money) return `<td>${v}</td>`;
                const cls = (v < 0 ? 'neg' : '') + (c.gold ? ' gold-cell' : '');
                return `<td class="${cls}">${eur(v)}</td>`;
            }).join('');
            tbody.appendChild(tr);
        }
    }

    function renderErbmasse(r) {
        const d = r.details && r.details.erbmasse;
        if (!d) { document.getElementById('erbmasse-block').innerHTML = ''; return; }
        const rows = [
            ['Depot 2055',   d.depot_2055],
            ['Gold 2055',    d.gold_2055],
            ['PT LDA 95%',   d.pt_lda_95],
            ['PT LDA 5%',    d.pt_lda_5],
            ['Privathaus',   d.privathaus],
            ['Schruns Y',    d.schruns],
            ['Diverses',     d.diverses],
            ['LWF Schruns',  d.lwf],
        ];
        let html = '<table><tbody>';
        for (const [k, v] of rows) html += `<tr><td>${k}</td><td>${eur(v)}</td></tr>`;
        html += `<tr class="total"><td>Brutto</td><td>${eur(d.brutto)}</td></tr>`;
        html += `<tr><td>./. GrESt Privathaus</td><td class="neg">${eur(-d.grest_haus)}</td></tr>`;
        html += `<tr><td>./. GrESt Schruns</td><td class="neg">${eur(-d.grest_schruns)}</td></tr>`;
        html += `<tr class="netto"><td>NETTO</td><td>${eur(d.netto)}</td></tr>`;
        html += '</tbody></table>';
        document.getElementById('erbmasse-block').innerHTML = html;
    }

    function showSave(text, color) {
        const el = document.getElementById('save-indicator');
        el.textContent = text;
        el.style.color = color === 'red' ? 'var(--red)' : 'var(--green)';
    }

    // ---------- SCENARIOS ----------
    async function loadScenarioList() {
        state.scenarios = await api('/scenarios');
        const sel = document.getElementById('scenario-select');
        sel.innerHTML = '';
        for (const s of state.scenarios) {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            sel.appendChild(opt);
        }
        if (state.currentId) sel.value = state.currentId;
    }

    async function selectScenario(id) {
        const s = await api('/scenarios/' + id);
        state.currentId = s.id;
        state.currentInputs = inputsFromScenario(s);
        state.currentResults = resultsFromScenario(s);
        document.getElementById('scenario-name').value = s.name;
        document.getElementById('scenario-select').value = s.id;
        fillInputForm(state.currentInputs);
        renderResults(Calc.berechneAlles(state.currentInputs));
        state.dirty = false;
        showSave('Gespeichert ✓', 'green');
    }

    function inputsFromScenario(s) {
        const i = s.inputs || {};
        const out = {};
        for (const k of Object.keys(SNAKE_TO_CAMEL)) {
            const camel = SNAKE_TO_CAMEL[k];
            const v = i[camel] !== undefined ? i[camel] : i[k];
            if (v !== undefined && v !== null) out[k] = (typeof v === 'string') ? Number(v) : v;
        }
        // JSON felder
        if (i.estTarifstufen) out.est_tarifstufen = i.estTarifstufen;
        if (i.grestStufen)    out.grest_stufen    = i.grestStufen;
        return out;
    }

    function resultsFromScenario(s) {
        const r = s.results || {};
        return {
            pension_netto_mt:  Number(r.pensionNettoMt),
            miete_netto_mt:    Number(r.mieteNettoMt),
            gold_rate_optimal: Number(r.goldRateOptimal),
            gold_ende_2055:    Number(r.goldEnde2055),
            gold_erhalt_pct:   Number(r.goldErhaltPct),
            depot_ende_2055:   Number(r.depotEnde2055),
            erbmasse_brutto:   Number(r.erbmasseBrutto),
            erbmasse_netto:    Number(r.erbmasseNetto),
            grest_gesamt:      Number(r.grestGesamt),
            cashflow_json:     r.cashflowJson || [],
        };
    }

    async function saveCurrent() {
        const inp = readInputForm();
        const name = document.getElementById('scenario-name').value || 'Unbenannt';
        const updated = await api('/scenarios/' + state.currentId, {
            method: 'PUT',
            body: { name, inputs: inp },
        });
        state.currentInputs = inputsFromScenario(updated);
        state.currentResults = resultsFromScenario(updated);
        renderResults(Calc.berechneAlles(state.currentInputs));
        state.dirty = false;
        showSave('Gespeichert ✓', 'green');
        await loadScenarioList();
    }

    async function newScenario() {
        const name = prompt('Name des neuen Szenarios:', 'Neues Szenario');
        if (!name) return;
        const created = await api('/scenarios', { method: 'POST', body: { name } });
        await loadScenarioList();
        await selectScenario(created.id);
    }

    async function duplicateCurrent() {
        if (!state.currentId) return;
        const dup = await api('/scenarios/' + state.currentId + '/duplicate', { method: 'POST' });
        await loadScenarioList();
        await selectScenario(dup.id);
    }

    async function deleteCurrent() {
        if (!state.currentId) return;
        if (!confirm('Szenario wirklich löschen?')) return;
        await api('/scenarios/' + state.currentId, { method: 'DELETE' });
        state.currentId = null;
        await loadScenarioList();
        if (state.scenarios.length > 0) await selectScenario(state.scenarios[0].id);
    }

    function exportCurrent() {
        if (!state.currentId) return;
        window.location.href = '/api/scenarios/' + state.currentId + '/export-xlsx';
    }

    // ---------- COMPARE ----------
    function openCompare() {
        const list = document.getElementById('compare-list');
        list.innerHTML = '';
        for (const s of state.scenarios) {
            const lbl = document.createElement('label');
            lbl.innerHTML = `<input type="checkbox" value="${s.id}" /> ${s.name}`;
            list.appendChild(lbl);
        }
        document.getElementById('compare-result').innerHTML = '';
        document.getElementById('compare-modal').classList.remove('hidden');
    }
    function closeCompare() {
        document.getElementById('compare-modal').classList.add('hidden');
    }
    async function runCompare() {
        const ids = Array.from(document.querySelectorAll('#compare-list input:checked')).map(i => i.value);
        if (ids.length < 2) { alert('Mind. 2 Szenarien wählen.'); return; }
        const data = await api('/compare', { method: 'POST', body: { scenario_ids: ids } });
        const cols = data;
        const rows = [
            ['Reno Whg1',         d => eur(Number(d.inputs.renoWhg120272029))],
            ['Darlehen',          d => eur(Number(d.inputs.darlehenBetrag))],
            ['Pension Netto/Mt',  d => eur(Number(d.results.pensionNettoMt))],
            ['Gold-Rate p.a.',    d => eur(Number(d.results.goldRateOptimal))],
            ['Gold Ende 2055',    d => eur(Number(d.results.goldEnde2055)) + ' (' + pct(Number(d.results.goldErhaltPct)) + ')'],
            ['Depot Ende 2055',   d => eur(Number(d.results.depotEnde2055))],
            ['Erbmasse Netto',    d => eur(Number(d.results.erbmasseNetto))],
        ];
        let html = '<table><thead><tr><th>Kennzahl</th>';
        for (const c of cols) html += `<th>${c.name}</th>`;
        html += '</tr></thead><tbody>';
        for (const [label, fn] of rows) {
            html += `<tr><td>${label}</td>` + cols.map(c => `<td>${fn(c)}</td>`).join('') + '</tr>';
        }
        html += '</tbody></table>';
        document.getElementById('compare-result').innerHTML = html;
    }

    // ---------- BOOTSTRAP ----------
    async function bootstrapApp() {
        buildInputForm();
        await loadScenarioList();
        if (state.scenarios.length === 0) {
            const created = await api('/scenarios', { method: 'POST', body: { name: 'Standard v6' } });
            await loadScenarioList();
            await selectScenario(created.id);
        } else {
            await selectScenario(state.scenarios[0].id);
        }
    }

    async function init() {
        document.getElementById('pin-submit').addEventListener('click', attemptAuth);
        document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') attemptAuth(); });
        document.getElementById('btn-save').addEventListener('click', saveCurrent);
        document.getElementById('btn-new').addEventListener('click', newScenario);
        document.getElementById('btn-duplicate').addEventListener('click', duplicateCurrent);
        document.getElementById('btn-delete').addEventListener('click', deleteCurrent);
        document.getElementById('btn-reset').addEventListener('click', () => fillInputForm(state.currentInputs));
        document.getElementById('btn-export').addEventListener('click', exportCurrent);
        document.getElementById('btn-compare').addEventListener('click', openCompare);
        document.getElementById('compare-close').addEventListener('click', closeCompare);
        document.getElementById('compare-run').addEventListener('click', runCompare);
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            location.reload();
        });
        document.getElementById('scenario-select').addEventListener('change', e => selectScenario(e.target.value));

        const status = await fetch('/api/auth/status', { credentials: 'include' }).then(r => r.json()).catch(() => ({ authenticated: false }));
        if (status.authenticated) {
            await hidePinGate();
            await bootstrapApp();
        } else {
            await showPinGate();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
