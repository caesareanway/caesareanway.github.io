# Pre-Launch Testing Checklist ✓

**Status:** Ready for comprehensive testing  
**Changes Made:** Eagle shirt bug fixed, email notifications added  
**Next Step:** Run through this checklist before going live  

---

## Section 1: Eagle Shirt Bug Fix ✓

### Desktop Testing
- [ ] Visit `/store.html` on desktop
- [ ] Scroll to Eagle shirt section
- [ ] Select a size (e.g., M)
- [ ] Click "Add to Cart" button
- [ ] **Should work** — Button shows "✓ Added"
- [ ] Cart opens showing the eagle shirt
- [ ] Item shows: "Eagle (M)" with price "$20"

### Mobile Testing
- [ ] Visit `/store.html` on mobile (< 768px width)
- [ ] Scroll to Eagle shirt
- [ ] Select a size
- [ ] Click "Add to Cart"
- [ ] **Should work** — No errors
- [ ] Cart displays correctly on mobile

### All Eagle Sizes
Test each size to ensure they all work:
- [ ] Eagle S - Add to cart
- [ ] Eagle M - Add to cart
- [ ] Eagle L - Add to cart
- [ ] Eagle XL - Add to cart
- [ ] Eagle XXL - Add to cart
- [ ] Eagle XXXL - Add to cart

---

## Section 2: Cart Functionality

### Adding Multiple Items
- [ ] Add 1 Eagle (M) to cart
- [ ] Add 1 Head (XL) to cart
- [ ] Add 1 CD to cart
- [ ] Cart shows 3 items
- [ ] Cart count badge shows "3"
- [ ] Cart displays all three products with correct prices

### Cart Calculations
- [ ] Subtotal: $20 + $20 + $10 = $50
- [ ] Shipping: $5.00
- [ ] Total: $55.00
- **Verify** these numbers are correct

### Quantity Controls
- [ ] Increase Eagle quantity to 2
- [ ] Subtotal updates to $70
- [ ] Total updates to $75
- [ ] Decrease quantity back to 1
- [ ] Totals recalculate correctly
- [ ] Remove Eagle from cart
- [ ] Cart shows only Head + CD

### Cart Persistence
- [ ] Add items to cart
- [ ] Refresh page (`Cmd+R` / `Ctrl+R`)
- [ ] **Cart items should still be there**
- [ ] Close cart drawer
- [ ] Refresh page again
- [ ] Cart still persists

---

## Section 3: Checkout Flow (TEST MODE)

### Before Checkout
1. Go to **Stripe Dashboard** → **Developers**
2. Toggle to **Viewing test data**
3. Ensure you're in TEST mode (not live)

### Test Purchase - All Products
- [ ] Clear cart
- [ ] Add: Eagle (L), Head (2XL), CD
- [ ] Click "Checkout →"
- [ ] Redirects to Stripe Checkout page
- [ ] Items list shows all three products
- [ ] Subtotal: $50
- [ ] Shipping: $5.00
- [ ] Total: $55.00
- [ ] **Stripe page loads** without errors

### Customer Email Entry
- [ ] Enter test email: `test@example.com`
- [ ] Enter shipping address (use US address)
- [ ] Continue to payment

### Test Card Payment
- [ ] Card number: `4242 4242 4242 4242`
- [ ] Expiry: Any future date (e.g., 12/25)
- [ ] CVC: `123`
- [ ] Click "Pay"
- [ ] **Should process successfully**
- [ ] Redirects to `/success.html`
- [ ] Success page shows order confirmation

---

## Section 4: Email Notifications ⭐ (NEW)

### Admin Email Received
After test purchase above:
- [ ] Check `contact.caesarean@gmail.com` inbox
- [ ] **Should receive email titled:** "New Order — 1x Eagle T-Shirt (L), 1x Head T-Shirt (2XL), 1x Wretched Decrepitude CD"
- [ ] Email contains:
  - [ ] Order ID
  - [ ] Customer name
  - [ ] Customer email
  - [ ] Shipping address
  - [ ] Item list with prices
  - [ ] Total amount ($55.00)

