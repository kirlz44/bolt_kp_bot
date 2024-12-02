const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cron = require('node-cron');

// Функция для отправки уведомлений всем пользователям о новой игре
async function notifyAllUsersAboutNewGame(ctx, game) {
  try {
    console.log('Начинаем отправку уведомлений о новой игре:', game.title);
    const users = await prisma.user.findMany();
    console.log(`Найдено ${users.length} пользователей для отправки уведомлений`);
    
    const message = `🎮 *Новая игра!*\n\n` +
      `*${game.title}*\n\n` +
      `📅 Дата: ${game.date.toLocaleDateString()}\n` +
      `⏰ Время: ${game.date.toLocaleTimeString()}\n` +
      `📍 Место: ${game.location}\n` +
      `💰 Цена: ${game.priceRub}₽ / ${game.priceKur} куражиков\n` +
      `👥 Количество мест: ${game.seats}`;

    console.log('Подготовлено сообщение для отправки:', message);

    for (const user of users) {
      try {
        // Не отправляем уведомление создателю игры
        if (user.telegramId.toString() === ctx.from.id.toString()) {
          console.log(`Пропускаем отправку создателю игры: ${user.telegramId}`);
          continue;
        }
        
        // Проверяем, что telegramId существует и валиден
        if (!user.telegramId) {
          console.log(`Пропускаем пользователя без telegramId: ${user.id}`);
          continue;
        }

        console.log(`Отправка уведомления пользователю ${user.telegramId}`);
        try {
          await ctx.telegram.sendMessage(user.telegramId.toString(), message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '👀 Подробнее', callback_data: `view_game_${game.id}` }]
              ]
            }
          });
          console.log(`Уведомление успешно отправлено пользователю ${user.telegramId}`);
        } catch (sendError) {
          console.error(`Ошибка отправки сообщения пользователю ${user.telegramId}:`, sendError.message);
          // Если пользователь заблокировал бота или другая ошибка отправки,
          // продолжаем работу с следующим пользователем
          continue;
        }
        
        // Добавляем задержку между отправками
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Ошибка обработки пользователя ${user.telegramId}:`, error);
        continue;
      }
    }
    console.log('Завершена отправка уведомлений о новой игре');
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