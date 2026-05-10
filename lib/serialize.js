// Wandelt Prisma Decimal/Date Objekte in plain JSON-faehige Werte.
//
// Prisma nutzt decimal.js fuer Decimal-Felder. Instanzen haben toNumber().
// Frueher haben wir constructor.name === 'Decimal' geprueft - das kann
// nach Bundling fehlschlagen (mangling). Jetzt vertrauen wir toNumber().
function plain(v) {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(plain);
    if (v instanceof Date) return v.toISOString();
    if (typeof v.toNumber === 'function') {
        try { return v.toNumber(); } catch (_) { /* fallthrough */ }
    }
    const out = {};
    for (const k of Object.keys(v)) out[k] = plain(v[k]);
    return out;
}

module.exports = { plain };
