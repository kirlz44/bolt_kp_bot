const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function spinWheel(ctx) {
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
      return ctx.reply('Недостаточно куражиков для вращения колеса. Необходимо: 700 куражиков');
    }

    // Проверяем, когда было последнее вращение
    const lastSpin = user.lastWheelSpin;
    const now = new Date();
    if (lastSpin && lastSpin.getTime() > now.getTime() - 24 * 60 * 60 * 1000) {
      return ctx.reply('Вы уже крутили колесо сегодня. Попробуйте завтра!');
    }

    // Списываем куражики
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: 700 },
        lastWheelSpin: now
      }
    });

    // Получаем все активные призы
    const prizes = await prisma.wheelPrize.findMany({
      where: { active: true }
    });

    // Выбираем приз на основе вероятностей
    const prize = selectPrize(prizes);

    // Обрабатываем выигрыш
    await handlePrize(ctx, user, prize);

  } catch (error) {
    console.error('Ошибка при вращении колеса:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

function selectPrize(prizes) {
  const random = Math.random() * 100;
  let currentProb = 0;

  for (const prize of prizes) {
    currentProb += prize.probability;
    if (random <= currentProb) {
      return prize;
    }
  }

  return prizes[prizes.length - 1]; // Возвращаем последний приз, если ничего не выпало
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
      await ctx.reply(`🎉 Поздравляем! Вы выиграли ${prize.value} куражиков!`);
      break;

    case 'discount':
      const discountCode = generateDiscountCode(user.id, prize.value);
      await ctx.reply(
        `🎉 Поздравляем! Вы выиграли скидку ${prize.value}%!\n` +
        `Ваш код скидки: ${discountCode}\n` +
        `Используйте его при следующей покупке в маркетплейсе.`
      );
      break;

    case 'special':
      await ctx.reply(`🎉 Поздравляем! Вы выиграли "${prize.name}"!`);
      // Уведомляем админов
      const adminMessage = 
        `🎯 Выигран специальный приз!\n` +
        `Приз: ${prize.name}\n` +
        `Победитель: ${user.telegramId}\n` +
        `Свяжитесь с победителем для вручения приза!`;
      await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage);
      break;
  }
}

function generateDiscountCode(userId, discount) {
  return `WHEEL${userId}D${discount}${Date.now().toString(36)}`;
}

module.exports = spinWheel;
