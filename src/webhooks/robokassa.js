const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { sendMessageToUser } = require('../utils/telegram');

/**
 * Начисляет реферальные бонусы за покупку
 */
async function processReferralBonuses(userId, amount) {
  try {
    // Находим реферала первого уровня
    const firstLevelReferral = await prisma.referral.findFirst({
      where: { userId },
      include: { referrer: true }
    });

    const bonuses = {
      firstLevel: null,
      secondLevel: null
    };

    if (firstLevelReferral) {
      // Начисляем 5% от суммы покупки рефереру первого уровня
      const firstLevelBonus = Math.floor(amount * 0.05);
      await prisma.user.update({
        where: { id: firstLevelReferral.referrerId },
        data: { balance: { increment: firstLevelBonus } }
      });

      bonuses.firstLevel = {
        userId: firstLevelReferral.referrerId,
        bonus: firstLevelBonus,
        telegramId: firstLevelReferral.referrer.telegramId
      };

      // Находим реферала второго уровня
      const secondLevelReferral = await prisma.referral.findFirst({
        where: { userId: firstLevelReferral.referrerId },
        include: { referrer: true }
      });

      if (secondLevelReferral) {
        // Начисляем 2% от суммы покупки рефереру второго уровня
        const secondLevelBonus = Math.floor(amount * 0.02);
        await prisma.user.update({
          where: { id: secondLevelReferral.referrerId },
          data: { balance: { increment: secondLevelBonus } }
        });

        bonuses.secondLevel = {
          userId: secondLevelReferral.referrerId,
          bonus: secondLevelBonus,
          telegramId: secondLevelReferral.referrer.telegramId
        };
      }
    }

    return bonuses;
  } catch (error) {
    console.error('Ошибка при обработке реферальных бонусов:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    console.log('Получен webhook от Робокассы:', req.query);
    const { OutSum, InvId, SignatureValue, Shp_description } = req.query;
    
    if (!OutSum || !InvId || !SignatureValue) {
      console.error('Отсутствуют обязательные параметры в запросе');
      return res.status(400).send('Missing required parameters');
    }

    const password2 = process.env.ROBOKASSA_TEST_MODE === 'true' 
      ? process.env.ROBOKASSA_TEST_PASSWORD2 
      : process.env.ROBOKASSA_PROD_PASSWORD2;

    const expectedSignature = crypto
      .createHash('md5')
      .update(`${OutSum}:${InvId}:${password2}${Shp_description ? `:Shp_description=${Shp_description}` : ''}`)
      .digest('hex')
      .toUpperCase();

    if (SignatureValue.toUpperCase() !== expectedSignature) {
      console.error('Неверная подпись платежа');
      return res.status(400).send('Invalid signature');
    }

    // Обновляем транзакцию в базе данных
    const transaction = await prisma.$transaction(async (prisma) => {
      const updatedTransaction = await prisma.transaction.update({
        where: { id: parseInt(InvId, 10) },
        data: { 
          status: 'success',
          paidAt: new Date()
        },
        include: {
          product: true,
          event: true
        }
      });

      const user = await prisma.user.findUnique({ 
        where: { id: updatedTransaction.userId },
        select: { 
          id: true,
          telegramId: true,
          firstName: true,
          username: true
        }
      });

      return { transaction: updatedTransaction, user };
    });

    // Обрабатываем реферальные бонусы
    const referralBonuses = await processReferralBonuses(
      transaction.transaction.userId,
      parseFloat(OutSum)
    );

    // Отправляем уведомление пользователю
    const userMessage = [
      '✅ Ваш платеж успешно обработан!',
      '',
      `💰 Сумма: ${OutSum} руб.`,
      `📝 ${transaction.transaction.product ? 'Товар' : 'Мероприятие'}: ${
        transaction.transaction.product?.name || 
        transaction.transaction.event?.name || 
        transaction.transaction.description
      }`,
      `🆔 Номер транзакции: ${InvId}`,
      '',
      '👨‍💼 Администратор свяжется с вами в ближайшее время!'
    ].join('\n');

    await sendMessageToUser(transaction.user.telegramId, userMessage);

    // Отправляем уведомления рефералам
    if (referralBonuses?.firstLevel) {
      await sendMessageToUser(
        referralBonuses.firstLevel.telegramId,
        `🎁 Поздравляем! Вам начислено ${referralBonuses.firstLevel.bonus} куражиков за покупку вашего реферала!`
      );
    }

    if (referralBonuses?.secondLevel) {
      await sendMessageToUser(
        referralBonuses.secondLevel.telegramId,
        `🎁 Поздравляем! Вам начислено ${referralBonuses.secondLevel.bonus} куражиков за покупку реферала второго уровня!`
      );
    }

    // Отправляем уведомление администраторам
    const adminMessage = [
      '💰 Новый успешный платеж!',
      '',
      `👤 Покупатель: ${transaction.user.firstName} ${transaction.user.username ? `(@${transaction.user.username})` : ''}`,
      `💵 Сумма: ${OutSum} руб.`,
      `📝 ${transaction.transaction.product ? 'Товар' : 'Мероприятие'}: ${
        transaction.transaction.product?.name || 
        transaction.transaction.event?.name || 
        transaction.transaction.description
      }`,
      `🆔 ID транзакции: ${InvId}`,
      `📅 Дата: ${new Date().toLocaleString('ru-RU')}`,
      '',
      '💎 Реферальные бонусы:'
    ];

    if (referralBonuses?.firstLevel) {
      adminMessage.push(`└ Уровень 1: ${referralBonuses.firstLevel.bonus} куражиков`);
    }
    if (referralBonuses?.secondLevel) {
      adminMessage.push(`└ Уровень 2: ${referralBonuses.secondLevel.bonus} куражиков`);
    }
    if (!referralBonuses?.firstLevel && !referralBonuses?.secondLevel) {
      adminMessage.push('└ Нет рефералов');
    }

    await sendMessageToUser(process.env.ADMIN_CHAT_ID, adminMessage.join('\n'));

    console.log(`Успешно обработан платеж #${InvId} на сумму ${OutSum} руб.`);
    return res.send('OK');

  } catch (error) {
    console.error('Ошибка при обработке webhook от Робокассы:', error);
    
    // В случае ошибки базы данных, всё равно отвечаем OK,
    // чтобы Робокасса не пыталась повторить запрос
    return res.send('OK');
  }
};
