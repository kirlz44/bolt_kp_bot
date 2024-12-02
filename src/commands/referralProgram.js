const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) }
    });

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    // Получаем статистику рефералов
    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: {
        user: {
          select: {
            telegramId: true,
            balance: true
          }
        }
      }
    });

    // Получаем рефералов второго уровня
    const firstLevelIds = referrals.map(ref => ref.userId);
    const secondLevel = await prisma.referral.findMany({
      where: {
        referrerId: {
          in: firstLevelIds
        }
      },
      include: {
        user: {
          select: {
            telegramId: true,
            balance: true
          }
        }
      }
    });

    // Рассчитываем заработанные куражики
    const firstLevelPercent = user.role === 'partner' ? 10 : 5;
    const secondLevelPercent = user.role === 'partner' ? 5 : 2.5;

    const firstLevelEarnings = referrals.reduce((sum, ref) => {
      return sum + (ref.user.balance * firstLevelPercent / 100);
    }, 0);

    const secondLevelEarnings = secondLevel.reduce((sum, ref) => {
      return sum + (ref.user.balance * secondLevelPercent / 100);
    }, 0);

    const botUsername = process.env.BOT_USERNAME || 'studiokp_bot';
    const referralLink = `https://t.me/${botUsername}?start=${user.telegramId.toString()}`;
    console.log('Сформирована реферальная ссылка:', referralLink);

    let message = '👥 *Реферальная программа*\n\n';
    message += `🎭 Ваш статус: ${user.role === 'partner' ? 'Партнер' : 'Пользователь'}\n\n`;
    message += '💰 Реферальные бонусы:\n';
    message += `- Первый уровень: ${firstLevelPercent}% от покупок\n`;
    message += `- Второй уровень: ${secondLevelPercent}% от покупок\n\n`;
    message += '🎁 Бонусы за приглашения:\n';
    message += '- 500 куражиков за каждого приглашенного\n';
    message += '- 100 куражиков за приглашенных вашими рефералами\n\n';
    message += '📊 *Ваша статистика:*\n';
    message += `- Рефералов 1-го уровня: ${referrals.length}\n`;
    message += `- Рефералов 2-го уровня: ${secondLevel.length}\n`;
    message += `- Заработано с 1-го уровня: ${Math.floor(firstLevelEarnings)} куражиков\n`;
    message += `- Заработано со 2-го уровня: ${Math.floor(secondLevelEarnings)} куражиков\n\n`;
    message += '🔗 *Ваша реферальная ссылка:*\n';
    message += `\`${referralLink}\`\n\n`;
    message += 'Скопируйте ссылку и отправьте друзьям!';

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Копировать ссылку', callback_data: 'copy_referral_link' }],
        [{ text: '📊 Подробная статистика', callback_data: 'referral_stats' }],
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
