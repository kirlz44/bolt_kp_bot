const { Telegraf, session } = require('telegraf');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/auth');
const cron = require('node-cron');
const { sendWeeklyReport } = require('./services/scheduler');

// Загружаем переменные окружения
dotenv.config();

// Создаем экземпляр бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Добавляем поддержку сессий
bot.use(session());

// Добавляем middleware для авторизации
bot.use(authMiddleware);

// Глобальные состояния
const states = {
  productCreation: {},
  eventCreation: {},
  gameCreation: {},
  broadcastCreation: {},
  wheelPrizeCreation: {},
  postCreation: {},
  videoUpload: {}
};

// Основные команды
bot.command('start', require('./commands/start'));
bot.command('menu', require('./commands/menu'));
bot.command('balance', require('./commands/balance'));
bot.command('admin', require('./commands/adminPanel'));
bot.command('statistics', require('./commands/viewStatistics'));

// Обработчик callback-запросов
bot.on('callback_query', require('./commands/handleCallbackQuery'));

// Обработка контактов (для записи на игры и мероприятия)
bot.on('contact', async (ctx) => {
  try {
    const phoneNumber = ctx.message.contact.phone_number;
    const userId = ctx.from.id;

    if (ctx.session?.awaitingPhoneFor) {
      const { type, id } = ctx.session.awaitingPhoneFor;
      
      if (type === 'game') {
        await handleGameRegistration(ctx, id, phoneNumber);
      } else if (type === 'event') {
        await handleEventRegistration(ctx, id, phoneNumber);
      }

      delete ctx.session.awaitingPhoneFor;
      
      // Убираем клавиатуру с запросом телефона
      await ctx.reply('Спасибо! Номер телефона сохранен.', {
        reply_markup: { remove_keyboard: true }
      });
    }
  } catch (error) {
    console.error('Ошибка при обработке контакта:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Обработка фото (для постов и товаров)
bot.on('photo', async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    if (states.postCreation[userId]) {
      await require('./commands/earn').handlePostSubmission(ctx);
      delete states.postCreation[userId];
    } else if (states.productCreation[userId]?.awaitingPhoto) {
      await require('./commands/manageProducts').handleProductPhoto(ctx);
    }
  } catch (error) {
    console.error('Ошибка при обработке фото:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Обработка видео (для приветственных видео)
bot.on('video', async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    if (states.videoUpload[userId]) {
      await require('./commands/manageWelcomeVideos').handleVideoUpload(ctx);
      delete states.videoUpload[userId];
    }
  } catch (error) {
    console.error('Ошибка при обработке видео:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // Обработка создания товара
    if (states.productCreation[userId]) {
      await require('./commands/manageProducts').handleProductCreation(ctx);
      return;
    }

    // Обработка создания мероприятия
    if (states.eventCreation[userId]) {
      await require('./commands/events').handleEventCreation(ctx);
      return;
    }

    // Обработка создания игры
    if (states.gameCreation[userId]) {
      await require('./commands/manageGames').handleGameCreation(ctx);
      return;
    }

    // Обработка создания рассылки
    if (states.broadcastCreation[userId]) {
      await require('./commands/broadcast').handleBroadcastCreation(ctx);
      return;
    }

    // Обработка создания приза для колеса фортуны
    if (states.wheelPrizeCreation[userId]) {
      await require('./commands/manageWheel').handlePrizeCreation(ctx);
      return;
    }

    // Обработка запроса помощи
    if (text.startsWith('/help')) {
      await require('./commands/help')(ctx);
      return;
    }
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Запускаем еженедельный отчет
cron.schedule('0 7 * * 0', sendWeeklyReport, {
  timezone: 'Europe/Moscow'
});

// Запускаем бота
bot.launch().then(() => {
  console.log('Бот успешно запущен!');
}).catch((err) => {
  console.error('Ошибка при запуске бота:', err);
});

// Включаем graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Экспортируем состояния для использования в других модулях
module.exports = {
  states
};