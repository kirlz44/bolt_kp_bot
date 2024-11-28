const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const events = await prisma.event.findMany();
    let message = '*Управление мероприятиями*\n\n';
    
    if (events.length > 0) {
      message += 'Текущие мероприятия:\n\n';
      events.forEach(event => {
        message += `🎪 ${event.title}\n`;
        message += `📅 ${event.date.toLocaleDateString()}\n`;
        message += `📍 ${event.location}\n\n`;
      });
    } else {
      message += 'Мероприятия отсутствуют\n';
    }

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Добавить мероприятие', callback_data: 'add_event' }],
          [{ text: '✏️ Редактировать мероприятие', callback_data: 'edit_event' }],
          [{ text: '❌ Удалить мероприятие', callback_data: 'delete_event' }],
          [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка в управлении мероприятиями:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
