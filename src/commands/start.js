const { checkUserRole, createUser } = require('../models/user');

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userRole = await checkUserRole(userId);

    if (!userRole) {
      // Новый пользователь
      await createUser(userId, 'user');
      
      // Отправляем приветственное сообщение
      await ctx.reply(`Рады поприветствовать тебя ${ctx.from.first_name} в боте Студии игр "Кураж-Продаж"!`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 Кураж!', callback_data: 'start_bot' }]
          ]
        }
      });
    } else if (userRole === 'superadmin') {
      // Приветствие для суперадмина
      await ctx.reply('Добро пожаловать, Суперадмин!', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Главное меню', callback_data: 'open_menu' }],
            [{ text: '⚙️ Панель администратора', callback_data: 'admin_panel' }]
          ]
        }
      });
    } else {
      // Приветствие для существующих пользователей
      await ctx.reply(`С возвращением, ${ctx.from.first_name}!`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Открыть меню', callback_data: 'open_menu' }]
          ]
        }
      });
    }
  } catch (error) {
    console.error('Ошибка в команде start:', error);
    ctx.reply('Произошла ошибка при запуске бота. Пожалуйста, попробуйте позже.');
  }
};
