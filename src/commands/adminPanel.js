module.exports = async (ctx) => {
  try {
    const userRole = ctx.state.userRole;
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return ctx.reply('У вас нет доступа к панели администратора');
    }

    await ctx.reply('Панель администратора', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📹 Приветственные видео', callback_data: 'manage_welcome_videos' }],
          [{ text: '🎡 Управление колесом фортуны', callback_data: 'manage_wheel' }],
          [{ text: '🛍 Управление товарами', callback_data: 'manage_products' }],
          [{ text: '🎮 Управление играми', callback_data: 'manage_games' }],
          [{ text: '🎪 Создать мероприятие', callback_data: 'create_event' }],
          [{ text: '📢 Рассылка', callback_data: 'broadcast' }],
          [{ text: '📊 Управление активностями', callback_data: 'manage_activities' }],
          [{ text: '📈 Статистика', callback_data: 'view_statistics' }],
          [{ text: '🔙 Вернуться в меню', callback_data: 'open_menu' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка в панели администратора:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
