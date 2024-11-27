const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    module.exports = async (ctx) => {
      const games = await prisma.game.findMany({
        where: {
          seats: {
            gt: 0
          }
        }
      });

      if (games.length > 0) {
        let message = 'Доступные игры:\n';
        games.forEach(game => {
          message += `\nНазвание: ${game.title}\nДата: ${game.date}\nМесто: ${game.location}\nЦена: ${game.priceRub} руб. / ${game.priceKur} куражиков\nДоступные места: ${game.seats}\n`;
          message += `/register_game_${game.id} - Зарегистрироваться\n/pay_game_${game.id} - Оплатить\n`;
        });
        ctx.reply(message);
      } else {
        ctx.reply('На данный момент нет доступных игр.');
      }
    };
