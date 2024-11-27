const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function createReferral(userId, referrerId) {
      return await prisma.referral.create({
        data: {
          userId,
          referrerId
        }
      });
    }

    async function getReferralsByUserId(userId) {
      return await prisma.referral.findMany({
        where: {
          referrerId: userId
        }
      });
    }

    async function calculateReferralBonus(userId) {
      const firstLevelReferrals = await prisma.referral.findMany({
        where: { referrerId: userId }
      });

      let firstLevelBonus = firstLevelReferrals.length * 5; // 5% bonus for first level

      let secondLevelBonus = 0;
      for (const referral of firstLevelReferrals) {
        const secondLevelReferrals = await prisma.referral.findMany({
          where: { referrerId: referral.userId }
        });
        secondLevelBonus += secondLevelReferrals.length * 2.5; // 2.5% bonus for second level
      }

      return firstLevelBonus + secondLevelBonus;
    }

    module.exports = {
      createReferral,
      getReferralsByUserId,
      calculateReferralBonus
    };
