const { generatePaymentUrl } = require('../services/robokassa');

    module.exports = (ctx) => {
      const isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';
      const paymentUrl = generatePaymentUrl(500, 'Партнерство на 30 дней', isTestMode);

      ctx.reply('Для оплаты партнерства перейдите по ссылке:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Оплатить', url: paymentUrl }]
          ]
        }
      });
    };
