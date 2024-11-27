const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const addWheelPrizeScene = new Scenes.BaseScene('add_wheel_prize_scene');

// Состояния для сбора информации о призе
const STATES = {
  CHOOSE_TYPE: 'CHOOSE_TYPE',
  ENTER_NAME: 'ENTER_NAME',
  ENTER_VALUE: 'ENTER_VALUE',
  ENTER_PROBABILITY: 'ENTER_PROBABILITY'
};

addWheelPrizeScene.enter(async (ctx) => {
  ctx.scene.state.currentState = STATES.CHOOSE_TYPE;
  await ctx.reply('Выберите тип приза:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💎 Куражики', callback_data: 'prize_type_kurajiki' }],
        [{ text: '🏷 Скидка на товар', callback_data: 'prize_type_discount' }],
        [{ text: '🎁 Специальный приз', callback_data: 'prize_type_special' }],
        [{ text: '🔙 Отмена', callback_data: 'cancel_add_prize' }]
      ]
    }
  });
});

// Обработка выбора типа приза
addWheelPrizeScene.action(/prize_type_(.+)/, async (ctx) => {
  const type = ctx.match[1];
  ctx.scene.state.prizeData = { type };
  ctx.scene.state.currentState = STATES.ENTER_NAME;
  
  let message;
  switch (type) {
    case 'kurajiki':
      message = 'Введите количество куражиков для приза:';
      break;
    case 'discount':
      message = 'Введите размер скидки (от 5 до 50):';
      break;
    case 'special':
      message = 'Введите название специального приза:';
      break;
  }
  
  await ctx.reply(message);
});

// Обработка ввода значения/названия приза
addWheelPrizeScene.on('text', async (ctx) => {
  const state = ctx.scene.state;
  
  switch (state.currentState) {
    case STATES.ENTER_NAME:
      if (state.prizeData.type === 'kurajiki') {
        const value = parseInt(ctx.message.text);
        if (isNaN(value) || value <= 0) {
          return ctx.reply('Пожалуйста, введите положительное число куражиков.');
        }
        state.prizeData.name = `${value} куражиков`;
        state.prizeData.value = value;
      } else if (state.prizeData.type === 'discount') {
        const value = parseInt(ctx.message.text);
        if (isNaN(value) || value < 5 || value > 50) {
          return ctx.reply('Пожалуйста, введите число от 5 до 50.');
        }
        state.prizeData.name = `Скидка ${value}%`;
        state.prizeData.value = value;
      } else {
        state.prizeData.name = ctx.message.text;
        state.prizeData.value = 0;
      }
      
      state.currentState = STATES.ENTER_PROBABILITY;
      await ctx.reply('Введите вероятность выпадения приза (число от 1 до 100):');
      break;
      
    case STATES.ENTER_PROBABILITY:
      const probability = parseFloat(ctx.message.text);
      if (isNaN(probability) || probability <= 0 || probability > 100) {
        return ctx.reply('Пожалуйста, введите число от 1 до 100.');
      }
      
      // Проверяем сумму всех вероятностей
      const existingPrizes = await prisma.wheelPrize.findMany({
        where: { active: true }
      });
      
      const totalProbability = existingPrizes.reduce((sum, prize) => sum + prize.probability, 0);
      if (totalProbability + probability > 100) {
        return ctx.reply(`Сумма вероятностей превысит 100%. Текущая сумма: ${totalProbability}%. Максимально возможная вероятность для нового приза: ${(100 - totalProbability).toFixed(1)}%`);
      }
      
      // Сохраняем приз в базу данных
      try {
        await prisma.wheelPrize.create({
          data: {
            type: state.prizeData.type,
            name: state.prizeData.name,
            value: state.prizeData.value,
            probability: probability,
            active: true
          }
        });
        
        await ctx.reply('Приз успешно добавлен!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Вернуться к управлению колесом', callback_data: 'manage_wheel' }]
            ]
          }
        });
        await ctx.scene.leave();
      } catch (error) {
        console.error('Ошибка при сохранении приза:', error);
        await ctx.reply('Произошла ошибка при сохранении приза. Попробуйте еще раз.');
      }
      break;
  }
});

// Обработка отмены
addWheelPrizeScene.action('cancel_add_prize', async (ctx) => {
  await ctx.reply('Добавление приза отменено', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Вернуться к управлению колесом', callback_data: 'manage_wheel' }]
      ]
    }
  });
  await ctx.scene.leave();
});

module.exports = addWheelPrizeScene; 