const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { sendMessageToUser } = require('../utils/telegram');

module.exports = async (req, res) => {
  try {
    console.log('Получен webhook от Робокассы:', req.query);
    const { OutSum, InvId, SignatureValue, Shp_description } = req.query;
    
    if (!OutSum || !InvId || !SignatureValue) {
      console.error('Отсутствуют обязательные параметры в запросе');
      return res.status(400).send('Missing required parameters');
    }

    const password2 = process.env.ROBOKASSA_TEST_MODE === 'true' 
      ? process.env.ROBOKASSA_TEST_PASSWORD2 
      : process.env.ROBOKASSA_PROD_PASSWORD2;

    const expectedSignature = crypto
      .createHash('md5')
      .update(`${OutSum}:${InvId}:${password2}${Shp_description ? `:Shp_description=${Shp_description}` : ''}`)
      .digest('hex')
      .toUpperCase();

    if (SignatureValue.toUpperCase() !== expectedSignature) {
      console.error('Неверная подпись платежа');
      return res.status(400).send('Invalid signature');
    }

    // Обновляем транзакцию в базе данных
    const transaction = await prisma.$transaction(async (prisma) => {
      const updatedTransaction = await prisma.transaction.update({
        where: { id: parseInt(InvId, 10) },
        data: { 
          status: 'success',
          paidAt: new Date()
        }
      });

      const user = await prisma.user.findUnique({ 
        where: { id: updatedTransaction.userId },
        select: { 
          id: true,
          telegramId: true,
          firstName: true,
          username: true
        }
      });

      return { transaction: updatedTransaction, user };
    });

    // Отправляем уведомление пользователю
    const userMessage = `✅ Ваш платеж успешно обработан!\n\n` +
      `💰 Сумма: ${OutSum} руб.\n` +
      `📝 Описание: ${Shp_description || transaction.transaction.description}\n` +
      `🆔 Номер транзакции: ${InvId}`;

    await sendMessageToUser(transaction.user.telegramId, userMessage);

    // Отправляем уведомление администраторам
    const adminMessage = `💰 Новый успешный платеж!\n\n` +
      `👤 Пользователь: ${transaction.user.firstName} ` +
      `${transaction.user.username ? `(@${transaction.user.username})` : ''}\n` +
      `💵 Сумма: ${OutSum} руб.\n` +
      `📝 Описание: ${Shp_description || transaction.transaction.description}\n` +
      `🆔 ID транзакции: ${InvId}\n` +
      `📅 Дата: ${new Date().toLocaleString('ru-RU')}`;

    await sendMessageToUser(process.env.ADMIN_CHAT_ID, adminMessage);

    console.log(`Успешно обработан платеж #${InvId} на сумму ${OutSum} руб.`);
    return res.send('OK');

  } catch (error) {
    console.error('Ошибка при обработке webhook от Робокассы:', error);
    
    // В случае ошибки базы данных, всё равно отвечаем OK,
    // чтобы Робокасса не пыталась повторить запрос
    return res.send('OK');
  }
};
