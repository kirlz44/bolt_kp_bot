const { generatePaymentUrl } = require('../services/robokassa');

    module.exports = (ctx) => {
      const eventId = parseInt(ctx.match[1], 10);
      const isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';
      const paymentUrl = generatePaymentUrl(500, `Оплата мероприятия ${eventId}`, isTestMode);

      ctx.reply('Для оплаты мероприятия перейдите по ссылке:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Оплатить', url: paymentUrl }]
          ]
        }
      });
    };
