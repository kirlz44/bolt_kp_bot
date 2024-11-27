const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    // Проверяем баланс
    if (user.balance < 700) {
      return ctx.reply(
        'Недостаточно куражиков для вращения колеса.\n' +
        'Необходимо: 700 куражиков\n' +
        'Ваш баланс: ' + user.balance + ' куражиков', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Заработать куражики', callback_data: 'earn' }],
              [{ text: '🔙 В меню', callback_data: 'open_menu' }]
            ]
          }
        }
      );
    }

    // Получаем все активные призы
    const prizes = await prisma.wheelPrize.findMany({
      where: { active: true }
    });

    if (prizes.length === 0) {
      return ctx.reply('К сожалению, сейчас нет доступных призов. Попробуйте позже.');
    }

    // Списываем куражики
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: 700 }
      }
    });

    // Анимация вращения
    const spinMessage = await ctx.reply('🎡 Колесо крутится...');
    
    // Задержка для имитации вращения
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Выбираем приз на основе вероятностей
    const prize = selectPrize(prizes);

    // Обрабатываем выигрыш
    await handlePrize(ctx, user, prize);
    
    // Удаляем сообщение с анимацией
    await ctx.telegram.deleteMessage(ctx.chat.id, spinMessage.message_id);

  } catch (error) {
    console.error('Ошибка при вращении колеса:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

function selectPrize(prizes) {
  const random = Math.random() * 100;
  let currentProb = 0;

  for (const prize of prizes) {
    currentProb += prize.probability;
    if (random <= currentProb) {
      return prize;
    }
  }

  return prizes[prizes.length - 1];
}

async function handlePrize(ctx, user, prize) {
  switch (prize.type) {
    case 'kurajiki':
      await prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: prize.value }
        }
      });
      await ctx.reply(
        `🎉 Поздравляем! Вы выиграли ${prize.value} куражиков!\n` +
        `Они уже начислены на ваш баланс.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎡 Крутить ещё раз', callback_data: 'spin_wheel' }],
              [{ text: '🔙 В меню', callback_data: 'open_menu' }]
            ]
          }
        }
      );
      break;

    case 'discount':
      const discountCode = generateDiscountCode(user.id, prize.value);
      await ctx.reply(
        `🎉 Поздравляем! Вы выиграли скидку ${prize.value}%!\n` +
        `Ваш код скидки: ${discountCode}\n` +
        `Используйте его при следующей покупке в маркетплейсе.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍 Перейти в маркетплейс', callback_data: 'marketplace' }],
              [{ text: '🎡 Крутить ещё раз', callback_data: 'spin_wheel' }],
              [{ text: '🔙 В меню', callback_data: 'open_menu' }]
            ]
          }
        }
      );
      break;

    case 'special':
      await ctx.reply(
        `🎉 Поздравляем! Вы выиграли "${prize.name}"!\n` +
        `Администратор свяжется с вами для вручения приза.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎡 Крутить ещё раз', callback_data: 'spin_wheel' }],
              [{ text: '🔙 В меню', callback_data: 'open_menu' }]
            ]
          }
        }
      );
      
      // Получаем информацию о пользователе
      const winner = ctx.from;
      const username = winner.username ? `@${winner.username}` : 'не указан';
      const fullName = winner.first_name + (winner.last_name ? ` ${winner.last_name}` : '');
      
      // Уведомляем админов с расширенной информацией
      const adminMessage = 
        `🎯 Выигран специальный приз!\n` +
        `Приз: ${prize.name}\n` +
        `Победитель: ${fullName}\n` +
        `Username: ${username}\n` +
        `ID: ${user.telegramId}\n\n` +
        `Свяжитесь с победителем для вручения приза!`;

      await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Приз выдан', callback_data: `prize_given_${user.telegramId}` }]
          ]
        }
      });
      break;
  }
}

function generateDiscountCode(userId, discount) {
  return `WHEEL${userId}D${discount}${Date.now().toString(36).toUpperCase()}`;
}
