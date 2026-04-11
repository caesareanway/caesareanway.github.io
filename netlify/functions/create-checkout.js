// Netlify Function: create-checkout.js
// Creates a Stripe Checkout Session from cart items.
// Called by the cart drawer "Checkout →" button.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Server-side price and SKU validation
const VALID_PRODUCTS = {
  'cd':              { price: 10, name: 'Wretched Decrepitude CD' },
  'head-shirt-XL':   { price: 20, name: 'Head T-Shirt (XL)' },
  'head-shirt-2XL':  { price: 20, name: 'Head T-Shirt (2XL)' },
  'head-shirt-3XL':  { price: 20, name: 'Head T-Shirt (3XL)' },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items } = JSON.parse(event.body);

    if (!items || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
    }

    // Validate every item against server-side whitelist
    for (const item of items) {
      const valid = VALID_PRODUCTS[item.id];
      if (!valid) {
        return { statusCode: 400, body: JSON.stringify({ error: `Invalid product: ${item.id}` }) };
      }
      if (!Number.isInteger(item.qty) || item.qty < 1) {
        return { statusCode: 400, body: JSON.stringify({ error: `Invalid quantity for ${item.id}` }) };
      }
      // Enforce server-side price — ignore client price
      item.price = valid.price;
    }

    // Build Stripe line items from validated cart
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: VALID_PRODUCTS[item.id].name,
          description: item.format || undefined,
        },
        unit_amount: VALID_PRODUCTS[item.id].price * 100,
      },
      quantity: item.qty,
    }));

    // Store cart items in metadata for webhook to process after successful payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',

      // Store cart items for inventory decrement (used by webhook)
      metadata: {
        cart_items: JSON.stringify(items.map(item => ({
          sku: item.id, // e.g., 'cd' or 'shirt-XL'
          qty: item.qty,
        }))),
      },

      // Collect US shipping address
      shipping_address_collection: {
        allowed_countries: ['US'],
      },

      // Flat $5.00 US shipping
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 500, currency: 'usd' },
            display_name: 'US Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ],

      // Send order receipt to customer automatically
      customer_creation: 'always',

      // Redirect URLs — fallback to hardcoded domain if Netlify URL env var isn't set
      success_url: `${process.env.URL || 'https://caesarean.org'}/success.html`,
      cancel_url:  `${process.env.URL || 'https://caesarean.org'}/store.html`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('create-checkout error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
