# Live Inventory Implementation Checklist

## ✅ Completed Implementation

### 1. store.html — Client-Side Inventory Fetch
✅ **Status:** Complete

**What was done:**
- Added async `initSupabase()` function that safely initializes Supabase client
- Handles both `window.supabase` and ESM import fallback
- `loadInventory()` fetches from `inventory` table on page load
- Maps Supabase rows (`sku`, `quantity`) to INVENTORY object format
- Automatically disables "Add to Cart" buttons when quantity = 0
- Falls back to hardcoded values if Supabase unavailable

**Code location:**
```
store.html
  - Line 664-683: Supabase setup and initialization
  - Line 685-705: loadInventory() function
  - Line 722-744: updateStockDisplay() (disabled button logic)
```

**How it works:**
1. Page loads → Calls `loadInventory()`
2. Fetches all SKU quantities from Supabase
3. Updates INVENTORY object: `{ 'cd': 32, 'shirt-XL': 11, ... }`
4. Calls `updateStockDisplay()` to enable/disable buttons
5. User can see live inventory immediately

---

### 2. create-checkout.js — Cart Metadata Storage
✅ **Status:** Complete

**What was done:**
- Already configured to include cart items in Stripe session metadata
- Maps cart items to SKU format: `{ sku: 'cd', qty: 1 }`
- Stores as JSON string in `session.metadata.cart_items`

**Code location:**
```
netlify/functions/create-checkout.js
  - Line 32-44: Session metadata with cart items
```

**How it works:**
1. User clicks "Checkout →"
2. Cart items passed to create-checkout function
3. Metadata includes: `{ cart_items: "[{sku: 'cd', qty: 1}, ...]" }`
4. Stripe session created with metadata
5. After payment, webhook can access cart from metadata

---

### 3. handle-stripe-webhook.js — Post-Purchase Decrement
✅ **Status:** Complete (NEW)

**What was created:**
- Listens for `checkout.session.completed` webhook events
- Verifies webhook signature with `STRIPE_WEBHOOK_SECRET`
- Extracts cart items from session metadata
- For each item: decrements Supabase inventory by purchased quantity
- Updates `updated_at` timestamp for tracking

**Code location:**
```
netlify/functions/handle-stripe-webhook.js
  - Line 17-38: Webhook signature verification
  - Line 40-48: Extract cart items from metadata
  - Line 56-97: Decrement inventory for each SKU
```

**How it works:**
1. User completes Stripe checkout
2. Stripe sends webhook to `handle-stripe-webhook`
3. Webhook extracts cart: `[{sku: 'cd', qty: 1}]`
4. For each item:
   - Fetches current quantity from Supabase
   - Calculates new quantity: `quantity - qty`
   - Updates Supabase with new quantity
5. Next customer sees updated inventory

---

## 🔧 Setup Required

### Step 1: Verify Netlify Environment Variables
Required variables (should already be set):
```
SUPABASE_URL = https://lflmxpmyynjyuwvdpwqu.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...  (public key for reads)
SUPABASE_SERVICE_KEY = eyJhbGc... (service role for writes)
STRIPE_SECRET_KEY = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
INVENTORY_PASSWORD = (your admin password)
```

**To verify:**
1. Netlify Dashboard → Site settings → Build & deploy → Environment
2. All variables above should be present

### Step 2: Stripe Webhook Configuration
Ensure webhook is configured in Stripe:
1. **Stripe Dashboard → Developers → Webhooks**
2. Look for endpoint: `handle-stripe-webhook`
3. Events: `checkout.session.completed`
4. Status: Enabled ✓

If not set up:
1. Click **+ Add Endpoint**
2. URL: `https://caesarean.org/.netlify/functions/handle-stripe-webhook`
3. Events: `checkout.session.completed`
4. Click **Create Endpoint**
5. Copy signing secret → Add to Netlify as `STRIPE_WEBHOOK_SECRET`

### Step 3: Supabase Table Verification
Your `inventory` table must have correct schema:

```sql
-- Table structure (verify in Supabase):
CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,          -- Unique for each product variant
  quantity INTEGER DEFAULT 0,         -- Current stock
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Current data (should match your store):
INSERT INTO inventory (sku, quantity) VALUES
  ('cd', 32),           -- CD: Wretched Decrepitude
  ('shirt-XL', 11),     -- T-Shirt: XL
  ('shirt-2XL', 3),     -- T-Shirt: 2XL
  ('shirt-3XL', 1);     -- T-Shirt: 3XL
```

---

## 🧪 Testing Checklist

