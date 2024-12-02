const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx, productId) => {
  try {
    const userId = ctx.from.id;

    // Получаем информацию о товаре и пользователе
    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.user.findUnique({ where: { telegramId: userId } })
    ]);

    if (!product) {
      return ctx.reply('Товар не найден');
    }

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    if (product.stock <= 0) {
      return ctx.reply('К сожалению, товар закончился');
    }

    // Проверяем, есть ли у пользователя активная скидка
    const discountCode = ctx.session?.discountCode;
    let finalPrice = product.priceKur;

    if (discountCode && discountCode.startsWith('WHEEL') && discountCode.includes('D')) {
      const discountPercent = parseInt(discountCode.match(/D(\d+)/)[1]);
      finalPrice = Math.round(product.priceKur * (1 - discountPercent / 100));
    }

    // Проверяем баланс пользователя
    if (user.balance < finalPrice) {
      return ctx.reply(
        'Недостаточно куражиков для покупки.\n' +
        `Необходимо: ${finalPrice} куражиков\n` +
        `Ваш баланс: ${user.balance} куражиков`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Заработать куражики', callback_data: 'earn' }],
              [{ text: '🔙 Вернуться к товару', callback_data: `view_product_${productId}` }]
            ]
          }
        }
      );
    }

    // Списываем куражики и обновляем количество товара
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: finalPrice } }
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: 1 } }
      })
    ]);

    // Уведомляем пользователя об успешной покупке
    await ctx.reply(
      `✅ Вы успешно купили "${product.name}" за ${finalPrice} куражиков!\n` +
      'Администратор свяжется с вами для передачи товара.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍 Вернуться в маркетплейс', callback_data: 'marketplace' }]
          ]
        }
      }
    );

    // Уведомляем админов о покупке
    const adminMessage = 
      `🛍 Новая покупка за куражики!\n\n` +
      `Товар: ${product.name}\n` +
      `Цена: ${finalPrice} куражиков\n` +
      `Покупатель: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
      `Username: @${ctx.from.username || 'отсутствует'}\n` +
      `ID: ${userId}`;

    await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Товар выдан', callback_data: `product_given_${userId}_${productId}` }]
        ]
      }
    });

  } catch (error) {
    console.error('Ошибка при покупке товара:', error);
    await ctx.reply('Произошла ошибка при оформлении покупки. Пожалуйста, попробуйте позже.');
  }
};
