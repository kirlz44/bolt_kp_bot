const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

async function sendMessageToUser(telegramId, message, extra = {}) {
  try {
    await bot.telegram.sendMessage(telegramId, message, extra);
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
  }
}

async function sendMessageToAdmins(message, extra = {}) {
  try {
    await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message, extra);
  } catch (error) {
    console.error('Ошибка отправки сообщения админам:', error);
  }
}

module.exports = {
  sendMessageToUser,
  sendMessageToAdmins
};
