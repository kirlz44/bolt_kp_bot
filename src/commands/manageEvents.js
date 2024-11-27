const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const events = await prisma.event.findMany();
      let message = 'Список мероприятий:\n';
      events.forEach(event => {
        message += `Название: ${event.title}, Дата: ${event.date}, Место: ${event.location}\n`;
      });
      ctx.reply(message);
    };
