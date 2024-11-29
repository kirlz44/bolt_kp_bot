const { Scenes } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const editEventScene = new Scenes.BaseScene('edit_event_scene');

editEventScene.enter(async (ctx) => {
  await ctx.reply(ctx.scene.state.promptMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Отменить', callback_data: 'cancel_edit_event' }]
      ]
    }
  });
});

editEventScene.on('text', async (ctx) => {
  try {
    const { id: eventId, param } = ctx.session.editingEvent;
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
        
        if (isNaN(newDate.getTime())) {
          await ctx.reply('Неверный формат даты. Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ');
          return;
        }
        
        updateData = { date: newDate };
        break;
      case 'location':
        updateData = { location: newValue };
        break;
      case 'price':
        const [priceRub, priceKur] = newValue.split(' ').map(Number);
        if (isNaN(priceRub) || isNaN(priceKur) || priceRub < 0 || priceKur < 0) {
          await ctx.reply('Неверный формат цены. Используйте формат "РУБЛИ КУРАЖИКИ" или "0 0"');
          return;
        }
        updateData = { priceRub, priceKur };
        break;
      case 'seats':
        const seats = parseInt(newValue);
        if (isNaN(seats) || seats <= 0) {
          await ctx.reply('Пожалуйста, введите корректное количество мест (положительное число)');
          return;
        }
        updateData = { seats };
        break;
      case 'description':
        updateData = { description: newValue };
        break;
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData
    });

    // Уведомляем зарегистрированных участников об изменениях
    if (param === 'date' || param === 'location') {
      const registrations = await prisma.eventRegistration.findMany({
        where: { eventId },
        include: { user: true }
      });

      for (const reg of registrations) {
        try {
          await ctx.telegram.sendMessage(
            reg.user.telegramId,
            `⚠️ Внимание! Изменения в мероприятии "${event.title}"\n\n` +
            `${param === 'date' ? `Новая дата: ${event.date.toLocaleDateString()} ${event.date.toLocaleTimeString()}` : 
              `Новое место: ${event.location}`}`
          );
        } catch (error) {
          console.error(`Ошибка отправки уведомления пользователю ${reg.user.telegramId}:`, error);
        }
      }
    }

    await ctx.reply('✅ Изменения сохранены!');
    await ctx.scene.leave();
    
    // Возвращаемся к списку параметров для редактирования
    const editMessage = '*Выберите параметр для редактирования:*';
    const editKeyboard = [
      [{ text: '📝 Название', callback_data: `edit_event_title_${eventId}` }],
      [{ text: '📅 Дата и время', callback_data: `edit_event_date_${eventId}` }],
      [{ text: '📍 Место проведения', callback_data: `edit_event_location_${eventId}` }],
      [{ text: '💰 Цена', callback_data: `edit_event_price_${eventId}` }],
      [{ text: '👥 Количество мест', callback_data: `edit_event_seats_${eventId}` }],
      [{ text: '📝 Описание', callback_data: `edit_event_description_${eventId}` }],
      [{ text: '🔙 Назад', callback_data: 'manage_events' }]
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

editEventScene.action('cancel_edit_event', async (ctx) => {
  await ctx.scene.leave();
  await ctx.editMessageText('Редактирование отменено', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад к управлению мероприятиями', callback_data: 'manage_events' }]
      ]
    }
  });
});

module.exports = editEventScene; 