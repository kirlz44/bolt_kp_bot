const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    // Получаем текущие настройки вознаграждений
    const rewards = await prisma.socialMediaReward.findMany();
    
    // Формируем объект с текущими вознаграждениями
    const currentRewards = {};
    rewards.forEach(reward => {
      currentRewards[reward.platform] = reward.amount;
    });

    // Формируем сообщение с текущими настройками
    let message = '*📊 Управление активностями*\n\n';
    message += 'Текущие вознаграждения за размещение постов:\n\n';
    message += `📱 Telegram: ${currentRewards.telegram || 0} куражиков\n`;
    message += `📸 Instagram: ${currentRewards.instagram || 0} куражиков\n`;
    message += `💙 ВКонтакте: ${currentRewards.vk || 0} куражиков\n`;
    message += `👥 Одноклассники: ${currentRewards.ok || 0} куражиков\n\n`;
    message += 'Выберите социальную сеть для изменения вознаграждения:';

    // Создаем клавиатуру с кнопками для каждой соцсети
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Telegram', callback_data: 'set_reward_telegram' },
          { text: '📸 Instagram', callback_data: 'set_reward_instagram' }
        ],
        [
          { text: '💙 ВКонтакте', callback_data: 'set_reward_vk' },
          { text: '👥 Одноклассники', callback_data: 'set_reward_ok' }
        ],
        [{ text: '🔙 Вернуться в панель администратора', callback_data: 'admin_panel' }]
      ]
    };

    // Если это ответ на callback query, редактируем сообщение
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      // Иначе отправляем новое сообщение
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }

  } catch (error) {
    console.error('Ошибка в управлении активностями:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
