const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from.id) }
    });

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    const botUsername = process.env.BOT_USERNAME || 'studiokp_bot';
    const referralLink = `https://t.me/${botUsername}?start=${user.telegramId.toString()}`;

    console.log('Сгенерирована реферальная ссылка:', {
      botUsername,
      userId: user.id,
      telegramId: user.telegramId.toString(),
      referralLink
    });

    await ctx.reply(
      '🔗 Ваша реферальная ссылка:\n\n' +
      `\`${referralLink}\`\n\n` +
      '💰 За каждого приглашенного друга вы получите:\n' +
      '- 500 куражиков за реферала 1-го уровня\n' +
      '- 100 куражиков за реферала 2-го уровня\n\n' +
      '📝 Нажмите на ссылку, чтобы скопировать',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Копировать ссылку', callback_data: 'copy_referral_link' }],
            [{ text: '💰 Заработать ещё', callback_data: 'earn' }],
            [{ text: '🔙 В меню', callback_data: 'open_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при получении реферальной ссылки:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
