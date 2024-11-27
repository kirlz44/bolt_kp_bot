const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const addGameScene = new Scenes.BaseScene('add_game_scene');

const STATES = {
  ENTER_TITLE: 'ENTER_TITLE',
  ENTER_DESCRIPTION: 'ENTER_DESCRIPTION',
  ENTER_DATE: 'ENTER_DATE',
  ENTER_TIME: 'ENTER_TIME',
  ENTER_LOCATION: 'ENTER_LOCATION',
  ENTER_PRICE_RUB: 'ENTER_PRICE_RUB',
  ENTER_PRICE_KUR: 'ENTER_PRICE_KUR',
  ENTER_SEATS: 'ENTER_SEATS',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  ENTER_PAYMENT_TYPE: 'ENTER_PAYMENT_TYPE',
  ENTER_CARD_NUMBER: 'ENTER_CARD_NUMBER',
  ENTER_PHONE_NUMBER: 'ENTER_PHONE_NUMBER'
};

addGameScene.enter(async (ctx) => {
  ctx.scene.state.gameData = {};
  ctx.scene.state.currentState = STATES.ENTER_TITLE;
  await ctx.reply('Введите название игры:\n(Для отмены нажмите /cancel)');
});

addGameScene.command('cancel', async (ctx) => {
  await ctx.reply('Добавление игры отменено', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
      ]
    }
  });
  await ctx.scene.leave();
});

addGameScene.on('text', async (ctx) => {
  const state = ctx.scene.state;
  const text = ctx.message.text;

  switch (state.currentState) {
    case STATES.ENTER_TITLE:
      state.gameData.title = text;
      state.currentState = STATES.ENTER_DESCRIPTION;
      await ctx.reply('Введите описание игры:');
      break;

    case STATES.ENTER_DESCRIPTION:
      state.gameData.description = text;
      state.currentState = STATES.ENTER_DATE;
      await ctx.reply('Введите дату проведения (в формате ДД.ММ.ГГГГ):');
      break;

    case STATES.ENTER_DATE:
      const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
      if (!dateRegex.test(text)) {
        return ctx.reply('Пожалуйста, введите дату в формате ДД.ММ.ГГГГ');
      }
      state.gameData.date = text;
      state.currentState = STATES.ENTER_TIME;
      await ctx.reply('Введите время начала (в формате ЧЧ:ММ):');
      break;

    case STATES.ENTER_TIME:
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(text)) {
        return ctx.reply('Пожалуйста, введите время в формате ЧЧ:ММ');
      }
      
      // Объединяем дату и время
      const [day, month, year] = state.gameData.date.split('.');
      const [hours, minutes] = text.split(':');
      state.gameData.dateTime = new Date(year, month - 1, day, hours, minutes);
      
      state.currentState = STATES.ENTER_LOCATION;
      await ctx.reply('Введите место проведения:');
      break;

    case STATES.ENTER_LOCATION:
      state.gameData.location = text;
      state.currentState = STATES.ENTER_PRICE_RUB;
      await ctx.reply('Введите цену в рублях (только число):');
      break;

    case STATES.ENTER_PRICE_RUB:
      const priceRub = parseFloat(text);
      if (isNaN(priceRub) || priceRub < 0) {
        return ctx.reply('Пожалуйста, введите корректную цену');
      }
      state.gameData.priceRub = priceRub;
      state.currentState = STATES.ENTER_PRICE_KUR;
      await ctx.reply('Введите цену в куражиках (только число):');
      break;

    case STATES.ENTER_PRICE_KUR:
      const priceKur = parseFloat(text);
      if (isNaN(priceKur) || priceKur < 0) {
        return ctx.reply('Пожалуйста, введите корректную цену');
      }
      state.gameData.priceKur = priceKur;
      state.currentState = STATES.ENTER_SEATS;
      await ctx.reply('Введите количество мест:');
      break;

    case STATES.ENTER_SEATS:
      const seats = parseInt(text);
      if (isNaN(seats) || seats <= 0) {
        return ctx.reply('Пожалуйста, введите корректное количество мест');
      }
      state.gameData.seats = seats;
      state.currentState = STATES.UPLOAD_IMAGE;
      await ctx.reply('Отправьте изображение для игры (или нажмите /skip для пропуска):');
      break;
  }
});

