const { Telegraf, Scenes: { Stage }, session } = require('telegraf');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/auth');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const { sendWeeklyReport, startScheduler } = require('./services/scheduler');

// Импорт сцен
const uploadVideoScene = require('./scenes/uploadVideoScene');
const addWheelPrizeScene = require('./scenes/addWheelPrizeScene');
const postVerificationScene = require('./scenes/postVerificationScene');
const addProductScene = require('./scenes/addProductScene');
const editProductScene = require('./scenes/editProductScene');
const addGameScene = require('./scenes/addGameScene');
const editGameScene = require('./scenes/editGameScene');
const addEventScene = require('./scenes/addEventScene');
const editEventScene = require('./scenes/editEventScene');
const broadcastScene = require('./scenes/broadcastScene');
const setRewardScene = require('./scenes/setRewardScene');

// Инициализация
dotenv.config();
const prisma = new PrismaClient();
const bot = new Telegraf(process.env.BOT_TOKEN);

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

// Создаем stage для сцен
const stage = new Stage([
  uploadVideoScene, 
  addWheelPrizeScene, 
  postVerificationScene,
  addProductScene,
  editProductScene,
  addGameScene,
  editGameScene,
  addEventScene,
  editEventScene,
  broadcastScene,
  setRewardScene
]);

// Добавляем middleware
bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware);

// Основные команды
bot.command('start', require('./commands/start'));
bot.command('menu', require('./commands/menu'));
bot.command('balance', require('./commands/balance'));
bot.command('admin', require('./commands/adminPanel'));
bot.command('statistics', require('./commands/viewStatistics'));

// Обработчик callback-запросов
bot.on('callback_query', require('./commands/handleCallbackQuery'));

// Обработка контактов
bot.on('contact', async (ctx) => {
  try {
    const contact = ctx.message.contact;
    
    if (contact.user_id === ctx.from.id) {
      // Проверяем существование пользователя
      let user = await prisma.user.findUnique({
        where: { telegramId: BigInt(ctx.from.id) }
      });

      // Если пользователь не найден, создаем его
      if (!user) {
        console.log('Создаем нового пользователя с telegramId:', ctx.from.id);
        user = await prisma.user.create({
          data: {
            telegramId: BigInt(ctx.from.id),
            role: 'user',
            balance: 0,
            phoneNumber: contact.phone_number
          }
        });
        console.log('Создан новый пользователь:', user);
      } else {
        // Обновляем пользователя с новым номером телефона
        user = await prisma.user.update({
          where: { telegramId: BigInt(ctx.from.id) },
          data: { phoneNumber: contact.phone_number }
        });
      }

      await ctx.reply('✅ Спасибо! Ваш номер телефона сохранен.', {
        reply_markup: { remove_keyboard: true }
      });

      // Получаем информацию о последней оплате пользователя
      const event = await prisma.event.findFirst({
        where: {
          participants: {
            some: {
              telegramId: BigInt(ctx.from.id)
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Отправляем полное уведомление админам
      await ctx.telegram.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `💎 Новая регистрация на мероприятие!\n\n` +
        `Мероприятие: ${event?.title}\n` +
        `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
        `Username: @${ctx.from.username || 'отсутствует'}\n` +
        `ID: ${ctx.from.id}\n` +
        `Телефон: ${contact.phone_number}\n` +
        (event?.priceKur > 0 ? `Оплачено куражиками: ${event.priceKur}` : 'Бесплатное мероприятие')
      );

      await ctx.reply(
        '🎉 Вы успешно зарегистрированы на мероприятие!\n' +
        'Мы свяжемся с вами для подтверждения участия.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Вернуться к мероприятиям', callback_data: 'events' }]
            ]
          }
        }
      );
    } else {
      await ctx.reply('Пожалуйста, отправьте свой собственный номер телефона.');
    }
  } catch (error) {
    console.error('Ошибка при сохранении контакта:', error);
    await ctx.reply('Произошла ошибка при сохранении номера телефона. Пожалуйста, попробуйте позже.');
  }
});

// Обработка фото
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

// Обработка видео
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

    if (states.productCreation[userId]) {
      await require('./commands/manageProducts').handleProductCreation(ctx);
    } else if (states.eventCreation[userId]) {
      await require('./commands/events').handleEventCreation(ctx);
    } else if (states.gameCreation[userId]) {
      await require('./commands/manageGames').handleGameCreation(ctx);
    } else if (states.broadcastCreation[userId]) {
      await require('./commands/broadcast').handleBroadcastCreation(ctx);
    } else if (states.wheelPrizeCreation[userId]) {
      await require('./commands/manageWheel').handlePrizeCreation(ctx);
    } else if (text.startsWith('/help')) {
      await require('./commands/help')(ctx);
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
  startScheduler(bot); // Запускаем планировщик
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
