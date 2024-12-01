const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    // Проверяем права доступа
    if (ctx.state.userRole !== 'admin' && ctx.state.userRole !== 'superadmin') {
      return ctx.reply('У вас нет доступа к этой функции');
    }

    const message = 
      '*📬 Управление рассылками*\n\n' +
      'Выберите тип получателей рассылки:';

    // Используем editMessageText если это callback_query, иначе reply
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 Всем пользователям', callback_data: 'broadcast_all' }],
            [{ text: '🎯 По квалификации', callback_data: 'broadcast_qualification' }],
            [{ text: '🤝 Партнерам', callback_data: 'broadcast_partners' }],
            [{ text: '📅 Запланированные рассылки', callback_data: 'broadcast_scheduled' }],
            [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
          ]
        }
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 Всем пользователям', callback_data: 'broadcast_all' }],
            [{ text: '🎯 По квалификации', callback_data: 'broadcast_qualification' }],
            [{ text: '🤝 Партнерам', callback_data: 'broadcast_partners' }],
            [{ text: '📅 Запланированные рассылки', callback_data: 'broadcast_scheduled' }],
            [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
          ]
        }
      });
    }
  } catch (error) {
    console.error('Ошибка в команде broadcast:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
