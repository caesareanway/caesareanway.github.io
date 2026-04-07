/**
 * CAESAREAN SPOTIFY WEB PLAYBACK SDK PLAYER
 * Authorization Code + PKCE flow (Implicit Grant deprecated by Spotify)
 */

// ================================================================
// CONFIGURATION
// ================================================================
const SPOTIFY_CLIENT_ID = '859eefa9333644eebf8cd10538a8b3fc';
const REDIRECT_URI = window.location.origin + '/main.html';
const ALBUM_ID = '0RLVNjnrScuDTnNSZgn3kN';

let token = null;
let player = null;
let deviceId = null;
let currentTrack = null;
let isPlaying = false;
let currentPosition = 0;
let duration = 0;

// ================================================================
// PKCE HELPERS
// ================================================================
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(x => possible[x % possible.length]).join('');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ================================================================
// AUTH FLOW
// ================================================================
async function startAuthFlow() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem('spotify_code_verifier', codeVerifier);

  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);

  window.location.href = authUrl.toString();
}

async function handleAuthCallback(code) {
  const codeVerifier = localStorage.getItem('spotify_code_verifier');

  if (!codeVerifier) {
    showAuthPrompt();
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      console.error('Token exchange failed:', response.status);
      showAuthPrompt();
      return null;
    }

    const data = await response.json();

    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
    localStorage.setItem('spotify_token_expires', Date.now() + (data.expires_in * 1000));
    localStorage.removeItem('spotify_code_verifier');

    // Clean ?code= from URL
    window.history.replaceState({}, document.title, window.location.pathname);

    return data.access_token;
  } catch (err) {
    console.error('Token exchange error:', err);
    showAuthPrompt();
    return null;
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_token_expires', Date.now() + (data.expires_in * 1000));
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }

    return data.access_token;
  } catch (err) {
    console.error('Refresh error:', err);
    return null;
  }
}

async function getAccessToken() {
  // Returning from Spotify OAuth — exchange code for token
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    return await handleAuthCallback(code);
  }

  // Valid stored token
  const storedToken = localStorage.getItem('spotify_access_token');
  const expiresAt = parseInt(localStorage.getItem('spotify_token_expires') || '0');
  if (storedToken && Date.now() < expiresAt - 60000) {
    return storedToken;
  }

  // Refresh if we have a refresh token
  if (localStorage.getItem('spotify_refresh_token')) {
    return await refreshAccessToken();
  }

  return null;
}

function clearSpotifyAuth() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires');
  localStorage.removeItem('spotify_code_verifier');
}

// ================================================================
// AUTH PROMPT UI
// ================================================================
function showAuthPrompt() {
  const playerContainer = document.getElementById('spotify-player');
  if (!playerContainer) return;
  playerContainer.innerHTML = `
    <div class="player-auth">
      <div class="auth-content">
        <p>Sign in with Spotify to play full tracks</p>
        <button id="auth-btn" class="auth-button">Sign In with Spotify</button>
        <p class="auth-fallback">
          Or listen on <a href="https://open.spotify.com/album/0RLVNjnrScuDTnNSZgn3kN" target="_blank" rel="noopener noreferrer">Spotify</a>
        </p>
      </div>
    </div>
  `;
  document.getElementById('auth-btn').addEventListener('click', startAuthFlow);
}

