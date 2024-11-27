const crypto = require('crypto');

function generatePaymentUrl(amount, description, isTest = true) {
  const login = isTest ? process.env.ROBOKASSA_TEST_LOGIN : process.env.ROBOKASSA_PROD_LOGIN;
  const password = isTest ? process.env.ROBOKASSA_TEST_PASSWORD1 : process.env.ROBOKASSA_PROD_PASSWORD1;
  
  const signature = crypto
    .createHash('md5')
    .update(`${login}:${amount}:0:${password}:Shp_description=${description}`)
    .digest('hex');

  return `https://auth.robokassa.ru/Merchant/Index.aspx?` +
    `MerchantLogin=${login}&` +
    `OutSum=${amount}&` +
    `Description=${encodeURIComponent(description)}&` +
    `SignatureValue=${signature}&` +
    `IsTest=${isTest ? 1 : 0}&` +
    `Shp_description=${encodeURIComponent(description)}`;
}

module.exports = {
  generatePaymentUrl
};
