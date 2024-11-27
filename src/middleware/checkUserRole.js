module.exports = (ctx, next) => {
      const userId = ctx.from.id;
      const superAdminId = parseInt(process.env.SUPER_ADMIN_ID, 10);
      const adminChatId = parseInt(process.env.ADMIN_CHAT_ID, 10);
      const partnerChatId = parseInt(process.env.PARTNER_CHAT_ID, 10);

      if (userId === superAdminId) {
        ctx.state.role = 'superadmin';
      } else if (ctx.chat && ctx.chat.id === adminChatId) {
        ctx.state.role = 'admin';
      } else if (ctx.chat && ctx.chat.id === partnerChatId) {
        ctx.state.role = 'partner';
      } else {
        ctx.state.role = 'user';
      }

      return next();
    };
