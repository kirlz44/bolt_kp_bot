const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const postVerificationScene = new Scenes.BaseScene('post_verification_scene');

const NETWORK_NAMES = {
  vk: 'ВКонтакте',
  instagram: 'Instagram',
  telegram: 'Telegram',
  ok: 'Одноклассники'
};

postVerificationScene.enter(async (ctx) => {
  const network = ctx.scene.state.network;
  
  // Получаем актуальное значение вознаграждения из базы данных
  const reward = await prisma.socialMediaReward.findUnique({
    where: { platform: network }
  });

  // Определяем сумму вознаграждения
  const rewardAmount = reward?.amount || {
    vk: 300,
    instagram: 300,
    telegram: 200,
    ok: 200
  }[network];

  await ctx.reply(
    `Отправьте скриншот размещенного поста в ${NETWORK_NAMES[network]}.\n` +
    `За подтвержденный пост вы получите ${rewardAmount} куражиков.\n\n` +
    'Для отмены нажмите /cancel'
  );
});

postVerificationScene.command('cancel', async (ctx) => {
  await ctx.reply('Проверка поста отменена', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад к способам заработка', callback_data: 'earn' }]
      ]
    }
  });
  await ctx.scene.leave();
});

postVerificationScene.on(['photo', 'document'], async (ctx) => {
  try {
    const network = ctx.scene.state.network;
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : 'не указан';
    const fullName = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

    // Получаем актуальное значение вознаграждения
    const reward = await prisma.socialMediaReward.findUnique({
      where: { platform: network }
    });

    const rewardAmount = reward?.amount || {
      vk: 300,
      instagram: 300,
      telegram: 200,
      ok: 200
    }[network];

    // Формируем сообщение для админов
    const adminMessage = 
      `📝 Новый пост на проверку!\n\n` +
      `Соцсеть: ${NETWORK_NAMES[network]}\n` +
      `Пользователь: ${fullName}\n` +
      `Username: ${username}\n` +
      `ID: ${userId}\n` +
      `Награда: ${rewardAmount} куражиков`;

    // Пересылаем скриншот и информацию админам
    await ctx.telegram.sendPhoto(
      process.env.ADMIN_CHAT_ID,
      ctx.message.photo[0].file_id,
      {
        caption: adminMessage,
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: '✅ Подтвердить', 
                callback_data: `approve_post_${userId}_${network}`
              },
              { 
                text: '❌ Отклонить', 
                callback_data: `reject_post_${userId}_${network}` 
              }
            ]
          ]
        }
      }
    );

    await ctx.reply(
      'Ваш пост отправлен на проверку. После подтверждения администратором вам будут начислены куражики.', 
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад к способам заработка', callback_data: 'earn' }]
          ]
        }
      }
    );
    await ctx.scene.leave();
  } catch (error) {
    console.error('Ошибка при обработке скриншота:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте еще раз или нажмите /cancel');
  }
});

postVerificationScene.on('message', async (ctx) => {
  await ctx.reply(
    'Пожалуйста, отправьте скриншот поста или нажмите /cancel для отмены',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Отмена', callback_data: 'earn' }]
        ]
      }
    }
  );
});

module.exports = postVerificationScene; 