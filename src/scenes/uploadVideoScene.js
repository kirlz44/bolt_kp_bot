const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const { checkUserRole } = require('../models/user');
const prisma = new PrismaClient();

const uploadVideoScene = new Scenes.BaseScene('upload_video_scene');

uploadVideoScene.enter(async (ctx) => {
  // Проверяем права доступа при входе в сцену
  const userRole = await checkUserRole(ctx.from.id);
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    await ctx.reply('У вас нет доступа к управлению видео', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 В главное меню', callback_data: 'open_menu' }]
        ]
      }
    });
    return await ctx.scene.leave();
  }

  const qualificationId = ctx.scene.state.qualificationId;
  await ctx.reply(
    'Пожалуйста, отправьте видео для этой квалификации.\n' +
    'Для отмены нажмите /cancel'
  );
});

uploadVideoScene.command('cancel', async (ctx) => {
  await ctx.reply('Загрузка видео отменена', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад', callback_data: 'manage_welcome_videos' }]
      ]
    }
  });
  await ctx.scene.leave();
});

uploadVideoScene.on('video', async (ctx) => {
  try {
    const qualificationId = ctx.scene.state.qualificationId;
    const fileId = ctx.message.video.file_id;

    // Проверяем, существует ли уже видео для этой квалификации
    const existingVideo = await prisma.welcomeVideo.findFirst({
      where: {
        qualification: `qualification_${qualificationId}`
      }
    });

    if (existingVideo) {
      // Обновляем существующее видео
      await prisma.welcomeVideo.update({
        where: { id: existingVideo.id },
        data: { fileId }
      });
    } else {
      // Создаем новую запись
      await prisma.welcomeVideo.create({
        data: {
          qualification: `qualification_${qualificationId}`,
          fileId
        }
      });
    }

    await ctx.reply('Видео успешно загружено!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Вернуться к управлению видео', callback_data: 'manage_welcome_videos' }]
        ]
      }
    });
    await ctx.scene.leave();

  } catch (error) {
    console.error('Ошибка при загрузке видео:', error);
    await ctx.reply('Произошла ошибка при загрузке видео. Попробуйте еще раз или нажмите /cancel', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'manage_welcome_videos' }]
        ]
      }
    });
  }
});

uploadVideoScene.on('message', async (ctx) => {
  await ctx.reply('Пожалуйста, отправьте видео или нажмите /cancel для отмены', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад', callback_data: 'manage_welcome_videos' }]
      ]
    }
  });
});

module.exports = uploadVideoScene; 