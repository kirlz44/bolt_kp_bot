const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    if (ctx.state.userRole !== 'admin' && ctx.state.userRole !== 'superadmin') {
      return ctx.reply('У вас нет доступа к управлению играми');
    }

    const games = await prisma.game.findMany({
      orderBy: {
        date: 'asc'
      }
    });

    let message = '*Управление играми*\n\n';

    if (games.length > 0) {
      message += 'Предстоящие игры:\n\n';
      games.forEach(game => {
        message += `🎮 ${game.title}\n`;
        message += `📅 ${game.date.toLocaleDateString()}\n`;
        message += `⏰ ${game.date.toLocaleTimeString()}\n`;
        message += `📍 ${game.location}\n`;
        message += `💰 ${game.priceRub}₽ / ${game.priceKur} куражиков\n`;
        message += `👥 Мест: ${game.seats}\n\n`;
      });
    } else {
      message += 'Нет запланированных игр\n';
    }

    const keyboard = [
      [{ text: '➕ Добавить игру', callback_data: 'add_game' }],
      [{ text: '📋 Список игр', callback_data: 'list_games' }],
      [{ text: '✏️ Редактировать игру', callback_data: 'edit_game' }],
      [{ text: '❌ Удалить игру', callback_data: 'delete_game' }],
      [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка в управлении играми:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
