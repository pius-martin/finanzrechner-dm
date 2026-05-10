// Wandelt Prisma Decimal/Date Objekte in plain JSON-fähige Werte.
function plain(v) {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(plain);
    if (typeof v === 'object') {
        if (typeof v.toNumber === 'function' && v.constructor && v.constructor.name === 'Decimal') {
            return v.toNumber();
        }
        if (v instanceof Date) return v.toISOString();
        const out = {};
        for (const k of Object.keys(v)) out[k] = plain(v[k]);
        return out;
    }
    return v;
}

module.exports = { plain };
