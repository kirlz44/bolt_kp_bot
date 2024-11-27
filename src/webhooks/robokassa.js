const { PrismaClient } = require('@prisma/client');
    const crypto = require('crypto');
    const prisma = new PrismaClient();
    const { sendMessageToUser } = require('../utils/telegram');

    module.exports = async (req, res) => {
      const { OutSum, InvId, SignatureValue } = req.query;
      const password2 = process.env.ROBOKASSA_TEST_MODE === 'true' ? process.env.ROBOKASSA_TEST_PASSWORD2 : process.env.ROBOKASSA_PROD_PASSWORD2;
      const expectedSignature = crypto.createHash('md5').update(`${OutSum}:${InvId}:${password2}`).digest('hex').toUpperCase();

      if (SignatureValue.toUpperCase() === expectedSignature) {
        // Update transaction status in the database
        await prisma.transaction.update({
          where: { id: parseInt(InvId, 10) },
          data: { status: 'success' }
        });

        // Notify user about successful payment
        const transaction = await prisma.transaction.findUnique({ where: { id: parseInt(InvId, 10) } });
        const user = await prisma.user.findUnique({ where: { id: transaction.userId } });
        sendMessageToUser(user.telegramId, 'Ваш платеж успешно обработан.');

        // Notify admin about successful payment
        const adminChatId = process.env.ADMIN_CHAT_ID;
        sendMessageToUser(adminChatId, `Пользователь ${user.telegramId} успешно оплатил ${transaction.amount} руб. за ${transaction.description}.`);

        res.send('OK');
      } else {
        res.status(400).send('Invalid signature');
      }
    };
