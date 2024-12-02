const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkUserRole, createUser } = require('../models/user');

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    console.log('\n=== Начало обработки команды start ===');
    console.log('userId:', userId);
    
    const userRole = await checkUserRole(userId);
    console.log('userRole:', userRole);

    // Проверяем наличие реферальной ссылки
    let startPayload = ctx.message?.text?.split(' ')[1] || ctx.startPayload;
    console.log('Полученный текст команды:', ctx.message?.text);
    console.log('Разобранный startPayload:', startPayload);
    
    let referrerId = null;
    let referrer = null;
    
    if (startPayload) {
      try {
        // Ищем пользователя по telegramId из стартового параметра
        referrer = await prisma.user.findFirst({
          where: { 
            telegramId: BigInt(startPayload)
          }
        });

        if (referrer) {
          referrerId = referrer.telegramId;
          console.log('Найден реферер:', {
            id: referrer.id,
            telegramId: referrer.telegramId.toString(),
            role: referrer.role
          });
        } else {
          console.log('Реферер не найден по telegramId:', startPayload);
        }
      } catch (error) {
        console.error('Ошибка при обработке startPayload:', error);
      }
    }

    if (!userRole) {
      console.log('Создаем нового пользователя');
      // Создаем пользователя с начальным балансом 1000 куражиков
      const user = await createUser(userId, 'user', 1000);
      console.log('Создан новый пользователь:', user);
      
      // Если есть реферер, создаем реферальную связь
      if (startPayload && referrerId && referrerId !== BigInt(userId)) {
        console.log('\n=== Начало обработки реферальной программы ===');
        console.log('Реферер для транзакции:', referrer);
        
        try {
          await prisma.$transaction(async (tx) => {
            // Создаем реферальную связь
            await tx.referral.create({
              data: {
                userId: user.id,
                referrerId: referrer.id
              }
            });

            // Начисляем бонус рефереру
            await tx.user.update({
              where: { id: referrer.id },
              data: { balance: { increment: 500 } }
            });

            // Записываем бонус в историю
            await tx.bonus.create({
              data: {
                userId: referrer.id,
                amount: 500,
                description: 'Бонус за приглашение реферала 1-го уровня'
              }
            });

            // Уведомляем реферера
            await ctx.telegram.sendMessage(
              referrer.telegramId.toString(),
              `🎉 По вашей реферальной ссылке зарегистрировался новый пользователь ${ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name} (${ctx.from.first_name})!\n` +
              `Вам начислено 500 куражиков!`
            );

            // Ищем реферера второго уровня
            const secondLevelReferral = await tx.referral.findFirst({
              where: { userId: referrer.id },
              include: { referrer: true }
            });

            if (secondLevelReferral) {
              // Начисляем бонус рефереру второго уровня
              await tx.user.update({
                where: { id: secondLevelReferral.referrer.id },
                data: { balance: { increment: 100 } }
              });

              // Записываем бонус в историю
              await tx.bonus.create({
                data: {
                  userId: secondLevelReferral.referrer.id,
                  amount: 100,
                  description: 'Бонус за реферала 2-го уровня'
                }
              });

              // Уведомляем реферера второго уровня
              await ctx.telegram.sendMessage(
                secondLevelReferral.referrer.telegramId.toString(),
                `🎉 По вашей реферальной программе второго уровня зарегистрировался новый пользователь!\n` +
                `Вам начислено 100 куражиков!`
              );
            }
          });
        } catch (error) {
          console.error('Ошибка при обработке реферальной программы:', error);
        }
      }

      // Отправляем приветственное сообщение для нового пользователя
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
    console.error('Критическая ошибка в команде start:', error);
    await ctx.reply('Произошла ошибка при запуске бота. Пожалуйста, попробуйте позже.');
  }
};
