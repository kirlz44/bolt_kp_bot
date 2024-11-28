const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        date: {
          gte: new Date()
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const message = games.length === 0 
      ? 'На данный момент нет запланированных игр'
      : 'Доступные игры:';

    const keyboard = games.map(game => ([{
      text: `${game.title} - ${game.date.toLocaleDateString()}`,
      callback_data: `view_game_${game.id}`
    }]));

    keyboard.push([{ text: '🔙 В меню', callback_data: 'open_menu' }]);

    // Проверяем, вызвана ли команда через callback
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } else {
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при получении списка игр:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