### Customer Email Received
- [ ] Check `test@example.com` inbox (you may need a temp email service)
- [ ] **Should receive email titled:** "Order Confirmation — Caesarean"
- [ ] Email contains:
  - [ ] Thank you message
  - [ ] Item list
  - [ ] Total ($55.00)
  - [ ] Shipping address
  - [ ] "5-7 business days" delivery estimate
  - [ ] Support contact info

---

## Section 5: Inventory Updates

### Before Purchase
- [ ] Open browser DevTools (F12)
- [ ] Go to `/store.html`
- [ ] Console shows: `Inventory loaded from Supabase: {...}`
- [ ] Check Supabase Dashboard:
  - [ ] Go to `inventory` table
  - [ ] Note current quantities:
    - [ ] `cd`: ? (note the number)
    - [ ] `eagle-shirt-L`: ? (note the number)
    - [ ] `head-shirt-2XL`: ? (note the number)

### After Test Purchase
- [ ] Refresh `/store.html`
- [ ] Check Supabase again
- [ ] Quantities should have decremented:
  - [ ] `cd` decreased by 1
  - [ ] `eagle-shirt-L` decreased by 1
  - [ ] `head-shirt-2XL` decreased by 1
- [ ] Store page shows updated inventory
- [ ] Netlify function logs show: `✓ Decremented [sku] by 1`

---

## Section 6: Out of Stock Behavior

### Set Low Stock
1. Go to Supabase `inventory` table
2. Change one SKU to 0 (e.g., `eagle-shirt-XXXL`)
3. Change another to 2 (e.g., `cd`)

### Verify UI Updates
- [ ] Refresh `/store.html`
- [ ] Eagle XXXL button says "Out of Stock"
- [ ] Eagle XXXL button is disabled (grayed out)
- [ ] CD shows "Add to Cart" normally
- [ ] When selecting sizes, if stock < 5, shows "(X left)"

### Try Adding Out of Stock Item
- [ ] Try clicking "Out of Stock" button
- [ ] **Should not add to cart**
- [ ] No console errors

---

## Section 7: Mobile Responsiveness

### 3-Column Desktop (> 1200px)
- [ ] View on desktop browser
- [ ] All 3 products (Eagle, Head, CD) in one row
- [ ] Equal column widths
- [ ] Proper spacing between columns
- [ ] No overflow or wrapping

### 2-Column Tablet (768px - 1200px)
- [ ] Resize browser to ~900px wide
- [ ] Should show 2 products per row
- [ ] Eagle + Head in first row
- [ ] CD in second row
- [ ] Proper spacing

### 1-Column Mobile (< 768px)
- [ ] Resize browser to ~375px wide
- [ ] All products stack vertically
- [ ] Single column layout
- [ ] Full width products
- [ ] Size selectors full width
- [ ] Buttons full width

### Mobile Cart
- [ ] Open cart on mobile
- [ ] Cart drawer slides in from right
- [ ] Can close by clicking X
- [ ] Can close by clicking overlay
- [ ] Items display with correct formatting
- [ ] Quantity controls work
- [ ] Checkout button accessible

---

## Section 8: Image Display & Zoom

### Eagle Front/Back Buttons
- [ ] Click Eagle shirt image
- [ ] Zoom modal opens with large image
- [ ] Shows FRONT image
- [ ] Can click BACK button (under image)
- [ ] Shows BACK image
- [ ] Can click FRONT again to go back
- [ ] Close button (X) closes modal
- [ ] Pressing ESC closes modal
- [ ] Page shows correct button highlighted

### Head Front/Back Buttons
- [ ] Click Head shirt image
- [ ] Zoom modal shows FRONT
- [ ] Click BACK to see back photo
- [ ] Navigation arrows appear
- [ ] Click arrows to cycle through
- [ ] Shows "1 / 2" and "2 / 2" indicators
- [ ] Works correctly

