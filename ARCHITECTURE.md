# CAESAREAN Site Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR BANDMATES                            │
│                    (accessing from phone/laptop)                 │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ Visit: caesarean.org/.netlify/functions/inventory
                            │ Enter password: "milk"
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NETLIFY (Hosting)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Environment Variables (HIDDEN - not in GitHub)          │   │
│  │ • SUPABASE_URL                                          │   │
│  │ • SUPABASE_ANON_KEY                                     │   │
│  │ • INVENTORY_PASSWORD = "milk"  ← YOU MANAGE THIS HERE  │   │
│  │ • STRIPE_PUBLISHABLE_KEY                                │   │
│  │ • STRIPE_SECRET_KEY                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                      │
│                            ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Netlify Function: /.netlify/functions/inventory.js       │   │
│  │ • Reads password from environment: "milk"               │   │
│  │ • Reads Supabase credentials from environment           │   │
│  │ • Serves HTML with credentials injected                 │   │
│  │ • NO SECRETS IN CODE, NO SECRETS IN GITHUB              │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ Inventory updates
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Database)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ inventory table                                         │   │
│  │ ├─ cd: 32                                               │   │
│  │ ├─ shirt-XL: 11                                         │   │
│  │ ├─ shirt-2XL: 3                                         │   │
│  │ └─ shirt-3XL: 1                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Real-time sync: All bandmates see updates instantly            │
└─────────────────────────────────────────────────────────────────┘


          ↓ When inventory is ready to go live ↓


┌──────────────────────────────────────────────────────────────────┐
│                    STORE (Live Site)                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ store.html                                                 │  │
│  │ INVENTORY = { 'cd': 32, 'shirt-XL': 11, ... }             │  │
│  │ ↑ Copy-paste generated code here                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Password Management

**Where to change the password:**
- Go to Netlify Dashboard → Your Site → Settings → Environment
- Find `INVENTORY_PASSWORD`
- Change value from "milk" to whatever you want
- Netlify auto-redeployes functions with the new password
- **Bandmates use the new password immediately** (no code changes needed)

## Workflow

1. **At a show/event:**
   - Bandmate visits: `caesarean.org/.netlify/functions/inventory`
   - Enters password: "milk"
   - Clicks +/- to adjust inventory in real-time
   - Everyone else sees changes instantly (Supabase real-time sync)

2. **End of day:**
   - Click "Copy Code" in the inventory app
   - Paste into `store.html` (line with `INVENTORY = {...}`)
   - Push to GitHub
   - Live inventory updates on the site

## Files

- `store.html` — Has hardcoded inventory (updated manually from inventory app)
- `netlify/functions/inventory.js` — Serves inventory manager (reads secrets from env vars)
- `netlify/functions/create-checkout.js` — Stripe checkout
- `netlify/functions/create-payment-intent.js` — Apple Pay

## Security

✅ Supabase credentials: Hidden in Netlify env vars
✅ Stripe keys: Hidden in Netlify env vars
✅ Admin password: Managed in Netlify env vars, never in code
✅ GitHub: Only contains safe, public code
