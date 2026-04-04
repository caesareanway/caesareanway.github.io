# Inventory Manager Setup & Debugging

## What Was Fixed

The inventory app (`/.netlify/functions/inventory`) had several critical issues:

1. **Supabase initialization timing** — CDN script loaded asynchronously, but code tried to use it immediately
2. **Template literal syntax errors** — Backticks inside template literals causing parse errors
3. **Missing async/await** — Functions didn't wait for Supabase to initialize
4. **Real-time subscription errors** — Subscription attempted before Supabase was ready

## How It Works Now

```
1. User visits /.netlify/functions/inventory
2. Page loads, Supabase library loads from CDN
3. initSupabase() waits for library, creates Supabase client
4. User enters password, clicks "Sign In"
5. Password verified against INVENTORY_PASSWORD env var
6. App fetches inventory from Supabase inventory table
7. Real-time subscription created for live updates
8. +/- buttons update quantities in Supabase
```

## Required Setup

### 1. Netlify Environment Variables

Add these to your Netlify site (Site Settings → Build & Deploy → Environment):

```
SUPABASE_URL = https://lflmxpmyynjyuwvdpwqu.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
INVENTORY_PASSWORD = your-secure-password-here
```

**Get these from:**
- **SUPABASE_URL** — Supabase Dashboard → Project Settings → API
- **SUPABASE_ANON_KEY** — Supabase Dashboard → Project Settings → API (anon/public key)
- **INVENTORY_PASSWORD** — Create your own secure password

### 2. Supabase Table

Your `inventory` table must have:

```sql
CREATE TABLE inventory (
  id BIGSERIAL PRIMARY KEY,
  product TEXT UNIQUE NOT NULL,  -- 'cd', 'shirt-XL', 'shirt-2XL', 'shirt-3XL'
  quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO inventory (product, quantity) VALUES
  ('cd', 32),
  ('shirt-XL', 11),
  ('shirt-2XL', 3),
  ('shirt-3XL', 1);
```

### 3. Enable Real-time (Optional)

For real-time updates to work:
1. Go to Supabase Dashboard → Project Settings → Realtime
2. Enable Realtime for the `inventory` table
3. (Usually enabled by default)

## Testing

### Test 1: Access the App
```
Visit: https://caesarean.org/.netlify/functions/inventory
Expected: Login screen appears with password field
```

### Test 2: Login
```
1. Enter your INVENTORY_PASSWORD
2. Click "Sign In"
Expected: App loads, shows inventory cards with quantities
```

### Test 3: Update Inventory
```
1. Click + or − button on any product
2. Check Supabase inventory table
Expected: Quantity updates in Supabase, card reflects change
```

### Test 4: Real-time Sync
```
1. Open app in two browser windows
2. Update quantity in one window
3. Check the other window
Expected: Quantity updates in real-time (within seconds)
```

## Troubleshooting

### "Invalid password" on login
- Check INVENTORY_PASSWORD environment variable is set in Netlify
- Verify you're using the exact password (case-sensitive)
- Try: `echo $INVENTORY_PASSWORD` in Netlify function logs

### "Connection error: Cannot read properties of undefined"
- Supabase library failed to load
- Check SUPABASE_URL is correct and accessible
- Check SUPABASE_ANON_KEY is valid
- Open DevTools → Network tab, see if Supabase CDN script loads

### Inventory doesn't load after login
```javascript
// Check browser console for:
1. Supabase initialization logs
2. "Received X items from inventory table"
3. Any error messages
```

Solutions:
- Verify `inventory` table exists in Supabase
- Check table has `product` and `quantity` columns
- Confirm SUPABASE_ANON_KEY has read access

### Real-time updates not working
- Check Supabase Realtime is enabled: Settings → Realtime
- Verify table name is lowercase `inventory`
- Check browser console for subscription status logs
- Note: Realtime takes 2-5 seconds to sync across clients

### Update fails with "Cannot read properties of undefined"
- Ensure Supabase initialized before clicking +/−
- Wait 2-3 seconds after login before updating
- Check that updateInventory() function can access supabase object

## Browser Console Debugging

Open DevTools (F12) → Console to see debug info:

```javascript
// Should see:
✓ "Initialization: Supabase client created"
✓ "Received 4 inventory items"
✓ "Subscription created for inventory_changes"

// On update:
✓ "Updating: cd to 31"
✓ "Real-time update: {product: 'cd', quantity: 31}"
```

If you see errors, check:
1. SUPABASE_URL format
2. SUPABASE_ANON_KEY validity
3. Network tab for failed requests
4. Supabase project status (not paused)

## Admin Password

The password is set via `INVENTORY_PASSWORD` environment variable.

**To change it:**
1. Go to Netlify → Site settings → Build & deploy → Environment
2. Click the lock icon on INVENTORY_PASSWORD
3. Update the value
4. Save

**Security notes:**
- Don't use simple passwords like "123" or "admin"
- Use at least 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Never commit to git or expose in client code

## Integration with Store

The inventory manager is **separate** from the store. To sync store with inventory:

1. You manually update quantities in the inventory app
2. Supabase updates in real-time
3. Store fetches from Supabase on page load (see store.html)
4. Purchases auto-decrement via webhook

To test the full flow:
1. Update quantity in inventory app
2. Refresh store.html
3. Verify quantity displays correctly

## Files Modified

- `netlify/functions/inventory.js` — Main inventory app (fixed)
- `netlify/functions/package.json` — Added @supabase/supabase-js

## Need Help?

Check these:
1. Netlify function logs: `netlify functions:invoke inventory`
2. Browser console errors (F12)
3. Supabase table data exists
4. Environment variables are set correctly
