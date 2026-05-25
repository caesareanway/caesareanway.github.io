// Netlify Function: handle-stripe-webhook.js
// Listens for Stripe webhook events (checkout.session.completed)
// and decrements inventory in Supabase when payment succeeds.
// ALSO sends purchase notification emails to admin and customer.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact.caesarean@gmail.com';

// Initialize Supabase with service role key (allows inventory updates)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Stripe webhook signing secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['stripe-signature'];

  let stripeEvent;
  try {
    // Verify webhook signature to ensure it's from Stripe
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // Handle checkout.session.completed event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      // Get cart items from session metadata
      let cartItems = [];
      if (session.metadata?.cart_items) {
        try {
          cartItems = JSON.parse(session.metadata.cart_items);
        } catch (parseErr) {
          console.error('Failed to parse cart items from metadata:', parseErr);
          cartItems = [];
        }
      }

      if (cartItems.length === 0) {
        console.log('Session has no cart items, skipping inventory update');
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }

      console.log('Processing inventory update for SKUs:', cartItems);

      // Extract customer and order info for email notifications
      const orderId = session.payment_intent || session.id;
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || 'Customer';
      const shippingAddress = session.shipping_details?.address || {};
      const amountTotal = (session.amount_total / 100).toFixed(2);

      // Decrement inventory for each item in the cart
      for (const item of cartItems) {
        const { sku, qty } = item;

        if (!sku || !qty) {
          console.warn('Invalid cart item:', item);
          continue;
        }

        try {
          // Fetch current inventory
          const { data: currentData, error: fetchError } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('product', sku)
            .single();

          if (fetchError) {
            console.error(`Failed to fetch inventory for ${sku}:`, fetchError);
            continue;
          }

          if (!currentData) {
            console.warn(`No inventory record found for SKU: ${sku}`);
            continue;
          }

          // Calculate new quantity
          const newQuantity = Math.max(0, currentData.quantity - qty);

          // Update inventory in Supabase
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              quantity: newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq('product', sku);

          if (updateError) {
            console.error(`Failed to update inventory for ${sku}:`, updateError);
          } else {
            console.log(
              `✓ Decremented ${sku} by ${qty} (new quantity: ${newQuantity})`
            );
          }
        } catch (itemErr) {
          console.error(`Error processing item ${sku}:`, itemErr);
        }
      }

      // ── Send email notifications ──────────────────────
      if (customerEmail) {
        try {
          // Fetch line items from Stripe for email
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const itemsFormatted = lineItems.data
            .map(item => `• ${item.quantity}x ${item.description} — $${(item.price.unit_amount / 100).toFixed(2)}`)
            .join('\n');

          const itemsSimple = lineItems.data
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
          const adminEmailMsg = {
            to: ADMIN_EMAIL,
            from: 'em8484@caesarean.org',
            subject: `New Order — ${itemsSimple}`,
            html: `
              <h2>New Order Received</h2>
              <p><strong>Order ID:</strong> ${orderId}</p>

              <h3>Customer</h3>
              <p>
                <strong>Name:</strong> ${customerName}<br>
                <strong>Email:</strong> ${customerEmail}
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
          const customerEmailMsg = {
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
            sgMail.send(adminEmailMsg),
            sgMail.send(customerEmailMsg)
          ]);

          console.log(`✓ Purchase confirmation emails sent for order ${orderId}`);
          console.log(`  Admin: ${ADMIN_EMAIL}`);
          console.log(`  Customer: ${customerEmail}`);
        } catch (emailErr) {
          // Log email error but don't fail the webhook
          console.error('Error sending confirmation emails:', emailErr.message);
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Inventory updated and emails sent',
          items_processed: cartItems.length,
        }),
      };
    } catch (err) {
      console.error('Error processing webhook:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  // Ignore other event types
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
