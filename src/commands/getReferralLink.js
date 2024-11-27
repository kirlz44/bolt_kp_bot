module.exports = (ctx) => {
      const userId = ctx.from.id;
      const botUsername = 'studiokp_bot';
      const referralLink = `https://t.me/${botUsername}?start=${userId}`;
      ctx.reply(`Ваша реферальная ссылка: ${referralLink}`);
    };
