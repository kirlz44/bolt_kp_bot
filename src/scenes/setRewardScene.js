const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const setRewardScene = new Scenes.BaseScene('set_reward_scene');

setRewardScene.enter(async (ctx) => {
  const { message } = ctx.scene.state;
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Отмена', callback_data: 'manage_activities' }]
      ]
    }
  });
});

setRewardScene.on('text', async (ctx) => {
  try {
    const amount = parseInt(ctx.message.text);
    
    if (isNaN(amount) || amount < 0) {
      await ctx.reply(
        'Пожалуйста, введите положительное целое число.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Отмена', callback_data: 'manage_activities' }]
            ]
          }
        }
      );
      return;
    }

    const platform = ctx.session.settingRewardFor;

    // Обновляем или создаем запись о вознаграждении
    await prisma.socialMediaReward.upsert({
      where: { platform },
      update: { amount },
      create: { platform, amount }
    });

    await ctx.reply(
      `✅ Вознаграждение для ${platform} успешно установлено: ${amount} куражиков`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться к управлению активностями', callback_data: 'manage_activities' }]
          ]
        }
      }
    );

    // Выходим из сцены
    await ctx.scene.leave();
  } catch (error) {
    console.error('Ошибка при установке вознаграждения:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

setRewardScene.action('manage_activities', async (ctx) => {
  await ctx.scene.leave();
  await require('../commands/manageActivities')(ctx);
});

module.exports = setRewardScene; 