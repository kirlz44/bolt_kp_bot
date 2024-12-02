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
      await require('./menu')(ctx);
    }
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
        const qualificationNum = data.split('_')[1];
        await handleQualification(ctx, qualificationNum);
        break;

      case 'open_menu':
        try {
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          const message = 
            `*🎪 Добро пожаловать в Студию Кураж Продаж!*\n\n` +
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
        require('./spinWheel')(ctx);
        break;

      case 'marketplace':
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
      case 'show_catalog':
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

      case 'games':
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
            text: `${game.title} - ${game.date.toLocaleDateString()}`,
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

      case 'events':
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
              message += `📅 ${event.date.toLocaleDateString()}\n`;
              message += `⏰ ${event.date.toLocaleTimeString()}\n`;
              message += `📍 ${event.location}\n`;
              message += `👥 Свободных мест: ${event.seats - event.participants.length}\n`;
              message += `💰 Стоимость: ${event.priceRub > 0 ? `${event.priceRub}₽ / ${event.priceKur} куражиков` : 'Бесплатно'}\n\n`;

              keyboard.push([{ 
                text: `✍️ ${event.title} - ${event.date.toLocaleDateString()}`, 
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

      case 'add_product':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_product_scene');
        } else {
          await ctx.reply('У вас нет доступа к добавлению товаров');
        }
        break;

      case 'edit_products':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('edit_product_scene');
        } else {
          await ctx.reply('У вас нет доступа к редактированию товаров');
        }
        break;

      case 'delete_product':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const products = await prisma.product.findMany();
          const keyboard = products.map(product => ([{
            text: product.name,
            callback_data: `confirm_delete_product_${product.id}`
          }]));
          keyboard.push([{ text: '🔙 Отмена', callback_data: 'manage_products' }]);
          
          await ctx.reply('Выберите товар для удаления:', {
            reply_markup: { inline_keyboard: keyboard }
          });
        } else {
          await ctx.reply('У вас нет доступа к удалению товаров');
        }
        break;

      case data.match(/^confirm_delete_product_(\d+)/)?.[0]:
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

      case 'list_products':
        try {
          const products = await prisma.product.findMany();
          let message = '*📋 Список товаров*\n\n';
          
          if (products.length > 0) {
            products.forEach(product => {
              message += `📦 *${product.name}*\n`;
              message += `📝 ${product.description}\n`;
              message += `💰 Цена: ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
              message += `📊 На складе: ${product.stock} шт.\n\n`;
            });
          } else {
            message += 'Товары отсутствуют';
          }
          
          await ctx.reply(message, {
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
      case data.match(/^buy_product_kurajiki_(\d+)/)?.[0]:
        const buyProductId = parseInt(data.split('_')[3]);
        await require('./buyProductWithKurajiki')(ctx, buyProductId);
        break;

      // Обработчик подтверждения выдачи товара
      case data.match(/^product_given_(\d+)_(\d+)/)?.[0]:
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

      case 'add_wheel_prize':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_wheel_prize_scene');
        } else {
          await ctx.reply('У вас нет доступа к управлению призами');
        }
        break;

      case 'list_wheel_prizes':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const prizes = await prisma.wheelPrize.findMany({
            where: { active: true }
          });
          
          let message = '*Список призов колеса фортуны:*\n\n';
          let totalProbability = 0;
          
          prizes.forEach(prize => {
            message += `🎁 ${prize.name}\n`;
            message += `Верятность: ${prize.probability}%\n\n`;
            totalProbability += prize.probability;
          });
          
          message += `\nОбщая сумма вероятностей: ${totalProbability}%`;
          
          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'manage_wheel' }]
              ]
            }
          });
        } else {
          await ctx.reply('У вас нет доступа к упрвению призами');
        }
        break;

      case 'delete_wheel_prize':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const prizes = await prisma.wheelPrize.findMany({
            where: { active: true }
          });
          
          if (prizes.length === 0) {
            return ctx.editMessageText('Нет активных призов для удаления', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_wheel' }]
                ]
              }
            });
          }

          const keyboard = prizes.map(prize => [{
            text: `${prize.name} (${prize.probability}%)`,
            callback_data: `delete_prize_${prize.id}`
          }]);

          keyboard.push([{ text: '🔙 Назад', callback_data: 'manage_wheel' }]);

          await ctx.editMessageText('Выберите приз для удаления:', {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } else {
          await ctx.reply('У вас нет доступа к управлению призами');
        }
        break;

      case data.match(/^delete_prize_(\d+)/)?.[0]:
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

      case data.match(/^prize_given_(\d+)/)?.[0]:
        if (userRole === 'admin' || userRole === 'superadmin') {
          const winnerTelegramId = data.split('_')[2];
          const adminUsername = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
          
          // Обновляем сообщение, добавляя информацию о выдаче приза
          await ctx.editMessageText(
            ctx.update.callback_query.message.text + 
            `\n\n✅ Приз выдан администрором ${adminUsername}`
          );

          // Уведомляем победителя
          await ctx.telegram.sendMessage(
            winnerTelegramId,
            '🎁 Ваш специальный приз гото к выдаче! Администратор свяжется с вами в ближайшее время.'
          );
        }
        break;

      case 'earn':
        require('./earn')(ctx);
        break;

      case data.match(/^post_(vk|instagram|telegram|ok)$/)?.[0]:
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

      case data.match(/^approve_post_(\d+)_([a-z]+)$/)?.[0]:
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
            where: { platform: network }
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
              cleanUserId,
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

      case data.match(/^reject_post_(\d+)_(\w+)/)?.[0]:
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

      case 'list_games':
        try {
          const games = await prisma.game.findMany({
            orderBy: {
              date: 'asc'
            }
          });

          let message = '*Список игр*\n\n';
          
          if (games.length > 0) {
            games.forEach(game => {
              message += `🎮 ${game.title}\n`;
              message += `📅 ${game.date.toLocaleDateString()}\n`;
              message += `⏰ ${game.date.toLocaleTimeString()}\n`;
              message += `📍 ${game.location}\n`;
              message += `💰 ${game.priceRub}₽ / ${game.priceKur} куражиков\n`;
              message += `👥 Мест: ${game.seats}\n\n`;
            });
          } else {
            message += 'Нет запланированных игр\n';
          }

          const keyboard = [
            [{ text: '➕ Добавить игру', callback_data: 'add_game' }],
            [{ text: '✏️ Редактировать игру', callback_data: 'edit_game' }],
            [{ text: '❌ Удалить игру', callback_data: 'delete_game' }],
            [{ text: '🔙 Назад', callback_data: 'manage_games' }]
          ];

          // Сначала удалм текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (error) {
          console.error('Ошибка при поучении списка игр:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case 'edit_game':
        try {
          const games = await prisma.game.findMany({
            orderBy: {
              date: 'asc'
            }
          });

          if (games.length === 0) {
            await ctx.deleteMessage();
            return ctx.reply('Нет игр для редактирования', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_games' }]
                ]
              }
            });
          }

          let message = '*Выберите игру для редактирования:*\n\n';
          
          const keyboard = games.map(game => ([{
            text: `${game.title} - ${game.date.toLocaleDateString()}`,
            callback_data: `edit_game_${game.id}`
          }]));

          keyboard.push([{ text: '🔙 Назад', callback_data: 'manage_games' }]);

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение со списком игр
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (error) {
          console.error('Ошибка при выборе игры для редактирования:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^edit_game_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[2]);
          const game = await prisma.game.findUnique({
            where: { id: gameId }
          });

          if (!game) {
            return ctx.editMessageText('Игра не найдена', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'edit_game' }]
                ]
              }
            });
          }

          // Показываем параметры игры, которые можно отредактировать
          const editMessage = 
            `*Редактирование игры:* ${game.title}\n\n` +
            'Выберите параметр для редактирования:';

          const editKeyboard = [
            [{ text: '📝 Название', callback_data: `edit_game_title_${gameId}` }],
            [{ text: '📅 Дата и время', callback_data: `edit_game_date_${gameId}` }],
            [{ text: '📍 Место проведения', callback_data: `edit_game_location_${gameId}` }],
            [{ text: '💰 Цена', callback_data: `edit_game_price_${gameId}` }],
            [{ text: '🔢 Количество мест', callback_data: `edit_game_seats_${gameId}` }],
            [{ text: '📝 Описание', callback_data: `edit_game_description_${gameId}` }],
            [{ text: '🖼 Изображение', callback_data: `edit_game_image_${gameId}` }],
            [{ text: '🔙 Назад', callback_data: 'edit_game' }]
          ];

          await ctx.editMessageText(editMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: editKeyboard
            }
          });

        } catch (error) {
          console.error('Ошибка при редактировании игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчики для каждого параметра редактирования
      case data.match(/^edit_game_(title|date|location|price|seats|description|image)_\d+/)?.[0]:
        try {
          const [, , param, gameId] = data.split('_');
          // Сохраняем днные  сеии для последующего использования
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

      case 'delete_game':
        try {
          const games = await prisma.game.findMany({
            orderBy: {
              date: 'asc'
            }
          });

          if (games.length === 0) {
            await ctx.deleteMessage();
            return ctx.reply('Нет игр для удаления', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_games' }]
                ]
              }
            });
          }

          let message = '*Выберите игру для удаления:*\n\n';
          games.forEach(game => {
            message += `🎮 ${game.title}\n`;
            message += `📅 ${game.date.toLocaleDateString()}\n`;
            message += `⏰ ${game.date.toLocaleTimeString()}\n`;
            message += `📍 ${game.location}\n\n`;
          });

          const keyboard = games.map(game => ([{
            text: `${game.title} - ${game.date.toLocaleDateString()}`,
            callback_data: `confirm_delete_game_${game.id}`
          }]));

          keyboard.push([{ text: '🔙 Назад', callback_data: 'manage_games' }]);

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем новое сообщение со списком игр
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (error) {
          console.error('Ошибка при выборе игры для удаления:', error);
          await ctx.reply('Приошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^confirm_delete_game_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[3]);
          const game = await prisma.game.findUnique({
            where: { id: gameId }
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
            `Дата: ${game.date.toLocaleDateString()}\n` +
            `Время: ${game.date.toLocaleTimeString()}\n` +
            `Место: ${game.location}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Да, удалить', callback_data: `delete_game_confirmed_${gameId}` },
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

      case data.match(/^delete_game_confirmed_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[3]);
          
          // Удаляем игру
          await prisma.game.delete({
            where: { id: gameId }
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

      case 'add_game':
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

      case 'manage_events':
        require('./manageEvents')(ctx);
        break;

      case 'add_event':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_event_scene');
        } else {
          await ctx.reply('У вас нет доступа к созданию мероприятий');
        }
        break;

      case 'edit_event':
        if (userRole === 'admin' || userRole === 'superadmin') {
          require('./editEvent')(ctx);
        } else {
          await ctx.reply('У вас нет доступа к редактированию мероприятий');
        }
        break;

      case 'delete_event':
        if (userRole === 'admin' || userRole === 'superadmin') {
          require('./deleteEvent')(ctx);
        } else {
          await ctx.reply('У вас нет доступа к удалению мероприятий');
        }
        break;

      case data.match(/^confirm_delete_event_(\d+)/)?.[0]:
        try {
          const eventId = parseInt(data.split('_')[3]);
          
          // Получаем информацию о мероприятии и его участниках перед удалением
          const event = await prisma.event.findUnique({
            where: { id: eventId },
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

          if (!event) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          // Обрабатываем каждого участника перед удалением мероприятия
          for (const participant of event.participants) {
            try {
              // Если мероприятие платное, возвращаем куражики
              if (event.priceKur > 0) {
                await prisma.user.update({
                  where: { id: participant.id },
                  data: { 
                    balance: { increment: event.priceKur } 
                  }
                });
              }

              // Отправляем уведомление участнику
              await ctx.telegram.sendMessage(
                participant.telegramId.toString(),
                `❌ Важное уведомление!\n\n` +
                `Мероприятие "${event.title}" отменено.\n` +
                `📅 Дата: ${event.date.toLocaleDateString()}\n` +
                `⏰ Время: ${event.date.toLocaleTimeString()}\n` +
                `📍 Место: ${event.location}\n` +
                (event.priceKur > 0 ? 
                  `\n💎 ${event.priceKur} куражиков возвращены на ваш баланс.\n` : '') +
                  '\nПриносим извинения за доставленные неудобства.'
              );
            } catch (error) {
              console.error(`Ошибка при обработке участника ${participant.telegramId}:`, error);
            }
          }

          // После обработки всех участников удаляем мероприятие
          await prisma.event.delete({
            where: { id: eventId }
          });

          // Отправляем подтверждение администратору
          await ctx.editMessageText(
            `✅ Мероприятие "${event.title}" успешно удалено\n` +
            `Уведомлено участников: ${event.participants.length}\n` +
            (event.priceKur > 0 ? 
              `Возвращено куражиков каждому: ${event.priceKur}\n` : ''),
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Вернуться к управлению мероприятиями', callback_data: 'manage_events' }]
                ]
              }
            }
          );

        } catch (error) {
          console.error('Ошибка при удалении мероприятия:', error);
          await ctx.reply('Произошла ошибка при удалении мерприятия. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^edit_event_(title|date|location|price|seats|description)_(\d+)/)?.[0]:
        try {
          const [, param, eventId] = data.split('_');
          // Сохраняем данные в сессии для последующего использования
          ctx.session = {
            ...ctx.session,
            editingEvent: {
              id: parseInt(eventId),
              param: param
            }
          };
          
          let promptMessage;
          switch (param) {
            case 'title':
              promptMessage = 'Введите новое название мероприятия:';
              break;
            case 'date':
              promptMessage = 'Введите новую дату и время в формате ДД.ММ.ГГГГ ЧЧ:ММ:';
              break;
            case 'location':
              promptMessage = 'Введите новое место проведения:';
              break;
            case 'price':
              promptMessage = 'Введите новую цену в формате "РУБЛИ КУРАЖИКИ" или "0 0":';
              break;
            case 'seats':
              promptMessage = 'Введите новое количество мест:';
              break;
            case 'description':
              promptMessage = 'Введите новое описание мероприятия:';
              break;
          }

          await ctx.scene.enter('edit_event_scene', { promptMessage });
        } catch (error) {
          console.error('Ошибка при редактировании параметра мероприятия:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^register_event_(\d+)/)?.[0]:
        try {
          const eventId = parseInt(data.split('_')[2]);
          const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { participants: true }
          });

          if (!event) {
            return ctx.reply('Мероприятие не найдено');
          }

          if (event.seats <= event.participants.length) {
            return ctx.reply('К сожалению, все места уже заняты');
          }

          // Находим пользователя
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          if (!user) {
            return ctx.reply('Пользователь не найден');
          }

          // Проверяем, не зарегистрирован ли уже пользователь
          const isAlreadyRegistered = event.participants.some(p => p.id === user.id);
          if (isAlreadyRegistered) {
            return ctx.reply('Вы уже зарегистрированы на это мероприятие');
          }

          if (event.priceRub > 0) {
            // Если мероприятие платное, предлагаем способы оплаты
            await ctx.reply(
              `Стоимость участия: ${event.priceRub}₽ или ${event.priceKur} куражиков\n` +
              'Выберите способ оплаты:',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '💳 Оплатить деньгами', callback_data: `pay_event_money_${eventId}` },
                      { text: '💎 Оплатить куражиками', callback_data: `pay_event_kurajiki_${eventId}` }
                    ]
                  ]
                }
              }
            );
          } else {
            // Если мероприятие бесплатное, сразу регистрируем
            await prisma.event.update({
              where: { id: eventId },
              data: {
                participants: {
                  connect: { id: user.id }
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
              ` Новая регистрация на мероприятие!\n\n` +
              `Мероприятие: ${event.title}\n` +
              `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
              `Username: @${ctx.from.username || 'отсутствует'}`
            );
          }
        } catch (error) {
          console.error('Ошибка при регистрации на мероприятие:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^pay_event_(money|kurajiki)_(\d+)/)?.[0]:
        try {
          // Правильно разбираем callback_data
          const eventId = parseInt(data.match(/^pay_event_(?:money|kurajiki)_(\d+)/)[1]);
          const paymentType = data.includes('money') ? 'money' : 'kurajiki';

          // Проверяем корректноть ID
          if (isNaN(eventId)) {
            console.log('Некорректный ID мероприятия:', eventId);
            await ctx.reply('Произошла ошибка. Некорректный ID мероприятия.');
            return;
          }

          // Ищем мероприятие
          const event = await prisma.event.findUnique({
            where: { 
              id: eventId 
            },
            include: { 
              creator: true,
              participants: true
            }
          });

          if (!event) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          // Находим пользователя
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          if (!user) {
            await ctx.reply('Пользователь не найден');
            return;
          }

          if (paymentType === 'kurajiki') {
            // Проверяем баланс
            if (user.balance < event.priceKur) {
              await ctx.reply(
                'Недостаточно куражиков для участия в мероприятии.\n' +
                `Необходимо: ${event.priceKur} куражиков\n` +
                `Ваш баланс: ${user.balance} куражиков`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '💰 Заработать куражики', callback_data: 'earn' }],
                      [{ text: '🔙 Вернуться к мероприятию', callback_data: `view_event_${eventId}` }]
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
                  where: { id: user.id },
                  data: { balance: { decrement: event.priceKur } }
                }),
                prisma.event.update({
                  where: { id: eventId },
                  data: {
                    participants: {
                      connect: { id: user.id }
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
                `Мероприятие: ${event.title}\n` +
                `Сумма: ${event.priceKur} куражиков\n` +
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
              event.priceRub,
              `Оплата участия в мероприятии: ${event.title}`,
              isTestMode
            );

            await ctx.reply(
              `Для оплаты участия в мероприятии "${event.title}" перейдите по ссылке:\n` +
              `Сумма к оплате: ${event.priceRub}₽`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💳 Оплатить', url: paymentUrl }],
                    [{ text: '🔙 Вернуться к меоприятию', callback_data: `view_event_${eventId}` }]
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

      case data.match(/^view_event_(\d+)/)?.[0]:
        try {
          const eventId = parseInt(data.split('_')[2]);
          const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { participants: true }
          });

          if (!event) {
            return ctx.reply('Мероприятие не найдено');
          }

          // Проверяем, зарегистрирован ли текущий пользователь
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          const isRegistered = event.participants.some(p => p.id === user?.id);

          const message = {
            text: `🎪 ${event.title}\n\n` +
                  `📝 ${event.description || ''}\n` +
                  `📅 ${event.date.toLocaleDateString()}\n` +
                  `⏰ ${event.date.toLocaleTimeString()}\n` +
                  `📍 ${event.location}\n` +
                  `👥 Свободных мест: ${event.seats - event.participants.length}\n\n` +
                  `Стоимость: ${event.priceRub > 0 ? `${event.priceRub}₽ / ${event.priceKur} куражиков` : 'Бесплатно'}`,
            reply_markup: {
              inline_keyboard: [
                // Показываем разные кнопки в зависимости от статуса регистрации
                [{ 
                  text: isRegistered ? '❌ Отменить запись' : '✍️ Записаться', 
                  callback_data: isRegistered ? `cancel_event_registration_${event.id}` : `register_event_${event.id}` 
                }],
                [{ text: '🔙 К списку мероприятий', callback_data: 'events' }]
              ]
            }
          };

          if (event.imageId) {
            await ctx.replyWithPhoto(event.imageId, message);
          } else {
            await ctx.reply(message.text, message);
          }
        } catch (error) {
          console.error('Ошибка при просмотре мероприятия:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Добавляем новый case для обработки отмены регистрации
      case data.match(/^cancel_event_registration_(\d+)/)?.[0]:
        try {
          const eventId = parseInt(data.split('_')[3]);
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(ctx.from.id) }
          });

          if (!user) {
            return ctx.reply('Пользователь не найден');
          }

          const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { participants: true }
          });

          if (!event) {
            return ctx.reply('Мероприятие не найдено');
          }

          // Проверяем, был ли платеж куражиками
          if (event.priceKur > 0) {
            // Возвращаем куражики пользователю
            await prisma.user.update({
              where: { id: user.id },
              data: { balance: { increment: event.priceKur } }
            });
          }

          // Отменяем регистрацию
          await prisma.event.update({
            where: { id: eventId },
            data: {
              participants: {
                disconnect: { id: user.id }
              }
            }
          });

          // Уведомляем админов с полной информацией
          await ctx.telegram.sendMessage(
            process.env.ADMIN_CHAT_ID,
            `❌ Отмена регистрации на мероприятие!\n\n` +
            `Мероприятие: ${event.title}\n` +
            `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}\n` +
            `ID: ${ctx.from.id}\n` +
            `Телефон: ${user.phoneNumber || 'не указан'}\n` +
            (event.priceKur > 0 ? `Возвращено куражиков: ${event.priceKur}` : 'Бесплатное мероприятие')
          );

          await ctx.reply(
            '✅ Регистрация успешно отменена.\n' +
            (event.priceKur > 0 ? `💎 ${event.priceKur} куражиков возвращены на ваш баланс.\n` : '') +
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

      case 'view_event_registrations':
        try {
          const events = await prisma.event.findMany({
            orderBy: {
              date: 'desc'
            }
          });

          if (events.length === 0) {
            await ctx.editMessageText('Нет созданных мероприятий', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'manage_events' }]
                ]
              }
            });
            return;
          }

          const keyboard = events.map(event => ([{
            text: `${event.title} - ${event.date.toLocaleDateString()}`,
            callback_data: `view_registrations_${event.id}`
          }]));

          keyboard.push([{ text: '🔙 Назад', callback_data: 'manage_events' }]);

          await ctx.editMessageText('Выберите мероприятие для просмотра регистраций:', {
            reply_markup: { inline_keyboard: keyboard }
          });
        } catch (error) {
          console.error('Ошибка при получении списка мероприятий:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^view_registrations_(\d+)/)?.[0]:
        try {
          const eventId = parseInt(data.split('_')[2]);
          const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
              participants: {
                select: {
                  id: true,
                  telegramId: true,
                  phoneNumber: true,
                  role: true,
                  balance: true
                }
              }
            }
          });

          if (!event) {
            await ctx.reply('Мероприятие не найдено');
            return;
          }

          if (event.participants.length === 0) {
            await ctx.editMessageText(
              `*${event.title}*\n\nНа данное мероприятие ещё нет регистраций.`, {
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

          let message = `*Регистрации на мероприятие: ${event.title}*\n`;
          message += `📅 ${event.date.toLocaleDateString()} ${event.date.toLocaleTimeString()}\n\n`;
          message += `Всего зарегистрировано: ${event.participants.length} из ${event.seats}\n\n`;
          message += '*Список участников:*\n\n';

          // Получаем информацию о пользователях последовательно
          for (let i = 0; i < event.participants.length; i++) {
            const participant = event.participants[i];
            try {
              // Преобразуем BigInt в строку для работы с Telegram API
              const telegramId = participant.telegramId.toString();
              const userInfo = await ctx.telegram.getChatMember(telegramId, telegramId);
              
              message += `${i + 1}. ${userInfo.user.first_name} ${userInfo.user.last_name || ''}\n`;
              message += `👤 ID: ${telegramId}\n`;
              message += `${userInfo.user.username ? `@${userInfo.user.username}\n` : ''}`;
              message += `📱 ${participant.phoneNumber || 'Номер не указан'}\n\n`;
            } catch (userError) {
              // Если не удалось получить информацию о пользователе
              message += `${i + 1}. Участник\n`;
              message += `👤 ID: ${participant.telegramId.toString()}\n`;
              message += `📱 ${participant.phoneNumber || 'Номер не указан'}\n\n`;
              console.error(`Ошибка при получении информации о пользователе ${participant.telegramId}:`, userError);
            }
          }

          // Разбиваем сообщение на части, если оно слишком длинное
          const maxLength = 4096;
          if (message.length > maxLength) {
            const parts = message.match(new RegExp(`.{1,${maxLength}}`, 'g'));
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
            await ctx.editMessageText(message, {
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

      case 'broadcast_all':
        ctx.scene.enter('broadcast_scene', { broadcastType: 'all' });
        break;

      case 'broadcast_partners':
        ctx.scene.enter('broadcast_scene', { broadcastType: 'partners' });
        break;

      case 'broadcast_qualification':
        // Показываем список квалификаций
        const qualificationKeyboard = [
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
          reply_markup: { inline_keyboard: qualificationKeyboard }
        });
        break;

      case data.match(/^broadcast_qual_(\d+)/)?.[0]:
        const broadcastQualNum = data.split('_')[2];
        ctx.scene.enter('broadcast_scene', { 
          broadcastType: 'qualification', 
          qualification: `qualification_${broadcastQualNum}` 
        });
        break;

      case 'broadcast_scheduled':
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

        let message = '*📅 Запланированные рассылки:*\n\n';
        
        if (scheduledBroadcasts.length === 0) {
          message += 'Нет запланированных рассылок';
        } else {
          scheduledBroadcasts.forEach((broadcast, index) => {
            message += `${index + 1}. ${broadcast.scheduledFor.toLocaleString('ru-RU')}\n`;
            message += `Тип: ${broadcast.type}\n`;
            if (broadcast.qualification) {
              message += `Квалификация: ${broadcast.qualification}\n`;
            }
            message += '\n';
          });
        }

        const keyboard = [
          ...scheduledBroadcasts.map(broadcast => ([{
            text: `❌ Отменить (${broadcast.scheduledFor.toLocaleDateString()})`,
            callback_data: `cancel_broadcast_${broadcast.id}`
          }])),
          [{ text: '🔙 Назад', callback_data: 'broadcast' }]
        ];

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        break;

      case data.match(/^cancel_broadcast_(\d+)/)?.[0]:
        const broadcastId = parseInt(data.split('_')[2]);
        await prisma.scheduledBroadcast.delete({
          where: { id: broadcastId }
        });
        
        await ctx.reply('✅ Рассылка успешно отменена');
        await ctx.answerCbQuery();
        break;

      case 'help':
        try {
          const message = 
            '*❓ Помощь и поддержка*\n\n' +
            'Если у вас возникли вопросы или нужна помощь, вы можете связаться с администратором:\n\n' +
            '👨‍💼 Администратор: @Sazonovbt\n' +
            '🌐 Сайт компании: kuraj-prodaj.com\n\n' +
            'Будем рады помочь вам! 😊';

          const keyboard = [
            [{ text: '📱 Написать администратору', url: 'https://t.me/Sazonovbt' }],
            [{ text: '🔙 В меню', callback_data: 'open_menu' }]
          ];

          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard },
            disable_web_page_preview: true
          });
        } catch (error) {
          console.error('Ошибка в разделе помощи:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^set_reward_(telegram|instagram|vk|ok)$/)?.[0]:
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

          const message = 
            `*Установка вознаграждения для ${platform}*\n\n` +
            `Текущее значение: ${currentReward?.amount || 0} куражиков\n\n` +
            'Введите новое значение вознаграждения в куражиках:';

          // Входим в сцену установки вознаграждения
          await ctx.scene.enter('set_reward_scene', { message });
        } catch (error) {
          console.error('Ошибка при установке вознаграждения:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case 'referral_program':
        try {
          const userId = ctx.from.id;
          const user = await prisma.user.findUnique({
            where: { telegramId: userId }
          });

          if (!user) {
            return ctx.reply('Пользователь не найден');
          }

          // Получаем статистику рефералов
          const referrals = await prisma.referral.findMany({
            where: { referrerId: user.id },
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
          const referralLink = `https://t.me/${botUsername}?start=${userId}`;

          let message = '👥 *Реферальная программа*\n\n';
          message += '💰 За каждого приглашенного друга:\n';
          message += '- Первый уровень: 500 куражиков\n';
          message += '- Второй уровень: 100 куражиков\n\n';
          message += '📊 *Ваша статистика:*\n';
          message += `- Рефералов 1-го уровня: ${referrals.length}\n`;
          message += `- Рефералов 2-го уровня: ${secondLevel}\n\n`;
          message += '🔗 *Ваша реферальная ссылка:*\n';
          message += `\`${referralLink}\`\n\n`;
          message += 'Скопируйте ссылку и отправьте друзьям!';

          const keyboard = {
            inline_keyboard: [
              [{ text: '📋 Копировать ссылку', callback_data: 'copy_referral_link' }],
              [{ text: '📊 Статистика рефералов', callback_data: 'referral_stats' }],
              [{ text: '🔙 В меню', callback_data: 'open_menu' }]
            ]
          };

          if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } else {
            await ctx.reply(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          }
        } catch (error) {
          console.error('Ошибка в реферальной программе:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case 'copy_referral_link':
        try {
          const userId = ctx.from.id;
          const botUsername = process.env.BOT_USERNAME || 'studiokp_bot';
          const referralLink = `https://t.me/${botUsername}?start=${userId}`;
          
          await ctx.answerCbQuery('Ссылка скопирована!');
          await ctx.reply(
            '🔗 Вот ваша реферальная ссылка:\n' +
            `\`${referralLink}\`\n\n` +
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

      case 'referral_stats':
        try {
          const userId = ctx.from.id;
          const user = await prisma.user.findUnique({
            where: { telegramId: userId },
            include: {
              referrals: {
                include: {
                  user: true
                }
              }
            }
          });

          if (!user) {
            return ctx.reply('Пользователь не найден');
          }

          let message = '📊 *Детальная статистика рефералов*\n\n';
          
          if (user.referrals.length > 0) {
            message += '*Рефералы первого уровня:*\n';
            for (const ref of user.referrals) {
              const refUser = ref.user;
              message += `- ${refUser.telegramId} (${new Date(ref.createdAt).toLocaleDateString()})\n`;
            }

            // Получаем рефералов второго уровня
            const firstLevelIds = user.referrals.map(ref => ref.userId);
            const secondLevelRefs = await prisma.referral.findMany({
              where: {
                referrerId: {
                  in: firstLevelIds
                }
              },
              include: {
                user: true
              }
            });

            if (secondLevelRefs.length > 0) {
              message += '\n*Рефералы второго уровня:*\n';
              for (const ref of secondLevelRefs) {
                message += `- ${ref.user.telegramId} (${new Date(ref.createdAt).toLocaleDateString()})\n`;
              }
            }
          } else {
            message += 'У вас пока нет рефералов. Отправьте свою реферальную ссылку друзьям!';
          }

          await ctx.editMessageText(message, {
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

      case data.match(/^view_game_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[2]);
          const userId = ctx.from.id;

          const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
              creator: true,
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

          if (!game) {
            return ctx.reply('Игра не найдена');
          }

          let message = `🎮 *${game.title}*\n\n`;
          message += `📝 ${game.description}\n`;
          message += `📅 Дата: ${game.date.toLocaleDateString()}\n`;
          message += `⏰ Время: ${game.date.toLocaleTimeString()}\n`;
          message += `📍 Место: ${game.location}\n`;
          message += `💰 Цена: ${game.priceRub}₽ / ${game.priceKur} куражиков\n`;
          message += `👥 Свободных мест: ${game.seats - game.participants.length}\n\n`;

          // Показываем список участников для админов и создателя
          if (userRole === 'admin' || userRole === 'superadmin' || ctx.from.id === Number(game.creator.telegramId)) {
            message += '*Список участников:*\n';
            if (game.participants.length > 0) {
              game.participants.forEach(participant => {
                message += `- ${participant.phoneNumber || 'Нет телефона'} (@${participant.telegramId})\n`;
              });
            } else {
              message += 'Пока нет участников\n';
            }
          }

          const keyboard = [];
          
          // Проверяем, записан ли текущий пользователь на игру
          const isParticipant = game.participants.some(p => Number(p.telegramId) === userId);
          
          if (isParticipant) {
            // Если пользователь уже записан, показываем кнопку отмены
            keyboard.push([
              { text: '❌ Отменить запись', callback_data: `cancel_game_registration_${game.id}` }
            ]);
          } else if (game.seats > game.participants.length) {
            // Если есть свободные места и пользователь не записан, показываем кнопки оплаты
            keyboard.push([
              { text: '💳 Оплатить рублями', callback_data: `pay_game_rub_${game.id}` },
              { text: '💎 Оплатить куражиками', callback_data: `pay_game_kur_${game.id}` }
            ]);
          }

          // Добавляем кнопки управления для создателя игры и админов
          if (userRole === 'admin' || userRole === 'superadmin' || ctx.from.id === Number(game.creator.telegramId)) {
            keyboard.push([
              { text: '✏️ Редактировать', callback_data: `edit_game_${game.id}` },
              { text: '❌ Отменить игру', callback_data: `cancel_game_${game.id}` }
            ]);
          }

          keyboard.push([{ text: '🔙 К списку игр', callback_data: 'games' }]);

          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          });
        } catch (error) {
          console.error('Ошибка при просмотре игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчик отмены регистрации на игру
      case data.match(/^cancel_game_registration_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[3]);
          const userId = ctx.from.id;

          const [game, user] = await Promise.all([
            prisma.game.findUnique({
              where: { id: gameId },
              include: {
                creator: true,
                participants: true
              }
            }),
            prisma.user.findUnique({
              where: { telegramId: userId }
            })
          ]);

          if (!game || !user) {
            return ctx.reply('Игра или пользователь не найдены');
          }

          // Отключаем пользователя от игры и возвращаем куражики
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: {
                balance: { increment: game.priceKur },
                participatingGames: {
                  disconnect: { id: game.id }
                }
              }
            }),
            // Снимаем куражики у создателя игры
            prisma.user.update({
              where: { id: game.creatorId },
              data: { balance: { decrement: game.priceKur } }
            })
          ]);

          // Уведомляем пользователя
          await ctx.reply(
            `✅ Вы отменили запись на игру "${game.title}"\n` +
            `${game.priceKur} куражиков возвращены на ваш баланс.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🎮 К списку игр', callback_data: 'games' }]
                ]
              }
            }
          );

          // Уведомляем создателя игры
          await ctx.telegram.sendMessage(
            Number(game.creator.telegramId),
            `❌ Отмена регистрации на игру "${game.title}"\n` +
            `Пользователь: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}`
          );

        } catch (error) {
          console.error('Ошибка при отмене регистрации:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обновляем обработчик списка игр в админской панели
      case 'manage_games':
        try {
          const games = await prisma.game.findMany({
            include: {
              creator: true,
              participants: {
                select: {
                  telegramId: true,
                  phoneNumber: true
                }
              }
            },
            orderBy: {
              date: 'asc'
            }
          });

          let message = '*Управление играми*\n\n';
          
          if (games.length > 0) {
            games.forEach(game => {
              message += `🎮 *${game.title}*\n`;
              message += `📅 ${game.date.toLocaleDateString()} ${game.date.toLocaleTimeString()}\n`;
              message += `📍 ${game.location}\n`;
              message += `💰 ${game.priceRub}₽ / ${game.priceKur} куражиков\n`;
              message += `👥 Участников: ${game.participants.length}/${game.seats}\n\n`;
            });
          } else {
            message += 'Нет созданных игр\n';
          }

          const keyboard = [
            [{ text: '➕ Создать игру', callback_data: 'create_game' }]
          ];

          // Добавляем кнопки для каждой игры
          games.forEach(game => {
            keyboard.push([{ 
              text: `📋 ${game.title} (${game.participants.length}/${game.seats})`, 
              callback_data: `view_game_${game.id}` 
            }]);
          });

          keyboard.push([{ text: '🔙 Назад', callback_data: 'admin_panel' }]);

          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          });
        } catch (error) {
          console.error('Ошибка при управлении играми:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      // Обработчик оплаты игры куражиками
      case data.match(/^pay_game_kur_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[3]);
          const userId = ctx.from.id;

          // Получаем информацию об игре и пользователе
          const [game, user] = await Promise.all([
            prisma.game.findUnique({
              where: { id: gameId },
              include: {
                creator: true,
                participants: true
              }
            }),
            prisma.user.findUnique({
              where: { telegramId: userId }
            })
          ]);

          if (!game) {
            return ctx.reply('Игра не найдена');
          }

          if (!user) {
            return ctx.reply('Пользователь не найден');
          }

          // Проверяем, есть ли свободные места
          if (game.seats <= game.participants.length) {
            return ctx.reply('К сожалению, все места уже заняты');
          }

          // Проверяем, не записан ли пользователь уже
          const isAlreadyRegistered = game.participants.some(p => Number(p.telegramId) === userId);
          if (isAlreadyRegistered) {
            return ctx.reply('Вы уже записаны на эту игру');
          }

          // Проверяем баланс пользователя
          if (user.balance < game.priceKur) {
            return ctx.reply(
              'Недостаточно куражиков для участия в игре.\n' +
              `Необходимо: ${game.priceKur} куражиков\n` +
              `Ваш баланс: ${user.balance} куражиков`, {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💰 Заработать куражики', callback_data: 'earn' }],
                    [{ text: '🔙 Вернуться к игре', callback_data: `view_game_${gameId}` }]
                  ]
                }
              }
            );
          }

          // Списываем куражики и добавляем пользователя к участникам
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { 
                balance: { decrement: game.priceKur },
                participatingGames: {
                  connect: { id: game.id }
                }
              }
            }),
            // Начисляем куражики создателю игры
            prisma.user.update({
              where: { id: game.creatorId },
              data: { balance: { increment: game.priceKur } }
            })
          ]);

          // Уведомляем пользователя об успешной регистрации
          await ctx.reply(
            `✅ Вы успешно зарегистрировались на игру "${game.title}" за ${game.priceKur} куражиков!\n` +
            'Создатель игры свяжется с вами для подтверждения участия.', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🎮 К списку игр', callback_data: 'games' }]
                ]
              }
            }
          );

          // Уведомляем создателя игры о новом участнике
          await ctx.telegram.sendMessage(
            Number(game.creator.telegramId),
            `🎮 Новая регистрация на игру "${game.title}"!\n` +
            `Получено: ${game.priceKur} куражиков\n` +
            `От: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}\n` +
            `Телефон: ${user.phoneNumber || 'не указан'}`
          );

        } catch (error) {
          console.error('Ошибка при оплате игры куражиками:', error);
          await ctx.reply('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
        }
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
