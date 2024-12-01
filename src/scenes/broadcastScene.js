const { Scenes } = require('telegraf');
const { createScheduledBroadcast } = require('../services/broadcastService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const broadcastScene = new Scenes.WizardScene(
  'broadcast_scene',
  // Шаг 1: Получение сообщения или фото
  async (ctx) => {
    try {
      const { broadcastType, qualification } = ctx.scene.state;
      
      await ctx.reply(
        'Отправьте сообщение для рассылки.\n' +
        'Это может быть текст или фото с подписью.\n' +
        'Для отмены нажмите /cancel',
        {
          reply_markup: {
            remove_keyboard: true
          }
        }
      );

      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка в сцене рассылки:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 2: Подтверждение рассылки
  async (ctx) => {
    try {
      // Сохраняем сообщение
      if (ctx.message?.photo) {
        ctx.scene.state.photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        ctx.scene.state.caption = ctx.message.caption || '';
      } else if (ctx.message?.text) {
        ctx.scene.state.message = ctx.message.text;
      } else {
        await ctx.reply('Пожалуйста, отправьте текст или фото с подписью.');
        return;
      }

      // Показываем предпросмотр
      let previewMessage = '📨 *Предпросмотр рассылки:*\n\n';
      
      if (ctx.scene.state.photo) {
        await ctx.replyWithPhoto(ctx.scene.state.photo, {
          caption: previewMessage + (ctx.scene.state.caption || ''),
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Отправить сейчас', callback_data: 'broadcast_send_now' },
                { text: '⏰ Запланировать', callback_data: 'broadcast_schedule' }
              ],
              [{ text: '❌ Отменить', callback_data: 'broadcast_cancel' }]
            ]
          }
        });
      } else {
        await ctx.reply(previewMessage + ctx.scene.state.message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Отправить сейчас', callback_data: 'broadcast_send_now' },
                { text: '⏰ Запланировать', callback_data: 'broadcast_schedule' }
              ],
              [{ text: '❌ Отменить', callback_data: 'broadcast_cancel' }]
            ]
          }
        });
      }

      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при создании рассылки:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 3: Планирование времени (если выбрано)
  async (ctx) => {
    try {
      if (!ctx.callbackQuery) return;

      const action = ctx.callbackQuery.data;

      switch (action) {
        case 'broadcast_send_now':
          await executeBroadcast(ctx);
          await ctx.reply('✅ Рассылка успешно отправлена!', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Вернуться к рассылкам', callback_data: 'broadcast' }]
              ]
            }
          });
          return ctx.scene.leave();

        case 'broadcast_schedule':
          await ctx.reply(
            '📅 Введите дату и время для отправки в формате:\n' +
            'ДД.ММ.ГГГГ ЧЧ:ММ\n' +
            'Например: 25.12.2024 15:30'
          );
          return ctx.wizard.next();

        case 'broadcast_cancel':
          await ctx.reply('❌ Создание рассылки отменено');
          return ctx.scene.leave();
      }
    } catch (error) {
      console.error('Ошибка при обработке действия:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 4: Сохранение запланированной рассылки
  async (ctx) => {
    try {
      if (!ctx.message?.text) {
        await ctx.reply('Пожалуйста, введите дату и время в указанном формате.');
        return;
      }

      const dateStr = ctx.message.text;
      
      // Проверяем формат даты через регулярное выражение
      const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/;
      const match = dateStr.match(dateRegex);
      
      if (!match) {
        await ctx.reply(
          'Неверный формат даты и времени.\n' +
          'Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ\n' +
          'Например: 25.12.2024 15:30'
        );
        return;
      }

      const [, day, month, year, hours, minutes] = match;
      
      // Создаем дату в московском времени
      const moscowDate = new Date();
      moscowDate.setFullYear(parseInt(year));
      moscowDate.setMonth(parseInt(month) - 1); // Месяцы начинаются с 0
      moscowDate.setDate(parseInt(day));
      moscowDate.setHours(parseInt(hours));
      moscowDate.setMinutes(parseInt(minutes));
      moscowDate.setSeconds(0);
      moscowDate.setMilliseconds(0);

      // Проверяем, что дата в будущем
      const now = new Date();
      if (moscowDate <= now) {
        await ctx.reply('Пожалуйста, введите дату и время в будущем.');
        return;
      }

      // Сохраняем запланированную рассылку
      await createScheduledBroadcast({
        type: ctx.scene.state.broadcastType,
        qualification: ctx.scene.state.qualification,
        message: ctx.scene.state.message || '',
        photo: ctx.scene.state.photo || null,
        caption: ctx.scene.state.caption || '',
        scheduledFor: moscowDate,
        createdBy: ctx.from.id
      });

      // Форматируем дату для вывода
      const formatter = new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Europe/Moscow'
      });

      await ctx.reply(
        '✅ Рассылка успешно запланирована на ' + formatter.format(moscowDate) + ' (МСК)',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Вернуться к рассылкам', callback_data: 'broadcast' }]
            ]
          }
        }
      );

      return ctx.scene.leave();
    } catch (error) {
      console.error('Ошибка при планировании рассылки:', error);
      await ctx.reply('Произошла ошибка при планировании рассылки. Попробуйте позже.');
      return ctx.scene.leave();
    }
  }
);

// Обработка команды отмены
broadcastScene.command('cancel', async (ctx) => {
  await ctx.reply('Создание рассылки отменено');
  return ctx.scene.leave();
});

// Функция выполнения рассылки
async function executeBroadcast(ctx) {
  const { broadcastType, qualification, message, photo, caption } = ctx.scene.state;

  let users = [];
  
  // Получаем список пользователей в зависимости от типа рассылки
  switch (broadcastType) {
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
        where: { qualification }
      });
      break;
  }

  // Отправляем сообщение каждому пользователю
  let successCount = 0;
  for (const user of users) {
    try {
      if (photo) {
        await ctx.telegram.sendPhoto(Number(user.telegramId), photo, {
          caption: caption || ''
        });
      } else {
        await ctx.telegram.sendMessage(Number(user.telegramId), message);
      }
      successCount++;
    } catch (error) {
      console.error(`Ошибка отправки пользователю ${user.telegramId}:`, error);
    }
  }

  return successCount;
}

module.exports = broadcastScene; 