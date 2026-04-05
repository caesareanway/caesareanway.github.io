// Netlify Function: Send order confirmation emails
// Accepts order data via JSON POST and sends confirmation to admin + customer

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact.caesarean@gmail.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // TODO: Re-enable Stripe webhook signature verification before production
  // const signature = event.headers['stripe-signature'];
  // try {
  //   stripeEvent = stripe.webhooks.constructEvent(event.body, signature, webhookSecret);
  // } catch (err) {
  //   return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  // }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error('Failed to parse request body:', err.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  try {
    // Extract order data from request
    const orderId = body.orderId;
    const customerName = body.customerName || 'Customer';
    const customerEmail = body.customerEmail;
    const customerPhone = body.customerPhone || 'Not provided';
    const items = body.items || []; // Array of {description, quantity, unit_amount}
    const amountTotal = body.amountTotal; // Total in dollars
    const shippingAddress = body.shippingAddress || {};

    if (!customerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Customer email required' }) };
    }

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
      from: 'noreply@caesarean.band',
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
    console.error('Error sending confirmation emails:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
