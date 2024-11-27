const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    // Получаем статистику рефералов
    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: {
        user: true
      }
    });

    // Считаем рефералов второго уровня
    const firstLevelIds = referrals.map(ref => ref.userId);
    const secondLevel = await prisma.referral.count({
      where: {
        referrerId: {
          in: firstLevelIds
        }
      }
    });

    const botUsername = process.env.BOT_USERNAME || 'studiokp_bot';
    const referralLink = `https://t.me/${botUsername}?start=${userId}`;

    let message = '👥 *Реферальная программа*\n\n';
    message += '💰 За каждого приглашенного друга:\n';
    message += '- Первый уровень: 500 куражиков\n';
    message += '- Второй уровень: 100 куражиков\n\n';
    message += '📊 *Ваша статистика:*\n';
    message += `- Рефералов 1-го уровня: ${referrals.length}\n`;
    message += `- Рефералов 2-го уровня: ${secondLevel}\n\n`;
    message += '🔗 *Ваша реферальная ссылка:*\n';
    message += `\`${referralLink}\`\n\n`;
    message += 'Скопируйте ссылку и отправьте друзьям!';

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Копировать ссылку', callback_data: 'copy_referral_link' }],
        [{ text: '📊 Статистика рефералов', callback_data: 'referral_stats' }],
        [{ text: '🔙 В меню', callback_data: 'open_menu' }]
      ]
    };

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Ошибка в реферальной программе:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
