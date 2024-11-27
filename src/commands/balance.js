const { getUserByTelegramId } = require('../models/user');

    module.exports = async (ctx) => {
      const userId = ctx.from.id;
      const user = await getUserByTelegramId(userId);

      if (user) {
        ctx.reply(`Ваш текущий баланс: ${user.balance} куражиков.`);
      } else {
        ctx.reply('Пользователь не найден.');
      }
    };
