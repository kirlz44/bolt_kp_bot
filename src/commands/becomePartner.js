const { PrismaClient } = require('@prisma/client');
const { generatePaymentUrl } = require('../services/robokassa');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const user = await prisma.user.findUnique({ where: { telegramId: userId } });

    if (!user) {
      return ctx.editMessageText('Пользователь не найден', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 В меню', callback_data: 'open_menu' }]]
        }
      });
    }

    const message = 'Стать партнером можно двумя способами:\n' +
      '1. Оплатить 500 рублей\n' +
      '2. Потратить 1000 куражиков';

    const keyboard = [
      [{ text: '💳 Оплатить 500₽', callback_data: 'pay_partner_money' }],
      [{ text: '💎 Оплатить куражиками', callback_data: 'pay_partner_kurajiki' }],
      [{ text: '🔙 Вернуться в меню', callback_data: 'open_menu' }]
    ];

    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка в becomePartner:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
