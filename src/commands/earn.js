const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const message = 
      '💰 *Как заработать куражики:*\n\n' +
      '1️⃣ Приглашайте друзей:\n' +
      '- За каждого приглашенного друга: 500 куражиков\n' +
      '- За приглашенных вашими друзьями: 100 куражиков\n\n' +
      '2️⃣ Размещайте рекламные посты в соцсетях:\n' +
      '- ВКонтакте: 300 куражиков\n' +
      '- Instagram: 300 куражиков\n' +
      '- Telegram: 200 куражиков\n' +
      '- Одноклассники: 200 куражиков\n\n' +
      '🔗 Рекламная информация доступна в канале:\n' +
      't.me/+HXj790SP9DgyYzdi\n\n' +
      'Выберите соцсеть для размещения поста:';

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 ВКонтакте', callback_data: 'post_vk' },
          { text: '📸 Instagram', callback_data: 'post_instagram' }
        ],
        [
          { text: '✈️ Telegram', callback_data: 'post_telegram' },
          { text: '👥 Одноклассники', callback_data: 'post_ok' }
        ],
        [{ text: '🔗 Получить реферальную ссылку', callback_data: 'get_referral_link' }],
        [{ text: '🔙 В меню', callback_data: 'open_menu' }]
      ]
    };

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });
    }
  } catch (error) {
    console.error('Ошибка в команде earn:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
