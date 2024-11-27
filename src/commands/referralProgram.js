const { calculateReferralBonus } = require('../models/referral');
    const { updateUserBalance } = require('../models/user');

    module.exports = async (ctx) => {
      const userId = ctx.from.id;
      const bonus = await calculateReferralBonus(userId);

      await updateUserBalance(userId, bonus);
      ctx.reply(`Вам начислено ${bonus} куражиков за реферальную программу.`);
    };
