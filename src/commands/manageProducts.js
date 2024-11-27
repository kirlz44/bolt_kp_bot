const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    if (ctx.state.userRole !== 'admin' && ctx.state.userRole !== 'superadmin') {
      return ctx.reply('У вас нет доступа к управлению товарами');
    }

    const products = await prisma.product.findMany();
    let message = '*Управление товарами*\n\n';

    if (products.length > 0) {
      message += 'Текущие товары:\n\n';
      products.forEach(product => {
        message += `📦 ${product.name}\n`;
        message += `💰 ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
        message += `📊 На складе: ${product.stock} шт.\n\n`;
      });
    } else {
      message += 'Товары отсутствуют\n';
    }

    const keyboard = [
      [{ text: '➕ Добавить товар', callback_data: 'add_product' }],
      [{ text: '📋 Список товаров', callback_data: 'list_products' }],
      [{ text: '✏️ Редактировать товар', callback_data: 'edit_products' }],
      [{ text: '❌ Удалить товар', callback_data: 'delete_product' }],
      [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка в управлении товарами:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
