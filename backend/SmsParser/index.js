const { getTransactionInfo } = require('transaction-sms-parser');

const b64 = process.argv[2];

if (!b64) {
  console.log(JSON.stringify(null));
  process.exit(0);
}

try {
  const sms = Buffer.from(b64, 'base64').toString('utf8');
  const transactionInfo = getTransactionInfo(sms);
  console.log(JSON.stringify(transactionInfo));
} catch (error) {
  console.error(error);
  console.log(JSON.stringify(null));
}
