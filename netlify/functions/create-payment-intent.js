// Netlify Function: create-payment-intent.js
// Creates a Stripe PaymentIntent for on-page Apple Pay / Google Pay.
// Called by the Payment Request Button flow when user authorizes payment.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, description, shippingAddress } = JSON.parse(event.body);

    if (!amount || amount < 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    // Build shipping metadata from Apple Pay / Google Pay address
    const shippingMeta = shippingAddress ? {
      'ship_name':    shippingAddress.recipient    || '',
      'ship_line1':   shippingAddress.addressLine?.[0] || '',
      'ship_line2':   shippingAddress.addressLine?.[1] || '',
      'ship_city':    shippingAddress.city          || '',
      'ship_state':   shippingAddress.region        || '',
      'ship_zip':     shippingAddress.postalCode    || '',
      'ship_country': shippingAddress.country       || '',
    } : {};

    const paymentIntent = await stripe.paymentIntents.create({
      amount,        // already in cents (e.g. 1500 = $15.00)
      currency: 'usd',
      description,
      automatic_payment_methods: { enabled: true },
      metadata: {
        source:      'caesarean-store',
        ...shippingMeta,
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };

  } catch (err) {
    console.error('create-payment-intent error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
