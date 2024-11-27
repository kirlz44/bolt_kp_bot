const { checkUserRole } = require('../models/user');

async function authMiddleware(ctx, next) {
  try {
    const userId = ctx.from.id;
    const userRole = await checkUserRole(userId);
    ctx.state.userRole = userRole;
    
    return next();
  } catch (error) {
    console.error('Ошибка в middleware авторизации:', error);
    return ctx.reply('Произошла ошибка авторизации');
  }
}

module.exports = authMiddleware; 