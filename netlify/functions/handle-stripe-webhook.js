// Netlify Function: handle-stripe-webhook.js
// Listens for Stripe webhook events (checkout.session.completed)
// and decrements inventory in Supabase when payment succeeds.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

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

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Inventory updated',
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
