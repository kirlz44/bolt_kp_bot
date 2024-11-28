module.exports = async (ctx) => {
  try {
    const userRole = ctx.state.userRole;
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      const message = 'У вас нет доступа к панели администратора';
      const keyboard = [[{ text: '🔙 В меню', callback_data: 'open_menu' }]];
      
      if (ctx.callbackQuery) {
        return ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        return ctx.reply(message, {
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    }

    const message = 'Панель администратора';
    const keyboard = [
      [{ text: '📹 Приветственные видео', callback_data: 'manage_welcome_videos' }],
      [{ text: '🎡 Управление колесом фортуны', callback_data: 'manage_wheel' }],
      [{ text: '🛍 Управление товарами', callback_data: 'manage_products' }],
      [{ text: '🎮 Управление играми', callback_data: 'manage_games' }],
      [{ text: '🎪 Создать мероприятие', callback_data: 'create_event' }],
      [{ text: '📢 Рассылка', callback_data: 'broadcast' }],
      [{ text: '📊 Управление активностями', callback_data: 'manage_activities' }],
      [{ text: '📈 Статистика', callback_data: 'view_statistics' }],
      [{ text: '🔙 Вернуться в меню', callback_data: 'open_menu' }]
    ];

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await ctx.reply(message, {
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    console.error('Ошибка в панели администратора:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
