# Spotify Web Playback SDK Player Setup

## Overview
This document explains how to set up and configure the custom Spotify Web Playback SDK player on caesarean.org.

## What's New
- **Full album playback** instead of 30-second previews
- **Custom dark industrial UI** matching your site design
- **Spotify OAuth authentication** for verified users
- **Responsive design** for mobile & desktop
- **Custom controls**: play/pause, skip, volume, progress seeking

## Setup Instructions

### Step 1: Get Spotify Developer Credentials

1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (create one if needed)
3. Accept the terms and create an app
4. Name it something like "CAESAREAN Player"
5. Accept the service agreement and create the app
6. You'll see your **Client ID** — copy this

### Step 2: Configure Redirect URI

1. In your Spotify app settings, go to **Edit Settings**
2. Add the following to **Redirect URIs**:
   ```
   https://caesarean.org/main.html
   ```
   (Use `http://localhost:8000/main.html` for local testing)
3. Click **Save**

### Step 3: Add Client ID to player.js

1. Open `js/player.js`
2. Find this line at the top:
   ```javascript
   const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';
   ```
3. Replace `YOUR_SPOTIFY_CLIENT_ID_HERE` with your actual Client ID from Step 1
4. Save the file

### Step 4: Deploy & Test

The player is now ready! When users visit the Music page:
- They'll see "Sign in with Spotify" button
- Click to authenticate with their Spotify account
- Player loads with full album playback
- Controls: play/pause, next/previous, volume, seek bar

## File Structure

```
caesareanway.github.io/
├── main.html              (Updated with player UI)
├── css/
│   ├── styles.css        (Existing site styles)
│   └── player.css        (New player styles)
└── js/
    └── player.js         (Spotify SDK integration)
```

## Features

### Authentication
- OAuth flow with Spotify
- Token stored in localStorage
- Auto-refreshes if needed
- Fallback link to Spotify if not authenticated

### Playback
- Play/pause full tracks
- Skip forward/backward through album
- Volume control (0-100%)
- Progress bar with click-to-seek

### UI
- **Dark background** (#050505) with red borders
- **Bebas Neue display font** for track names
- **Red accents** (#c00000) matching site design
- **Responsive** layout for all screen sizes
- **Accessible**: ARIA labels, keyboard support, focus indicators

### Mobile
- Adapted layout for touch screens
- Larger tap targets
- Vertical controls on narrow screens
- Proper spacing and sizing

## Customization

### Change the Album
To play a different album, find this line in `js/player.js`:
```javascript
const ALBUM_ID = '0RLVNjnrScuDTnNSZgn3kN';
```
Replace with any Spotify album ID (from spotify.com URLs).

### Adjust Colors
Edit `css/player.css` or modify CSS variables in `styles.css`:
```css
--red:     #c00000;  /* Primary accent */
--bg:      #0a0a0a;  /* Background */
--fg:      #f0f0f0;  /* Text */
```

### Adjust Styling
The player respects all existing site design tokens:
- `--display` font (Bebas Neue)
- `--body` font (Inter)
- `--border` color
- Responsive breakpoints at 900px and 600px

## Troubleshooting

### "Sign in with Spotify" button doesn't appear
- Check browser console for errors
- Verify Client ID is correct in `js/player.js`
- Verify redirect URI matches exactly in Spotify dashboard

### Player loads but shows "Loading..."
- User may not be authenticated yet
- Check localStorage for `spotify_access_token`
- Verify user's Spotify account has permission to stream

### Playback doesn't start
- User must have active Spotify app (mobile/desktop)
- Can't have 2+ apps playing simultaneously
- Verify Spotify premium account (free tier won't stream)
- Check browser console for errors

### Styling looks off
- Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check that `css/player.css` is loading
- Verify CSS custom properties (variables) are defined

## Browser Support
- Chrome/Edge 80+
- Firefox 75+
- Safari 14+
- Mobile browsers: iOS Safari 14+, Chrome Android 80+

## Security Notes
- Client ID is public (it's in the code)
- User authentication is handled by Spotify
- Tokens are stored in browser localStorage
- HTTPS required in production

## Performance
- Lazy-loads Spotify SDK (only when player initializes)
- Minimal DOM footprint
- CSS-only animations (no JS for perf)
- No external dependencies beyond Spotify SDK

## Support
For issues with the Spotify SDK:
- [Spotify Web Playback SDK Docs](https://developer.spotify.com/documentation/web-playback-sdk)
- [Web Playback SDK Reference](https://developer.spotify.com/documentation/web-api/reference/player)
- [Spotify Community Forum](https://community.spotify.com/t5/Spotify-for-Developers/ct-p/spotify-for-developers)
