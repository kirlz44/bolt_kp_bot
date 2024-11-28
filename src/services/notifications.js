const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cron = require('node-cron');

// Функция для отправки уведомлений всем пользователям о новой игре
async function notifyAllUsersAboutNewGame(ctx, game) {
  try {
    const users = await prisma.user.findMany();
    const message = `🎮 *Новая игра!*\n\n` +
      `*${game.title}*\n\n` +
      `📅 Дата: ${game.date.toLocaleDateString()}\n` +
      `⏰ Время: ${game.date.toLocaleTimeString()}\n` +
      `📍 Место: ${game.location}\n` +
      `💰 Цена: ${game.priceRub}₽ / ${game.priceKur} куражиков\n` +
      `👥 Количество мест: ${game.seats}`;

    for (const user of users) {
      try {
        // Не отправляем уведомление создателю игры
        if (user.telegramId.toString() === ctx.from.id.toString()) continue;
        
        await ctx.telegram.sendMessage(user.telegramId.toString(), message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '👀 Подробнее', callback_data: `view_game_${game.id}` }]
            ]
          }
        });
        
        // Добавляем задержку между отправками
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Ошибка отправки уведомления пользователю ${user.telegramId}:`, error);
      }
    }
  } catch (error) {
    console.error('Ошибка массовой рассылки:', error);
  }
}

// Функция для настройки напоминаний о предстоящей игре
function scheduleGameReminders(ctx, game, participants) {
  const gameDate = new Date(game.date);
  
  // Напоминание за сутки
  const oneDayBefore = new Date(gameDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  
  // Напоминание за час
  const oneHourBefore = new Date(gameDate);
  oneHourBefore.setHours(oneHourBefore.getHours() - 1);

  // Планируем напоминания для каждого участника
  participants.forEach(participant => {
    // За сутки
    cron.schedule(
      `${oneDayBefore.getMinutes()} ${oneDayBefore.getHours()} ${oneDayBefore.getDate()} ${oneDayBefore.getMonth() + 1} *`,
      async () => {
        try {
          await ctx.telegram.sendMessage(
            participant.telegramId.toString(),
            `⏰ *Напоминание!*\n\n` +
            `Завтра в ${gameDate.toLocaleTimeString()} состоится игра "${game.title}"\n` +
            `📍 Место: ${game.location}`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error(`Ошибка отправки напоминания пользователю ${participant.telegramId}:`, error);
        }
      }
    );

    // За час
    cron.schedule(
      `${oneHourBefore.getMinutes()} ${oneHourBefore.getHours()} ${oneHourBefore.getDate()} ${oneHourBefore.getMonth() + 1} *`,
      async () => {
        try {
          await ctx.telegram.sendMessage(
            participant.telegramId.toString(),
            `⏰ *Напоминание!*\n\n` +
            `Через час начнется игра "${game.title}"\n` +
            `📍 Место: ${game.location}`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error(`Ошибка отправки напоминания пользователю ${participant.telegramId}:`, error);
        }
      }
    );
  });
}

module.exports = {
  notifyAllUsersAboutNewGame,
  scheduleGameReminders
}; 