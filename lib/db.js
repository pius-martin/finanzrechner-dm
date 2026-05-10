// Prisma-Client Singleton.
const { PrismaClient } = require('@prisma/client');

let prisma;
if (!global.__prisma) {
    global.__prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });
}
prisma = global.__prisma;

module.exports = prisma;
