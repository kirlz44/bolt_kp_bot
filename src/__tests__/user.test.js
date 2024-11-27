const { PrismaClient } = require('@prisma/client');
const { checkUserRole, createUser, updateUserBalance } = require('../models/user');

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

describe('User Model Tests', () => {
  test('should create new user', async () => {
    const telegramId = 123456;
    const user = await createUser(telegramId, 'user');
    expect(user.telegramId).toBe(telegramId);
    expect(user.role).toBe('user');
    expect(user.balance).toBe(0);
  });

  test('should check user role correctly', async () => {
    const telegramId = parseInt(process.env.SUPER_ADMIN_ID);
    const role = await checkUserRole(telegramId);
    expect(role).toBe('superadmin');
  });

  test('should update user balance', async () => {
    const telegramId = 123456;
    const user = await createUser(telegramId, 'user');
    const updatedUser = await updateUserBalance(user.id, 1000);
    expect(updatedUser.balance).toBe(1000);
  });
});
