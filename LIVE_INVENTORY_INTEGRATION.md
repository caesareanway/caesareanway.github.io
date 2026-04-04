# Live Inventory Integration Guide

## System Overview

Your store now has a fully integrated live inventory system:

```
┌─────────────────────────────────────────────────────────────┐
│                    INVENTORY MANAGER APP                     │
│          (/.netlify/functions/inventory)                     │
│  - Admin interface to update quantities                      │
│  - Real-time Supabase syncing                                │
│  - Password protected                                        │
└──────────────┬──────────────────────────────────────────────┘
               │ Updates
               ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                         │
│              (inventory table)                               │
│  - Stores current quantities for all SKUs                    │
│  - Updated by: inventory manager & purchases                 │
└──────────────┬──────────────────────────────────────────────┘
        ↑      │      ↑
    Reads on   │   Decrement
    pageload   │   after purchase
        │      ↓
┌──────────────────────────┐    ┌──────────────────────────────┐
│    STORE.HTML (Client)   │    │  STRIPE WEBHOOK (Backend)    │
│  - Fetches inventory     │    │  - Listens for payment done  │
│  - Shows live quantities │    │  - Decrements inventory      │
│  - Disables if out stock │    │  - Updates Supabase          │
└──────────────┬───────────┘    └──────────────────────────────┘
               │                         ↑
               │ User purchases          │
               └────────→ Stripe ────────┘
                        Checkout
```

## What Each Component Does

### 1. Store.html (Client-Side)
- **On page load:** Fetches live inventory from Supabase
- **Maps data:** Converts Supabase rows to INVENTORY object format
- **Disables buttons:** "Add to Cart" disabled if quantity = 0
- **Fallback:** Uses hardcoded values if Supabase unavailable

### 2. create-checkout.js (Stripe Session Creation)
- **Receives cart items** with SKU and quantities
- **Creates line items** for Stripe Checkout
- **Stores metadata:** Adds cart items to session metadata
- **Purpose:** Webhook can later retrieve items to decrement

### 3. handle-stripe-webhook.js (Post-Purchase Handler)
- **Triggers:** When Stripe sends `checkout.session.completed`
- **Extracts:** Cart items from session metadata
- **Decrements:** Each SKU quantity in Supabase inventory table
- **Updates:** Sets `updated_at` timestamp

### 4. Inventory Manager App
- **Admin interface:** Update quantities manually
- **Real-time sync:** Changes sync to Supabase instantly
- **Live updates:** Multiple admins see changes in real-time

## Data Flow

### Purchase Flow
```
1. User adds items to cart (store.html)
2. User clicks "Checkout →" (create-checkout.js)
   → Cart passed to create-checkout function
   → Cart items stored in Stripe session metadata
3. Stripe processes payment
4. Payment completes (Stripe triggers webhook)
5. handle-stripe-webhook.js receives event
   → Extracts cart items from metadata
   → For each item: quantity -= purchased_qty
   → Updates Supabase inventory table
6. Next time user visits store.html:
   → Fetches new quantities from Supabase
   → Shows updated inventory
```

### Manual Inventory Update Flow
```
1. Admin visits /.netlify/functions/inventory
2. Enters password (INVENTORY_PASSWORD env var)
3. Clicks +/- buttons to adjust quantities
4. updateInventory() updates Supabase
5. Real-time subscription notifies app
6. Next store.html visitor sees new quantities
```

## Environment Variables Required

All already set in Netlify, but verify:

```
SUPABASE_URL                    → Supabase project URL
SUPABASE_ANON_KEY               → Public key (for store reads)
SUPABASE_SERVICE_KEY            → Service role (for webhook writes)
STRIPE_SECRET_KEY               → Stripe API secret
STRIPE_WEBHOOK_SECRET           → Stripe webhook signing secret
INVENTORY_PASSWORD              → Admin password for inventory app
```

## Database Schema

Your `inventory` table structure:

