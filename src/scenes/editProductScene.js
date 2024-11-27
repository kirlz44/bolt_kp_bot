const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const editProductScene = new Scenes.BaseScene('edit_product_scene');

const STATES = {
  SELECT_PRODUCT: 'SELECT_PRODUCT',
  SELECT_FIELD: 'SELECT_FIELD',
  ENTER_VALUE: 'ENTER_VALUE'
};

editProductScene.enter(async (ctx) => {
  ctx.scene.state.currentState = STATES.SELECT_PRODUCT;
  const products = await prisma.product.findMany();
  
  const keyboard = products.map(product => ([{
    text: `${product.name} (${product.priceRub}₽)`,
    callback_data: `edit_product_${product.id}`
  }]));
  
  keyboard.push([{ text: '🔙 Отмена', callback_data: 'cancel_edit' }]);
  
  await ctx.reply('Выберите товар для редактирования:', {
    reply_markup: { inline_keyboard: keyboard }
  });
});

editProductScene.action(/edit_product_(\d+)/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  ctx.scene.state.productId = productId;
  ctx.scene.state.currentState = STATES.SELECT_FIELD;
  
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  const message = `Редактирование товара: ${product.name}\n` +
    `Текущие значения:\n` +
    `Название: ${product.name}\n` +
    `Описание: ${product.description}\n` +
    `Цена: ${product.priceRub}₽ / ${product.priceKur} куражиков\n` +
    `На складе: ${product.stock} шт.\n\n` +
    `Выберите, что хотите изменить:`;
  
  const keyboard = [
    [{ text: '📝 Название', callback_data: 'edit_name' }],
    [{ text: '📋 Описание', callback_data: 'edit_description' }],
    [{ text: '💰 Цена в рублях', callback_data: 'edit_price_rub' }],
    [{ text: '💎 Цена в куражиках', callback_data: 'edit_price_kur' }],
    [{ text: '📦 Количество на складе', callback_data: 'edit_stock' }],
    [{ text: '🖼 Изображение', callback_data: 'edit_image' }],
    [{ text: '🔙 Отмена', callback_data: 'cancel_edit' }]
  ];
  
  await ctx.reply(message, {
    reply_markup: { inline_keyboard: keyboard }
  });
});

editProductScene.action(/edit_(name|description|price_rub|price_kur|stock|image)/, async (ctx) => {
  const field = ctx.match[1];
  ctx.scene.state.editingField = field;
  ctx.scene.state.currentState = STATES.ENTER_VALUE;
  
  let message;
  switch (field) {
    case 'name':
      message = 'Введите новое название товара:';
      break;
    case 'description':
      message = 'Введите новое описание товара:';
      break;
    case 'price_rub':
      message = 'Введите новую цену в рублях (только число):';
      break;
    case 'price_kur':
      message = 'Введите новую цену в куражиках (только число):';
      break;
    case 'stock':
      message = 'Введите новое количество на складе:';
      break;
    case 'image':
      message = 'Отправьте новое изображение товара:';
      break;
  }
  
  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Отмена', callback_data: 'cancel_edit' }]]
    }
  });
});

editProductScene.on('text', async (ctx) => {
  if (ctx.scene.state.currentState !== STATES.ENTER_VALUE) return;
  
  const { productId, editingField } = ctx.scene.state;
  const value = ctx.message.text;
  
  try {
    const updateData = {};
    
    switch (editingField) {
      case 'name':
        updateData.name = value;
        break;
      case 'description':
        updateData.description = value;
        break;
      case 'price_rub':
        const priceRub = parseFloat(value);
        if (isNaN(priceRub) || priceRub <= 0) {
          return ctx.reply('Пожалуйста, введите корректную цену (положительное число)');
        }
        updateData.priceRub = priceRub;
        break;
      case 'price_kur':
        const priceKur = parseFloat(value);
        if (isNaN(priceKur) || priceKur <= 0) {
          return ctx.reply('Пожалуйста, введите корректную цену (положительное число)');
        }
        updateData.priceKur = priceKur;
        break;
      case 'stock':
        const stock = parseInt(value);
        if (isNaN(stock) || stock < 0) {
          return ctx.reply('Пожалуйста, введите корректное количество (целое неотрицательное число)');
        }
        updateData.stock = stock;
        break;
    }
    
    await prisma.product.update({
      where: { id: productId },
      data: updateData
    });
    
    await ctx.reply('Товар успешно обновлен!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Продолжить редактирование', callback_data: `edit_product_${productId}` }],
          [{ text: '🔙 Вернуться к управлению товарами', callback_data: 'manage_products' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении товара:', error);
    await ctx.reply('Произошла ошибка при обновлении товара. Попробуйте еще раз.');
  }
});

editProductScene.on('photo', async (ctx) => {
  if (ctx.scene.state.currentState !== STATES.ENTER_VALUE || ctx.scene.state.editingField !== 'image') return;
  
  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    await prisma.product.update({
      where: { id: ctx.scene.state.productId },
      data: { imageId: photo.file_id }
    });
    
    await ctx.reply('Изображение товара успешно обновлено!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Продолжить редактирование', callback_data: `edit_product_${ctx.scene.state.productId}` }],
          [{ text: '🔙 Вернуться к управлению товарами', callback_data: 'manage_products' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении изображения:', error);
    await ctx.reply('Произошла ошибка при обновлении изображения. Попробуйте еще раз.');
  }
});

editProductScene.action('cancel_edit', async (ctx) => {
  await ctx.reply('Редактирование отменено', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Вернуться к управлению товарами', callback_data: 'manage_products' }]
      ]
    }
  });
  await ctx.scene.leave();
});

module.exports = editProductScene; 