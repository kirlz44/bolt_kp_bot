const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserByTelegramId(telegramId) {
  console.log('Поиск пользователя с telegramId:', telegramId);
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) }
  });
  console.log('Найден пользователь:', user);
  return user;
}

async function createUser(telegramId, role = 'user') {
  console.log('Создание пользователя с telegramId:', telegramId, 'и ролью:', role);
  const user = await prisma.user.create({
    data: {
      telegramId: BigInt(telegramId),
      role,
      balance: 1000
    }
  });
  console.log('Создан пользователь:', user);
  return user;
}

async function updateUserBalance(userId, amount) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      balance: {
        increment: amount
      }
    }
  });
}

async function checkUserRole(telegramId) {
  console.log('Проверка роли для telegramId:', telegramId);
  const superAdminId = BigInt(process.env.SUPER_ADMIN_ID);
  const telegramIdBigInt = BigInt(telegramId);
  
  console.log('superAdminId:', superAdminId.toString());
  console.log('telegramIdBigInt:', telegramIdBigInt.toString());
  
  let user = await getUserByTelegramId(telegramId);
  
  if (telegramIdBigInt === superAdminId) {
    console.log('Пользователь является суперадмином');
    if (!user) {
      console.log('Создаем суперадмина в базе данных');
      user = await createUser(telegramId, 'superadmin');
    }
    return 'superadmin';
  }

  console.log('Результат проверки роли:', user?.role || null);
  return user?.role || null;
}

async function getReferralStats(userId) {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      user: true
    }
  });

  return {
    firstLevel: referrals.length,
    secondLevel: await getSecondLevelReferrals(userId)
  };
}

async function getSecondLevelReferrals(userId) {
  const firstLevelReferrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: { userId: true }
  });

  const secondLevel = await prisma.referral.count({
    where: {
      referrerId: {
        in: firstLevelReferrals.map(ref => ref.userId)
      }
    }
  });

  return secondLevel;
}

module.exports = {
  getUserByTelegramId,
  createUser,
  updateUserBalance,
  checkUserRole,
  getReferralStats
};