```sql
CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,        -- 'cd', 'shirt-XL', 'shirt-2XL', 'shirt-3XL'
  quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Current data:
INSERT INTO inventory (sku, quantity) VALUES
  ('cd', 32),
  ('shirt-XL', 11),
  ('shirt-2XL', 3),
  ('shirt-3XL', 1);
```

## Testing the Integration

### Test 1: Verify Inventory Loads
```
1. Visit store.html
2. Open DevTools → Console
3. Look for: "Inventory loaded from Supabase: {cd: 32, shirt-XL: 11, ...}"
4. Verify quantities display under product titles
```

### Test 2: Verify Admin Interface
```
1. Visit /.netlify/functions/inventory
2. Enter password
3. Click +/- buttons
4. Check Supabase: inventory table quantities should change
5. Refresh store.html in another tab: quantities should update
```

### Test 3: Verify Purchase Decrements
```
1. Note current inventory (e.g., cd: 32)
2. Make a test purchase with Stripe test card: 4242 4242 4242 4242
3. Complete checkout
4. Check Supabase: inventory should be decremented (cd: 31)
5. Refresh store.html: should show new quantity
```

### Test 4: Verify Out of Stock
```
1. Set shirt-3XL to 0 in inventory app
2. Refresh store.html
3. "Add to Cart" button should be disabled/grayed out
4. Text should say "Out of Stock"
```

## Stripe Webhook Setup

The webhook endpoint is: `https://caesarean.org/.netlify/functions/handle-stripe-webhook`

### To verify it's configured:
1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Look for endpoint: `handle-stripe-webhook`
3. Event: `checkout.session.completed`
4. Status: Should be "Enabled"

### If not set up:
1. Click **+ Add endpoint**
2. Endpoint URL: `https://caesarean.org/.netlify/functions/handle-stripe-webhook`
3. Events to send: `checkout.session.completed`
4. Click **Create endpoint**
5. Copy the signing secret → Add to Netlify as `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

### Inventory doesn't load on store.html
- Check browser console for errors
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check inventory table exists in Supabase
- Try the fallback (hardcoded values should appear)

### Purchases don't decrement inventory
- Check Netlify function logs: `netlify functions:invoke handle-stripe-webhook`
- Verify webhook is receiving events: Stripe Dashboard → Webhooks → Deliveries tab
- Verify SUPABASE_SERVICE_KEY is correct
- Check Supabase table permissions allow writes

### Admin app won't load
- See INVENTORY_SETUP.md troubleshooting section
- Verify INVENTORY_PASSWORD environment variable is set

### Real-time updates lag
- Real-time subscriptions take 2-5 seconds to sync
- Check Supabase Realtime is enabled: Settings → Realtime
- Refresh page to force sync

## Monitoring

### View Webhook Deliveries
1. Stripe Dashboard → Developers → Webhooks
2. Click `handle-stripe-webhook`
3. **Deliveries** tab shows all events sent
4. Click any delivery to see request/response

### Check Inventory Updates
1. Supabase → Your project → Tables
2. Click `inventory` table
3. `updated_at` column shows when last updated
4. `quantity` column shows current stock

### Monitor Netlify Function Logs
```bash
# Stream live logs
netlify functions:invoke handle-stripe-webhook --identity

# Or view in Netlify dashboard:
# Site → Netlify CLI → Functions → handle-stripe-webhook
```

## Security Notes

- **SUPABASE_ANON_KEY** — Used in client-side store.html (safe, read-only)
- **SUPABASE_SERVICE_KEY** — Used only in webhook (server-side, powerful)
- **STRIPE_WEBHOOK_SECRET** — Verifies webhook authenticity
- **INVENTORY_PASSWORD** — Protects admin interface

## API References

- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Session Object](https://stripe.com/docs/api/checkout/sessions/object)

## Files Modified

- ✅ `store.html` — Async Supabase initialization, live inventory fetch
- ✅ `netlify/functions/create-checkout.js` — Already includes cart metadata
- ✅ `netlify/functions/handle-stripe-webhook.js` — Created (new webhook handler)
- ✅ `netlify/functions/package.json` — Already includes @supabase/supabase-js
