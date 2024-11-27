const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        date: {
          gte: new Date() // Только предстоящие игры
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    if (games.length === 0) {
      return ctx.reply('На данный момент нет запланированных игр', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 В меню', callback_data: 'open_menu' }]
          ]
        }
      });
    }

    // Создаем клавиатуру со списком игр
    const keyboard = games.map(game => ([{
      text: `${game.title} - ${game.date.toLocaleDateString()}`,
      callback_data: `view_game_${game.id}`
    }]));

    keyboard.push([{ text: '🔙 В меню', callback_data: 'open_menu' }]);

    await ctx.reply('Доступные игры:', {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка при получении списка игр:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
