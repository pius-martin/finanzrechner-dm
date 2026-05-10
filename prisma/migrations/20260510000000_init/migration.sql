-- Prisma migration: initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL DEFAULT 'Neues Szenario',
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scenario_inputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "at_pension_brutto_mt" DECIMAL(10,2) NOT NULL DEFAULT 3500,
    "ch_ahv_brutto_mt" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "pension_y_netto_mt" DECIMAL(10,2) NOT NULL DEFAULT 1000,
    "miete_whg2_brutto_mt" DECIMAL(10,2) NOT NULL DEFAULT 1200,
    "miete_whg2_startjahr" INTEGER NOT NULL DEFAULT 2028,
    "miete_whg2_wert" DECIMAL(12,2) NOT NULL DEFAULT 300000,
    "haushalt_bis_80" DECIMAL(10,2) NOT NULL DEFAULT 7000,
    "haushalt_ab_80" DECIMAL(10,2) NOT NULL DEFAULT 5500,
    "instandhaltung_pa" DECIMAL(10,2) NOT NULL DEFAULT 6000,
    "depot_start" DECIMAL(14,2) NOT NULL DEFAULT 1180000,
    "gold_start" DECIMAL(14,2) NOT NULL DEFAULT 1374000,
    "pt_lda_95_wert" DECIMAL(14,2) NOT NULL DEFAULT 570000,
    "pt_miete_brutto_pa" DECIMAL(10,2) NOT NULL DEFAULT 18000,
    "holding_fix_j1" DECIMAL(10,2) NOT NULL DEFAULT 24900,
    "holding_fix_jx" DECIMAL(10,2) NOT NULL DEFAULT 20400,
    "darlehen_betrag" DECIMAL(14,2) NOT NULL DEFAULT 200000,
    "darlehen_jahre" INTEGER NOT NULL DEFAULT 10,
    "darlehen_zins_real" DECIMAL(5,4) NOT NULL DEFAULT 0.005,
    "kredit_betrag" DECIMAL(14,2) NOT NULL DEFAULT 300000,
    "kredit_laufzeit" INTEGER NOT NULL DEFAULT 15,
    "kredit_realzins" DECIMAL(5,4) NOT NULL DEFAULT 0.015,
    "reno_whg2_2026" DECIMAL(12,2) NOT NULL DEFAULT 100000,
    "reno_whg1_2027_2029" DECIMAL(12,2) NOT NULL DEFAULT 450000,
    "auto_privat" DECIMAL(10,2) NOT NULL DEFAULT 50000,
    "ram_rueckkauf" DECIMAL(10,2) NOT NULL DEFAULT 30000,
    "pt_zuschuss" DECIMAL(12,2) NOT NULL DEFAULT 150000,
    "privathaus_wert" DECIMAL(14,2) NOT NULL DEFAULT 1500000,
    "schruns_wohnung_y" DECIMAL(14,2) NOT NULL DEFAULT 700000,
    "diverses" DECIMAL(10,2) NOT NULL DEFAULT 50000,
    "lwf_schruns" DECIMAL(10,2) NOT NULL DEFAULT 15000,
    "priv_gold_2026" DECIMAL(12,2) NOT NULL DEFAULT 335000,
    "priv_silber_2026" DECIMAL(10,2) NOT NULL DEFAULT 4000,
    "koest" DECIMAL(5,4) NOT NULL DEFAULT 0.23,
    "kest" DECIMAL(5,4) NOT NULL DEFAULT 0.275,
    "kv_pensionisten" DECIMAL(5,4) NOT NULL DEFAULT 0.06,
    "pt_irc" DECIMAL(5,4) NOT NULL DEFAULT 0.21,
    "depot_rendite_real" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "sonder_freibetrag" DECIMAL(8,2) NOT NULL DEFAULT 620,
    "sonder_steuersatz" DECIMAL(5,4) NOT NULL DEFAULT 0.06,
    "gold_bilanz_faktor" DECIMAL(5,4) NOT NULL DEFAULT 0.77,
    "est_tarifstufen" JSONB NOT NULL DEFAULT '[{"bis":13539,"satz":0},{"bis":21992,"satz":0.20},{"bis":36458,"satz":0.30},{"bis":70365,"satz":0.40},{"bis":104859,"satz":0.48},{"bis":1000000,"satz":0.50},{"bis":null,"satz":0.55}]',
    "pab_max" DECIMAL(8,2) NOT NULL DEFAULT 1020,
    "pab_unten" DECIMAL(10,2) NOT NULL DEFAULT 21614,
    "pab_oben" DECIMAL(10,2) NOT NULL DEFAULT 31494,
    "grest_stufen" JSONB NOT NULL DEFAULT '[{"bis":250000,"satz":0.005},{"bis":400000,"satz":0.02},{"bis":null,"satz":0.035}]',
    CONSTRAINT "scenario_inputs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scenario_inputs_scenario_id_key" ON "scenario_inputs"("scenario_id");

CREATE TABLE "scenario_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "pension_netto_mt" DECIMAL(10,2),
    "miete_netto_mt" DECIMAL(10,2),
    "gold_rate_optimal" DECIMAL(10,2),
    "gold_ende_2055" DECIMAL(14,2),
    "gold_erhalt_pct" DECIMAL(5,2),
    "depot_ende_2055" DECIMAL(14,2),
    "erbmasse_brutto" DECIMAL(14,2),
    "erbmasse_netto" DECIMAL(14,2),
    "grest_gesamt" DECIMAL(10,2),
    "cashflow_json" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scenario_results_scenario_id_key" ON "scenario_results"("scenario_id");

ALTER TABLE "scenario_inputs" ADD CONSTRAINT "scenario_inputs_scenario_id_fkey"
    FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scenario_results" ADD CONSTRAINT "scenario_results_scenario_id_fkey"
    FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_scenarios_updated_at" ON "scenarios"("updated_at" DESC);
CREATE INDEX "idx_scenarios_archived" ON "scenarios"("archived");
