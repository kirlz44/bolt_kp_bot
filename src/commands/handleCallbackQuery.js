const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Добавляем в начало файла функцию getMenuKeyboard
function getMenuKeyboard(userRole) {
  let keyboard = [
    [{ text: '🤝 Стать партнером', callback_data: 'become_partner' }],
    [{ text: '🎡 Крутить колесо фортуны', callback_data: 'spin_wheel' }],
    [{ text: '🛍 Маркетплейс', callback_data: 'marketplace' }],
    [{ text: '🎮 Игры', callback_data: 'games' }],
    [{ text: '🎪 Мероприятия', callback_data: 'events' }],
    [{ text: '💰 Заработать', callback_data: 'earn' }],
    [{ text: '👥 Реферальная программа', callback_data: 'referral_program' }],
    [{ text: '❓ Помощь', callback_data: 'help' }]
  ];

  // Добавляем кнопки для админа
  if (userRole === 'admin' || userRole === 'superadmin') {
    keyboard.push([{ text: '⚙️ Панель администратора', callback_data: 'admin_panel' }]);
  }

  // Добавляем кнопки для партнера
  if (userRole === 'partner') {
    keyboard.push([{ text: '🎮 Мои игры', callback_data: 'my_games' }]);
  }

  return keyboard;
}

