const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function createBonus(userId, amount, description) {
      return await prisma.bonus.create({
        data: {
          userId,
          amount,
          description
        }
      });
    }

    async function getBonusesByUserId(userId) {
      return await prisma.bonus.findMany({
        where: {
          userId
        }
      });
    }

    module.exports = {
      createBonus,
      getBonusesByUserId
    };
