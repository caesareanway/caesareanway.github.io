// Netlify Function: Send order confirmation emails
// Listens for checkout.session.completed webhook and sends confirmation to admin + customer

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact.caesarean@gmail.com';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Stripe webhook signature verification (PRODUCTION ACTIVE)
  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  // Extract body from validated Stripe event
  const body = stripeEvent.data.object;

  try {
    // Extract order data from Stripe session
    const orderId = body.payment_intent;
    const customerName = body.customer_details?.name || 'Customer';
    const customerEmail = body.customer_details?.email;
    const customerPhone = body.customer_details?.phone || 'Not provided';
    const shippingAddress = body.shipping_details?.address || {};
    const amountTotal = (body.amount_total / 100).toFixed(2); // Convert cents to dollars

    if (!customerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Customer email required' }) };
    }

    // Fetch line items from Stripe
    const lineItems = await stripe.checkout.sessions.listLineItems(body.id);
    const items = lineItems.data.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_amount: item.price.unit_amount
    }));

    // Format item list
    const itemsFormatted = items
      .map(item => `• ${item.quantity}x ${item.description} — $${(item.unit_amount / 100).toFixed(2)}`)
      .join('\n');

    const itemsSimple = items
      .map(item => `${item.quantity}x ${item.description}`)
      .join(', ');

    // Format shipping address
    const addressLines = [
      shippingAddress.line1,
      shippingAddress.line2,
      `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`,
      shippingAddress.country
    ].filter(Boolean);
    const fullAddress = addressLines.join('\n');

    // Email to admin
    const adminEmail = {
      to: ADMIN_EMAIL,
      from: 'em8484@caesarean.org',
      subject: `New Order — ${itemsSimple}`,
      html: `
        <h2>New Order Received</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>

        <h3>Customer</h3>
        <p>
          <strong>Name:</strong> ${customerName}<br>
          <strong>Email:</strong> ${customerEmail}<br>
          <strong>Phone:</strong> ${customerPhone}
        </p>

        <h3>Shipping Address</h3>
        <p>${fullAddress.replace(/\n/g, '<br>')}</p>

        <h3>Items Ordered</h3>
        <p>${itemsFormatted.replace(/\n/g, '<br>')}</p>

        <h3>Total Paid</h3>
        <p><strong>$${amountTotal}</strong></p>
      `
    };

    // Email to customer
    const customerConfirmation = {
      to: customerEmail,
      from: 'em8484@caesarean.org',
      subject: 'Order Confirmation — Caesarean',
      html: `
        <h2>Order Confirmed</h2>
        <p>Thank you for your order!</p>

        <h3>Order Summary</h3>
        <p>${itemsFormatted.replace(/\n/g, '<br>')}</p>

        <h3>Total</h3>
        <p><strong>$${amountTotal}</strong></p>

        <h3>Shipping To</h3>
        <p>${fullAddress.replace(/\n/g, '<br>')}</p>

        <h3>Estimated Delivery</h3>
        <p>5-7 business days (US Standard Shipping)</p>

        <h3>Questions?</h3>
        <p>Contact us: <a href="mailto:contact.caesarean@gmail.com">contact.caesarean@gmail.com</a></p>
      `
    };

    // Send both emails
    await Promise.all([
      sgMail.send(adminEmail),
      sgMail.send(customerConfirmation)
    ]);

    console.log(`✓ Order confirmation emails sent for order ${orderId}`);
    console.log(`  Admin: ${ADMIN_EMAIL}`);
    console.log(`  Customer: ${customerEmail}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Confirmation emails sent',
        orderId
      })
    };
  } catch (err) {
    console.error('Error sending confirmation emails:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
