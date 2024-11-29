const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const message = '*Управление мероприятиями*\n\n';
    
    const keyboard = [
      [{ text: '➕ Добавить мероприятие', callback_data: 'add_event' }],
      [{ text: '✏️ Редактировать мероприятие', callback_data: 'edit_event' }],
      [{ text: '❌ Удалить мероприятие', callback_data: 'delete_event' }],
      [{ text: '👥 Просмотр регистраций', callback_data: 'view_event_registrations' }],
      [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    console.error('Ошибка в управлении мероприятиями:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
