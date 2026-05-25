// Netlify Function: handle-refund.js
// Manually increment inventory when a refund is issued.
// This is called when a customer requests a refund for an order.
// Should only be called by admin after verifying the refund in Stripe.

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Simple auth token to prevent unauthorized refunds
const ADMIN_TOKEN = process.env.REFUND_TOKEN || 'admin-token-change-me';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify admin token
    const authHeader = event.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing or invalid authorization' }) };
    }

    const token = authHeader.substring(7);
    if (token !== ADMIN_TOKEN) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Parse request body
    const { items } = JSON.parse(event.body);

    if (!items || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No items to refund' }) };
    }

    console.log('Processing refund for items:', items);

    // Increment inventory for each item
    const refundResults = [];

    for (const item of items) {
      const { sku, qty } = item;

      if (!sku || !qty || qty < 1) {
        console.warn('Invalid refund item:', item);
        refundResults.push({
          sku,
          status: 'failed',
          error: 'Invalid SKU or quantity'
        });
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
          refundResults.push({
            sku,
            status: 'failed',
            error: `Could not fetch current inventory: ${fetchError.message}`
          });
          continue;
        }

        if (!currentData) {
          console.warn(`No inventory record found for SKU: ${sku}`);
          refundResults.push({
            sku,
            status: 'failed',
            error: 'SKU not found in inventory'
          });
          continue;
        }

        // Calculate new quantity (add back the refunded amount)
        const previousQuantity = currentData.quantity;
        const newQuantity = previousQuantity + qty;

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
          refundResults.push({
            sku,
            status: 'failed',
            error: `Supabase error: ${updateError.message}`
          });
        } else {
          console.log(
            `✓ Refund: Incremented ${sku} by ${qty} (${previousQuantity} → ${newQuantity})`
          );
          refundResults.push({
            sku,
            status: 'success',
            previousQuantity,
            newQuantity,
            incrementedBy: qty
          });
        }
      } catch (itemErr) {
        console.error(`Error processing refund for ${sku}:`, itemErr);
        refundResults.push({
          sku,
          status: 'failed',
          error: itemErr.message
        });
      }
    }

    // Determine overall status
    const failedCount = refundResults.filter(r => r.status === 'failed').length;
    const successCount = refundResults.filter(r => r.status === 'success').length;

    return {
      statusCode: failedCount > 0 ? 207 : 200, // 207 Multi-Status if partial failure
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: failedCount === 0,
        summary: {
          total: refundResults.length,
          successful: successCount,
          failed: failedCount
        },
        results: refundResults
      }),
    };

  } catch (err) {
    console.error('Refund handler error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
