const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx, gameId) => {
  try {
    const userId = ctx.from.id;
    const parsedGameId = parseInt(gameId);

    if (isNaN(parsedGameId)) {
      console.error('Некорректный ID игры:', gameId);
      return ctx.reply('Произошла ошибка при оплате игры');
    }

    // Получаем информацию об игре и пользователе
    const [game, user] = await Promise.all([
      prisma.game.findUnique({ 
        where: { id: parsedGameId }
      }),
      prisma.user.findUnique({ 
        where: { telegramId: userId }
      })
    ]);

    if (!game) {
      return ctx.reply('Игра не найдена');
    }

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    if (game.seats <= 0) {
      return ctx.reply('К сожалению, все места уже заняты');
    }

    // Проверяем баланс пользователя
    if (user.balance < game.priceKur) {
      return ctx.reply(
        'Недостаточно куражиков для участия в игре.\n' +
        `Необходимо: ${game.priceKur} куражиков\n` +
        `Ваш баланс: ${user.balance} куражиков`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Заработать куражики', callback_data: 'earn' }],
              [{ text: '🔙 Вернуться к игре', callback_data: `view_game_${parsedGameId}` }]
            ]
          }
        }
      );
    }

    // Списываем куражики и обновляем количество мест
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: game.priceKur } }
      }),
      prisma.user.update({
        where: { id: game.creator.id },
        data: { balance: { increment: game.priceKur } }
      }),
      prisma.game.update({
        where: { id: parsedGameId },
        data: { seats: { decrement: 1 } }
      })
    ]);

    // Уведомляем пользователя об успешной регистрации
    await ctx.reply(
      `✅ Вы успешно зарегистрировались на игру "${game.title}" за ${game.priceKur} куражиков!\n` +
      'Администратор свяжется с вами для подтверждения участия.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 К списку игр', callback_data: 'games' }]
          ]
        }
      }
    );

    // Уведомляем админов о регистрации
    const adminMessage = 
      `🎮 Новая регистрация на игру!\n\n` +
      `Игра: ${game.title}\n` +
      `Дата: ${game.date.toLocaleDateString()}\n` +
      `Оплата: ${game.priceKur} куражиков\n` +
      `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
      `Username: @${ctx.from.username || 'отсутствует'}\n` +
      `ID: ${userId}`;

    await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Участие подтверждено', callback_data: `game_registration_confirmed_${userId}_${parsedGameId}` }]
        ]
      }
    });

    // Уведомляем создателя игры о новой оплате
    await ctx.telegram.sendMessage(
      game.creator.telegramId,
      `💰 Новая оплата за игру "${game.title}"!\n` +
      `Получено: ${game.priceKur} куражиков\n` +
      `От: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
      `Username: @${ctx.from.username || 'отсутствует'}`
    );

  } catch (error) {
    console.error('Ошибка при оплате игры:', error);
    await ctx.reply('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
  }
}; 