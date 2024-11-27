const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function createTransaction(userId, amount, description) {
      return await prisma.transaction.create({
        data: {
          userId,
          amount,
          description,
          status: 'pending'
        }
      });
    }

    async function getTransactionsByUserId(userId) {
      return await prisma.transaction.findMany({
        where: {
          userId
        }
      });
    }

    module.exports = {
      createTransaction,
      getTransactionsByUserId
    };
