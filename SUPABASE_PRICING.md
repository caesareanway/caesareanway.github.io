# Supabase Pricing & Usage Guide

## Understanding the Pause

Your Supabase database was paused due to exceeding free tier usage limits. **This is a protection feature** — Supabase pauses projects that exceed limits to prevent surprise bills.

---

## Supabase Free Tier Limits

| Limit | Allowance | Notes |
|-------|-----------|-------|
| **Storage** | 500 MB | Database + files combined |
| **Egress (Bandwidth)** | 2 GB/month | Data sent out of Supabase |
| **API Calls** | 50,000/day | Read/write operations |
| **Auto-pause** | If exceeded | After exceeding limits |

---

## What's Using Your Quota?

For a typical merchandise store:

### Storage Usage (Minimal)
- Inventory table: ~200 bytes
- Order history (if stored): Depends on volume
- **Current usage: < 1 MB**

### API Calls (Monthly Estimate)
If you get **100 visitors/day**:
- Each visitor = 1 inventory fetch = 1 API call
- 100 visitors × 30 days = **3,000 calls/month**
- Free tier allows: **1.5 million calls/month** (50k/day)
- **You're fine.**

If you get **1000 visitors/day**:
- 1000 × 30 = **30,000 calls/month**
- Still within free tier ✓

If you get **10,000 visitors/day**:
- 10,000 × 30 = **300,000 calls/month**
- **Approaching free tier limit** ⚠️

---

## Why Did It Pause?

Possible causes:
1. **Unusual traffic spike** — Temporary surge in visitors
2. **Testing/debugging** — Multiple repeated API calls during development
3. **Webhook loop** — If checkout failed and retried many times
4. **Network issue** — Timeouts causing retries

---

## Current Status

✅ **Your database has been resumed.** You can now:
1. Monitor usage in Supabase Dashboard
2. Adjust API calls if needed
3. Upgrade to Pro tier if expecting high traffic

---

## Usage Monitoring

### View Your Current Usage
1. Go to **Supabase Dashboard**
2. Click your project
3. **Settings → Usage**
4. See:
   - Database size
   - API calls this month
   - Bandwidth used

---

## Cost Options

### Free Tier (Current)
- **Cost:** $0/month
- **API Calls:** 50,000/day (1.5M/month)
- **Storage:** 500 MB
- **Best for:** Low-traffic stores (< 50,000 visits/month)

### Pro Tier
- **Cost:** $25/month
- **API Calls:** Unlimited*
- **Storage:** 8 GB
- **Bandwidth:** 250 GB/month
- **Best for:** Growing stores (50,000+ visits/month)

*Pro tier charges overages: $0.32 per 1M API calls beyond included

---

## Recommendations

### To Stay on Free Tier
✅ **Keep doing this:**
- Your current inventory table is perfect
- Webhook approach is efficient
- Minimal storage footprint

⚠️ **Watch out for:**
- Don't enable detailed logging/audit trails
- Don't store order history in Supabase (use Stripe instead)
- Don't run batch operations during peak traffic

### If You Expect High Traffic
→ **Upgrade to Pro Tier** for $25/month
- Guaranteed unlimited API calls (overages charged)
- 8 GB storage (plenty for growth)
- Priority support

### Immediate Action (Not Required Yet)
✅ **You've already done the right thing:**
- Resume the database (done ✓)
- Continue using Stripe for order records
- Keep inventory queries minimal (1 per page load)

---

## Best Practices for Efficiency

### Current Implementation (Good!)
✅ Fetch inventory once per page load → Cache in localStorage → No repeated calls
✅ Store order data in Stripe (not Supabase) → No extra storage
✅ Use anon key for reads, service key only for webhook → Secure & efficient

### Monitor Quarterly
- Check usage in Supabase Dashboard
- Alert if approaching limits
- Plan upgrade if traffic grows

---

## Pricing Comparison

For reference, alternatives:

| Service | Free Tier | Paid Tier | Why We Use Supabase |
|---------|-----------|-----------|-------------------|
| **Supabase** | 50k API/day | $25/month | Real-time, PostgreSQL, webhooks |
| **Firebase** | 1 GB + limits | $7/month | Limited real-time features |
| **MongoDB Atlas** | 512 MB | $57/month | More expensive, no webhooks |

**Supabase is the best choice** for this store.

---

## Next Steps

1. ✅ Database resumed
2. ✅ Eagle shirt bug fixed
3. ✅ Email notifications added
4. → Monitor usage monthly
5. → Test store thoroughly before going live

---

**Summary:** Your store is on a solid plan. The free tier is appropriate for launch. Monitor usage, and upgrade to Pro ($25/month) only if traffic exceeds 50,000 visits/month.
