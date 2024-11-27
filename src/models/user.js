const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserByTelegramId(telegramId) {
  return await prisma.user.findUnique({
    where: { telegramId }
  });
}

async function createUser(telegramId, role = 'user') {
  return await prisma.user.create({
    data: {
      telegramId,
      role,
      balance: 0
    }
  });
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
  const superAdminId = parseInt(process.env.SUPER_ADMIN_ID);
  
  if (telegramId === superAdminId) {
    return 'superadmin';
  }

  const user = await getUserByTelegramId(telegramId);
  if (!user) return null;

  return user.role;
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
