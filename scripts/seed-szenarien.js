// CLI-Wrapper: node scripts/seed-szenarien.js
const seed = require('./seed-szenarien-fn');
const prisma = require('../lib/db');

(async () => {
    await seed();
    await prisma.$disconnect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
