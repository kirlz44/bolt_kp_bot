const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendMessageToUser } = require('../utils/telegram');

const prisma = new PrismaClient();

// Функция для отправки еженедельного отчета
async function sendWeeklyReport() {
  try {
    const superAdminId = process.env.SUPER_ADMIN_ID;

    // Получаем топ-5 по постам
    const topPosters = await prisma.user.findMany({
      orderBy: {
        postsCount: 'desc'
      },
      take: 5
    });

    // Получаем топ-5 по рефералам
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
      take: 5
    });

    let message = '📊 *Еженедельный отчет*\n\n';
    
    message += '*Топ-5 по размещению постов:*\n';
    for (const user of topPosters) {
      message += `- [${user.telegramId}](tg://user?id=${user.telegramId})\n`;
      message += `Постов: ${user.postsCount}\n`;
      message += `Премировать: /reward_post_${user.id}\n\n`;
    }

    message += '*Топ-5 по привлечению пользователей:*\n';
    for (const ref of topReferrers) {
      const user = await prisma.user.findUnique({
        where: { id: ref.referrerId }
      });
      if (user) {
        message += `- [${user.telegramId}](tg://user?id=${user.telegramId})\n`;
        message += `Рефералов: ${ref._count.userId}\n`;
        message += `Премировать: /reward_ref_${user.id}\n\n`;
      }
    }

    await sendMessageToUser(superAdminId, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Ошибка при отправке еженедельного отчета:', error);
  }
}

// Запускаем отправку отчета каждое воскресенье в 7:00 МСК
cron.schedule('0 7 * * 0', sendWeeklyReport, {
  timezone: 'Europe/Moscow'
});

module.exports = {
  sendWeeklyReport
}; 