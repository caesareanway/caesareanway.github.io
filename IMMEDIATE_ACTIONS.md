# IMMEDIATE ACTIONS — Inventory & Refund Issue

**Date:** May 25, 2026  
**Status:** PUBLIC CUSTOMER ORDER NEEDS FIX  
**Time Required:** 5-10 minutes

---

## What Happened

- Customer purchased: **1x Head T-Shirt (XL)**
- Payment: ✅ Completed in Stripe
- Email notification: ✅ Admin received
- Inventory update: ❌ **FAILED** (still shows 11, should be 10)

---

## Fix Now: Option A (Fastest - 2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com
2. Select your project (CAESAREAN)
3. Click **Editor** (left menu)

### Step 2: Open inventory table
1. Click `inventory` table
2. Find the row where `product` = `head-shirt-XL`

### Step 3: Update the quantity
1. Click on the `quantity` field (currently shows 11)
2. Change it to `10`
3. Press Enter or click elsewhere
4. ✅ Done! Inventory is now correct.

**Why it's 10:** Customer bought 1, so 11 - 1 = 10

---

## Fix Now: Option B (Recommended if you set up refund API)

### Prerequisites
You need to have created `REFUND_TOKEN` in Netlify. If you haven't:

1. Go to Netlify Dashboard
2. Site Settings → Functions → Environment Variables
3. Create new variable:
   - Name: `REFUND_TOKEN`
   - Value: Generate a secure token (use any strong password)
4. Save and deploy

### Then run the refund command:
```bash
curl -X POST https://caesarean.org/.netlify/functions/handle-refund \
  -H "Authorization: Bearer YOUR_REFUND_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "sku": "head-shirt-XL", "qty": 1 }
    ]
  }'
```

Replace `YOUR_REFUND_TOKEN` with your actual token.

**Expected response:**
```json
{
  "success": true,
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

Wait, that's backwards! We need to *decrement* by 1, not increment. Let me clarify...

---

## Actually: The Real Fix

**Current state:** `head-shirt-XL` quantity = **11**  
**What it should be:** `head-shirt-XL` quantity = **10**  
**Action:** Subtract 1 (decrease the inventory)

### Fix: Go to Supabase and change 11 → 10

This is the immediate fix. The refund system is for when you're *giving inventory back* to a customer (like if you process a refund and need to restock).

**Steps:**
1. Supabase Dashboard → Editor → `inventory` table
2. Find `head-shirt-XL` row
3. Change quantity from `11` to `10`
4. Save
5. ✅ Fixed!

---

## After You Fix The Quantity

### Step 1: Check what went wrong

**Why didn't it automatically decrement?** 

The most likely cause is the webhook didn't have the cart items in the metadata. This happens when:
- Browser has old code cached
- Netlify hasn't deployed latest code

**Fix this:**
1. Go to Netlify Dashboard
2. Navigate to Deploys
3. Click "Trigger deploy" (without pushing new code)
4. Wait for deploy to complete (~1 min)
5. Clear your browser cache: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Step 2: Test with new order

Make a small test purchase:
1. Go to `/store.html`
2. Add a **CD** to cart ($10)
3. Complete test payment with card: `4242 4242 4242 4242`

**Then check:**
- ✅ Did you get admin email? (should arrive within 1 min)
- ✅ Did `cd` quantity in Supabase decrease by 1?
- ✅ Check Netlify logs to see "✓ Decremented cd by 1"

If all three ✅, the system is working again.

---

## Setup Refund System (For Future Use)

When a customer wants a refund:

### 1. Process refund in Stripe
1. Stripe Dashboard → Payments
2. Find the order
3. Click "Refund"
4. Confirm refund amount
5. ✅ Money goes back to customer

### 2. Restore inventory in Supabase
1. Supabase → `inventory` table
2. Find the product (e.g., `head-shirt-XL`)
3. Add back the quantity
   - Example: Was 10, refunded 1 → change to 11
4. Save

**That's it.** Customer refunded + inventory restored.

---

## Verification Checklist

- [ ] Supabase shows `head-shirt-XL` = 10 (fixed from 11)
- [ ] Netlify cache cleared
- [ ] Browser cache cleared
- [ ] Made test purchase with CD
- [ ] Received admin email for test purchase
- [ ] Supabase shows `cd` quantity decreased by 1
- [ ] Netlify logs show "✓ Decremented cd by 1"

If all checked ✅, **you're ready to take public orders again**.

---

## If Inventory Still Won't Decrement

**Problem:** Even after clearing cache and redeploying, inventory isn't decreasing

**Debug steps:**

1. **Check Netlify logs:**
   - Netlify Dashboard → Functions → handle-stripe-webhook
   - Look for your test order
   - Does it say "✓ Decremented"?
   - Or does it say "Failed to..."?

2. **Check Stripe webhook delivery:**
   - Stripe Dashboard → Developers → Webhooks
   - Find your endpoint
   - Look at recent events
   - Did webhook return 200 OK?
   - Or did it fail/timeout?

3. **Check Supabase directly:**
   - Is the `inventory` table accessible?
   - Can you manually change a quantity?
   - Are RLS policies preventing updates?

4. **Run the audit script:**
   ```bash
   SUPABASE_URL=https://xxx.supabase.co \
   SUPABASE_SERVICE_KEY=eyJ... \
   node inventory-audit.js
   ```

---

## Help Documentation

- **Full inventory guide:** `/INVENTORY_MANAGEMENT_GUIDE.md`
- **Refund system setup:** `/REFUND_SYSTEM_SETUP.md`
- **Audit script:** `/inventory-audit.js`

---

## Summary

**Right now:**
1. ✅ Fix inventory: Change `head-shirt-XL` from 11 → 10 in Supabase (2 min)
2. ✅ Redeploy: Trigger Netlify deploy (1 min)
3. ✅ Test: Make test purchase with CD, verify it decrements (5 min)

**After that:**
- Monitor next few orders
- Ensure decrement is working
- Document the issue for later analysis
- Set up refund system (see REFUND_SYSTEM_SETUP.md)

**Status:** You're ready to get back to taking orders