// ================================================================
// SPOTIFY WEB PLAYBACK SDK
// ================================================================
window.onSpotifyWebPlaybackSDKReady = () => {
  if (!token) return;

  player = new Spotify.Player({
    name: 'CAESAREAN Player',
    getOAuthToken: async callback => {
      const expiresAt = parseInt(localStorage.getItem('spotify_token_expires') || '0');
      if (Date.now() > expiresAt - 60000) {
        const refreshed = await refreshAccessToken();
        if (refreshed) token = refreshed;
      }
      callback(token);
    },
    volume: 0.5
  });

  let connectionTimeout = setTimeout(() => {
    console.error('Player connection timeout - no active Spotify app detected');
    const container = document.getElementById('spotify-player');
    if (container) {
      container.innerHTML = `
        <div class="player-auth">
          <div class="auth-content">
            <p style="color: #c00000; margin-bottom: 16px;">⚠ No active Spotify app found</p>
            <p>Open Spotify on your phone, desktop, or <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" style="color: #c00000; border-bottom: 1px solid #c00000;">spotify.com</a> and try again.</p>
            <button onclick="location.reload()" style="background: #c00000; color: #0a0a0a; border: none; padding: 10px 20px; margin-top: 16px; cursor: pointer; font-weight: 600;">Retry</button>
          </div>
        </div>
      `;
    }
  }, 8000);

  player.addListener('ready', ({ device_id }) => {
    clearTimeout(connectionTimeout);
    deviceId = device_id;
    console.log('Player ready, device:', device_id);
  });

  player.addListener('player_state_changed', state => {
    clearTimeout(connectionTimeout);
    if (!state) return;
    currentTrack = state.track_window.current_track;
    isPlaying = !state.paused;
    currentPosition = state.position;
    duration = state.duration;
    updateUI();
  });

  player.addListener('initialization_error', ({ message }) => {
    clearTimeout(connectionTimeout);
    console.error('Initialization error:', message);
  });

  player.addListener('authentication_error', ({ message }) => {
    clearTimeout(connectionTimeout);
    console.error('Authentication error:', message);
    clearSpotifyAuth();
    showAuthPrompt();
  });

  player.addListener('account_error', ({ message }) => {
    clearTimeout(connectionTimeout);
    console.error('Account error:', message);
  });

  player.connect();
};

// ================================================================
// PLAYBACK CONTROLS
// ================================================================
function togglePlay() {
  if (player) player.togglePlay();
}

function skipToNext() {
  if (player) player.nextTrack();
}

function skipToPrevious() {
  if (player) player.previousTrack();
}

function setVolume(value) {
  if (player) player.setVolume(parseFloat(value) / 100);
}

function seekToPosition(position) {
  if (!player || !deviceId) return;
  fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(position)}&device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch(err => console.error('Seek error:', err));
}

async function playAlbum() {
  if (!player || !deviceId || !token) return;
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context_uri: `spotify:album:${ALBUM_ID}`,
        offset: { position: 0 }
      })
    });
    if (!response.ok) console.error('Play album error:', response.statusText);
  } catch (err) {
    console.error('Play album error:', err);
  }
}

// ================================================================
// UI
// ================================================================
function updateUI() {
  const playBtn = document.getElementById('player-play-btn');
  if (playBtn) {
    playBtn.textContent = isPlaying ? '⏸' : '▶';
    playBtn.setAttribute('aria-pressed', isPlaying);
  }

  if (currentTrack) {
    const trackName = document.getElementById('player-track-name');
    const artistName = document.getElementById('player-artist-name');
    if (trackName) trackName.textContent = currentTrack.name;
    if (artistName) artistName.textContent = currentTrack.artists.map(a => a.name).join(', ');
  }

  updateProgressBar();
}

function updateProgressBar() {
  const progressBar = document.getElementById('player-progress');
  const timeDisplay = document.getElementById('player-time');

  if (progressBar && duration > 0) {
    progressBar.style.width = ((currentPosition / duration) * 100) + '%';
  }
  if (timeDisplay) {
    timeDisplay.textContent = `${formatTime(currentPosition)} / ${formatTime(duration)}`;
  }
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ================================================================
// PROGRESS POLLING
// ================================================================
setInterval(() => {
  if (isPlaying && player) {
    currentPosition = Math.min(currentPosition + 1000, duration);
    updateProgressBar();
  }
}, 1000);

// ================================================================
// BOOT
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Wire up controls
  document.getElementById('player-play-btn')?.addEventListener('click', togglePlay);
  document.getElementById('player-next-btn')?.addEventListener('click', skipToNext);
  document.getElementById('player-prev-btn')?.addEventListener('click', skipToPrevious);
  document.getElementById('player-volume')?.addEventListener('input', e => setVolume(e.target.value));
  document.getElementById('player-play-album-btn')?.addEventListener('click', playAlbum);

  document.getElementById('player-progress-container')?.addEventListener('click', e => {
    const el = document.getElementById('player-progress-container');
    const percentage = (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth;
    seekToPosition(percentage * duration);
  });

  // Get token (handles new auth callback or returns stored token)
  token = await getAccessToken();

  if (!token) {
    showAuthPrompt();
    return;
  }

  // Load SDK — onSpotifyWebPlaybackSDKReady fires when ready
  const script = document.createElement('script');
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  document.head.appendChild(script);
});
