const getMenuKeyboard = (userRole) => {
  let keyboard = [
    [{ text: '💎 Стать партнером', callback_data: 'become_partner' }],
    [{ text: '🎡 Крутить колесо фортуны', callback_data: 'spin_wheel' }],
    [{ text: '🛍 Маркетплейс', callback_data: 'marketplace' }],
    [{ text: '🎮 Игры', callback_data: 'games' }],
    [{ text: '🎪 Мероприятия', callback_data: 'events' }],
    [{ text: '💰 Заработать', callback_data: 'earn' }],
    [{ text: '👥 Реферальная программа', callback_data: 'referral_program' }],
    [{ text: '❓ Помощь', callback_data: 'help' }]
  ];

  // Добавляем кнопки для партнера
  if (userRole === 'partner') {
    keyboard.splice(1, 0, [{ text: '🎲 Мои игры', callback_data: 'my_games' }]);
  }

  // Добавляем кнопки для админа и суперадмина
  if (userRole === 'admin' || userRole === 'superadmin') {
    keyboard.push([{ text: '⚙️ Панель администратора', callback_data: 'admin_panel' }]);
  }

  return keyboard;
};

module.exports = async (ctx) => {
  try {
    const keyboard = await getMenuKeyboard(ctx.state.userRole);
    await ctx.reply('Главное меню', {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка в меню:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

// Экспортируем функцию создания клавиатуры
module.exports.getMenuKeyboard = getMenuKeyboard;
