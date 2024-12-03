const crypto = require('crypto');

/**
 * Генерирует URL для оплаты через Робокассу
 * @param {number} amount - Сумма платежа
 * @param {string} description - Описание платежа
 * @param {number} invId - Номер счета
 * @param {boolean} isTest - Использовать тестовый режим
 * @returns {string} URL для оплаты
 */
function generatePaymentUrl(amount, description, invId, isTest = false) {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Сумма платежа должна быть больше 0');
    }

    if (!description) {
      throw new Error('Описание платежа обязательно');
    }

    if (!invId) {
      throw new Error('Номер счета обязателен');
    }

    // Форматируем сумму с точкой в качестве разделителя
    const formattedAmount = amount.toString().replace(',', '.');

    const login = isTest ? process.env.ROBOKASSA_TEST_LOGIN : process.env.ROBOKASSA_PROD_LOGIN;
    const password = isTest ? process.env.ROBOKASSA_TEST_PASSWORD1 : process.env.ROBOKASSA_PROD_PASSWORD1;

    // Формируем строку для подписи: MerchantLogin:OutSum:InvId:Password
    const signatureStr = `${login}:${formattedAmount}:${invId}:${password}`;

    // Генерируем подпись в нижнем регистре
    const signature = crypto
      .createHash('md5')
      .update(signatureStr)
      .digest('hex')
      .toLowerCase();

    // Формируем URL
    const url = new URL('https://auth.robokassa.ru/Merchant/Index.aspx');
    
    // Добавляем основные параметры
    url.searchParams.append('MerchantLogin', login);
    url.searchParams.append('OutSum', formattedAmount);
    url.searchParams.append('InvId', invId);
    url.searchParams.append('Description', description);
    url.searchParams.append('SignatureValue', signature);
    
    if (isTest) {
      url.searchParams.append('IsTest', '1');
    }

    return url.toString();
  } catch (error) {
    console.error('Ошибка при генерации URL для оплаты:', error);
    throw error;
  }
}

module.exports = {
  generatePaymentUrl
};
