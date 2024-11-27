const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const users = await prisma.user.findMany();
      let message = 'Список пользователей:\n';
      users.forEach(user => {
        message += `ID: ${user.id}, Telegram ID: ${user.telegramId}, Роль: ${user.role}\n`;
      });
      ctx.reply(message);
    };
