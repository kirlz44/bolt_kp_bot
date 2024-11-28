const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const addGameScene = new Scenes.WizardScene(
  'add_game_scene',
  // Шаг 1: Название игры
  async (ctx) => {
    await ctx.reply('Введите название игры:', {
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Отмена', callback_data: 'cancel_add_game' }]]
      }
    });
    ctx.scene.session.gameData = {};
    return ctx.wizard.next();
  },
  // Шаг 2: Дата и время
  async (ctx) => {
    if (!ctx.message?.text) return;
    ctx.scene.session.gameData.title = ctx.message.text;
    await ctx.reply(
      'Введите дату и время проведения игры в формате ДД.ММ.ГГГГ ЧЧ:ММ\n' +
      'Например: 25.12.2024 19:00'
    );
    return ctx.wizard.next();
  },
  // Шаг 3: Место проведения
  async (ctx) => {
    if (!ctx.message?.text) return;
    const [date, time] = ctx.message.text.split(' ');
    const [day, month, year] = date.split('.');
    const [hours, minutes] = time.split(':');
    ctx.scene.session.gameData.date = new Date(year, month - 1, day, hours, minutes);
    
    await ctx.reply('Введите место проведения игры:');
    return ctx.wizard.next();
  },
  // Шаг 4: Цена
  async (ctx) => {
    if (!ctx.message?.text) return;
    ctx.scene.session.gameData.location = ctx.message.text;
    
    await ctx.reply(
      'Введите стоимость участия в формате "РУБЛИ КУРАЖИКИ"\n' +
      'Например: 1000 2000'
    );
    return ctx.wizard.next();
  },
  // Шаг 5: Количество мест
  async (ctx) => {
    if (!ctx.message?.text) return;
    const [priceRub, priceKur] = ctx.message.text.split(' ').map(Number);
    ctx.scene.session.gameData.priceRub = priceRub;
    ctx.scene.session.gameData.priceKur = priceKur;
    
    await ctx.reply('Введите количество мест:');
    return ctx.wizard.next();
  },
  // Шаг 6: Описание
  async (ctx) => {
    if (!ctx.message?.text) return;
    ctx.scene.session.gameData.seats = parseInt(ctx.message.text);
    
    await ctx.reply('Введите описание игры:');
    return ctx.wizard.next();
  },
  // Шаг 7: Изображение
  async (ctx) => {
    if (!ctx.message?.text) return;
    ctx.scene.session.gameData.description = ctx.message.text;
    
    await ctx.reply(
      'Отправьте изображение для игры (или нажмите "Пропустить"):',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '⏩ Пропустить', callback_data: 'skip_image' }]]
        }
      }
    );
    return ctx.wizard.next();
  },
  // Шаг 8: Сохранение
  async (ctx) => {
    try {
      if (ctx.message?.photo) {
        ctx.scene.session.gameData.imageId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      }
      
      // Получаем пользователя из базы данных
      const user = await prisma.user.findUnique({
        where: { telegramId: ctx.from.id }
      });

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Создаем игру в базе данных
      const game = await prisma.game.create({
        data: {
          ...ctx.scene.session.gameData,
          creator: {
            connect: { id: user.id } // Связываем с существующим пользователем
          }
        }
      });

      await ctx.reply('✅ Игра успешно создана!');
      await ctx.scene.leave();

      // Возвращаемся к управлению играми
      await ctx.reply('Управление играми', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
          ]
        }
      });
    } catch (error) {
      console.error('Ошибка при создании игры:', error);
      await ctx.reply('Произошла ошибка при создании игры. Пожалуйста, попробуйте снова.');
      await ctx.scene.leave();
    }
  }
);

// Обработка отмены
addGameScene.action('cancel_add_game', async (ctx) => {
  await ctx.reply('Создание игры отменено');
  await ctx.scene.leave();
  await ctx.reply('Управление играми', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
      ]
    }
  });
});

// Обработка пропуска изображения
addGameScene.action('skip_image', async (ctx) => {
  try {
    await ctx.answerCbQuery();

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: { telegramId: ctx.from.id }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Создаем игру в базе данных без изображения
    const game = await prisma.game.create({
      data: {
        ...ctx.scene.session.gameData,
        creator: {
          connect: { id: user.id } // Связываем с существующим пользователем
        }
      }
    });

    await ctx.reply('✅ Игра успешно создана!');
    await ctx.scene.leave();

    // Возвращаемся к управлению играми
    await ctx.reply('Управление играми', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при создании игры:', error);
    await ctx.reply('Произошла ошибка при создании игры. Пожалуйста, попробуйте снова.');
    await ctx.scene.leave();
  }
});

module.exports = addGameScene; 