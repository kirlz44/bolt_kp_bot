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
      let message = '*Доступные товары:*\n\n';
      
      // Создаем краткий список товаров
      products.forEach(product => {
        message += `📦 ${product.name} - ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
      });
      
      message += '\nДля просмотра подробной информации о товарах нажмите кнопку "Каталог"';

      const keyboard = [
        [{ text: '📑 Каталог', callback_data: 'show_catalog' }],
        [{ text: '🔙 В меню', callback_data: 'open_menu' }]
      ];

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } else {
      await ctx.reply('На данный момент нет доступных товаров.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 В меню', callback_data: 'open_menu' }]
          ]
        }
      });
    }
  } catch (error) {
    console.error('Ошибка в маркетплейсе:', error);
    await ctx.reply('Произошла ошибка при загрузке товаров. Пожалуйста, попробуйте позже.');
  }
};