// Исправляем функцию handleQualification
async function handleQualification(ctx, qualificationNumber) {
  try {
    const userId = ctx.from.id;
    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) }
    });

    // Если пользователь не найден, создаем его
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(userId),
          role: 'user',
          balance: 0,
          qualification: `qualification_${qualificationNumber}`
        }
      });
    } else {
      // Обновляем квалификацию пользователя
      user = await prisma.user.update({
        where: { id: user.id },
        data: { qualification: `qualification_${qualificationNumber}` }
      });
    }

    // Получаем приветственное видео для данной квалификации
    const welcomeVideo = await prisma.welcomeVideo.findFirst({
      where: { qualification: `qualification_${qualificationNumber}` }
    });

    if (welcomeVideo) {
      await ctx.replyWithVideo(welcomeVideo.fileId, {
        caption: 'В нашем боте вы можете ежедневно вращать колесо фортуны, зарабатывать Куражики, записываться на игры или мероприятия!'
      });
    }

    // End of Selection

    // Показываем основное меню
    await ctx.reply(
      `🎉 Поздравляем! Вам начислено 1000 куражиков за регистрацию!\n\n` +
      `Давайте познакомимся с основным меню:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Открыть меню', callback_data: 'open_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при обработке квалификации:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

// Экспортируем функцию вместе с основным обработчиком
module.exports = async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const userRole = ctx.state.userRole;

    switch (true) {
      case data === 'start_bot':
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

      case /^qualification_\d+$/.test(data):
        const qualificationNum = data.split('_')[1];
        await handleQualification(ctx, qualificationNum);
        break;

      case data === 'open_menu':
        try {
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          const message = 
            `*🎪 Добро пожаловать в Студию игр Кураж Продаж!*\n\n` +
            `💎 Ваш баланс: ${user?.balance || 0} куражиков\n\n` +
            `*О нашем боте:*\n` +
            `• Участвуйте в мероприятиях и играх для развития навыков продаж\n` +
            `• Зарабатывайте куражики за активность и используйте их для оплаты\n` +
            `• Получайте доступ к эксклюзивным обучающим материалам\n` +
            `• Приглашайте друзей и получайте бонусы\n` +
            `• Крутите колесо фортуны и выигрывайте призы\n` +
            `• Покупайте товары в маркетплейсе\n\n` +
            `*Доступные действия:*\n` +
            `🎮 Игры - участвуйте в играх по продажам\n` +
            `🎪 Мероприятия - записывайтесь на тренинги и встречи\n` +
            `🎡 Колесо фортуны - испытайте удачу\n` +
            `💰 Заработать - получайте куражики за активность\n` +
            `🛍️ Маркетплейс - обменивайте куражики на товары\n` +
            `👥 Реферальная программа - приглашайте друзей за куражики\n` +
            `🤝 Стать партнером - больше возможностей`;

          const keyboard = getMenuKeyboard(userRole);

          if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: keyboard }
            });
          } else {
            await ctx.reply(message, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: keyboard }
            });
          }
        } catch (error) {
          console.error('Ошибка при открытии меню:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'check_balance':
        require('./balance')(ctx);
        break;

      case data === 'how_to_earn':
        require('./earn')(ctx);
        break;

      // Добавляем обработку других callback_data из меню
      case data === 'become_partner':
        require('./becomePartner')(ctx);
        break;

      case data === 'spin_wheel':
        require('./spinWheel')(ctx);
        break;

      case data === 'marketplace':
        try {
          const products = await prisma.product.findMany({
            where: {
              stock: {
                gt: 0
              }
            }
          });

          let message = '*Маркетплейс*\n\n';
          
          if (products.length > 0) {
            message += 'Доступные товары:\n\n';
            products.forEach(product => {
              message += `📦 ${product.name} - ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
            });
            message += '\nДля просмотра подробной информации о товарах нажмите кнопку "Каталог"';

            // Создаем новое сообщение вместо редактирования
            await ctx.deleteMessage();
            await ctx.reply(message, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📑 Каталог', callback_data: 'show_catalog' }],
                  [{ text: '🔙 В меню', callback_data: 'open_menu' }]
                ]
              }
            });
          } else {
            await ctx.deleteMessage();
            await ctx.reply('На данный момент нет доступных товаров.', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 В меню', callback_data: 'open_menu' }]
                ]
              }
            });
          }
        } catch (error) {
          console.error('Ошибка в маркетплейсе:', error);
          await ctx.reply('Произошла ошибка при загрузке товаров. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчик для просмотра каталога товаров
      case data === 'show_catalog':
        try {
          const products = await prisma.product.findMany({
            where: {
              stock: {
                gt: 0
              }
            }
          });

          if (products.length === 0) {
            return ctx.reply('На данный момент нет доступных товаров', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 В меню', callback_data: 'open_menu' }]
                ]
              }
            });
          }

          // Отправляем каждый товар отдельным сообщением
          for (const product of products) {
            let message = `📦 *${product.name}*\n\n`;
            if (product.description) {
              message += `📝 ${product.description}\n\n`;
            }
            message += `💰 Цена: ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
            message += `📊 В наличии: ${product.stock} шт.\n`;

            const keyboard = {
              inline_keyboard: [
                [
                  { text: '💳 Купить за рубли', callback_data: `buy_product_money_${product.id}` },
                  { text: '💎 Купить за куражики', callback_data: `buy_product_kurajiki_${product.id}` }
                ]
              ]
            };

            if (product.imageId) {
              await ctx.replyWithPhoto(product.imageId, {
                caption: message,
                parse_mode: 'Markdown',
                reply_markup: keyboard
              });
            } else {
              await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
              });
            }

            // Добавляем небольшую задержку между сообщениями
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // В конце отправляем кнопку возврата
          await ctx.reply('Выберите товар для покупки:', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Вернуться в маркетплейс', callback_data: 'marketplace' }]
              ]
            }
          });

        } catch (error) {
          console.error('Ошибка при показе каталога:', error);
          await ctx.reply('Произошла ошибка при загрузке товаров. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'games':
        try {
          const games = await prisma.game.findMany({
            where: {
              date: {
                gte: new Date()
              }
            },
            orderBy: {
              date: 'asc'
            }
          });

          const message = games.length === 0 
            ? 'На данный момент нет запланированных игр'
            : 'Доступные игры:';

          const keyboard = games.map(game => ([{
            text: `${game.title} - ${new Date(game.date).toLocaleDateString()}`,
            callback_data: `view_game_${game.id}`
          }]));

          keyboard.push([{ text: '🔙 В меню', callback_data: 'open_menu' }]);

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение
          await ctx.reply(message, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (error) {
          console.error('Ошибка при получении списка игр:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'events':
        try {
          const events = await prisma.event.findMany({
            where: {
              date: {
                gte: new Date()
              }
            },
            orderBy: {
              date: 'asc'
            },
            include: {
              participants: true
            }
          });

          let message = events.length === 0 
            ? 'На данный момент нет доступных мероприятий'
            : '*Доступные мероприятия:*\n\n';

          const keyboard = [];

          if (events.length > 0) {
            for (const event of events) {
              message += `🎪 ${event.title}\n`;
              message += `📅 ${new Date(event.date).toLocaleDateString()}\n`;
              message += `⏰ ${new Date(event.date).toLocaleTimeString()}\n`;
              message += `📍 ${event.location}\n`;
              message += `👥 Свободных мест: ${event.seats - event.participants.length}\n`;
              message += `💰 Стоимость: ${event.priceRub > 0 ? `${event.priceRub}₽ / ${event.priceKur} куражиков` : 'Бесплатно'}\n\n`;

              keyboard.push([{ 
                text: `✍️ ${event.title} - ${new Date(event.date).toLocaleDateString()}`, 
                callback_data: `view_event_${event.id}` 
              }]);
            }
          }

          keyboard.push([{ text: '🔙 В меню', callback_data: 'open_menu' }]);

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (error) {
          console.error('Ошибка при отображении списка мероприятий:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'admin_panel':
        if (userRole === 'admin' || userRole === 'superadmin') {
          require('./adminPanel')(ctx);
        } else {
          ctx.reply('У вас нет доступа к панели администратора');
        }
        break;

      // Обработчики кнопок админ-панели
      case data === 'manage_welcome_videos':
        require('./manageWelcomeVideos')(ctx);
        break;

      case data === 'manage_wheel':
        require('./manageWheel')(ctx);
        break;

      case data === 'manage_products':
        try {
          if (userRole !== 'admin' && userRole !== 'superadmin') {
            return ctx.reply('У вас нет доступа к управлению товарами');
          }

          const products = await prisma.product.findMany();
          let message = '*Управление товарами*\n\n';

          if (products.length > 0) {
            message += 'Текущие товары:\n\n';
            products.forEach(product => {
              message += `📦 ${product.name}\n`;
              message += `💰 ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
              message += `📊 На складе: ${product.stock} шт.\n\n`;
            });
          } else {
            message += 'Товары отсутствуют\n';
          }

          const keyboard = [
            [{ text: '➕ Добавить товар', callback_data: 'add_product' }],
            [{ text: '📋 Список товаров', callback_data: 'list_products' }],
            [{ text: '✏️ Редактировать товар', callback_data: 'edit_products' }],
            [{ text: '❌ Удалить товар', callback_data: 'delete_product' }],
            [{ text: '🔙 Назад', callback_data: 'admin_panel' }]
          ];

          if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: keyboard }
            });
          } else {
            await ctx.reply(message, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: keyboard }
            });
          }
        } catch (error) {
          console.error('Ошибка в управлении товарами:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'add_product':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_product_scene');
        } else {
          await ctx.reply('У вас нет доступа к добавлению товаров');
        }
        break;

      case data === 'edit_products':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('edit_product_scene');
        } else {
          await ctx.reply('У вас нет доступа к редактированию товаров');
        }
        break;

      case data === 'delete_product':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const productsToDelete = await prisma.product.findMany();
          const keyboardDelete = productsToDelete.map(product => ([{
            text: product.name,
            callback_data: `confirm_delete_product_${product.id}`
          }]));
          keyboardDelete.push([{ text: '🔙 Отмена', callback_data: 'manage_products' }]);
          
          await ctx.reply('Выберите товар для удаления:', {
            reply_markup: { inline_keyboard: keyboardDelete }
          });
        } else {
          await ctx.reply('У вас нет доступа к удалению товаров');
        }
        break;

      case /^confirm_delete_product_\d+$/.test(data):
        try {
          if (userRole !== 'admin' && userRole !== 'superadmin') {
            return ctx.reply('У вас нет доступа к удалению товаров');
          }

          const productId = parseInt(data.split('_')[3]);
          await prisma.product.delete({
            where: { id: productId }
          });
          await ctx.reply('✅ Товар успешно удален!', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад к управлению товарами', callback_data: 'manage_products' }]]
            }
          });
        } catch (error) {
          console.error('Ошибка при удалении товара:', error);
          await ctx.reply('Произошла ошибка при удалении товара. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'list_products':
        try {
          const listedProducts = await prisma.product.findMany();
          let listMessage = '*📋 Список товаров*\n\n';
          
          if (listedProducts.length > 0) {
            listedProducts.forEach(product => {
              listMessage += `📦 *${product.name}*\n`;
              listMessage += `📝 ${product.description}\n`;
              listMessage += `💰 Цена: ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
              listMessage += `📊 На складе: ${product.stock} шт.\n\n`;
            });
          } else {
            listMessage += 'Товары отсутствуют';
          }
          
          await ctx.reply(listMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'manage_products' }]]
            }
          });
        } catch (error) {
          console.error('Ошибка при получении списка товаров:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчик покупки товара за куражики
      case /^buy_product_kurajiki_\d+$/.test(data):
        const buyProductId = parseInt(data.split('_')[3]);
        await require('./buyProductWithKurajiki')(ctx, buyProductId);
        break;

      // Обработчик подтверждения выдачи товара
      case /^product_given_\d+_\d+$/.test(data):
        try {
          // Используем регулярное выражение для извлечения userId и productId
          const matches = data.match(/^product_given_(\d+)_(\d+)$/);
          if (!matches) {
            throw new Error('Неверный формат callback_data');
          }

          const [, buyerUserId, productId] = matches;
          const adminUsername = ctx.from.username || ctx.from.first_name;

          // Получаем оригинальное сообщение
          const originalMessage = ctx.callbackQuery.message.text;

          // Обновляем сообщение, добавляя информацию о подтверждении
          await ctx.editMessageText(
            `${originalMessage}\n\n✅ Товар выдан администратором @${adminUsername}`,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: []  // Убираем кнопку после подтверждения
              }
            }
          );

          // Получаем информацию о покупателе
          const buyer = await prisma.user.findUnique({
            where: { telegramId: BigInt(buyerUserId) }
          });

          if (buyer) {
            // Отправляем уведомление покупателю
            try {
              await ctx.telegram.sendMessage(
                Number(buyer.telegramId),
                '✅ Администратор отметил ваш товар как выданный. Спасибо за покупку!'
              );
            } catch (sendError) {
              console.error('Ошибка при отправке уведомления покупателю:', sendError);
              await ctx.reply('Не удалось отправить уведомление покупателю, но товар отмечен как выданный.');
            }
          }

        } catch (error) {
          console.error('Ошибка при подтверждении выдачи товара:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'manage_games':
        require('./manageGames')(ctx);
        break;

      case data === 'create_event':
        require('./createEvent')(ctx);
        break;

      case data === 'broadcast':
        require('./broadcast')(ctx);
        break;

      case data === 'manage_activities':
        require('./manageActivities')(ctx);
        break;

      case data === 'view_statistics':
        require('./viewStatistics')(ctx);
        break;

      case /^upload_video_\d+$/.test(data):
        const qualificationId = data.split('_')[2];
        ctx.scene.enter('upload_video_scene', { qualificationId });
        break;

      case data === 'add_wheel_prize':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_wheel_prize_scene');
        } else {
          await ctx.reply('У вас нет доступа к управлению призами');
        }
        break;

      case data === 'list_wheel_prizes':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const prizes = await prisma.wheelPrize.findMany({
            where: { active: true }
          });
          
          let prizeMessage = '*Список призов колеса фортуны:*\n\n';
          let totalProbability = 0;
          
          prizes.forEach(prize => {
            prizeMessage += `🎁 ${prize.name}\n`;
            prizeMessage += `Вероятность: ${prize.probability}%\n\n`;
            totalProbability += prize.probability;
          });
          
          prizeMessage += `\nОбщая сумма вероятностей: ${totalProbability}%`;
          
          await ctx.editMessageText(prizeMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'manage_wheel' }]
              ]
            }
          });
        } else {
          await ctx.reply('У вас нет доступа к управлению призами');
        }
        break;

      case data === 'delete_wheel_prize':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const prizesToDelete = await prisma.wheelPrize.findMany({
            where: { active: true }
          });
          
          if (prizesToDelete.length === 0) {
            return ctx.editMessageText('Нет активных призов для удаления', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_wheel' }]
                ]
              }
            });
          }

          const keyboardDeletePrize = prizesToDelete.map(prize => [{
            text: `${prize.name} (${prize.probability}%)`,
            callback_data: `delete_prize_${prize.id}`
          }]);

          keyboardDeletePrize.push([{ text: '🔙 Назад', callback_data: 'manage_wheel' }]);

          await ctx.editMessageText('Выберите приз для удаления:', {
            reply_markup: {
              inline_keyboard: keyboardDeletePrize
            }
          });
        } else {
          await ctx.reply('У вас нет доступа к управлению призами');
        }
        break;

      case /^delete_prize_\d+$/.test(data):
        if (userRole === 'admin' || userRole === 'superadmin') {
          const prizeId = parseInt(data.split('_')[2]);
          try {
            await prisma.wheelPrize.update({
              where: { id: prizeId },
              data: { active: false }
            });
            
            await ctx.editMessageText('Приз успешно удален!', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Вернуться к управлению колесом', callback_data: 'manage_wheel' }]
                ]
              }
            });
          } catch (error) {
            console.error('Ошибка при удалении приза:', error);
            await ctx.reply('Произошла ошибка при удалении приза');
          }
        } else {
          await ctx.reply('У вас нет доступа к управлению призами');
        }
        break;

      case /^prize_given_\d+$/.test(data):
        if (userRole === 'admin' || userRole === 'superadmin') {
          const winnerTelegramId = data.split('_')[2];
          const adminUsername = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
          
          // Обновляем сообщение, добавляя информацию о выдаче приза
          await ctx.editMessageText(
            ctx.update.callback_query.message.text + 
            `\n\n✅ Приз выдан администратором ${adminUsername}`
          );

          // Уведомляем победителя
          await ctx.telegram.sendMessage(
            winnerTelegramId,
            '🎁 Ваш специальный приз готов к выдаче! Администратор свяжется с вами в ближайшее время.'
          );
        }
        break;

      case data === 'earn':
        require('./earn')(ctx);
        break;

      case /^post_(vk|instagram|telegram|ok)$/.test(data):
        try {
          const network = data.split('_')[1];
            
          // Получаем актуальное значение вознаграждения
          const reward = await prisma.socialMediaReward.findUnique({
            where: { platform: network }
          });

          // Определяем сумму вознаграждения
          const rewardAmount = reward?.amount || {
            vk: 300,
            instagram: 300,
            telegram: 200,
            ok: 200
          }[network];

          // Входим в сцену верификации с передачей сети и вознаграждения
          await ctx.scene.enter('post_verification_scene', { 
            network,
            rewardAmount
          });
        } catch (error) {
          console.error('Ошибка при обработке поста:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^approve_post_\d+_[a-z]+$/.test(data):
        try {
          // Используем правильное регулярное выражение для извлечения данных
          const match = data.match(/^approve_post_(\d+)_([a-z]+)$/);
          if (!match) {
            console.error('Неверный формат callback_data:', data);
            await ctx.reply('Ошибка: неверный формат данных');
            return;
          }

          const [, userId, network] = match;
          console.log('Полученный userId:', userId, 'Тип:', typeof userId);
          console.log('Полученный network:', network);
          
          const adminUsername = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
          const originalMessage = ctx.callbackQuery.message.caption;

          if (!originalMessage) {
            return ctx.reply('Ошибка: не удалось получить текст сообщения');
          }

          // Получаем актуальное значение вознаграждения
          const reward = await prisma.socialMediaReward.findUnique({
            where: { platform }
          });

          // Определяем сумму вознаграждения
          const rewardAmount = reward?.amount || {
            vk: 300,
            instagram: 300,
            telegram: 200,
            ok: 200
          }[network];

          // Обновляем сообщение, добавляя информацию о подтверждении
          await ctx.editMessageCaption(
            `${originalMessage}\n\n✅ Пост подтвержден администратором ${adminUsername}`,
            {
              reply_markup: {
                inline_keyboard: []
              }
            }
          );

          try {
            // Проверяем и очищаем userId от возможных нечисловых символов
            const cleanUserId = userId.toString().replace(/\D/g, '');
            console.log('Очищенный userId:', cleanUserId);
            
            if (!cleanUserId) {
              throw new Error('Invalid userId format');
            }

            // Преобразуем userId в BigInt с проверкой
            const telegramId = BigInt(cleanUserId);
            console.log('Преобразованный telegramId:', telegramId.toString());

            let user = await prisma.user.findUnique({
              where: { telegramId }
            });

            // Если пользователь не найден, создаем его
            if (!user) {
              console.log('Создаем нового пользователя с telegramId:', telegramId.toString());
              user = await prisma.user.create({
                data: {
                  telegramId,
                  role: 'user',
                  balance: 0
                }
              });
              console.log('Создан новый пользователь:', user);
            }

            // Обновляем баланс пользователя
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: { balance: { increment: rewardAmount } }
            });

            // Уведомляем пользователя о начислении куражиков
            await ctx.telegram.sendMessage(
              Number(cleanUserId),
              `✅ Ваш пост подтвержден!\n` +
              `Вам начислено ${rewardAmount} куражиков.\n` +
              `Ваш текущий баланс: ${updatedUser.balance} куражиков`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💰 Заработать ещё', callback_data: 'earn' }]
                  ]
                }
              }
            );
          } catch (error) {
            console.error('Ошибка при обработке userId:', error);
            console.error('Детали ошибки:', {
              originalUserId: userId,
              type: typeof userId,
              networkType: network,
              callbackData: data
            });
            await ctx.reply('Ошибка при обработке ID пользователя');
          }
        } catch (error) {
          console.error('Ошибка при подтверждении поста:', error);
          await ctx.reply('Произошла ошибка при подтверждении поста');
        }
        break;

      case /^reject_post_\d+_\w+$/.test(data):
        try {
          const [, userId, network] = data.split('_');
          const adminUsername = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
          const originalMessage = ctx.callbackQuery.message.caption;

          // Обновляем сообщение, добавляя информацию об отклонении
          await ctx.editMessageCaption(
            `${originalMessage}\n\n❌ Пост отклонен администратором ${adminUsername}`,
            {
              reply_markup: {
                inline_keyboard: [] // Убираем кнопки после отклонения
              }
            }
          );

          // Уведомляем пользователя об отклонении поста
          await ctx.telegram.sendMessage(
            userId,
            '❌ К сожалению, ваш пост не прошел проверку.\n' +
            'Пожалуйста, убедитесь, что пост соответствует требованиям и попробуйте снова.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Попробовать снова', callback_data: `post_${network}` }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при отклонении поста:', error);
          await ctx.reply('Произошла ошибка при отклонении поста');
        }
        break;

      case data === 'list_games':
        try {
          const gamesList = await prisma.game.findMany({
            orderBy: {
              date: 'asc'
            }
          });

          let listMessage = '*Список игр*\n\n';
          
          if (gamesList.length > 0) {
            gamesList.forEach(game => {
              listMessage += `🎮 ${game.title}\n`;
              listMessage += `📅 ${new Date(game.date).toLocaleDateString()}\n`;
              listMessage += `⏰ ${new Date(game.date).toLocaleTimeString()}\n`;
              listMessage += `📍 ${game.location}\n`;
              listMessage += `💰 ${game.priceRub}₽ / ${game.priceKur} куражиков\n`;
              listMessage += `👥 Мест: ${game.seats}\n\n`;
            });
          } else {
            listMessage += 'Нет запланированных игр\n';
          }

          const keyboardListGames = [
            [{ text: '➕ Добавить игру', callback_data: 'add_game' }],
            [{ text: '✏️ Редактировать игру', callback_data: 'edit_game' }],
            [{ text: '❌ Удалить игру', callback_data: 'delete_game' }],
            [{ text: '🔙 Назад', callback_data: 'manage_games' }]
          ];

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение
          await ctx.reply(listMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboardListGames
            }
          });
        } catch (error) {
          console.error('Ошибка при получении списка игр:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'edit_game':
        try {
          const gamesToEdit = await prisma.game.findMany({
            orderBy: {
              date: 'asc'
            }
          });

          if (gamesToEdit.length === 0) {
            await ctx.deleteMessage();
            return ctx.reply('Нет игр для редактирования', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_games' }]
                ]
              }
            });
          }

          let editMessage = '*Выберите игру для редактирования:*\n\n';
          
          const keyboardEditGames = gamesToEdit.map(game => ([{
            text: `${game.title} - ${new Date(game.date).toLocaleDateString()}`,
            callback_data: `edit_game_${game.id}`
          }]));

          keyboardEditGames.push([{ text: '🔙 Назад', callback_data: 'manage_games' }]);

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение со списком игр
          await ctx.reply(editMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboardEditGames
            }
          });
        } catch (error) {
          console.error('Ошибка при выборе игры для редактирования:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчики для каждого параметра редактирования
      case /^edit_game_(title|date|location|price|seats|description|image)_\d+$/.test(data):
        try {
          const [, param, gameId] = data.split('_');
          // Сохраняем данные сессии для последующего использования
          ctx.session = {
            ...ctx.session,
            editingGame: {
              id: parseInt(gameId),
              param: param
            }
          };
          
          let promptMessage;
          switch (param) {
            case 'title':
              promptMessage = 'Введите новое название игры:';
              break;
            case 'date':
              promptMessage = 'Введите новую дату и время в формате ДД.ММ.ГГГГ ЧЧ:ММ:';
              break;
            case 'location':
              promptMessage = 'Введите новое место проведения:';
              break;
            case 'price':
              promptMessage = 'Введите новую цену в формате "РУБЛИ КУРАЖИКИ" (например: "1000 2000"):';
              break;
            case 'seats':
              promptMessage = 'Введите новое количество мест:';
              break;
            case 'description':
              promptMessage = 'Введите новое описание игры:';
              break;
            case 'image':
              promptMessage = 'Отправьте новое изображение для игры:';
              break;
          }

          await ctx.scene.enter('edit_game_scene', { promptMessage });
        } catch (error) {
          console.error('Ошибка при редактировании параметра игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'delete_game':
        try {
          const gamesToDelete = await prisma.game.findMany({
            orderBy: {
              date: 'asc'
            }
          });

          if (gamesToDelete.length === 0) {
            await ctx.deleteMessage();
            return ctx.reply('Нет игр для удаления', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_games' }]
                ]
              }
            });
          }

          let deleteMessage = '*Выберите игру для удаления:*\n\n';
          gamesToDelete.forEach(game => {
            deleteMessage += `🎮 ${game.title}\n`;
            deleteMessage += `📅 ${new Date(game.date).toLocaleDateString()}\n`;
            deleteMessage += `⏰ ${new Date(game.date).toLocaleTimeString()}\n`;
            deleteMessage += `📍 ${game.location}\n\n`;
          });

          const keyboardDeleteGame = gamesToDelete.map(game => ([{
            text: `${game.title} - ${new Date(game.date).toLocaleDateString()}`,
            callback_data: `confirm_delete_game_${game.id}`
          }]));

          keyboardDeleteGame.push([{ text: '🔙 Назад', callback_data: 'manage_games' }]);

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение со списком игр
          await ctx.reply(deleteMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboardDeleteGame
            }
          });
        } catch (error) {
          console.error('Ошибка при выборе игры для удаления:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^confirm_delete_game_\d+$/.test(data):
        try {
          const gameIdToDelete = parseInt(data.split('_')[3]);
          
          // Получаем игру
          const game = await prisma.game.findUnique({
            where: { id: gameIdToDelete }
          });

          if (!game) {
            return ctx.editMessageText('Игра не найдена', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'delete_game' }]
                ]
              }
            });
          }

          // Запрашиваем подтверждение удаления
          await ctx.editMessageText(
            `❗️ Вы действительно хотите удалить игру "${game.title}"?\n` +
            `Дата: ${new Date(game.date).toLocaleDateString()}\n` +
            `Время: ${new Date(game.date).toLocaleTimeString()}\n` +
            `Место: ${game.location}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Да, удалить', callback_data: `delete_game_confirmed_${game.id}` },
                    { text: '❌ Отмена', callback_data: 'delete_game' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при подтверждении удаления игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^delete_game_confirmed_\d+$/.test(data):
        try {
          const confirmedGameId = parseInt(data.split('_')[3]);
          
          // Удаляем игру
          await prisma.game.delete({
            where: { id: confirmedGameId }
          });

          await ctx.editMessageText('✅ Игра успешно удалена', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Вернуться к управлению играм', callback_data: 'manage_games' }]
              ]
            }
          });
        } catch (error) {
          console.error('Ошибка при удалении игры:', error);
          await ctx.reply('Произошла ошибка при удалении игры. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'add_game':
        try {
          if (userRole !== 'admin' && userRole !== 'superadmin') {
            return ctx.editMessageText('У вас нет доступа к добавлению игр', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_games' }]
                ]
              }
            });
          }

          // Удаляем текущее сообщение перед входом в сцену
          await ctx.deleteMessage();
          
          // Входим в сцену добавления игры
          await ctx.scene.enter('add_game_scene');
        } catch (error) {
          console.error('Ошибка при добавлении игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'manage_events':
        require('./manageEvents')(ctx);
        break;

      case data === 'add_event':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_event_scene');
        } else {
          await ctx.reply('У вас нет доступа к созданию мероприятий');
        }
        break;

      case data === 'edit_event':
        if (userRole === 'admin' || userRole === 'superadmin') {
          require('./editEvent')(ctx);
        } else {
          await ctx.reply('У вас нет доступа к редактированию мероприятий');
        }
        break;

      case data === 'delete_event':
        if (userRole === 'admin' || userRole === 'superadmin') {
          require('./deleteEvent')(ctx);
        } else {
          await ctx.reply('У вас нет доступа к удалению мероприятий');
        }
        break;

      case /^confirm_delete_event_\d+$/.test(data):
        try {
          const eventIdToDelete = parseInt(data.split('_')[3]);
          
          // Получаем информацию о мероприятии и его участниках перед удалением
          const eventToDelete = await prisma.event.findUnique({
            where: { id: eventIdToDelete },
            include: { 
              participants: {
                select: {
                  id: true,
                  telegramId: true,
                  balance: true
                }
              }
            }
          });

          if (!eventToDelete) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          // Здесь можно добавить логику удаления участников или возврата баланса, если необходимо

          // Удаляем мероприятие
          await prisma.event.delete({
            where: { id: eventIdToDelete }
          });

          await ctx.reply('✅ Мероприятие успешно удалено', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Вернуться к управлению мероприятиями', callback_data: 'manage_events' }]
              ]
            }
          });
        } catch (error) {
          console.error('Ошибка при удалении мероприятия:', error);
          await ctx.reply('Произошла ошибка при удалении мероприятия. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^edit_event_(title|date|location|price|seats|description)_\d+$/.test(data):
        try {
          const [, paramEvent, eventId] = data.split('_');
          // Сохраняем данные в сессии для последующего использования
          ctx.session = {
            ...ctx.session,
            editingEvent: {
              id: parseInt(eventId),
              param: paramEvent
            }
          };
          
          let promptEventMessage;
          switch (paramEvent) {
            case 'title':
              promptEventMessage = 'Введите новое название мероприятия:';
              break;
            case 'date':
              promptEventMessage = 'Введите новую дату и время в формате ДД.ММ.ГГГГ ЧЧ:ММ:';
              break;
            case 'location':
              promptEventMessage = 'Введите новое место проведения:';
              break;
            case 'price':
              promptEventMessage = 'Введите новую цену в формате "РУБЛИ КУРАЖИКИ" или "0 0":';
              break;
            case 'seats':
              promptEventMessage = 'Введите новое количество мест:';
              break;
            case 'description':
              promptEventMessage = 'Введите новое описание мероприятия:';
              break;
          }

          await ctx.scene.enter('edit_event_scene', { promptMessage: promptEventMessage });
        } catch (error) {
          console.error('Ошибка при редактировании параметра мероприятия:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^register_event_\d+$/.test(data):
        try {
          const eventIdRegister = parseInt(data.split('_')[2]);
          const eventRegister = await prisma.event.findUnique({
            where: { id: eventIdRegister },
            include: { participants: true }
          });

          if (!eventRegister) {
            return ctx.reply('Мероприятие не найдено');
          }

          if (eventRegister.seats <= eventRegister.participants.length) {
            return ctx.reply('К сожалению, все места уже заняты');
          }

          // Находим пользователя
          const userRegister = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          if (!userRegister) {
            return ctx.reply('Пользователь не найден');
          }

          // Проверяем, не зарегистрирован ли уже пользователь
          const isAlreadyRegistered = eventRegister.participants.some(p => p.id === userRegister.id);
          if (isAlreadyRegistered) {
            return ctx.reply('Вы уже зарегистрированы на это мероприятие');
          }

          if (eventRegister.priceRub > 0) {
            // Если мероприятие платное, предлагаем способы оплаты
            await ctx.reply(
              `Стоимость участия: ${eventRegister.priceRub}₽ или ${eventRegister.priceKur} куражиков\n` +
              'Выберите способ оплаты:',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '💳 Оплатить деньгами', callback_data: `pay_event_money_${eventRegister.id}` },
                      { text: '💎 Оплатить куражиками', callback_data: `pay_event_kurajiki_${eventRegister.id}` }
                    ]
                  ]
                }
              }
            );
          } else {
            // Если мероприятие бесплатное, сразу регистрируем
            await prisma.event.update({
              where: { id: eventRegister.id },
              data: {
                participants: {
                  connect: { id: userRegister.id }
                }
              }
            });

            // Запрашиваем номер телефона
            await ctx.reply(
              'Для завершения регистрации, пожалуйста, поделитесь вашим номером телефона:',
              {
                reply_markup: {
                  keyboard: [
                    [{
                      text: '📱 Поделиться номером',
                      request_contact: true
                    }]
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true
                }
              }
            );

            // Уведомляем админов
            await ctx.telegram.sendMessage(
              process.env.ADMIN_CHAT_ID,
              `Новая регистрация на мероприятие!\n\n` +
              `Мероприятие: ${eventRegister.title}\n` +
              `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
              `Username: @${ctx.from.username || 'отсутствует'}`
            );
          }
        } catch (error) {
          console.error('Ошибка при регистрации на мероприятие:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^pay_event_(money|kurajiki)_\d+$/.test(data):
        try {
          const matchesPayment = data.match(/^pay_event_(money|kurajiki)_(\d+)$/);
          if (!matchesPayment) return;

          const paymentType = matchesPayment[1];
          const eventIdPayment = parseInt(matchesPayment[2]);

          // Проверяем корректность ID
          if (isNaN(eventIdPayment)) {
            console.log('Некорректный ID мероприятия:', eventIdPayment);
            await ctx.reply('Произошла ошибка. Некорректный ID мероприятия.');
            return;
          }

          // Ищем мероприятие
          const eventPayment = await prisma.event.findUnique({
            where: { 
              id: eventIdPayment 
            },
            include: { 
              creator: true,
              participants: true
            }
          });

          if (!eventPayment) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          // Находим пользователя
          const userPayment = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          if (!userPayment) {
            await ctx.reply('Пользователь не найден');
            return;
          }

          if (paymentType === 'kurajiki') {
            // Проверяем баланс
            if (userPayment.balance < eventPayment.priceKur) {
              await ctx.reply(
                'Недостаточно куражиков для участия в мероприятии.\n' +
                `Необходимо: ${eventPayment.priceKur} куражиков\n` +
                `Ваш баланс: ${userPayment.balance} куражиков`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '💰 Заработать куражики', callback_data: 'earn' }],
                      [{ text: '🔙 Вернуться к мероприятию', callback_data: `view_event_${eventPayment.id}` }]
                    ]
                  }
                }
              );
              return;
            }

            try {
              // Списываем куражики и регистрируем участника
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: userPayment.id },
                  data: { balance: { decrement: eventPayment.priceKur } }
                }),
                prisma.event.update({
                  where: { id: eventPayment.id },
                  data: {
                    participants: {
                      connect: { id: userPayment.id }
                    }
                  }
                })
              ]);

              // Запрашиваем номер телефона
              await ctx.reply(
                '✅ Оплата прошла успешно! Для завершения регистрации, пожалуйста, поделитесь вашим номером телефона:',
                {
                  reply_markup: {
                    keyboard: [
                      [{
                        text: '📱 Поделиться номером',
                        request_contact: true
                      }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                  }
                }
              );

              // Уведомляем админов
              await ctx.telegram.sendMessage(
                process.env.ADMIN_CHAT_ID,
                `💎 Новая оплата куражиками!\n\n` +
                `Мероприятие: ${eventPayment.title}\n` +
                `Сумма: ${eventPayment.priceKur} куражиков\n` +
                `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
                `Username: @${ctx.from.username || 'отсутствует'}\n` +
                `ID: ${ctx.from.id}`
              );

            } catch (transactionError) {
              console.error('Ошибка при проведении транзакции:', transactionError);
              await ctx.reply('Произошла ошибка при оплате. Пожалуйста, попробуйте позже.');
            }
          } else {
            // Оплата через Robokassa
            const isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';
            const paymentUrl = generatePaymentUrl(
              eventPayment.priceRub,
              `Оплата участия в мероприятии: ${eventPayment.title}`,
              isTestMode
            );

            await ctx.reply(
              `Для оплаты участия в мероприятии "${eventPayment.title}" перейдите по ссылке:\n` +
              `Сумма к оплате: ${eventPayment.priceRub}₽`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💳 Оплатить', url: paymentUrl }],
                    [{ text: '🔙 Вернуться к мероприятию', callback_data: `view_event_${eventPayment.id}` }]
                  ]
                }
              }
            );
          }
        } catch (error) {
          console.error('Ошибка при оплате мероприятия:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^view_event_\d+$/.test(data):
        try {
          const eventIdView = parseInt(data.split('_')[2]);
          const eventView = await prisma.event.findUnique({
            where: { id: eventIdView },
            include: { participants: true }
          });

          if (!eventView) {
            return ctx.reply('Мероприятие не найдено');
          }

          // Проверяем, зарегистрирован ли текущий пользователь
          const userView = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          const isRegisteredView = eventView.participants.some(p => p.id === userView?.id);

          const eventMessage = {
            text: `🎪 ${eventView.title}\n\n` +
                  `📝 ${eventView.description || ''}\n` +
                  `📅 ${new Date(eventView.date).toLocaleDateString()}\n` +
                  `⏰ ${new Date(eventView.date).toLocaleTimeString()}\n` +
                  `📍 ${eventView.location}\n` +
                  `👥 Свободных мест: ${eventView.seats - eventView.participants.length}\n\n` +
                  `Стоимость: ${eventView.priceRub > 0 ? `${eventView.priceRub}₽ / ${eventView.priceKur} куражиков` : 'Бесплатно'}`,
            reply_markup: {
              inline_keyboard: [
                [ 
                  { 
                    text: isRegisteredView ? '❌ Отменить запись' : '✍️ Записаться', 
                    callback_data: isRegisteredView ? `cancel_event_registration_${eventView.id}` : `register_event_${eventView.id}` 
                  } 
                ],
                [{ text: '🔙 К списку мероприятий', callback_data: 'events' }]
              ]
            }
          };

          if (eventView.imageId) {
            await ctx.replyWithPhoto(eventView.imageId, eventMessage);
          } else {
            await ctx.reply(eventMessage.text, eventMessage);
          }
        } catch (error) {
          console.error('Ошибка при просмотре мероприятия:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Добавляем новый case для обработки отмены регистрации
      case /^cancel_event_registration_\d+$/.test(data):
        try {
          const eventIdCancel = parseInt(data.split('_')[3]);
          const userCancel = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          if (!userCancel) {
            return ctx.reply('Пользователь не найден');
          }

          const eventCancel = await prisma.event.findUnique({
            where: { id: eventIdCancel },
            include: { participants: true }
          });

          if (!eventCancel) {
            return ctx.reply('Мероприятие не найдено');
          }

          // Проверяем, был ли платеж куражиками
          if (eventCancel.priceKur > 0) {
            // Возвращаем куражики пользователю
            await prisma.user.update({
              where: { id: userCancel.id },
              data: { balance: { increment: eventCancel.priceKur } }
            });
          }

          // Отменяем регистрацию
          await prisma.event.update({
            where: { id: eventCancel.id },
            data: {
              participants: {
                disconnect: { id: userCancel.id }
              }
            }
          });

          // Уведомляем админов с полной информацией
          await ctx.telegram.sendMessage(
            process.env.ADMIN_CHAT_ID,
            `❌ Отмена регистрации на мероприятие!\n\n` +
            `Мероприятие: ${eventCancel.title}\n` +
            `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}\n` +
            `ID: ${ctx.from.id}\n` +
            `Телефон: ${userCancel.phoneNumber || 'не указан'}\n` +
            (eventCancel.priceKur > 0 ? `Возвращено куражиков: ${eventCancel.priceKur}` : 'Бесплатное мероприятие')
          );

          await ctx.reply(
            '✅ Регистрация успешно отменена.\n' +
            (eventCancel.priceKur > 0 ? `💎 ${eventCancel.priceKur} куражиков возвращены на ваш баланс.\n` : '') +
            'Вы можете зарегистрироваться снова в любое время, если будут свободные места.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 К списку мероприятий', callback_data: 'events' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при отмене регистрации:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'view_event_registrations':
        try {
          const eventsRegistrations = await prisma.event.findMany({
            orderBy: {
              date: 'desc'
            }
          });

          if (eventsRegistrations.length === 0) {
            await ctx.editMessageText('Нет созданных мероприятий', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_events' }]
                ]
              }
            });
            return;
          }

          const keyboardViewRegs = eventsRegistrations.map(event => ([{
            text: `${event.title} - ${new Date(event.date).toLocaleDateString()}`,
            callback_data: `view_registrations_${event.id}`
          }]));

          keyboardViewRegs.push([{ text: '🔙 Назад', callback_data: 'manage_events' }]);

          await ctx.editMessageText('Выберите мероприятие для просмотра регистраций:', {
            reply_markup: { inline_keyboard: keyboardViewRegs }
          });
        } catch (error) {
          console.error('Ошибка при получении списка мероприятий:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^view_registrations_\d+$/.test(data):
        try {
          const eventIdViewReg = parseInt(data.split('_')[2]);
          const eventViewReg = await prisma.event.findUnique({
            where: { id: eventIdViewReg },
            include: {
              participants: {
                select: {
                  id: true,
                  telegramId: true,
                  phoneNumber: true,
                  balance: true
                }
              }
            }
          });

          if (!eventViewReg) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          if (eventViewReg.participants.length === 0) {
            await ctx.editMessageText(
              `*${eventViewReg.title}*\n\nНа данное мероприятие ещё нет регистраций.`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔙 Назад к списку мероприятий', callback_data: 'view_event_registrations' }]
                  ]
                }
              }
            );
            return;
          }

          let registrationsMessage = `*Регистрации на мероприятие: ${eventViewReg.title}*\n`;
          registrationsMessage += `📅 ${new Date(eventViewReg.date).toLocaleDateString()} ${new Date(eventViewReg.date).toLocaleTimeString()}\n\n`;
          registrationsMessage += `Всего зарегистрировано: ${eventViewReg.participants.length} из ${eventViewReg.seats}\n\n`;
          registrationsMessage += '*Список участников:*\n\n';

          // Получаем информацию о пользователях последовательно
          for (let i = 0; i < eventViewReg.participants.length; i++) {
            const participant = eventViewReg.participants[i];
            try {
              // Преобразуем BigInt в строку для работы с Telegram API
              const telegramId = participant.telegramId.toString();
              const userInfo = await ctx.telegram.getChatMember(telegramId, telegramId);
              
              registrationsMessage += `${i + 1}. ${userInfo.user.first_name} ${userInfo.user.last_name || ''}\n`;
              registrationsMessage += `👤 ID: ${telegramId}\n`;
              registrationsMessage += `${userInfo.user.username ? `@${userInfo.user.username}\n` : ''}`;
              registrationsMessage += `📱 ${participant.phoneNumber || 'Номер не указан'}\n\n`;
            } catch (userError) {
              // Если не удалось получить информацию о пользователе
              registrationsMessage += `${i + 1}. Участник\n`;
              registrationsMessage += `👤 ID: ${participant.telegramId.toString()}\n`;
              registrationsMessage += `📱 ${participant.phoneNumber || 'Номер не указан'}\n\n`;
              console.error(`Ошибка при получении информации о пользователе ${participant.telegramId}:`, userError);
            }
          }

          // Разбиваем сообщение на части, если оно слишком длинное
          const maxLength = 4096;
          if (registrationsMessage.length > maxLength) {
            const parts = registrationsMessage.match(new RegExp(`.{1,${maxLength}}`, 'g'));
            for (let i = 0; i < parts.length; i++) {
              if (i === parts.length - 1) {
                await ctx.reply(parts[i], {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🔙 Назад к списку мероприятий', callback_data: 'view_event_registrations' }]
                    ]
                  }
                });
              } else {
                await ctx.reply(parts[i], { parse_mode: 'Markdown' });
              }
            }
          } else {
            await ctx.editMessageText(registrationsMessage, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад к списку мероприятий', callback_data: 'view_event_registrations' }]
                ]
              }
            });
          }
        } catch (error) {
          console.error('Ошибка при просмотре регистраций:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'broadcast_all':
        ctx.scene.enter('broadcast_scene', { broadcastType: 'all' });
        break;

      case data === 'broadcast_partners':
        ctx.scene.enter('broadcast_scene', { broadcastType: 'partners' });
        break;

      case data === 'broadcast_qualification':
        // Показываем список квалификаций
        const qualificationKeyboardBroadcast = [
          [{ text: '👨‍💼 Предприниматель/Эксперт', callback_data: 'broadcast_qual_1' }],
          [{ text: '🎮 Игропрактик', callback_data: 'broadcast_qual_2' }],
          [{ text: '🎪 Организатор фестивалей', callback_data: 'broadcast_qual_3' }],
          [{ text: '👨‍🏫 Бизнес-тренер', callback_data: 'broadcast_qual_4' }],
          [{ text: '👔 Руководитель или HR', callback_data: 'broadcast_qual_5' }],
          [{ text: '🎯 Интересна движуха', callback_data: 'broadcast_qual_6' }],
          [{ text: '🌱 Саморазвитие', callback_data: 'broadcast_qual_7' }],
          [{ text: '🎲 Автор игр', callback_data: 'broadcast_qual_8' }],
          [{ text: '🧠 Психолог', callback_data: 'broadcast_qual_9' }],
          [{ text: '🎨 Хочу создать игру', callback_data: 'broadcast_qual_10' }],
          [{ text: '🔄 Сетевой MLM-бизнес', callback_data: 'broadcast_qual_11' }],
          [{ text: '💅 Бьюти сфера', callback_data: 'broadcast_qual_12' }],
          [{ text: '🔙 Назад', callback_data: 'broadcast' }]
        ];

        await ctx.editMessageText('Выберите квалификацию для рассылки:', {
          reply_markup: { inline_keyboard: qualificationKeyboardBroadcast }
        });
        break;

      case /^broadcast_qual_\d+$/.test(data):
        const broadcastQualNum = data.split('_')[2];
        ctx.scene.enter('broadcast_scene', { 
          broadcastType: 'qualification', 
          qualification: `qualification_${broadcastQualNum}` 
        });
        break;

      case data === 'broadcast_scheduled':
        const scheduledBroadcasts = await prisma.scheduledBroadcast.findMany({
          where: {
            isCompleted: false,
            scheduledFor: {
              gt: new Date()
            }
          },
          orderBy: {
            scheduledFor: 'asc'
          }
        });

        let scheduledMessage = '*📅 Запланированные рассылки:*\n\n';
        
        if (scheduledBroadcasts.length === 0) {
          scheduledMessage += 'Нет запланированных рассылок';
        } else {
          scheduledBroadcasts.forEach((broadcast, index) => {
            scheduledMessage += `${index + 1}. ${new Date(broadcast.scheduledFor).toLocaleString('ru-RU')}\n`;
            scheduledMessage += `Тип: ${broadcast.type}\n`;
            if (broadcast.qualification) {
              scheduledMessage += `Квалификация: ${broadcast.qualification}\n`;
            }
            scheduledMessage += '\n';
          });
        }

        const keyboardScheduled = [
          ...scheduledBroadcasts.map(broadcast => ([{
            text: `❌ Отменить (${new Date(broadcast.scheduledFor).toLocaleDateString()})`,
            callback_data: `cancel_broadcast_${broadcast.id}`
          }])),
          [{ text: '🔙 Назад', callback_data: 'broadcast' }]
        ];

        await ctx.editMessageText(scheduledMessage, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboardScheduled }
        });
        break;

      case /^cancel_broadcast_\d+$/.test(data):
        const broadcastId = parseInt(data.split('_')[2]);
        await prisma.scheduledBroadcast.delete({
          where: { id: broadcastId }
        });
        
        await ctx.reply('✅ Рассылка успешно отменена');
        await ctx.answerCbQuery();
        break;

      case data === 'help':
        try {
          const helpMessage = 
            '*❓ Помощь и поддержка*\n\n' +
            'Если у вас возникли вопросы или нужна помощь, вы можете связаться с администратором:\n\n' +
            '👨‍💼 Администратор: @Sazonovbt\n' +
            '🌐 Сайт компании: kuraj-prodaj.com\n\n' +
            'Будем рады помочь вам! 😊';

          const keyboardHelp = [
            [{ text: '📱 Написать администратору', url: 'https://t.me/Sazonovbt' }],
            [{ text: '🔙 В меню', callback_data: 'open_menu' }]
          ];

          await ctx.editMessageText(helpMessage, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboardHelp },
            disable_web_page_preview: true
          });
        } catch (error) {
          console.error('Ошибка в разделе помощи:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^set_reward_(telegram|instagram|vk|ok)$/.test(data):
        try {
          const platform = data.split('_')[2];
          
          // Сохраняем в сессии информацию о выбранной платформе
          ctx.session = {
            ...ctx.session,
            settingRewardFor: platform
          };

          // Получаем текущее значение вознаграждения
          const currentReward = await prisma.socialMediaReward.findUnique({
            where: { platform }
          });

          const setRewardMessage = 
            `*Установка вознаграждения для ${platform}*\n\n` +
            `Текущее значение: ${currentReward?.amount || 0} куражиков\n\n` +
            'Введите новое значение вознаграждения в куражиках:';

          // Входим в сцену установки вознаграждения
          await ctx.scene.enter('set_reward_scene', { message: setRewardMessage });
        } catch (error) {
          console.error('Ошибка при установке вознаграждения:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'referral_program':
        try {
          const userIdReferral = ctx.from.id;
          const userReferral = await prisma.user.findUnique({
            where: { telegramId: BigInt(userIdReferral) }
          });

          if (!userReferral) {
            return ctx.reply('Пользователь не найден');
          }

          // Получаем статистику рефералов
          const referrals = await prisma.referral.findMany({
            where: { referrerId: userReferral.id },
            include: {
              user: true
            }
          });

          // Считаем рефералов второго уровня
          const firstLevelIds = referrals.map(ref => ref.userId);
          const secondLevel = await prisma.referral.count({
            where: {
              referrerId: {
                in: firstLevelIds
              }
            }
          });

          const botUsername = process.env.BOT_USERNAME || 'studiokp_bot';
          const referralLink = `https://t.me/${botUsername}?start=${userIdReferral}`;

          let referralMessage = '👥 *Реферальная программа*\n\n';
          referralMessage += '💰 За каждого приглашенного друга:\n';
          referralMessage += '- Первый уровень: 500 куражиков\n';
          referralMessage += '- Второй уровень: 100 куражиков\n\n';
          referralMessage += '📊 *Ваша статистика:*\n';
          referralMessage += `- Рефералов 1-го уровня: ${referrals.length}\n`;
          referralMessage += `- Рефералов 2-го уровня: ${secondLevel}\n\n`;
          referralMessage += '🔗 *Ваша реферальная ссылка:*\n';
          referralMessage += `\`${referralLink}\`\n\n`;
          referralMessage += 'Скопируйте ссылку и отправьте друзьям!';

          const keyboardReferral = {
            inline_keyboard: [
              [{ text: '📋 Копировать ссылку', callback_data: 'copy_referral_link' }],
              [{ text: '📊 Статистика рефералов', callback_data: 'referral_stats' }],
              [{ text: '🔙 В меню', callback_data: 'open_menu' }]
            ]
          };

          if (ctx.callbackQuery) {
            await ctx.editMessageText(referralMessage, {
              parse_mode: 'Markdown',
              reply_markup: keyboardReferral
            });
          } else {
            await ctx.reply(referralMessage, {
              parse_mode: 'Markdown',
              reply_markup: keyboardReferral
            });
          }
        } catch (error) {
          console.error('Ошибка в реферальной программе:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'copy_referral_link':
        try {
          const userIdCopy = ctx.from.id;
          const botUsernameCopy = process.env.BOT_USERNAME || 'studiokp_bot';
          const referralLinkCopy = `https://t.me/${botUsernameCopy}?start=${userIdCopy}`;
          
          await ctx.answerCbQuery('Ссылка скопирована!');
          await ctx.reply(
            '🔗 Вот ваша реферальная ссылка:\n' +
            `\`${referralLinkCopy}\`\n\n` +
            'Отправьте её друзьям и получайте бонусы за каждого приглашенного!',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'referral_program' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при копировании реферальной ссылки:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'referral_stats':
        try {
          const userIdStats = ctx.from.id;
          const userStats = await prisma.user.findUnique({
            where: { telegramId: BigInt(userIdStats) },
            include: {
              referrals: {
                include: {
                  user: {
                    select: {
                      telegramId: true,
                      balance: true,
                      createdAt: true
                    }
                  }
                }
              }
            }
          });

          if (!userStats) {
            return ctx.reply('Пользователь не найден');
          }

          let statsMessage = '🎉 *Детальная статистика рефералов*\n\n';
          
          if (userStats.referrals.length > 0) {
            statsMessage += '*Рефералы первого уровня:*\n';
            for (const ref of userStats.referrals) {
              const earnings = ref.user.balance * (userStats.role === 'partner' ? 0.1 : 0.05);
              statsMessage += `- ID: ${ref.user.telegramId}\n`;
              statsMessage += `  Дата: ${new Date(ref.createdAt).toLocaleDateString()}\n`;
              statsMessage += `  Заработано: ${Math.floor(earnings)} куражиков\n\n`;
            }

            // Получаем рефералов второго уровня
            const firstLevelIdsStats = userStats.referrals.map(ref => ref.userId);
            const secondLevelRefsStats = await prisma.referral.findMany({
              where: {
                referrerId: {
                  in: firstLevelIdsStats
                }
              },
              include: {
                user: {
                  select: {
                    telegramId: true,
                    balance: true,
                    createdAt: true
                  }
                },
                referrer: {
                  select: {
                    telegramId: true
                  }
                }
              }
            });

            if (secondLevelRefsStats.length > 0) {
              statsMessage += '\n*Рефералы второго уровня:*\n';
              for (const ref of secondLevelRefsStats) {
                const earningsSecond = ref.user.balance * (userStats.role === 'partner' ? 0.05 : 0.025);
                statsMessage += `- ID: ${ref.user.telegramId}\n`;
                statsMessage += `  Через: ${ref.referrer.telegramId}\n`;
                statsMessage += `  Дата: ${new Date(ref.createdAt).toLocaleDateString()}\n`;
                statsMessage += `  Заработано: ${Math.floor(earningsSecond)} куражиков\n\n`;
              }
            }
          } else {
            statsMessage += 'У вас пока нет рефералов. Отправьте свою реферальную ссылку друзьям!';
          }

          await ctx.editMessageText(statsMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'referral_program' }]
              ]
            }
          });
        } catch (error) {
          console.error('Ошибка при получении статистики рефералов:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^view_game_\d+$/.test(data):
        try {
          const gameIdViewGame = parseInt(data.split('_')[2]);
          const userIdViewGame = ctx.from.id;

          const gameViewGame = await prisma.game.findUnique({
            where: { id: gameIdViewGame },
            include: {
              creator: true,
              participants: {
                select: {
                  telegramId: true,
                  phoneNumber: true,
                  role: true
                }
              }
            }
          });

          if (!gameViewGame) {
            return ctx.reply('Игра не найдена');
          }

          let messageViewGame = `🎮 *${gameViewGame.title}*\n\n`;
          messageViewGame += `📝 ${gameViewGame.description || ''}\n`;
          messageViewGame += `📅 Дата: ${new Date(gameViewGame.date).toLocaleDateString()}\n`;
          messageViewGame += `⏰ Время: ${new Date(gameViewGame.date).toLocaleTimeString()}\n`;
          messageViewGame += `📍 Место: ${gameViewGame.location}\n`;
          messageViewGame += `💰 Цена: ${gameViewGame.priceRub}₽ / ${gameViewGame.priceKur} куражиков\n`;
          messageViewGame += `👥 Свободных мест: ${gameViewGame.seats - gameViewGame.participants.length}\n\n`;

          // Показываем список участников для админов и создателя
          if (userRole === 'admin' || userRole === 'superadmin' || ctx.from.id === Number(gameViewGame.creator.telegramId)) {
            messageViewGame += '*Список участников:*\n';
            if (gameViewGame.participants.length > 0) {
              gameViewGame.participants.forEach(participant => {
                messageViewGame += `- ${participant.phoneNumber || 'Нет телефона'} (@${participant.telegramId})\n`;
              });
            } else {
              messageViewGame += 'Пока нет участников\n';
            }
          }

          const keyboardViewGame = [];
          
          // Проверяем, записан ли текущий пользователь на игру
          const isParticipantViewGame = gameViewGame.participants.some(p => Number(p.telegramId) === userIdViewGame);
          
          if (isParticipantViewGame) {
            // Если пользователь уже записан, показываем кнопку отмены
            keyboardViewGame.push([
              { text: '❌ Отменить запись', callback_data: `cancel_game_registration_${gameViewGame.id}` }
            ]);
          } else if (gameViewGame.seats > gameViewGame.participants.length) {
            // Если есть свободные места и пользователь не записан, показываем кнопки оплаты
            keyboardViewGame.push([
              { text: '💳 Оплатить рублями', callback_data: `pay_game_rub_${gameViewGame.id}` },
              { text: '💎 Оплатить куражиками', callback_data: `pay_game_kur_${gameViewGame.id}` }
            ]);
          }

          // Добавляем кнопки управления для создателя игры и админов
          if (userRole === 'admin' || userRole === 'superadmin' || ctx.from.id === Number(gameViewGame.creator.telegramId)) {
            keyboardViewGame.push([
              { text: '✏️ Редактировать', callback_data: `edit_game_${gameViewGame.id}` },
              { text: '❌ Отменить игру', callback_data: `cancel_game_${gameViewGame.id}` }
            ]);
          }

          keyboardViewGame.push([{ text: '🔙 К списку игр', callback_data: 'games' }]);

          await ctx.reply(messageViewGame, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboardViewGame }
          });
        } catch (error) {
          console.error('Ошибка при просмотре игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчик отмены регистрации на игру
      case /^cancel_game_registration_\d+$/.test(data):
        try {
          const gameIdCancelGame = parseInt(data.split('_')[3]);
          const userIdCancelGame = ctx.from.id;

          const [gameCancelGame, userCancelGame] = await Promise.all([
            prisma.game.findUnique({
              where: { id: gameIdCancelGame },
              include: {
                creator: true,
                participants: true
              }
            }),
            prisma.user.findUnique({
              where: { telegramId: BigInt(userIdCancelGame) }
            })
          ]);

          if (!gameCancelGame || !userCancelGame) {
            return ctx.reply('Игра или пользователь не найдены');
          }

          // Отключаем пользователя от игры и возвращаем куражики
          await prisma.$transaction([
            prisma.user.update({
              where: { id: userCancelGame.id },
              data: { balance: { increment: gameCancelGame.priceKur }, participatingGames: { disconnect: { id: gameCancelGame.id } } }
            }),
            // Начисляем куражики создателю игры
            prisma.user.update({
              where: { id: gameCancelGame.creatorId },
              data: { balance: { decrement: gameCancelGame.priceKur } }
            })
          ]);

          // Уведомляем пользователя
          await ctx.reply(
            `✅ Вы отменили запись на игру "${gameCancelGame.title}"\n` +
            `${gameCancelGame.priceKur} куражиков возвращены на ваш баланс.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🎮 К списку игр', callback_data: 'games' }]
                ]
              }
            }
          );

          // Уведомляем создателя игры
          await ctx.telegram.sendMessage(
            Number(gameCancelGame.creator.telegramId),
            `❌ Отмена регистрации на игру "${gameCancelGame.title}"\n` +
            `Пользователь: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}`
          );

        } catch (error) {
          console.error('Ошибка при отмене регистрации:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'view_event_registrations':
        try {
          const eventsBroadcast = await prisma.event.findMany({
            orderBy: {
              date: 'desc'
            }
          });

          if (eventsBroadcast.length === 0) {
            await ctx.editMessageText('Нет созданных мероприятий', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_events' }]
                ]
              }
            });
            return;
          }

          const keyboardViewBroadcast = eventsBroadcast.map(event => ([{
            text: `${event.title} - ${new Date(event.date).toLocaleDateString()}`,
            callback_data: `view_registrations_${event.id}`
          }]));

          keyboardViewBroadcast.push([{ text: '🔙 Назад', callback_data: 'manage_events' }]);

          await ctx.editMessageText('Выберите мероприятие для просмотра регистраций:', {
            reply_markup: { inline_keyboard: keyboardViewBroadcast }
          });
        } catch (error) {
          console.error('Ошибка при получении списка мероприятий:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case /^view_registrations_\d+$/.test(data):
        try {
          const eventIdViewReg2 = parseInt(data.split('_')[2]);
          const eventViewReg2 = await prisma.event.findUnique({
            where: { id: eventIdViewReg2 },
            include: {
              participants: {
                select: {
                  id: true,
                  telegramId: true,
                  phoneNumber: true,
                  role: true
                }
              }
            }
          });

          if (!eventViewReg2) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          if (eventViewReg2.participants.length === 0) {
            await ctx.editMessageText(
              `*${eventViewReg2.title}*\n\nНа данное мероприятие ещё нет регистраций.`, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔙 Назад к списку мероприятий', callback_data: 'view_event_registrations' }]
                  ]
                }
              }
            );
            return;
          }

          let listRegsMessage = `*Регистрации на мероприятие: ${eventViewReg2.title}*\n`;
          listRegsMessage += `📅 ${new Date(eventViewReg2.date).toLocaleDateString()} ${new Date(eventViewReg2.date).toLocaleTimeString()}\n\n`;
          listRegsMessage += `Всего зарегистрировано: ${eventViewReg2.participants.length} из ${eventViewReg2.seats}\n\n`;
          listRegsMessage += '*Список участников:*\n\n';

          // Получаем информацию о пользователях последовательно
          for (let i = 0; i < eventViewReg2.participants.length; i++) {
            const participant = eventViewReg2.participants[i];
            try {
              // Преобразуем BigInt в строку для работы с Telegram API
              const telegramId = participant.telegramId.toString();
              const userInfo = await ctx.telegram.getChatMember(telegramId, telegramId);
              
              listRegsMessage += `${i + 1}. ${userInfo.user.first_name} ${userInfo.user.last_name || ''}\n`;
              listRegsMessage += `👤 ID: ${telegramId}\n`;
              listRegsMessage += `${userInfo.user.username ? `@${userInfo.user.username}\n` : ''}`;
              listRegsMessage += `📱 ${participant.phoneNumber || 'Номер не указан'}\n\n`;
            } catch (userError) {
              // Если не удалось получить информацию о пользователе
              listRegsMessage += `${i + 1}. Участник\n`;
              listRegsMessage += `👤 ID: ${participant.telegramId.toString()}\n`;
              listRegsMessage += `📱 ${participant.phoneNumber || 'Номер не указан'}\n\n`;
              console.error(`Ошибка при получении информации о пользователе ${participant.telegramId}:`, userError);
            }
          }

          // Разбиваем сообщение на части, если оно слишком длинное
          const maxLengthRegs = 4096;
          if (listRegsMessage.length > maxLengthRegs) {
            const parts = listRegsMessage.match(new RegExp(`.{1,${maxLengthRegs}}`, 'g'));
            for (let i = 0; i < parts.length; i++) {
              if (i === parts.length - 1) {
                await ctx.reply(parts[i], {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🔙 Назад к списку мероприятий', callback_data: 'view_event_registrations' }]
                    ]
                  }
                });
              } else {
                await ctx.reply(parts[i], { parse_mode: 'Markdown' });
              }
            }
          } else {
            await ctx.editMessageText(listRegsMessage, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад к списку мероприятий', callback_data: 'view_event_registrations' }]
                ]
              }
            });
          }
        } catch (error) {
          console.error('Ошибка при просмотре регистраций:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data === 'broadcast_all':
        ctx.scene.enter('broadcast_scene', { broadcastType: 'all' });
        break;

      case data === 'broadcast_partners':
        ctx.scene.enter('broadcast_scene', { broadcastType: 'partners' });
        break;

      case data === 'broadcast_qualification':
        // Повторная обработка, обычно уже покрыта выше
        break;

      // Добавьте остальные случаи здесь по аналогии...

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