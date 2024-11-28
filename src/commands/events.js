const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        seats: {
          gt: 0
        }
      }
    });

    let message;
    let keyboard;

    if (events.length > 0) {
      message = 'Доступные мероприятия:\n\n';
      events.forEach(event => {
        message += `Название: ${event.title}\nДата: ${event.date}\nМесто: ${event.location}\nЦена: ${event.priceRub} руб. / ${event.priceKur} куражиков\nДоступные места: ${event.seats}\n\n`;
      });

      keyboard = events.map(event => ([
        { text: event.title, callback_data: `view_event_${event.id}` }
      ]));
    } else {
      message = 'На данный момент нет доступных мероприятий.';
      keyboard = [];
    }

    keyboard.push([{ text: '🔙 В меню', callback_data: 'open_menu' }]);

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
    console.error('Ошибка при получении списка мероприятий:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
