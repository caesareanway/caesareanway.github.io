// Netlify Function: Send order confirmation emails
// Listens for checkout.session.completed and emails admin + customer

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact.caesarean@gmail.com';
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Re-enable for production verification

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // TODO: Re-enable Stripe webhook signature verification before production
  // Currently disabled for testing. Uncomment below for production:
  /*
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
  */

  // For testing: parse JSON body directly
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    console.error('Failed to parse request body:', err.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      // Get line items from Stripe
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      // Format order data
      const customerName = session.customer_details?.name || 'Customer';
      const customerEmail = session.customer_details?.email;
      const customerPhone = session.customer_details?.phone || 'Not provided';
      const shippingAddress = session.shipping_details?.address || {};
      const amountTotal = (session.amount_total / 100).toFixed(2);
      const orderId = session.payment_intent;

      // Build item list
      const items = lineItems.data
        .map(item => `${item.quantity}x ${item.description}`)
        .join('\n');

      const itemsFormatted = lineItems.data
        .map(item => `• ${item.quantity}x ${item.description} — $${(item.price.unit_amount / 100).toFixed(2)}`)
        .join('\n');

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
        from: 'noreply@caesarean.band',
        subject: `New Order — ${items.replace(/\n/g, ', ')}`,
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
        from: 'noreply@caesarean.band',
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
      console.error('Error processing order confirmation:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
