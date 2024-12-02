const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const { validateDateTime } = require('../utils/dateValidation');
const { notifyAllUsersAboutNewGame } = require('../services/notifications');
const prisma = new PrismaClient();

const addGameScene = new Scenes.WizardScene(
  'add_game_scene',
  // Шаг 1: Запрос названия игры
  async (ctx) => {
    try {
      ctx.scene.session.gameData = {};
      await ctx.reply('Введите название игры:');
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при запросе названия игры:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 2: Запрос даты и времени
  async (ctx) => {
    try {
      ctx.scene.session.gameData.title = ctx.message.text;
      await ctx.reply(
        'Введите дату и время проведения игры в формате ДД.ММ.ГГГГ ЧЧ:ММ\n' +
        'Например: 25.12.2024 19:30'
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при запросе даты и времени:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 3: Проверка даты и запрос места проведения
  async (ctx) => {
    try {
      const dateTimeStr = ctx.message.text;
      const validation = validateDateTime(dateTimeStr);

      if (!validation.isValid) {
        await ctx.reply(
          `❌ ${validation.error}\n\n` +
          'Пожалуйста, введите дату и время снова в формате ДД.ММ.ГГГГ ЧЧ:ММ'
        );
        return; // Остаемся на текущем шаге
      }

      ctx.scene.session.gameData.date = validation.date;
      await ctx.reply('Введите место проведения игры:');
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при проверке даты:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 4: Цена
  async (ctx) => {
    try {
      if (!ctx.message?.text) return;
      ctx.scene.session.gameData.location = ctx.message.text;
      
      await ctx.reply(
        'Введите стоимость участия в формате "РУБЛИ КУРАЖИКИ"\n' +
        'Например: 1000 2000'
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при запросе цены:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 5: Количество мест
  async (ctx) => {
    try {
      if (!ctx.message?.text) return;
      const [priceRub, priceKur] = ctx.message.text.split(' ').map(Number);
      
      if (isNaN(priceRub) || isNaN(priceKur)) {
        await ctx.reply('Пожалуйста, введите корректные числовые значения в формате "РУБЛИ КУРАЖИКИ"');
        return;
      }
      
      ctx.scene.session.gameData.priceRub = priceRub;
      ctx.scene.session.gameData.priceKur = priceKur;
      
      await ctx.reply('Введите количество мест:');
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при обработке цены:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 6: Описание
  async (ctx) => {
    try {
      if (!ctx.message?.text) return;
      const seats = parseInt(ctx.message.text);
      
      if (isNaN(seats) || seats <= 0) {
        await ctx.reply('Пожалуйста, введите корректное количество мест (положительное число)');
        return;
      }
      
      ctx.scene.session.gameData.seats = seats;
      await ctx.reply('Введите описание игры:');
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при обработке количества мест:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 7: Изображение
  async (ctx) => {
    try {
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
    } catch (error) {
      console.error('Ошибка при запросе изображения:', error);
      await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
      return ctx.scene.leave();
    }
  },
  // Шаг 8: Сохранение
  async (ctx) => {
    try {
      if (ctx.message?.photo) {
        ctx.scene.session.gameData.imageId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      }
      
      console.log('Попытка найти пользователя с ID:', ctx.from.id);
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(ctx.from.id) }
      });
      console.log('Найден пользователь:', user);

      if (!user) {
        console.log('Пользователь не найден в базе данных');
        throw new Error('Пользователь не найден');
      }

      console.log('Создание игры с данными:', {
        ...ctx.scene.session.gameData,
        creatorId: user.id
      });

      const game = await prisma.game.create({
        data: {
          ...ctx.scene.session.gameData,
          creator: {
            connect: { id: user.id }
          }
        }
      });
      console.log('Игра успешно создана:', game);

      // Отправляем уведомления всем пользователям
      await notifyAllUsersAboutNewGame(ctx, game);

      await ctx.reply('✅ Игра успешно создана!');
      await ctx.scene.leave();

      await ctx.reply('Управление играми', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
          ]
        }
      });
    } catch (error) {
      console.error('Ошибка при сохранении игры:', error);
      await ctx.reply('Произошла ошибка при создании игры. Пожалуйста, попробуйте снова.');
      return ctx.scene.leave();
    }
  }
);

// Обработка отмены
addGameScene.action('cancel_add_game', async (ctx) => {
  try {
    await ctx.reply('Создание игры отменено');
    await ctx.scene.leave();
    await ctx.reply('Управление играми', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при отмене создания игры:', error);
    await ctx.reply('Произошла ошибка. Попробуйте снова или обратитесь к администратору.');
    return ctx.scene.leave();
  }
});

// Обработка пропуска изображения
addGameScene.action('skip_image', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from.id) }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const game = await prisma.game.create({
      data: {
        ...ctx.scene.session.gameData,
        creator: {
          connect: { id: user.id }
        }
      }
    });

    // Отправляем уведомления всем пользователям
    await notifyAllUsersAboutNewGame(ctx, game);

    await ctx.reply('✅ Игра успешно создана!');
    await ctx.scene.leave();

    await ctx.reply('Управление играми', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при создании игры без изображения:', error);
    await ctx.reply('Произошла ошибка при создании игры. Пожалуйста, попробуйте снова.');
    return ctx.scene.leave();
  }
});

module.exports = addGameScene; 