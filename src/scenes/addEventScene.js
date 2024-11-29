const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const addEventScene = new Scenes.WizardScene(
  'add_event_scene',
  // Шаг 1: Название мероприятия
  async (ctx) => {
    await ctx.reply('Введите название мероприятия:');
    return ctx.wizard.next();
  },
  // Шаг 2: Описание
  async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply('Введите описание мероприятия:');
    return ctx.wizard.next();
  },
  // Шаг 3: Дата и время
  async (ctx) => {
    ctx.wizard.state.description = ctx.message.text;
    await ctx.reply('Введите дату и время в формате ДД.ММ.ГГГГ ЧЧ:ММ:');
    return ctx.wizard.next();
  },
  // Шаг 4: Место проведения
  async (ctx) => {
    try {
      const dateStr = ctx.message.text;
      
      // Проверяем формат даты с помощью регулярного выражения
      const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/;
      const match = dateStr.match(dateRegex);
      
      if (!match) {
        await ctx.reply(
          'Неверный формат даты и времени.\n' +
          'Пожалуйста, используйте формат ДД.ММ.ГГГГ ЧЧ:ММ\n' +
          'Например: 25.12.2024 19:30'
        );
        return;
      }

      const [, day, month, year, hours, minutes] = match;
      const date = new Date(year, month - 1, day, hours, minutes);
      
      // Проверяем валидность даты
      if (isNaN(date.getTime())) {
        await ctx.reply(
          'Указана некорректная дата.\n' +
          'Пожалуйста, проверьте правильность введенных данных.'
        );
        return;
      }

      // Проверяем, что дата не в прошлом
      if (date < new Date()) {
        await ctx.reply(
          'Дата мероприятия не может быть в прошлом.\n' +
          'Пожалуйста, укажите будущую дату.'
        );
        return;
      }

      // Проверяем корректность времени
      if (hours > 23 || minutes > 59) {
        await ctx.reply(
          'Указано некорректное время.\n' +
          'Часы должны быть от 00 до 23, минуты от 00 до 59.'
        );
        return;
      }
      
      ctx.wizard.state.date = date;
      await ctx.reply('Введите место проведения:');
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при обработке даты:', error);
      await ctx.reply(
        'Произошла ошибка при обработке даты.\n' +
        'Пожалуйста, введите дату и время в формате ДД.ММ.ГГГГ ЧЧ:ММ\n' +
        'Например: 25.12.2024 19:30'
      );
      return;
    }
  },
  // Шаг 5: Количество мест
  async (ctx) => {
    ctx.wizard.state.location = ctx.message.text;
    await ctx.reply('Введите количество мест:');
    return ctx.wizard.next();
  },
  // Шаг 6: Стоимость
  async (ctx) => {
    const seats = parseInt(ctx.message.text);
    if (isNaN(seats) || seats <= 0) {
      await ctx.reply('Пожалуйста, введите корректное число мест:');
      return;
    }
    ctx.wizard.state.seats = seats;
    await ctx.reply(
      'Введите стоимость мероприятия в формате "РУБЛИ КУРАЖИКИ" или "0 0" для бесплатного мероприятия\n' +
      'Например: "1000 2000" или "0 0"'
    );
    return ctx.wizard.next();
  },
  // После шага с ценой добавляем шаг загрузки фото
  async (ctx) => {
    const [priceRub, priceKur] = ctx.message.text.split(' ').map(Number);
    
    if (isNaN(priceRub) || isNaN(priceKur) || priceRub < 0 || priceKur < 0) {
      await ctx.reply('Пожалуйста, введите корректную стоимость:');
      return;
    }

    ctx.wizard.state.priceRub = priceRub;
    ctx.wizard.state.priceKur = priceKur;

    await ctx.reply(
      'Отправьте фото для мероприятия или нажмите кнопку "Пропустить":',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏩ Пропустить', callback_data: 'skip_event_photo' }]
          ]
        }
      }
    );

    return ctx.wizard.next();
  },
  // Финальный шаг - сохранение мероприятия
  async (ctx) => {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(ctx.from.id) }
      });

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      let imageId = null;
      if (ctx.message?.photo) {
        imageId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      }

      const event = await prisma.event.create({
        data: {
          title: ctx.wizard.state.title,
          description: ctx.wizard.state.description,
          date: ctx.wizard.state.date,
          location: ctx.wizard.state.location,
          seats: ctx.wizard.state.seats,
          priceRub: ctx.wizard.state.priceRub,
          priceKur: ctx.wizard.state.priceKur,
          imageId: imageId,
          creatorId: user.id
        }
      });

      // Отправляем уведомление всем пользователям
      const users = await prisma.user.findMany();
      for (const user of users) {
        try {
          const message = {
            caption: `🎪 Новое мероприятие!\n\n` +
                    `${event.title}\n` +
                    `📅 ${event.date.toLocaleDateString()}\n` +
                    `⏰ ${event.date.toLocaleTimeString()}\n` +
                    `📍 ${event.location}\n` +
                    `${event.description}\n\n` +
                    `Стоимость: ${event.priceRub > 0 ? `${event.priceRub}₽ / ${event.priceKur} куражиков` : 'Бесплатно'}`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✍️ Записаться', callback_data: `register_event_${event.id}` }]
              ]
            }
          };

          if (imageId) {
            await ctx.telegram.sendPhoto(
              user.telegramId.toString(), 
              imageId, 
              message
            );
          } else {
            await ctx.telegram.sendMessage(
              user.telegramId.toString(), 
              message.caption,
              {
                parse_mode: message.parse_mode,
                reply_markup: message.reply_markup
              }
            );
          }
        } catch (error) {
          console.error(`Ошибка отправки уведомления пользователю ${user.telegramId}:`, error);
        }
      }

      await ctx.reply(
        '✅ Мероприятие успешно создано!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Вернуться в панель администратора', callback_data: 'admin_panel' }]
            ]
          }
        }
      );
      return ctx.scene.leave();
    } catch (error) {
      console.error('Ошибка при создании мероприятия:', error);
      await ctx.reply('Произошла ошибка при создании мероприятия. Попробуйте позже.');
      return ctx.scene.leave();
    }
  }
);

