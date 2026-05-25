# Inventory Management & Refund Guide

**Last Updated:** May 25, 2026  
**Status:** Critical system for tracking merchandise stock and handling refunds

---

## Overview

The inventory system tracks stock for:
- **CD:** `cd` (Wretched Decrepitude)
- **Eagle T-Shirts:** `eagle-shirt-S`, `eagle-shirt-M`, `eagle-shirt-L`, `eagle-shirt-XL`, `eagle-shirt-XXL`, `eagle-shirt-XXXL`
- **Head T-Shirts:** `head-shirt-XL`, `head-shirt-2XL`, `head-shirt-3XL`

**Storage:** Supabase PostgreSQL table named `inventory` with columns:
- `product` (text, primary key) — SKU identifier
- `quantity` (integer) — Current stock
- `updated_at` (timestamp) — Last update time

---

## How Inventory Decrements Work (Normal Flow)

### Customer Makes Purchase
1. Customer adds items to cart on `/store.html`
2. Clicks "Checkout →" button
3. Cart data sent to `/netlify/functions/create-checkout.js`
4. Server validates items against whitelist
5. Stripe checkout session created with **cart items stored in metadata**
6. Customer completes payment in Stripe

### Webhook Processes Payment
1. Stripe sends `checkout.session.completed` webhook event
2. Netlify function `/netlify/functions/handle-stripe-webhook.js` receives it
3. **Webhook verifies Stripe signature** (security check)
4. **Extracts cart items from session metadata**
5. For each item:
   - Fetches current inventory from Supabase
   - Subtracts quantity purchased
   - Updates Supabase with new quantity
   - Logs: `✓ Decremented {sku} by {qty} (new quantity: {X})`
6. Sends confirmation emails to admin and customer

### Why It Might Fail (Silent Failures)

The system can have **silent failures** where the webhook appears to succeed but inventory doesn't actually update:

| Failure Type | Cause | How to Detect |
|---|---|---|
| **Cart items missing** | Cart items not serialized in metadata | Webhook log shows "no cart items, skipping" |
| **SKU mismatch** | SKU name doesn't match inventory table | Webhook logs "invalid cart item" |
| **Supabase offline** | Database connection failure | Webhook logs "Failed to fetch inventory for X" |
| **Supabase RLS issue** | Row Level Security blocks updates | Update appears to succeed but quantity unchanged |
| **Webhook didn't fire** | Stripe webhook delivery failed | No logs appear in function logs at all |
| **Bad signature** | Webhook signature verification failed | Logs show "signature verification failed" |

---

## Debugging: Why Didn't Inventory Decrement?

### Step 1: Check Netlify Function Logs

**Location:** Netlify Dashboard → Functions → handle-stripe-webhook

**What to look for:**
```
✓ Decremented {sku} by {qty} (new quantity: {X})
```

If you see this log, the function attempted the update.

**If log shows error:**
```
Failed to fetch inventory for head-shirt-XL: {...}
Failed to update inventory for head-shirt-XL: {...}
```

This means Supabase rejected the update.

### Step 2: Verify in Supabase

**Location:** Supabase Dashboard → Project → SQL Editor

**Query to check inventory:**
```sql
SELECT product, quantity, updated_at 
FROM inventory 
ORDER BY updated_at DESC 
LIMIT 20;
```

**Look for:**
- Does the product SKU exist in the table?
- What's the current quantity?
- When was it last updated?
- Is the update timestamp after the purchase time?

### Step 3: Check Stripe Webhook Delivery

**Location:** Stripe Dashboard → Developers → Webhooks

**For your endpoint:**
1. Find the event `checkout.session.completed`
2. Click to see details
3. Check if response was `200 OK`
4. If not 200, see the response body for the error

### Step 4: Verify Webhook Secret

**Common issue:** Webhook secret mismatch = signature verification fails

**Check in Netlify:**
1. Go to Netlify → Functions → Settings → Environment Variables
2. Verify `STRIPE_WEBHOOK_SECRET` exists and matches Stripe

---

## Handling Refunds

### Automatic Refund in Stripe
1. Stripe Dashboard → Payments → Find the order
2. Click "Refund" button
3. Enter amount to refund
4. Confirm refund

**This refunds the MONEY but does NOT increment inventory.**

### Manual Inventory Increment (Restore Stock)

When you refund a customer, you must manually increment their items back into inventory.

#### Option A: Supabase Manual Update (Simplest)

1. **Go to Supabase Dashboard**
2. **Navigate to** Project → Editor → `inventory` table
3. **Find the product row** (e.g., `head-shirt-XL`)
4. **Click the quantity field** and update it
   - Example: was 10, customer bought 1, refund issued → change to 11
5. Click save

#### Option B: Use Refund API (Recommended for Automation)

Create a POST request to the refund endpoint:

**Endpoint:** `https://caesarean.org/.netlify/functions/handle-refund`

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "items": [
    { "sku": "head-shirt-XL", "qty": 1 },
    { "sku": "eagle-shirt-L", "qty": 2 }
  ]
}
```

**Response Example:**
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "sku": "head-shirt-XL",
      "status": "success",
      "previousQuantity": 10,
      "newQuantity": 11,
      "incrementedBy": 1
    },
    {
      "sku": "eagle-shirt-L",
      "status": "success",
      "previousQuantity": 11,
      "newQuantity": 13,
      "incrementedBy": 2
    }
  ]
}
```

