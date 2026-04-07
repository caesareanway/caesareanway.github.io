const { randomBytes } = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { passphrase } = JSON.parse(event.body || '{}');

    if (!passphrase) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Passphrase required' })
      };
    }

    const correctPassphrase = process.env.INVENTORY_PASSWORD;

    if (!correctPassphrase) {
      console.error('INVENTORY_PASSWORD env var is not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Server misconfigured' })
      };
    }

    if (passphrase === correctPassphrase) {
      const token = randomBytes(32).toString('hex');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, token })
      };
    } else {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Incorrect passphrase' })
      };
    }
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Bad request' })
    };
  }
};
