const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUser(telegramId, role = 'user', initialBalance = 1000) {
  console.log('Создание пользователя с параметрами:', {
    telegramId,
    role,
    initialBalance
  });
  
  try {
    const user = await prisma.user.create({
      data: {
        telegramId: BigInt(telegramId),
        role: role,
        balance: initialBalance
      }
    });
    console.log('Создан пользователь:', user);
    return user;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    throw error;
  }
}

async function checkUserRole(telegramId) {
  console.log('Проверка роли для telegramId:', telegramId);
  try {
    const superAdminId = process.env.SUPER_ADMIN_ID;
    console.log('superAdminId:', superAdminId);

    const telegramIdBigInt = BigInt(telegramId);
    console.log('telegramIdBigInt:', telegramIdBigInt);

    console.log('Поиск пользователя с telegramId:', telegramIdBigInt);
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt }
    });
    console.log('Найден пользователь:', user);

    if (telegramId.toString() === superAdminId) {
      return 'superadmin';
    }

    console.log('Результат проверки роли:', user?.role || null);
    return user?.role || null;
  } catch (error) {
    console.error('Ошибка при проверке роли пользователя:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  checkUserRole
};