---

## Current Issue: Public Customer Order (May 25, 2026)

**Situation:**
- Customer purchased 1x Head T-Shirt (XL)
- Payment completed in Stripe
- Admin received confirmation email
- **But:** Inventory still shows 11 (should be 10)

**What we know:**
- Test purchase (eagle-shirt-L) DID decrement correctly
- Webhook code looks correct
- RLS was disabled on April 6th

**What might have happened:**
1. **Most likely:** Webhook fired, but cart items weren't in metadata
   - This happens if browser has outdated `create-checkout.js` cached
   - Fix: Refresh browser cache or clear CloudFlare cache
   
2. **Less likely:** Webhook didn't fire at all
   - Check Stripe webhook delivery logs
   - Verify endpoint URL in Stripe settings

3. **Possible:** SKU name mismatch
   - Customer's order has SKU `head-shirt-XL` but table has different name
   - Query Supabase to verify exact SKU names

**Action Required:**
1. ✅ Check Netlify logs for that specific order (find by customer email in logs)
2. ✅ Verify cart items were in webhook metadata
3. ✅ Manually increment `head-shirt-XL` by 1 in Supabase OR issue refund
4. ✅ Clear browser cache to ensure next customer gets latest code
5. ✅ Monitor next few orders to ensure inventory continues to decrement

---

## Refund Process Checklist

When a customer requests a refund:

- [ ] **In Stripe:**
  1. Go to Payments → Find the order
  2. Click "Refund"
  3. Enter refund amount
  4. Confirm refund
  5. Note the order ID and items

- [ ] **In Supabase:**
  1. Go to `inventory` table
  2. Find each SKU from the order
  3. Add back the quantity purchased
     - Example: `head-shirt-XL` goes from 10 → 11 (if 1 was refunded)
  4. Verify update is saved

- [ ] **Send Customer Email:**
  - Confirm refund was processed
  - Provide tracking info or next steps
  - Use template in email documentation

- [ ] **Log the Refund:**
  - Keep a simple record of refunds (date, customer, items, reason)
  - Helpful for tracking patterns

---

## Recommended Practices

### Daily Monitoring
1. Check Stripe for new orders
2. Verify admin email received notification
3. Spot-check Supabase to confirm inventory decremented

### Weekly Inventory Audit
1. Query Supabase to see current stock levels
2. Compare to expected levels based on sales
3. Flag any discrepancies
4. Manual inventory adjustments if needed

### Before Going Fully Public
1. ✅ Monitor next 5-10 test orders carefully
2. ✅ Verify inventory decrements for each
3. ✅ Confirm webhook logs show successful processing
4. ✅ Only then announce publicly

### Cache Issues
If you update code and customers still see old behavior:
1. **Clear Netlify cache:**
   - Netlify Dashboard → Deploys → Trigger deploy (skip git push)
2. **Clear CloudFlare cache (if using):**
   - Dashboard → Caching → Purge Cache → All Files
3. **Browser cache:**
   - Ask customers to hard-refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

## Environment Variables Required

Ensure these are set in **Netlify → Functions → Environment Variables:**

| Variable | Purpose | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API key for payment processing | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook signature from Stripe | `whsec_...` |
| `SUPABASE_URL` | Supabase database endpoint | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Grants access to update inventory | `eyJ...` |
| `SENDGRID_API_KEY` | Sends purchase confirmation emails | `SG.xxx...` |
| `ADMIN_EMAIL` | Where order notifications go | `contact.caesarean@gmail.com` |
| `REFUND_TOKEN` | Security token for refund API | `admin-token-change-me` |

---

## Quick Reference: SKU Names

Copy these exact names when updating inventory:

```
cd
head-shirt-XL
head-shirt-2XL
head-shirt-3XL
eagle-shirt-S
eagle-shirt-M
eagle-shirt-L
eagle-shirt-XL
eagle-shirt-XXL
eagle-shirt-XXXL
```

---

## Troubleshooting Flowchart

```
Customer claims they paid but inventory didn't change
    ↓
1. Check Stripe: Is the payment successful?
    ├─ NO  → Refund customer, no inventory change needed
    └─ YES → Continue to step 2
    ↓
2. Check Netlify logs: Does webhook show "Decremented"?
    ├─ YES  → Inventory SHOULD have changed, check Supabase
    │         │ Is inventory correct? → No action needed, may be display lag
    │         │ Is inventory wrong?   → See step 3
    │
    └─ NO   → Webhook didn't process inventory
             1. Clear browser cache
             2. Trigger Netlify redeploy
             3. Wait 5 minutes, try another test order
             4. If still fails, check Stripe webhook delivery status
    ↓
3. Supabase shows wrong quantity
    ├─ Too LOW  → Inventory was already decremented, maybe check again in 2 min
    └─ Too HIGH → Manually increment back to correct amount
```

---

## Support

If inventory isn't working:
1. **Check logs first** — 95% of issues visible in Netlify/Stripe logs
2. **Clear cache** — Many issues resolve with fresh deployment
3. **Test with simple order** — One product, no extras, see if it works
4. **Verify environment variables** — All 7 variables must be set correctly

**Contact:** contact.caesarean@gmail.com for questions

---

**Status:** Production environment — treat inventory updates with care.