addGameScene.command('skip', async (ctx) => {
  if (ctx.scene.state.currentState === STATES.UPLOAD_IMAGE) {
    ctx.scene.state.gameData.imageId = null;
    await createGame(ctx);
  } else {
    await ctx.reply('Команда /skip доступна только при загрузке изображения');
  }
});

addGameScene.hears('/skip', async (ctx) => {
  if (ctx.scene.state.currentState === STATES.UPLOAD_IMAGE) {
    ctx.scene.state.gameData.imageId = null;
    await createGame(ctx);
  } else {
    await ctx.reply('Команда /skip доступна только при загрузке изображения');
  }
});

addGameScene.on('photo', async (ctx) => {
  if (ctx.scene.state.currentState === STATES.UPLOAD_IMAGE) {
    ctx.scene.state.gameData.imageId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    await createGame(ctx);
  }
});

async function createGame(ctx) {
  try {
    const gameData = ctx.scene.state.gameData;
    const telegramId = ctx.from.id;
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Если создатель - партнер, запрашиваем способ оплаты
    if (user.role === 'partner') {
      if (!gameData.paymentType) {
        ctx.scene.state.currentState = STATES.ENTER_PAYMENT_TYPE;
        return await ctx.reply(
          'Выберите способ приема оплаты:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '💳 Банковская карта', callback_data: 'payment_card' }],
                [{ text: '📱 Номер телефона', callback_data: 'payment_phone' }]
              ]
            }
          }
        );
      }
    }

    // Создаем игру с платежными данными
    const game = await prisma.game.create({
      data: {
        title: gameData.title,
        description: gameData.description || '',
        date: gameData.dateTime,
        location: gameData.location,
        priceRub: gameData.priceRub,
        priceKur: gameData.priceKur,
        seats: gameData.seats,
        imageId: gameData.imageId || null,
        paymentType: gameData.paymentType,
        paymentDetails: gameData.paymentDetails,
        creator: {
          connect: {
            id: user.id
          }
        }
      }
    });

    // Отправляем подтверждение
    await ctx.reply(
      'Игра успешно создана!\n\n' +
      `Название: ${game.title}\n` +
      `Описание: ${game.description}\n` +
      `Дата: ${game.date.toLocaleDateString()}\n` +
      `Время: ${game.date.toLocaleTimeString()}\n` +
      `Место: ${game.location}\n` +
      `Цена: ${game.priceRub}₽ / ${game.priceKur} куражиков\n` +
      `Мест: ${game.seats}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Добавить ещё игру', callback_data: 'add_game' }],
            [{ text: '🔙 Вернуться к управлению играми', callback_data: 'manage_games' }]
          ]
        }
      }
    );

    await ctx.scene.leave();
  } catch (error) {
    console.error('Ошибка при создании игры:', error);
    await ctx.reply('Произошла ошибка при создании игры. Попробуйте еще раз или нажмите /cancel');
  }
}

addGameScene.action('payment_card', async (ctx) => {
  ctx.scene.state.gameData.paymentType = 'card';
  ctx.scene.state.currentState = STATES.ENTER_CARD_NUMBER;
  await ctx.reply('Введите номер банковской карты для приема платежей:');
});

addGameScene.action('payment_phone', async (ctx) => {
  ctx.scene.state.gameData.paymentType = 'phone';
  ctx.scene.state.currentState = STATES.ENTER_PHONE_NUMBER;
  await ctx.reply('Введите номер телефона для приема платежей:');
});

module.exports = addGameScene; 