# Refund System Setup

**Created:** May 25, 2026  
**Purpose:** Enable refund processing and inventory restoration when customers request refunds  
**Status:** Ready for immediate use

---

## Problem Statement

**Issue:** When a public customer purchased Head T-Shirt (XL), the Stripe payment went through, but the inventory in Supabase didn't decrement. The quantity still shows 11 (should be 10).

**Root Cause:** Unknown (under investigation). Could be:
- Webhook didn't fire properly
- Cart items weren't in metadata
- Supabase update failed silently
- Browser cache issue causing old code to run

**What We've Built:** A complete refund system that lets you:
1. Manually adjust inventory in Supabase
2. Use an API to increment inventory for refunded orders
3. Audit current inventory levels
4. Detect and troubleshoot issues

---

## What Was Created

### 1. Refund API Function
**File:** `/netlify/functions/handle-refund.js`

**Purpose:** Increments inventory when a refund is issued

**How to use:**

```bash
curl -X POST https://caesarean.org/.netlify/functions/handle-refund \
  -H "Authorization: Bearer {REFUND_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "sku": "head-shirt-XL", "qty": 1 }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 1,
    "successful": 1,
    "failed": 0
  },
  "results": [
    {
      "sku": "head-shirt-XL",
      "status": "success",
      "previousQuantity": 10,
      "newQuantity": 11,
      "incrementedBy": 1
    }
  ]
}
```

### 2. Inventory Management Guide
**File:** `/INVENTORY_MANAGEMENT_GUIDE.md`

**Contains:**
- How the inventory system works (normal flow)
- Why inventory might fail to decrement (7 common causes)
- Step-by-step debugging process
- Manual refund procedures (both methods)
- Recommended practices (daily, weekly, before going public)
- Troubleshooting flowchart

### 3. Inventory Audit Script
**File:** `/inventory-audit.js`

**Purpose:** Check current inventory levels and detect issues

**How to run:**
```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
node inventory-audit.js
```

**What it shows:**
- All current inventory levels
- Missing SKUs (if any)
- Total units and estimated value
- Low stock alerts
- Recent update timestamps
- Instructions for manual adjustments

---

## Environment Variable: REFUND_TOKEN

The refund API requires an `ADMIN_TOKEN` for security.

### Setup

1. **Generate a secure token:**
   ```bash
   openssl rand -base64 32
   # Output: something like: kG9x2mL8qR5jN3zP7vT1bW2cX5yF6uH9iO0kL3mN5p=
   ```

2. **Add to Netlify Environment Variables:**
   - Go to Netlify Dashboard
   - Site Settings → Functions → Environment Variables
   - Add new variable:
     - Name: `REFUND_TOKEN`
     - Value: (paste the token from step 1)
   - Save

3. **Use the token:**
   - Always include in refund requests: `Authorization: Bearer {REFUND_TOKEN}`
   - Never share or expose this token
   - If compromised, regenerate and update in Netlify

---

## Immediate Action: Fix the Public Customer's Order

**Customer:** Purchased 1x Head T-Shirt (XL) on May 24-25, 2026

**What happened:**
- ✅ Payment successful in Stripe
- ✅ Admin received notification email
- ❌ Inventory didn't decrement (still shows 11, should show 10)

**What to do now:**

### Option 1: Manual Supabase Fix (Fastest)
1. Go to Supabase Dashboard
2. Project → Editor → `inventory` table
3. Find row with `product` = `head-shirt-XL`
4. Change `quantity` from 11 to 10
5. Scroll right and verify `updated_at` timestamp
6. Done (inventory fixed)

### Option 2: Use Refund API (Recommended)
1. Ensure `REFUND_TOKEN` is set in Netlify
2. Make API request:
   ```bash
   curl -X POST https://caesarean.org/.netlify/functions/handle-refund \
     -H "Authorization: Bearer {YOUR_REFUND_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{ "items": [{ "sku": "head-shirt-XL", "qty": 1 }] }'
   ```
3. Verify response shows success
4. Done (inventory fixed)

### Option 3: Stripe Refund + Inventory Adjustment
If the customer also requests a refund:
1. Issue refund in Stripe (money goes back to customer)
2. Then follow Option 1 or 2 above (increments inventory)
3. Send customer confirmation email

---

## Prevention: Why This Happened

**Likely causes:**

