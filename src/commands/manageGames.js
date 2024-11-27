const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const games = await prisma.game.findMany();
      let message = 'Список игр:\n';
      games.forEach(game => {
        message += `Название: ${game.title}, Дата: ${game.date}, Место: ${game.location}\n`;
      });
      ctx.reply(message);
    };
