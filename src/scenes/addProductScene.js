const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const addProductScene = new Scenes.BaseScene('add_product_scene');

const STATES = {
  ENTER_NAME: 'ENTER_NAME',
  ENTER_DESCRIPTION: 'ENTER_DESCRIPTION',
  ENTER_PRICE_RUB: 'ENTER_PRICE_RUB',
  ENTER_PRICE_KUR: 'ENTER_PRICE_KUR',
  ENTER_STOCK: 'ENTER_STOCK',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE'
};

addProductScene.enter(async (ctx) => {
  ctx.scene.state.productData = {};
  ctx.scene.state.currentState = STATES.ENTER_NAME;
  await ctx.reply('Введите название товара:\n(Для отмены нажмите /cancel)');
});

addProductScene.command('cancel', async (ctx) => {
  await ctx.reply('Добавление товара отменено', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Вернуться к управлению товарами', callback_data: 'manage_products' }]
      ]
    }
  });
  await ctx.scene.leave();
});

addProductScene.on('text', async (ctx) => {
  const state = ctx.scene.state;
  const text = ctx.message.text;

  switch (state.currentState) {
    case STATES.ENTER_NAME:
      state.productData.name = text;
      state.currentState = STATES.ENTER_DESCRIPTION;
      await ctx.reply('Введите описание товара:');
      break;

    case STATES.ENTER_DESCRIPTION:
      state.productData.description = text;
      state.currentState = STATES.ENTER_PRICE_RUB;
      await ctx.reply('Введите цену в рублях (только число):');
      break;

    case STATES.ENTER_PRICE_RUB:
      const priceRub = parseFloat(text);
      if (isNaN(priceRub) || priceRub <= 0) {
        return ctx.reply('Пожалуйста, введите корректную цену (положительное число)');
      }
      state.productData.priceRub = priceRub;
      state.currentState = STATES.ENTER_PRICE_KUR;
      await ctx.reply('Введите цену в куражиках (только число):');
      break;

    case STATES.ENTER_PRICE_KUR:
      const priceKur = parseFloat(text);
      if (isNaN(priceKur) || priceKur <= 0) {
        return ctx.reply('Пожалуйста, введите корректную цену (положительное число)');
      }
      state.productData.priceKur = priceKur;
      state.currentState = STATES.ENTER_STOCK;
      await ctx.reply('Введите количество товара на складе:');
      break;

    case STATES.ENTER_STOCK:
      const stock = parseInt(text);
      if (isNaN(stock) || stock < 0) {
        return ctx.reply('Пожалуйста, введите корректное количество (целое неотрицательное число)');
      }
      state.productData.stock = stock;
      state.currentState = STATES.UPLOAD_IMAGE;
      await ctx.reply('Отправьте фотографию товара:');
      break;
  }
});

addProductScene.on('photo', async (ctx) => {
  if (ctx.scene.state.currentState === STATES.UPLOAD_IMAGE) {
    try {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const productData = ctx.scene.state.productData;
      
      // Создаем товар в базе данных
      const product = await prisma.product.create({
        data: {
          ...productData,
          imageId: photo.file_id
        }
      });

      await ctx.reply(
        'Товар успешно добавлен!\n\n' +
        `Название: ${product.name}\n` +
        `Цена: ${product.priceRub}₽ / ${product.priceKur} куражиков\n` +
        `На складе: ${product.stock} шт.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Добавить ещё товар', callback_data: 'add_product' }],
              [{ text: '🔙 Вернуться к управлению товарами', callback_data: 'manage_products' }]
            ]
          }
        }
      );

      await ctx.scene.leave();
    } catch (error) {
      console.error('Ошибка при создании товара:', error);
      await ctx.reply('Произошла ошибка при создании товара. Попробуйте еще раз или нажмите /cancel');
    }
  }
});

addProductScene.on('message', async (ctx) => {
  if (ctx.scene.state.currentState === STATES.UPLOAD_IMAGE) {
    await ctx.reply('Пожалуйста, отправьте фотографию товара или нажмите /cancel для отмены');
  }
});

module.exports = addProductScene; 