1. **Browser cache:** Old `create-checkout.js` code running, cart items not in metadata
   - Fix: Clear Netlify cache, ask customer to refresh

2. **Webhook didn't fire:** Stripe webhook delivery failed silently
   - Fix: Monitor Stripe webhook delivery status
   - Verify webhook endpoint URL in Stripe settings

3. **SKU mismatch:** Product ID doesn't match inventory table name
   - Fix: Run audit script to verify SKU names
   - Ensure create-checkout.js whitelist matches inventory table

4. **Supabase RLS:** Row Level Security blocking updates (even though disabled)
   - Fix: Verify RLS is disabled in Supabase
   - Check service key has UPDATE permissions

### To Prevent Future Issues:

1. **Before every deployment:**
   - Clear Netlify cache: Netlify → Deploys → Trigger deploy
   - Or hard-refresh CloudFlare if using
   - Run audit script to verify

2. **Monitor webhook status:**
   - Stripe Dashboard → Developers → Webhooks
   - Check recent deliveries
   - Ensure response is 200 OK

3. **Test every few orders:**
   - Check Netlify logs for "Decremented" messages
   - Verify quantities in Supabase match expectations
   - If discrepancies, manually adjust

4. **Stay informed:**
   - Check logs after each order for first week
   - Set up alerts if Stripe webhooks fail

---

## Testing the Refund System

### Test 1: Simple Refund API Call

**Prerequisites:**
- `REFUND_TOKEN` set in Netlify
- At least one product in inventory

**Steps:**
```bash
curl -X POST https://caesarean.org/.netlify/functions/handle-refund \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{ "items": [{ "sku": "cd", "qty": 1 }] }'
```

**Expected response:** 200 OK with success: true

**Then verify:**
- Go to Supabase inventory table
- Find `cd` row
- Quantity should have incremented by 1

### Test 2: Multiple Items Refund

```bash
curl -X POST https://caesarean.org/.netlify/functions/handle-refund \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "sku": "head-shirt-XL", "qty": 1 },
      { "sku": "eagle-shirt-L", "qty": 2 }
    ]
  }'
```

**Verify:** Both SKUs incremented correctly in Supabase

### Test 3: Invalid Token

```bash
curl -X POST https://caesarean.org/.netlify/functions/handle-refund \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "items": [{ "sku": "cd", "qty": 1 }] }'
```

**Expected:** 403 Forbidden with error: "Invalid token"

---

## Monitoring Checklist

After implementing this system:

- [ ] REFUND_TOKEN generated and added to Netlify
- [ ] Refund API tested with sample request
- [ ] Manual Supabase adjustment tested (change a quantity, restore it)
- [ ] Audit script run to verify current state
- [ ] Public customer's order manually corrected (head-shirt-XL: 11 → 10)
- [ ] Netlify logs checked for webhook errors
- [ ] Stripe webhook delivery status verified
- [ ] Next 3 test orders monitored to ensure inventory decrements
- [ ] Team trained on refund process
- [ ] Documentation printed/saved for reference

---

## Summary

**What You Can Do Now:**

1. ✅ **Quickly fix the customer's order** — Manual Supabase adjustment (30 seconds)
2. ✅ **Process refunds** — Use Refund API or manual method
3. ✅ **Audit inventory** — Run script to see current state
4. ✅ **Troubleshoot issues** — Follow debugging flowchart
5. ✅ **Monitor ongoing orders** — Check logs and quantities

**Critical Next Steps:**

1. Generate and set `REFUND_TOKEN` in Netlify
2. Manually correct the public customer's head-shirt-XL from 11 → 10
3. Monitor next few orders to ensure decrement is working
4. Run audit script weekly to track inventory

**Timeline:**

- **Immediate (now):** Fix public customer's order
- **Within 1 hour:** Set REFUND_TOKEN, test refund API
- **Within 24 hours:** Monitor next orders, verify system working
- **Weekly:** Run audit, check for discrepancies

---

## Need Help?

**Check these first:**
1. `/INVENTORY_MANAGEMENT_GUIDE.md` — Detailed troubleshooting
2. Netlify function logs — Shows what happened
3. Stripe webhook delivery — Confirms webhook fired
4. Supabase activity logs — Shows database changes

**If still stuck:**
- Review the debugging flowchart in INVENTORY_MANAGEMENT_GUIDE.md
- Run the audit script to get current state
- Check environment variables are correctly set

**Status:** ✅ Ready for production use
