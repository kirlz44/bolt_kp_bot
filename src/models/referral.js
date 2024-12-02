const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createReferral(userId, referrerId) {
  try {
    const referral = await prisma.referral.create({
      data: {
        userId,
        referrerId
      }
    });

    // Начисляем бонусы рефереру
    await prisma.user.update({
      where: { id: referrerId },
      data: { balance: { increment: 500 } }
    });

    // Записываем бонус в историю
    await prisma.bonus.create({
      data: {
        userId: referrerId,
        amount: 500,
        description: 'Бонус за приглашение реферала 1-го уровня'
      }
    });

    return referral;
  } catch (error) {
    console.error('Ошибка при создании реферальной связи:', error);
    throw error;
  }
}

async function getReferralsByUserId(userId) {
  try {
    // Получаем рефералов первого уровня
    const firstLevel = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: { user: true }
    });

    // Получаем рефералов второго уровня
    const firstLevelIds = firstLevel.map(ref => ref.userId);
    const secondLevel = await prisma.referral.findMany({
      where: {
        referrerId: {
          in: firstLevelIds
        }
      },
      include: { user: true }
    });

    return {
      firstLevel,
      secondLevel
    };
  } catch (error) {
    console.error('Ошибка при получении рефералов:', error);
    throw error;
  }
}

async function calculateReferralBonus(userId, role = 'user') {
  try {
    const firstLevelPercent = role === 'partner' ? 10 : 5;
    const secondLevelPercent = role === 'partner' ? 5 : 2.5;

    const referrals = await getReferralsByUserId(userId);
    
    // Считаем бонусы от рефералов первого уровня
    const firstLevelBonus = referrals.firstLevel.reduce((sum, ref) => {
      return sum + (ref.user.balance * firstLevelPercent / 100);
    }, 0);

    // Считаем бонусы от рефералов второго уровня
    const secondLevelBonus = referrals.secondLevel.reduce((sum, ref) => {
      return sum + (ref.user.balance * secondLevelPercent / 100);
    }, 0);

    return {
      firstLevelBonus,
      secondLevelBonus,
      totalBonus: firstLevelBonus + secondLevelBonus
    };
  } catch (error) {
    console.error('Ошибка при расчете реферальных бонусов:', error);
    throw error;
  }
}

module.exports = {
  createReferral,
  getReferralsByUserId,
  calculateReferralBonus
};
