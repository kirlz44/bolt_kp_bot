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

async function checkScheduledBroadcasts(bot) {
  try {
    // Получаем все невыполненные рассылки, время которых уже наступило
    const broadcasts = await prisma.scheduledBroadcast.findMany({
      where: {
        isCompleted: false,
        scheduledFor: {
          lte: new Date()
        }
      }
    });

    for (const broadcast of broadcasts) {
      try {
        let users = [];
        
        // Получаем список пользователей в зависимости от типа рассылки
        switch (broadcast.type) {
          case 'all':
            users = await prisma.user.findMany();
            break;
          case 'partners':
            users = await prisma.user.findMany({
              where: { role: 'partner' }
            });
            break;
          case 'qualification':
            users = await prisma.user.findMany({
              where: { qualification: broadcast.qualification }
            });
            break;
        }

        // Отправляем сообщение каждому пользователю
        let successCount = 0;
        for (const user of users) {
          try {
            if (broadcast.photo) {
              await bot.telegram.sendPhoto(Number(user.telegramId), broadcast.photo, {
                caption: broadcast.caption || ''
              });
            } else {
              await bot.telegram.sendMessage(Number(user.telegramId), broadcast.message);
            }
            successCount++;
          } catch (error) {
            console.error(`Ошибка отправки пользователю ${user.telegramId}:`, error);
          }
        }

        // Отмечаем рассылку как выполненную
        await prisma.scheduledBroadcast.update({
          where: { id: broadcast.id },
          data: { isCompleted: true }
        });

        // Уведомляем создателя рассылки
        await bot.telegram.sendMessage(
          Number(broadcast.createdBy),
          `✅ Запланированная рассылка выполнена!\n` +
          `Успешно отправлено: ${successCount} из ${users.length} сообщений.`
        );

      } catch (error) {
        console.error('Ошибка при выполнении рассылки:', error);
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке запланированных рассылок:', error);
  }
}

// Запускаем проверку каждую минуту
function startScheduler(bot) {
  cron.schedule('* * * * *', () => checkScheduledBroadcasts(bot));
}

module.exports = {
  sendWeeklyReport,
  startScheduler
}; 