const { Telegraf, Scenes: { Stage }, session } = require('telegraf');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/auth');
const uploadVideoScene = require('./scenes/uploadVideoScene');
const addWheelPrizeScene = require('./scenes/addWheelPrizeScene');
const postVerificationScene = require('./scenes/postVerificationScene');
const addProductScene = require('./scenes/addProductScene');
const editProductScene = require('./scenes/editProductScene');
const addGameScene = require('./scenes/addGameScene');
const editGameScene = require('./scenes/editGameScene');
const addEventScene = require('./scenes/addEventScene');
const editEventScene = require('./scenes/editEventScene');

// Загружаем переменные окружения
dotenv.config();

// Создаем экземпляр бота
const bot = new Telegraf(process.env.BOT_TOKEN);

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
  editEventScene
]);

// Добавляем middleware
bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware);

// Импортируем команды
bot.command('start', require('./commands/start'));
bot.command('menu', require('./commands/menu'));
bot.command('balance', require('./commands/balance'));
bot.command('admin', require('./commands/adminPanel'));
bot.command('statistics', require('./commands/viewStatistics'));

// Обработчик callback-запросов
bot.on('callback_query', require('./commands/handleCallbackQuery'));

// Запускаем бота
bot.launch().then(() => {
    console.log('Бот успешно запущен!');
}).catch((err) => {
    console.error('Ошибка при запуске бота:', err);
});

// Включаем graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
