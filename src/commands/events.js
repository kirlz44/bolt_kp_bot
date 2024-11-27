const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const events = await prisma.event.findMany({
        where: {
          seats: {
            gt: 0
          }
        }
      });

      if (events.length > 0) {
        let message = 'Доступные мероприятия:\n';
        events.forEach(event => {
          message += `\nНазвание: ${event.title}\nДата: ${event.date}\nМесто: ${event.location}\nЦена: ${event.priceRub} руб. / ${event.priceKur} куражиков\nДоступные места: ${event.seats}\n`;
          message += `/register_event_${event.id} - Зарегистрироваться\n/pay_event_${event.id} - Оплатить\n`;
        });
        ctx.reply(message);
      } else {
        ctx.reply('На данный момент нет доступных мероприятий.');
      }
    };
