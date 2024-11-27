const { PrismaClient } = require('@prisma/client');
const { generatePaymentUrl } = require('../services/robokassa');
const prisma = new PrismaClient();

module.exports = async (ctx, gameId) => {
  try {
    const userId = ctx.from.id;
    const parsedGameId = parseInt(gameId);

    if (isNaN(parsedGameId)) {
      console.error('Некорректный ID игры:', gameId);
      return ctx.reply('Произошла ошибка при оплате игры');
    }

    // Получаем информацию об игре
    const game = await prisma.game.findUnique({
      where: { id: parsedGameId }
    });

    if (!game) {
      return ctx.reply('Игра не найдена');
    }

    if (game.seats <= 0) {
      return ctx.reply('К сожалению, все места уже заняты');
    }

    // Генерируем ссылку для оплаты
    const isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';
    const paymentUrl = generatePaymentUrl(
      game.priceRub,
      `Оплата участия в игре: ${game.title}`,
      isTestMode
    );

    // Отправляем сообщение с ссылкой на оплату
    await ctx.reply(
      `Для оплаты участия в игре "${game.title}" перейдите по ссылке:\n` +
      `Сумма к оплате: ${game.priceRub}₽`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Оплатить', url: paymentUrl }],
            [{ text: '🔙 Вернуться к игре', callback_data: `view_game_${parsedGameId}` }]
          ]
        }
      }
    );

  } catch (error) {
    console.error('Ошибка при оплате игры:', error);
    await ctx.reply('Произошла ошибка при оформлении оплаты. Пожалуйста, попробуйте позже.');
  }
};