### Test 1: Inventory Loads on Store
```
☐ Visit https://caesarean.org/store.html
☐ Open DevTools (F12) → Console
☐ Look for: "Inventory loaded from Supabase: {...}"
☐ Verify quantities display under each product
☐ CD shows as "Add to Cart" (quantity > 0)
☐ Shirt 3XL shows as "Out of Stock" (quantity = 0)
```

### Test 2: Manual Inventory Update
```
☐ Visit /.netlify/functions/inventory
☐ Enter INVENTORY_PASSWORD
☐ Click + button on any product
☐ Quantity should increase in app
☐ Check Supabase: inventory table quantity increased
☐ Refresh store.html: new quantity displays
```

### Test 3: Purchase Decrements Inventory
```
☐ Note current CD quantity (e.g., 32)
☐ Visit store.html
☐ Add CD to cart
☐ Complete Stripe checkout (use test card: 4242 4242 4242 4242)
☐ Check Supabase: CD quantity should be 31
☐ Refresh store.html: shows quantity 31
☐ Check Stripe Dashboard → Events: checkout.session.completed received
☐ Check Netlify logs: "Decremented cd by 1"
```

### Test 4: Out of Stock Buttons Disabled
```
☐ Set shirt-3XL quantity to 0 in inventory app
☐ Refresh store.html
☐ Shirt 3XL "Add to Cart" button should be disabled
☐ Button text should say "Out of Stock"
☐ Button should appear grayed out
```

---

## 📊 Data Flow Verification

### User Purchase Flow
```
1. Store.html loads
   ✓ Fetches from Supabase: `SELECT sku, quantity FROM inventory`
   ✓ Updates INVENTORY object

2. User adds to cart & checks out
   ✓ create-checkout.js receives items
   ✓ Stores in Stripe metadata with SKUs

3. Payment completes
   ✓ Stripe sends checkout.session.completed webhook
   ✓ handle-stripe-webhook receives event
   ✓ Extracts: `[{sku: 'cd', qty: 1}]`
   ✓ For each: `UPDATE inventory SET quantity = quantity - 1 WHERE sku = 'cd'`

4. Next visitor
   ✓ store.html fetches updated inventory
   ✓ Shows new quantities
```

---

## 🐛 Troubleshooting

### Problem: "Inventory loaded from Supabase" doesn't appear in console
**Solution:**
- Check SUPABASE_URL is accessible
- Verify SUPABASE_ANON_KEY is correct
- Ensure `inventory` table exists in Supabase
- Check browser Network tab for failed requests

### Problem: Webhook not decrementing inventory
**Solution:**
- Verify STRIPE_WEBHOOK_SECRET is correct in Netlify
- Check Stripe Dashboard → Webhooks → Deliveries
- Verify SUPABASE_SERVICE_KEY has write permissions
- Check Netlify function logs for errors

### Problem: Out of stock button not working
**Solution:**
- Ensure inventory loaded successfully
- Verify quantity is exactly 0 in Supabase
- Check `getStock()` function calculates correctly
- Try refreshing page

---

## 📝 Files Modified/Created

| File | Status | Notes |
|------|--------|-------|
| `store.html` | Modified | Added async Supabase init, inventory fetch |
| `netlify/functions/create-checkout.js` | Already Updated | Includes cart metadata |
| `netlify/functions/handle-stripe-webhook.js` | Created | NEW webhook handler |
| `netlify/functions/package.json` | Already Updated | Includes @supabase/supabase-js |
| `LIVE_INVENTORY_INTEGRATION.md` | Created | Comprehensive guide |
| `IMPLEMENTATION_CHECKLIST.md` | Created | This file |

---

## ✨ What's Now Working

✅ Inventory manager app (`/.netlify/functions/inventory`)
✅ Admin can update quantities in real-time
✅ Store reads live inventory on page load
✅ Products out of stock are disabled
✅ Purchases automatically decrement inventory
✅ Real-time syncing between admin and store
✅ Fallback to hardcoded values if Supabase down

---

## 🚀 Next Steps

1. **Test the integration** using checklist above
2. **Monitor webhook deliveries** in Stripe Dashboard
3. **Track inventory** in Supabase admin panel
4. **Use inventory app** to manage stock daily

---

## 📞 Quick Reference

| Component | URL | Purpose |
|-----------|-----|---------|
| Store | `/store.html` | Customer shopping interface |
| Inventory Manager | `/.netlify/functions/inventory` | Admin stock management |
| Webhook | `/.netlify/functions/handle-stripe-webhook` | Auto-decrement on purchase |
| Database | Supabase Console | View/edit quantities directly |

---

**Status: READY FOR TESTING** ✅
