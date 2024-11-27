const { PrismaClient } = require('@prisma/client');
    const { updateUserBalance } = require('../models/user');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const eventId = parseInt(ctx.match[1], 10);
      const userId = ctx.from.id;
      const user = await prisma.user.findUnique({ where: { telegramId: userId } });
      const event = await prisma.event.findUnique({ where: { id: eventId } });

      if (event && event.seats > 0) {
        if (user.balance >= event.priceKur) {
          // Deduct kurajiki from user's balance
          await updateUserBalance(user.id, -event.priceKur);

          // Update event seats
          await prisma.event.update({
            where: { id: eventId },
            data: { seats: { decrement: 1 } }
          });

          ctx.reply('Вы успешно зарегистрировались на мероприятие.');
        } else {
          ctx.reply('Недостаточно куражиков для регистрации.');
        }
      } else {
        ctx.reply('Мероприятие недоступно или нет свободных мест.');
      }
    };
