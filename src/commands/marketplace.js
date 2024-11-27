const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        stock: {
          gt: 0
        }
      }
    });

    if (products.length > 0) {
      let message = 'Доступные товары:\n';
      const inlineKeyboard = products.map(product => {
        return [{
          text: `${product.name} - ${product.priceRub}₽ / ${product.priceKur} куражиков`,
          callback_data: `view_product_${product.id}`
        }];
      });

      // Добавляем кнопку "Каталог"
      inlineKeyboard.push([{ text: '📑 Каталог', callback_data: 'show_catalog' }]);
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
    } else {
      await ctx.reply('На данный момент нет доступных товаров.');
    }
  } catch (error) {
    console.error('Ошибка в маркетплейсе:', error);
    await ctx.reply('Произошла ошибка при загрузке товаров. Пожалуйста, попробуйте позже.');
  }
};
