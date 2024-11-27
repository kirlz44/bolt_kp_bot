const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    // Получаем общее количество пользователей
    const totalUsers = await prisma.user.count();
    
    // Получаем общую сумму куражиков
    const totalKurajiki = await prisma.user.aggregate({
      _sum: {
        balance: true
      }
    });

    // Получаем топ-10 активных пользователей по рефералам
    const topReferrers = await prisma.referral.groupBy({
      by: ['referrerId'],
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    });

    // Получаем статистику по товарам
    const productsStats = await prisma.product.aggregate({
      _count: {
        id: true
      },
      where: {
        stock: {
          gt: 0
        }
      }
    });

    // Получаем статистику по играм
    const gamesStats = await prisma.game.groupBy({
      by: ['id'],
      _count: {
        id: true
      },
      where: {
        date: {
          gte: new Date()
        }
      }
    });

    // Формируем сообщение со статистикой
    let message = '📊 *Статистика бота:*\n\n';
    message += `👥 Всего пользователей: ${totalUsers}\n`;
    message += `💎 Всего куражиков: ${totalKurajiki._sum.balance || 0}\n\n`;
    
    message += '🏆 *Топ-10 по рефералам:*\n';
    for (const ref of topReferrers) {
      const user = await prisma.user.findUnique({
        where: { id: ref.referrerId }
      });
      if (user) {
        message += `- ID: ${user.telegramId}, Рефералов: ${ref._count.userId}\n`;
      }
    }

    message += '\n📦 *Статистика товаров:*\n';
    message += `Доступно товаров: ${productsStats._count.id}\n`;

    message += '\n🎮 *Статистика игр:*\n';
    message += `Предстоящих игр: ${gamesStats.length}\n`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Обновить', callback_data: 'refresh_stats' }],
          [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    await ctx.reply('Произошла ошибка при получении статистики');
  }
};
