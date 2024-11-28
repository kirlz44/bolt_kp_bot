const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (ctx) => {
  try {
    if (ctx.state.userRole !== 'admin' && ctx.state.userRole !== 'superadmin') {
      return ctx.editMessageText('У вас нет доступа к управлению видео', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 В меню', callback_data: 'admin_panel' }]]
        }
      });
    }

    const qualifications = [
      'Предприниматель/Эксперт',
      'Игропрактик',
      'Организатор фестивалей',
      'Бизнес-тренер',
      'Руководитель/HR',
      'Интересующийся',
      'Саморазвитие',
      'Автор игр',
      'Психолог',
      'Создатель игр',
      'MLM-бизнес',
      'Бьюти сфера'
    ];

    const videos = await prisma.welcomeVideo.findMany();
    let message = '*Управление приветственными видео*\n\n';

    qualifications.forEach((qual, index) => {
      const video = videos.find(v => v.qualification === `qualification_${index + 1}`);
      message += `${index + 1}. ${qual}: ${video ? '✅' : '❌'}\n`;
    });

    const keyboard = qualifications.map((qual, index) => [{
      text: `${index + 1}. ${qual}`,
      callback_data: `upload_video_${index + 1}`
    }]);

    keyboard.push([{ text: '🔙 Назад', callback_data: 'admin_panel' }]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Ошибка в управлении видео:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};