// Обработчик пропуска фото
addEventScene.action('skip_event_photo', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from.id) }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const event = await prisma.event.create({
      data: {
        title: ctx.wizard.state.title,
        description: ctx.wizard.state.description,
        date: ctx.wizard.state.date,
        location: ctx.wizard.state.location,
        seats: ctx.wizard.state.seats,
        priceRub: ctx.wizard.state.priceRub,
        priceKur: ctx.wizard.state.priceKur,
        imageId: null,
        creatorId: user.id
      }
    });

    // Отправляем уведомление всем пользователям
    const users = await prisma.user.findMany();
    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(
          user.telegramId.toString(),
          `🎪 Новое мероприятие!\n\n` +
          `${event.title}\n` +
          `📅 ${event.date.toLocaleDateString()}\n` +
          `⏰ ${event.date.toLocaleTimeString()}\n` +
          `📍 ${event.location}\n` +
          `${event.description}\n\n` +
          `Стоимость: ${event.priceRub > 0 ? `${event.priceRub}₽ / ${event.priceKur} куражиков` : 'Бесплатно'}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✍️ Записаться', callback_data: `register_event_${event.id}` }]
              ]
            }
          }
        );
      } catch (error) {
        console.error(`Ошибка отправки уведомления пользователю ${user.telegramId}:`, error);
      }
    }

    await ctx.reply(
      '✅ Мероприятие успешно создано!',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться в панель администратора', callback_data: 'admin_panel' }]
          ]
        }
      }
    );
    return ctx.scene.leave();
  } catch (error) {
    console.error('Ошибка при создании мероприятия:', error);
    await ctx.reply('Произошла ошибка при создании мероприятия. Попробуйте позже.');
    return ctx.scene.leave();
  }
});

module.exports = addEventScene; 