-- Initial schema for Entnahmeplan-Rechner v2
-- Run with: psql $DATABASE_URL -f db/migrations/001_initial.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scenarios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL DEFAULT 'Neues Szenario',
    description   TEXT,
    is_default    BOOLEAN DEFAULT false,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    archived      BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS scenario_inputs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id       UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

    at_pension_brutto_mt        NUMERIC(10,2) NOT NULL DEFAULT 3500,
    ch_ahv_brutto_mt            NUMERIC(10,2) NOT NULL DEFAULT 500,
    pension_y_netto_mt          NUMERIC(10,2) NOT NULL DEFAULT 1000,
    miete_whg2_brutto_mt        NUMERIC(10,2) NOT NULL DEFAULT 1200,
    miete_whg2_startjahr        INTEGER NOT NULL DEFAULT 2028,
    miete_whg2_wert             NUMERIC(12,2) NOT NULL DEFAULT 300000,

    haushalt_bis_80             NUMERIC(10,2) NOT NULL DEFAULT 7000,
    haushalt_ab_80              NUMERIC(10,2) NOT NULL DEFAULT 5500,
    instandhaltung_pa           NUMERIC(10,2) NOT NULL DEFAULT 6000,

    depot_start                 NUMERIC(14,2) NOT NULL DEFAULT 1180000,
    gold_start                  NUMERIC(14,2) NOT NULL DEFAULT 1374000,
    pt_lda_95_wert              NUMERIC(14,2) NOT NULL DEFAULT 570000,
    pt_miete_brutto_pa          NUMERIC(10,2) NOT NULL DEFAULT 18000,
    holding_fix_j1              NUMERIC(10,2) NOT NULL DEFAULT 24900,
    holding_fix_jx              NUMERIC(10,2) NOT NULL DEFAULT 20400,

    darlehen_betrag             NUMERIC(14,2) NOT NULL DEFAULT 200000,
    darlehen_jahre              INTEGER NOT NULL DEFAULT 10,
    darlehen_zins_real          NUMERIC(5,4) NOT NULL DEFAULT 0.005,

    kredit_betrag               NUMERIC(14,2) NOT NULL DEFAULT 300000,
    kredit_laufzeit             INTEGER NOT NULL DEFAULT 15,
    kredit_realzins             NUMERIC(5,4) NOT NULL DEFAULT 0.015,

    reno_whg2_2026              NUMERIC(12,2) NOT NULL DEFAULT 100000,
    reno_whg1_2027_2029         NUMERIC(12,2) NOT NULL DEFAULT 450000,
    auto_privat                 NUMERIC(10,2) NOT NULL DEFAULT 50000,
    ram_rueckkauf               NUMERIC(10,2) NOT NULL DEFAULT 30000,
    pt_zuschuss                 NUMERIC(12,2) NOT NULL DEFAULT 150000,

    privathaus_wert             NUMERIC(14,2) NOT NULL DEFAULT 1500000,
    schruns_wohnung_y           NUMERIC(14,2) NOT NULL DEFAULT 700000,
    diverses                    NUMERIC(10,2) NOT NULL DEFAULT 50000,
    lwf_schruns                 NUMERIC(10,2) NOT NULL DEFAULT 15000,
    priv_gold_2026              NUMERIC(12,2) NOT NULL DEFAULT 335000,
    priv_silber_2026            NUMERIC(10,2) NOT NULL DEFAULT 4000,

    koest                       NUMERIC(5,4) NOT NULL DEFAULT 0.23,
    kest                        NUMERIC(5,4) NOT NULL DEFAULT 0.275,
    kv_pensionisten             NUMERIC(5,4) NOT NULL DEFAULT 0.06,
    pt_irc                      NUMERIC(5,4) NOT NULL DEFAULT 0.21,
    depot_rendite_real          NUMERIC(5,4) NOT NULL DEFAULT 0.03,
    sonder_freibetrag           NUMERIC(8,2) NOT NULL DEFAULT 620,
    sonder_steuersatz           NUMERIC(5,4) NOT NULL DEFAULT 0.06,
    gold_bilanz_faktor          NUMERIC(5,4) NOT NULL DEFAULT 0.77,

    est_tarifstufen             JSONB NOT NULL DEFAULT '[
        {"bis": 13539, "satz": 0},
        {"bis": 21992, "satz": 0.20},
        {"bis": 36458, "satz": 0.30},
        {"bis": 70365, "satz": 0.40},
        {"bis": 104859, "satz": 0.48},
        {"bis": 1000000, "satz": 0.50},
        {"bis": null, "satz": 0.55}
    ]',

    pab_max                     NUMERIC(8,2) NOT NULL DEFAULT 1020,
    pab_unten                   NUMERIC(10,2) NOT NULL DEFAULT 21614,
    pab_oben                    NUMERIC(10,2) NOT NULL DEFAULT 31494,

    grest_stufen                JSONB NOT NULL DEFAULT '[
        {"bis": 250000, "satz": 0.005},
        {"bis": 400000, "satz": 0.02},
        {"bis": null, "satz": 0.035}
    ]',

    UNIQUE(scenario_id)
);

CREATE TABLE IF NOT EXISTS scenario_results (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id         UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

    pension_netto_mt    NUMERIC(10,2),
    miete_netto_mt      NUMERIC(10,2),
    gold_rate_optimal   NUMERIC(10,2),
    gold_ende_2055      NUMERIC(14,2),
    gold_erhalt_pct     NUMERIC(5,2),
    depot_ende_2055     NUMERIC(14,2),
    erbmasse_brutto     NUMERIC(14,2),
    erbmasse_netto      NUMERIC(14,2),
    grest_gesamt        NUMERIC(10,2),

    cashflow_json       JSONB,
    calculated_at       TIMESTAMP DEFAULT NOW(),

    UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_scenarios_updated_at ON scenarios(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_archived ON scenarios(archived);
