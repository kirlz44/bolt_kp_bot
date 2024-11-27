const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    // Проверяем роль пользователя
    const userRole = ctx.state.userRole;

    switch (data) {
      case 'start_bot':
        await ctx.reply('Нам важно знать кто вы', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👨‍💼 Предприниматель/Эксперт', callback_data: 'qualification_1' }],
              [{ text: '🎮 Игропрактик, провожу игры', callback_data: 'qualification_2' }],
              [{ text: '🎪 Организатор фестивалей', callback_data: 'qualification_3' }],
              [{ text: '👨‍🏫 Бизнес-тренер', callback_data: 'qualification_4' }],
              [{ text: '👔 Руководитель или HR', callback_data: 'qualification_5' }],
              [{ text: '🎯 Интересна ваша движуха', callback_data: 'qualification_6' }],
              [{ text: '🌱 Саморазвитие', callback_data: 'qualification_7' }],
              [{ text: '🎲 Автор игр', callback_data: 'qualification_8' }],
              [{ text: '🧠 Психолог', callback_data: 'qualification_9' }],
              [{ text: '🎨 Хочу создать свою игру', callback_data: 'qualification_10' }],
              [{ text: '🔄 Сетевой MLM-бизнес', callback_data: 'qualification_11' }],
              [{ text: '💅 Бьюти сфера', callback_data: 'qualification_12' }]
            ]
          }
        });
        break;

      case data.match(/^qualification_\d+/)?.[0]:
        const qualificationNumber = data.split('_')[1];
        await handleQualification(ctx, qualificationNumber);
        break;

      case 'open_menu':
        // Используем существующую команду menu
        require('./menu')(ctx);
        break;

      case 'check_balance':
        // Используем существующую команду balance
        require('./balance')(ctx);
        break;

      case 'how_to_earn':
        // Используем существующую команду earn
        require('./earn')(ctx);
        break;

      // Добавляем обработку других callback_data из меню
      case 'become_partner':
        require('./becomePartner')(ctx);
        break;

      case 'spin_wheel':
        ctx.reply('Функция колеса фортуны в разработке');
        break;

      case 'marketplace':
        require('./marketplace')(ctx);
        break;

      case 'games':
        require('./games')(ctx);
        break;

      case 'events':
        require('./events')(ctx);
        break;

      case 'admin_panel':
        if (userRole === 'admin' || userRole === 'superadmin') {
          require('./adminPanel')(ctx);
        } else {
          ctx.reply('У вас нет доступа к панели администратора');
        }
        break;

      // Обработка кнопок админ-панели
      case 'manage_welcome_videos':
        require('./manageWelcomeVideos')(ctx);
        break;

      case 'manage_wheel':
        require('./manageWheel')(ctx);
        break;

      case 'manage_products':
        require('./manageProducts')(ctx);
        break;

      case 'manage_games':
        require('./manageGames')(ctx);
        break;

      case 'create_event':
        require('./createEvent')(ctx);
        break;

      case 'broadcast':
        require('./broadcast')(ctx);
        break;

      case 'manage_activities':
        require('./manageActivities')(ctx);
        break;

      case 'view_statistics':
        require('./viewStatistics')(ctx);
        break;

      case data.match(/^upload_video_\d+/)?.[0]:
        const qualificationId = data.split('_')[2];
        ctx.scene.enter('upload_video_scene', { qualificationId });
        break;

      default:
        ctx.reply('Неизвестная команда');
    }

    // Отвечаем на callback, чтобы убрать "часики" на кнопке
    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Ошибка в обработке callback:', error);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

async function handleQualification(ctx, qualificationNumber) {
  try {
    const userId = ctx.from.id;
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (user) {
      // Обновляем квалификацию пользователя
      await prisma.user.update({
        where: { id: user.id },
        data: { qualification: `qualification_${qualificationNumber}` }
      });

      // Получаем приветственное видео для данной квалификации
      const welcomeVideo = await prisma.welcomeVideo.findFirst({
        where: { qualification: `qualification_${qualificationNumber}` }
      });

      if (welcomeVideo) {
        await ctx.replyWithVideo(welcomeVideo.fileId, {
          caption: 'В нашем боте вы можете ежедневно вращать колесо фортуны, зарабатывать Куражики, записываться на игры или мероприятия!'
        });
      }

      // Начисляем приветственные куражики
      await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: 1000 } }
      });

      // Показываем основное меню
      require('./menu')(ctx);
    }
  } catch (error) {
    console.error('Ошибка при обработке квалификации:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}
