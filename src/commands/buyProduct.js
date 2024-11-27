const { PrismaClient } = require('@prisma/client');
const { generatePaymentUrl } = require('../services/robokassa');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    // Получаем ID товара из callback_data
    const productId = parseInt(ctx.callbackQuery.data.split('_')[3]);
    const userId = ctx.from.id;

    // Получаем информацию о товаре и пользователе
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return ctx.reply('Товар не найден');
    }

    if (product.stock <= 0) {
      return ctx.reply('К сожалению, товар закончился');
    }

    // Проверяем, есть ли у пользователя активная скидка
    const discountCode = ctx.session?.discountCode;
    let finalPrice = product.priceRub;

    if (discountCode && discountCode.startsWith('WHEEL') && discountCode.includes('D')) {
      const discountPercent = parseInt(discountCode.match(/D(\d+)/)[1]);
      finalPrice = Math.round(product.priceRub * (1 - discountPercent / 100));
    }

    // Генерируем ссылку для оплаты
    const isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';
    const paymentUrl = generatePaymentUrl(
      finalPrice,
      `Оплата товара: ${product.name}`,
      isTestMode
    );

    // Отправляем сообщение с ссылкой на оплату
    await ctx.reply(
      `Для оплаты товара "${product.name}" перейдите по ссылке:\n` +
      `Сумма к оплате: ${finalPrice}₽`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Оплатить', url: paymentUrl }],
            [{ text: '🔙 Вернуться к товару', callback_data: `view_product_${productId}` }]
          ]
        }
      }
    );

  } catch (error) {
    console.error('Ошибка при покупке товара:', error);
    await ctx.reply('Произошла ошибка при оформлении покупки. Пожалуйста, попробуйте позже.');
  }
};
