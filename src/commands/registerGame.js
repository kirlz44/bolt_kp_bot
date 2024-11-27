const { PrismaClient } = require('@prisma/client');
    const { updateUserBalance } = require('../models/user');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const gameId = parseInt(ctx.match[1], 10);
      const userId = ctx.from.id;
      const user = await prisma.user.findUnique({ where: { telegramId: userId } });
      const game = await prisma.game.findUnique({ where: { id: gameId } });

      if (game && game.seats > 0) {
        if (user.balance >= game.priceKur) {
          // Deduct kurajiki from user's balance
          await updateUserBalance(user.id, -game.priceKur);

          // Update game seats
          await prisma.game.update({
            where: { id: gameId },
            data: { seats: { decrement: 1 } }
          });

          ctx.reply('Вы успешно зарегистрировались на игру.');
        } else {
          ctx.reply('Недостаточно куражиков для регистрации.');
        }
      } else {
        ctx.reply('Игра недоступна или нет свободных мест.');
      }
    };
