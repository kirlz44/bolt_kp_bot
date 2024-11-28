const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const editGameScene = new Scenes.BaseScene('edit_game_scene');

editGameScene.enter(async (ctx) => {
  await ctx.reply(ctx.scene.state.promptMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Отменить', callback_data: 'cancel_edit' }]
      ]
    }
  });
});

editGameScene.on('text', async (ctx) => {
  try {
    const { id: gameId, param } = ctx.session.editingGame;
    const newValue = ctx.message.text;

    let updateData = {};
    
    switch (param) {
      case 'title':
        updateData = { title: newValue };
        break;
      case 'date':
        const [date, time] = newValue.split(' ');
        const [day, month, year] = date.split('.');
        const [hours, minutes] = time.split(':');
        const newDate = new Date(year, month - 1, day, hours, minutes);
        updateData = { date: newDate };
        break;
      case 'location':
        updateData = { location: newValue };
        break;
      case 'price':
        const [priceRub, priceKur] = newValue.split(' ').map(Number);
        updateData = { priceRub, priceKur };
        break;
      case 'seats':
        updateData = { seats: parseInt(newValue) };
        break;
      case 'description':
        updateData = { description: newValue };
        break;
    }

    await prisma.game.update({
      where: { id: gameId },
      data: updateData
    });

    await ctx.reply('✅ Изменения сохранены!');
    await ctx.scene.leave();
    
    // Возвращаемся к списку параметров для редактирования
    const editMessage = '*Выберите параметр для редактирования:*';
    const editKeyboard = [
      [{ text: '📝 Название', callback_data: `edit_game_title_${gameId}` }],
      [{ text: '📅 Дата и время', callback_data: `edit_game_date_${gameId}` }],
      [{ text: '📍 Место проведения', callback_data: `edit_game_location_${gameId}` }],
      [{ text: '💰 Цена', callback_data: `edit_game_price_${gameId}` }],
      [{ text: '👥 Количество мест', callback_data: `edit_game_seats_${gameId}` }],
      [{ text: '📝 Описание', callback_data: `edit_game_description_${gameId}` }],
      [{ text: '🖼 Изображение', callback_data: `edit_game_image_${gameId}` }],
      [{ text: '🔙 Назад', callback_data: 'edit_game' }]
    ];

    await ctx.reply(editMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: editKeyboard
      }
    });

  } catch (error) {
    console.error('Ошибка при сохранении изменений:', error);
    await ctx.reply('Произошла ошибка при сохранении. Пожалуйста, попробуйте снова.');
  }
});

editGameScene.on('photo', async (ctx) => {
  if (ctx.session.editingGame.param === 'image') {
    try {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      await prisma.game.update({
        where: { id: ctx.session.editingGame.id },
        data: { imageId: photo.file_id }
      });

      await ctx.reply('✅ Изображение обновлено!');
      await ctx.scene.leave();
      
      // Возвращаемся к списку параметров для редактирования
      await ctx.reply('Выберите следующий параметр для редактирования:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад к параметрам', callback_data: `edit_game_${ctx.session.editingGame.id}` }]
          ]
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении изображения:', error);
      await ctx.reply('Произошла ошибка при сохранении изображения. Пожалуйста, попробуйте снова.');
    }
  }
});

editGameScene.action('cancel_edit', async (ctx) => {
  await ctx.scene.leave();
  await ctx.editMessageText('Редактирование отменено', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад к списку игр', callback_data: 'edit_game' }]
      ]
    }
  });
});

module.exports = editGameScene; 