### CD Image
- [ ] Click CD image
- [ ] Zoom modal shows album art
- [ ] No navigation buttons (only 1 image)
- [ ] Close works normally

---

## Section 9: Error Handling

### Simulate Network Issues (Optional)
1. Open DevTools (F12)
2. Go to **Network** tab
3. Set throttle to "Slow 3G"

- [ ] Page still loads
- [ ] Inventory fetches (might be slow)
- [ ] Add to cart still works
- [ ] Checkout works
- [ ] Cart persists on refresh

### Missing Size Selection
- [ ] Try to add Eagle without selecting size
- [ ] **Should show error:** Border turns red
- [ ] Focus moves to size selector
- [ ] Must select size to add to cart
- [ ] Same behavior for Head shirt

---

## Section 10: Desktop Features

### Navigation Bar
- [ ] All navigation links visible: Music, Store, Upcoming, Previous, Photos, Bio/Contact
- [ ] Active link for "Store" is highlighted
- [ ] Instagram link works (opens in new tab)
- [ ] Cart button shows count badge when items added

### Express Checkout (Apple Pay / Google Pay)
- [ ] If on Safari or Chrome with payment method:
  - [ ] Select size for Eagle
  - [ ] "— or —" text appears below "Add to Cart"
  - [ ] Payment button appears
  - [ ] Clicking button initiates payment
- [ ] If not available:
  - [ ] No payment button shown
  - [ ] Normal checkout only

### Stripe Form Styling
- [ ] All inputs properly styled
- [ ] Labels clear and visible
- [ ] Error messages readable
- [ ] Submit button prominent

---

## Section 11: Pre-Launch Checklist

### Code & Configuration
- [ ] All fixes committed to git
- [ ] No console errors on page load
- [ ] No console errors after checkout
- [ ] Netlify build succeeds
- [ ] Environment variables set correctly:
  - [ ] STRIPE_SECRET_KEY (production key starting with `sk_live_`)
  - [ ] STRIPE_WEBHOOK_SECRET
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_KEY
  - [ ] SENDGRID_API_KEY
  - [ ] ADMIN_EMAIL

### Database
- [ ] Supabase database running
- [ ] `inventory` table has correct data
- [ ] Webhook endpoint configured in Stripe
- [ ] SendGrid API key active

### Domains & SSL
- [ ] Domain resolves to correct site
- [ ] HTTPS working (green lock)
- [ ] Certificate valid

---

## Testing with Real Stripe (When Ready)

⚠️ **Do NOT use real keys until all tests pass**

When confident:
1. Generate real Stripe API keys
2. Set `STRIPE_SECRET_KEY` to production key (`sk_live_...`)
3. Set `STRIPE_WEBHOOK_SECRET` to real endpoint
4. Re-run all tests with real payment cards
5. Make a real test purchase
6. Verify email to YOUR email address
7. Verify inventory decremented in Supabase

---

## Final Approval

After completing above sections, you can:

✅ **Deploy to production** when:
- [ ] All tests passed on desktop
- [ ] All tests passed on mobile
- [ ] Cart persists correctly
- [ ] Emails sent to admin and customer
- [ ] Inventory updated after purchase
- [ ] No console errors
- [ ] All three products work (Eagle, Head, CD)

---

## Troubleshooting During Testing

| Problem | Solution |
|---------|----------|
| Eagle shirt says "product invalid" | This is fixed. If still happening, clear localStorage: DevTools → Application → Clear Site Data |
| No email received | Check spam/junk folder. Verify `SENDGRID_API_KEY` is set. Check Netlify function logs. |
| Inventory not decremented | Check Stripe webhook in Dashboard. Verify webhook signature secret. Check Netlify logs for errors. |
| Cart doesn't persist | Check localStorage isn't disabled. Try different browser. Clear cache. |
| Mobile layout broken | Check viewport meta tag. Resize browser slowly. Check for JavaScript errors in console. |

---

**Ready to launch? Let me know when you've completed this checklist!**
