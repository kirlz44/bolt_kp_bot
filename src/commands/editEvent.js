const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        date: {
          gte: new Date()
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    if (events.length === 0) {
      return ctx.editMessageText('Нет активных мероприятий для редактирования', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад', callback_data: 'manage_events' }]
          ]
        }
      });
    }

    const keyboard = events.map(event => ([{
      text: `${event.title} - ${event.date.toLocaleDateString()}`,
      callback_data: `edit_event_${event.id}`
    }]));

    keyboard.push([{ text: '🔙 Назад', callback_data: 'manage_events' }]);

    await ctx.editMessageText('Выберите мероприятие для редактирования:', {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка при редактировании мероприятия:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}; 