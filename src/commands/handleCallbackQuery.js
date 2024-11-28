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
        // Обновляем существующее сообщение вместо отправки нового
        const menuKeyboard = await require('./menu').getMenuKeyboard(ctx.state.userRole);
        await ctx.editMessageText('Главное меню', {
          reply_markup: {
            inline_keyboard: menuKeyboard
          }
        });
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
            message += `Вероятность: ${prize.probability}%\n\n`;
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
            '🎁 Ваш специальный приз готов к выдаче! Администратор свяжется с вами в ближайшее время.'
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
          console.error('Ошибка при отображении каталоа:', error);
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
          message += `⏰ Время: ${game.date.toLocaleTimeString()}\n`;
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
            return ctx.reply('Игра не найдена');
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
            'Информация об оплате отправлена организатору. Ожидайте подтверждения.',
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
                inline_keyboard: [] // Убираем кнопки после подтверждения
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
          console.error('Ошибка при получении списка игр:', error);
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
