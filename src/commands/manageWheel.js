const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    if (ctx.state.userRole !== 'admin' && ctx.state.userRole !== 'superadmin') {
      return ctx.reply('У вас нет доступа к управлению колесом фортуны');
    }

    // Получаем текущие призы
    const prizes = await prisma.wheelPrize.findMany({
      where: { active: true }
    });

    const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);

    let message = `*Управление колесом фортуны*\n\n` +
      `Типы призов:\n` +
      `1. Куражики (укажите количество и вероятность)\n` +
      `2. Скидка на товар (от 5% до 50%)\n` +
      `3. Специальный приз (любой приз на ваше усмотрение)\n\n` +
      `⚠️ Сумма всех вероятностей не должна превышать 100%\n\n` +
      `Текущая сумма вероятностей: ${totalProbability}%`;

    const keyboard = [
      [{ text: '➕ Добавить приз', callback_data: 'add_wheel_prize' }],
      [{ text: '📋 Список призов', callback_data: 'list_wheel_prizes' }],
      [{ text: '❌ Удалить приз', callback_data: 'delete_wheel_prize' }],
      [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка в управлении колесом:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
