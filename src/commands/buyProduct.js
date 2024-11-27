const { PrismaClient } = require('@prisma/client');
    const { updateUserBalance } = require('../models/user');
    const { sendMessageToUser } = require('../utils/telegram');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const productId = parseInt(ctx.match[1], 10);
      const userId = ctx.from.id;
      const user = await prisma.user.findUnique({ where: { telegramId: userId } });
      const product = await prisma.product.findUnique({ where: { id: productId } });

      if (product && user.balance >= product.priceKur) {
        // Deduct kurajiki from user's balance
        await updateUserBalance(user.id, -product.priceKur);

        // Update product stock
        await prisma.product.update({
          where: { id: productId },
          data: { stock: { decrement: 1 } }
        });

        // Notify user about successful purchase
        sendMessageToUser(user.telegramId, `Вы успешно купили ${product.name} за ${product.priceKur} куражиков.`);

        // Notify admin about successful purchase
        const adminChatId = process.env.ADMIN_CHAT_ID;
        sendMessageToUser(adminChatId, `Пользователь ${user.telegramId} купил ${product.name} за ${product.priceKur} куражиков.`);
      } else {
        ctx.reply('Недостаточно куражиков для покупки или товар недоступен.');
      }
    };
