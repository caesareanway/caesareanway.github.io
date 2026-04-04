# Supabase Live Inventory Setup

This guide explains how to set up live inventory integration between your store and Supabase.

## Architecture

1. **store.html** — Fetches live inventory from Supabase on page load
2. **create-checkout.js** — Accepts cart items and stores them in Stripe session metadata
3. **handle-stripe-webhook.js** — Listens for successful Stripe payments and decrements inventory in Supabase

## Required Setup

### 1. Supabase Database Table

Create an `inventory` table in your Supabase project with the following schema:

```sql
CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial inventory
INSERT INTO inventory (sku, quantity) VALUES
  ('cd', 32),
  ('shirt-XL', 11),
  ('shirt-2XL', 3),
  ('shirt-3XL', 1);
```

### 2. Netlify Environment Variables

Add these to your Netlify site settings (Site Settings → Build & Deploy → Environment):

**Already set:**
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_ANON_KEY` — Your Supabase anon/public key (for store.html reads)

**Add these:**
- `SUPABASE_SERVICE_KEY` — Your Supabase service role key (for webhook writes)
  - Get this from: Supabase Dashboard → Settings → API → Project API Keys → Service role key
  - ⚠️ Keep this secret — never commit to git

- `STRIPE_WEBHOOK_SECRET` — Your Stripe webhook signing secret
  - Get this from: Stripe Dashboard → Developers → Webhooks
  - Create a new endpoint: `https://yourdomain/.netlify/functions/handle-stripe-webhook`
  - Subscribe to: `checkout.session.completed`
  - Copy the signing secret

### 3. Stripe Webhook Configuration

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **+ Add endpoint**
3. Endpoint URL: `https://yourdomain/.netlify/functions/handle-stripe-webhook`
4. Events to send: `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET` in Netlify

## How It Works

### Page Load (store.html)
```javascript
1. User visits /store.html
2. Supabase client initialized with ANON_KEY
3. Inventory table queried for all SKUs
4. Stock display updated with live numbers
```

### Checkout (create-checkout.js)
```javascript
1. User clicks "Checkout →"
2. Cart items passed to create-checkout function
3. Cart stored in Stripe session metadata
4. User redirected to Stripe Checkout
```

### Post-Payment (handle-stripe-webhook.js)
```javascript
1. User completes payment in Stripe
2. Stripe sends checkout.session.completed event
3. Webhook signature verified
4. Cart items extracted from session metadata
5. For each item: quantity decremented in Supabase inventory table
6. Inventory is now updated (next page refresh will show new numbers)
```

## Testing

### Test Inventory Fetch
1. Open `/store.html`
2. Check browser console for: `Inventory loaded from Supabase: {...}`
3. Stock numbers should display under product titles

### Test Webhook
1. Use Stripe test keys (starts with `pk_test_` and `sk_test_`)
2. Make a test purchase with card: `4242 4242 4242 4242`
3. Check Supabase: inventory table quantities should be decremented
4. Check Netlify function logs for webhook processing

### Manual Testing
You can test the webhook directly:
```bash
curl -X POST https://yourdomain/.netlify/functions/handle-stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"checkout.session.completed","data":{"object":{"metadata":{"cart_items":"[{\"sku\":\"cd\",\"qty\":1}]"}}}}'
```

## Troubleshooting

**Inventory not updating after purchase?**
- Check Netlify function logs: `netlify functions:invoke handle-stripe-webhook`
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check Supabase service key has write permissions
- Confirm table name is lowercase `inventory`

**Inventory shows fallback values?**
- Supabase fetch failed (check network in DevTools)
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Supabase row-level security policies (RLS) aren't blocking reads

**SKU mismatch?**
- Verify `cart_items[].sku` matches `inventory.sku` exactly
- Examples: `'cd'`, `'shirt-XL'`, `'shirt-2XL'`

## Fallback Behavior

If Supabase is unavailable on page load, store.html falls back to hardcoded inventory:
```javascript
{
  'cd': 32,
  'shirt-XL': 11,
  'shirt-2XL': 3,
  'shirt-3XL': 1
}
```

This ensures your store remains functional even if Supabase is down temporarily.
