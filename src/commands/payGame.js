const { generatePaymentUrl } = require('../services/robokassa');

    module.exports = (ctx) => {
      const gameId = parseInt(ctx.match[1], 10);
      const isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';
      const paymentUrl = generatePaymentUrl(500, `Оплата игры ${gameId}`, isTestMode);

      ctx.reply('Для оплаты игры перейдите по ссылке:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Оплатить', url: paymentUrl }]
          ]
        }
      });
    };
