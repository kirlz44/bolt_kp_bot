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
      require('./menu')(ctx);
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
        const qualificationNumber = data.split('_')[1];
        await handleQualification(ctx, qualificationNumber);
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
          await ctx.reply('У вас нет доступа к управлению призами');
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
        const network = data.split('_')[1];
        ctx.scene.enter('post_verification_scene', { network });
        break;

      case 'get_referral_link':
        require('./getReferralLink')(ctx);
        break;

      case 'add_product':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('add_product_scene');
        } else {
          await ctx.reply('У вас нет доступа к управлению товарами');
        }
        break;

      case 'list_products':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const products = await prisma.product.findMany();
          let message = '*Список товаров:*\n\n';
          
          products.forEach(product => {
            message += `📦 *${product.name}*\n`;
            message += `📝 ${product.description}\n`;
            message += `💰 ${product.priceRub}₽ / ${product.priceKur} куражиков\n`;
            message += `📊 На складе: ${product.stock} шт.\n\n`;
          });

          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'manage_products' }]
              ]
            }
          });
        }
        break;

      case 'delete_product':
        if (userRole === 'admin' || userRole === 'superadmin') {
          const products = await prisma.product.findMany();
          const keyboard = products.map(product => ([{
            text: product.name,
            callback_data: `confirm_delete_product_${product.id}`
          }]));
          
          keyboard.push([{ text: '🔙 Назад', callback_data: 'manage_products' }]);
          
          await ctx.reply('Выберите товар для удаления:', {
            reply_markup: { inline_keyboard: keyboard }
          });
        }
        break;

      case data.match(/^confirm_delete_product_(\d+)/)?.[0]:
        if (userRole === 'admin' || userRole === 'superadmin') {
          const productId = parseInt(data.split('_')[3]);
          await prisma.product.delete({ where: { id: productId } });
          await ctx.reply('Товар успешно удален', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад к управлению товарами', callback_data: 'manage_products' }]
              ]
            }
          });
        }
        break;

      case 'edit_products':
        if (userRole === 'admin' || userRole === 'superadmin') {
          await ctx.scene.enter('edit_product_scene');
        } else {
          await ctx.reply('У вас нет доступа к управлению товарами');
        }
        break;

      case data.match(/^view_product_(\d+)/)?.[0]:
        try {
          const productId = parseInt(data.split('_')[2]);
          const product = await prisma.product.findUnique({
            where: { id: productId }
          });

          if (!product) {
            return ctx.reply('Товар не найден');
          }

          // Проверяем, есть ли у пользователя активная скидка
          const discountCode = ctx.session?.discountCode;
          let discountPercent = 0;
          if (discountCode && discountCode.startsWith('WHEEL') && discountCode.includes('D')) {
            discountPercent = parseInt(discountCode.match(/D(\d+)/)[1]);
          }

          // Рассчитываем цены с учетом скидки
          const originalPriceRub = product.priceRub;
          const originalPriceKur = product.priceKur;
          const discountedPriceRub = Math.round(originalPriceRub * (1 - discountPercent / 100));
          const discountedPriceKur = Math.round(originalPriceKur * (1 - discountPercent / 100));

          let message = `📦 *${product.name}*\n\n`;
          message += `📝 ${product.description}\n\n`;
          
          if (discountPercent > 0) {
            message += `💰 Цена: ~~${originalPriceRub}₽~~ *${discountedPriceRub}₽*\n`;
            message += `💎 Цена в куражиках: ~~${originalPriceKur}~~ *${discountedPriceKur}*\n`;
            message += `🏷 Скидка: ${discountPercent}%\n`;
          } else {
            message += `💰 Цена: ${originalPriceRub}₽\n`;
            message += `💎 Цена в куражиках: ${originalPriceKur}\n`;
          }
          
          message += `📊 В наличии: ${product.stock} шт.\n`;

          const keyboard = [
            [
              { text: '💳 Купить за деньги', callback_data: `buy_product_money_${productId}` },
              { text: '💎 Купить за куражики', callback_data: `buy_product_kurajiki_${productId}` }
            ],
            [{ text: '🔙 Назад в маркетплейс', callback_data: 'marketplace' }]
          ];

          if (product.imageId) {
            await ctx.replyWithPhoto(product.imageId, {
              caption: message,
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
          console.error('Ошибка при просмотре товара:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^buy_product_(money|kurajiki)_(\d+)/)?.[0]:
        const [, productPaymentType, productId] = data.split('_');
        if (productPaymentType === 'money') {
          require('./buyProduct')(ctx);
        } else {
          require('./buyProductWithKurajiki')(ctx);
        }
        break;

      case data.match(/^product_given_(\d+)_(\d+)/)?.[0]:
        if (userRole === 'admin' || userRole === 'superadmin') {
          try {
            const [, userId, productId] = data.split('_');
            const adminUsername = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

            // Обновляем сообщение, добавляя информацию о выдаче товара
            await ctx.editMessageText(
              ctx.update.callback_query.message.text + 
              `\n\n✅ Товар выдан администратором ${adminUsername}`,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [] // Убираем кнопку после нажатия
                }
              }
            );

            // Уведомляем покупателя
            await ctx.telegram.sendMessage(
              userId,
              '✅ Ваш товар готов к выдаче! Администратор свяжется с вами в ближайшее время.'
            );

            // Отправляем служебное общение в админский чат
            if (ctx.chat.id.toString() !== process.env.ADMIN_CHAT_ID) {
              await ctx.telegram.sendMessage(
                process.env.ADMIN_CHAT_ID,
                `📦 Заказ взят в работу\n` +
                `Администратор: ${adminUsername}\n` +
                `Покупатель ID: ${userId}\n` +
                `Товар ID: ${productId}`
              );
            }

          } catch (error) {
            console.error('Ошибка при обработке выдачи товара:', error);
            // Отправляем сообщение об ошибке в личку админу, а не в чат
            await ctx.telegram.sendMessage(
              ctx.from.id,
              'Произошла ошибка при обработке выдачи товара, но статус заказа обновлен'
            );
          }
        } else {
          await ctx.reply('У вас нет доступа к управлению заказами');
        }
        break;

      case 'show_catalog':
        try {
          const products = await prisma.product.findMany({
            where: { stock: { gt: 0 } }
          });

          if (products.length === 0) {
            return ctx.editMessageText('В каталоге пока нет доступных товаров', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'marketplace' }]
                ]
              }
            });
          }

          // Сначала удаляем текущее сообщение
          await ctx.deleteMessage();

          // Отправляем каждый товар отдельным сообщением с фото
          for (const product of products) {
            let message = `📦 *${product.name}*\n\n`;
            if (product.description) {
              message += `📝 ${product.description}\n\n`;
            }
            message += `💰 Цена: ${product.priceRub}₽\n`;
            message += `💎 Цена в куражиках: ${product.priceKur}\n`;
            message += `📊 В наличии: ${product.stock} шт.\n`;

            const keyboard = {
              inline_keyboard: [
                [
                  { text: '💳 Купить за деньги', callback_data: `buy_product_money_${product.id}` },
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
          }

          // В конце добавляем кнопку возврата
          await ctx.reply('Для возврата нажмите кнопку ниже:', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Вернуться в маркетплейс', callback_data: 'marketplace' }]
              ]
            }
          });

        } catch (error) {
          console.error('Ошибка при отображении каталога:', error);
          await ctx.reply('Произошла ошибка при загрузке каталога.');
        }
        break;

      case 'referral_program':
        try {
          const user = await prisma.user.findUnique({
            where: { telegramId: ctx.from.id }
          });
          
          if (user) {
            const referrals = await prisma.referral.findMany({
              where: { referrerId: user.id },
              include: { user: true }
            });

            let message = '📊 *Подробная статистика рефералов:*\n\n';
            
            if (referrals.length > 0) {
              message += '*Рефералы первого уровня:*\n';
              referrals.forEach((ref, index) => {
                const username = ref.user.telegramId;
                message += `${index + 1}. ID: ${username}\n`;
              });
            } else {
              message += 'У вас пока нет рефералов\n';
            }

            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔗 Получить реферальную ссылку', callback_data: 'copy_referral_link' }],
                  [{ text: '🔙 В меню', callback_data: 'open_menu' }]
                ]
              }
            });
          }
        } catch (error) {
          console.error('Ошибка при показе реферальной программы:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case 'copy_referral_link':
        try {
          const botUsername = process.env.BOT_USERNAME || 'studiokp_bot';
          const referralLink = `https://t.me/${botUsername}?start=${ctx.from.id}`;
          
          await ctx.editMessageText(
            '🔗 Вот ваша реферальная ссылка:\n\n' +
            `\`${referralLink}\`\n\n` +
            'Скопируйте её и отправьте друзьям!',
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

      case data.match(/^view_game_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[2]);
          const game = await prisma.game.findUnique({
            where: { id: gameId }
          });

          if (!game) {
            return ctx.editMessageText('Игра не найдена', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 К списку игр', callback_data: 'games' }]
                ]
              }
            });
          }

          let message = `🎮 *${game.title}*\n\n`;
          if (game.description) {
            message += `📝 ${game.description}\n\n`;
          }
          message += `📅 Дата: ${game.date.toLocaleDateString()}\n`;
          message += `⏰ Вемя: ${game.date.toLocaleTimeString()}\n`;
          message += `📍 Место: ${game.location}\n`;
          message += `💰 Цена: ${game.priceRub}₽ / ${game.priceKur} куражиков\n`;
          message += `👥 Свободных мест: ${game.seats}\n`;

          const keyboard = [
            [
              { text: '💳 Оплатить деньгами', callback_data: `pay_game_money_${gameId}` },
              { text: '💎 Оплатить куражиками', callback_data: `pay_game_kurajiki_${gameId}` }
            ],
            [{ text: '🔙 К списку игр', callback_data: 'games' }]
          ];

          if (game.imageId) {
            await ctx.replyWithPhoto(game.imageId, {
              caption: message,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: keyboard }
            });
          } else {
            await ctx.editMessageText(message, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: keyboard }
            });
          }
        } catch (error) {
          console.error('Ошибка при просмотре игры:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^pay_game_(money|kurajiki)_(\d+)/)?.[0]:
        try {
          const [action, paymentType, gameId] = data.split('_');
          console.log('Тип оплаты:', paymentType);
          console.log('ID игры:', gameId);

          // Получаем информацию об игре
          const game = await prisma.game.findUnique({
            where: { 
              id: parseInt(gameId) 
            },
            include: {
              creator: true
            }
          });

          if (!game) {
            return ctx.reply('Игр не надена');
          }

          // Проверяем, кто создал игру (админ или партнер)
          const isAdminGame = game.creator.role === 'admin' || game.creator.role === 'superadmin';

          if (paymentType === 'money') {
            if (isAdminGame) {
              // Для игр от админа - оплата через Robokassa
              await require('./payGame')(ctx, gameId);
            } else {
              // Для игр от партнера - показываем платежные данные
              const paymentMessage = 
                `💳 Оплата игры "${game.title}"\n\n` +
                `Сумма к оплате: ${game.priceRub}₽\n\n` +
                `Способ оплаты: ${game.paymentType === 'card' ? 'Банковская карта' : 'Телефон'}\n` +
                `Реквизиты: ${game.paymentDetails}\n\n` +
                `После оплаты отправьте чек организатору: @${game.creator.username || 'отсутствует'}`;

              await ctx.reply(paymentMessage, {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '✅ Я оплатил(а)', callback_data: `confirm_game_payment_${gameId}` }],
                    [{ text: '🔙 Назад', callback_data: `view_game_${gameId}` }]
                  ]
                }
              });
            }
          } else if (paymentType === 'kurajiki') {
            // Оплата куражиками с переводом создателю игры
            await require('./payGameWithKurajiki')(ctx, gameId);
          }
        } catch (error) {
          console.error('Ошибка при обработке оплаты:', error);
          await ctx.reply('Произошла ошибка при оплате. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^confirm_game_payment_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[3]);
          const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: { creator: true }
          });

          if (!game) {
            return ctx.reply('Игра не найдена');
          }

          // Уведомляем организатора о новй оплате
          const paymentMessage = 
            `💰 Новая плата за игру!\n\n` +
            `Игра: ${game.title}\n` +
            `Дата: ${game.date.toLocaleDateString()}\n` +
            `Сумма: ${game.priceRub}₽\n` +
            `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}\n` +
            `ID: ${ctx.from.id}`;

          await ctx.telegram.sendMessage(game.creator.telegramId, paymentMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Подтвердить оплату', callback_data: `approve_game_payment_${ctx.from.id}_${gameId}` }],
                [{ text: '❌ Отклонить оплату', callback_data: `reject_game_payment_${ctx.from.id}_${gameId}` }]
              ]
            }
          });

          await ctx.reply(
            'Информация об оплате оправлена организатору. Ожидайте подтверждения.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 К списку игр', callback_data: 'games' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при подтверждении оплаты:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^game_contact_(\d+)/)?.[0]:
        try {
          const gameId = parseInt(data.split('_')[2]);
          const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
              creator: true
            }
          });

          if (!game) {
            return ctx.reply('Игра не найдена');
          }

          // Уведомляем партнера о новой заявке
          const contactMessage = 
            `🎮 Новая заявка на игру!\n\n` +
            `Игра: ${game.title}\n` +
            `Дата: ${game.date.toLocaleDateString()}\n` +
            `Участник: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
            `Username: @${ctx.from.username || 'отсутствует'}\n` +
            `ID: ${ctx.from.id}`;

          await ctx.telegram.sendMessage(game.creator.telegramId, contactMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Подтвердить участие', callback_data: `confirm_game_participation_${ctx.from.id}_${gameId}` }]
              ]
            }
          });

          await ctx.reply(
            'Ваша заявка отправлена организатору игры. Ожидайте подтверждения.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 К списку игр', callback_data: 'games' }]
                ]
              }
            }
          );
        } catch (error) {
          console.error('Ошибка при обработке контактных данных:', error);
          await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
        break;

      case data.match(/^approve_post_(\d+)_(\w+)/)?.[0]:
        try {
          const [, userId, network] = data.split('_');
          const adminUsername = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
          const originalMessage = ctx.callbackQuery.message.caption;

          if (!originalMessage) {
            return ctx.reply('Ошибка: не удалось получить текст сообщения');
          }

          // Обновляем сообщение, добавляя информацию о подтверждении
          await ctx.editMessageCaption(
            `${originalMessage}\n\n✅ Пост подтвержден администратором ${adminUsername}`,
            {
              reply_markup: {
                inline_keyboard: [] // Убираем кнпки после подтверждения
              }
            }
          );

          // Начисляем куражики пользователю
          const rewards = {
            vk: 300,
            instagram: 300,
            telegram: 200,
            ok: 200
          };

          // Преобразуем userId в BigInt для поиска в базе
          const telegramId = BigInt(userId);
          const user = await prisma.user.findUnique({
            where: { telegramId }
          });

          if (user) {
            // Обновляем баланс пользователя
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: { balance: { increment: rewards[network] } }
            });

            // Уведомляем пользователя о начислении куражиков
            await ctx.telegram.sendMessage(
              userId,
              `✅ Ваш пост подтвержден!\n` +
              `Вам начислено ${rewards[network]} куражиков.\n` +
              `Ваш текущий баланс: ${updatedUser.balance} куражиков`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💰 Заработать ещё', callback_data: 'earn' }]
                  ]
                }
              }
            );
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
            'Пожалуйста, убедтесь, чт пост соответствует требованиям и попробуйте снова.',
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
            [{ text: '👥 Количество мест', callback_data: `edit_game_seats_${gameId}` }],
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
          await ctx.reply('Произошла ошибка при удалении мероприятия. Пожалуйста, попробуйте позже.');
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
                    [{ text: '🔙 Вернуться к мероприятию', callback_data: `view_event_${eventId}` }]
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
