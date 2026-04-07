/**
 * CAESAREAN SPOTIFY WEB PLAYBACK SDK PLAYER
 * Custom player for Wretched Decrepitude album with OAuth authentication
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
// INITIALIZATION
// ================================================================
window.onSpotifyWebPlaybackSDKReady = () => {
  initPlayer();
};

function initPlayer() {
  token = getAccessToken();

  if (!token) {
    showAuthPrompt();
    return;
  }

  initializeSDK();
}

function initializeSDK() {
  const script = document.createElement('script');
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  document.head.appendChild(script);
}

// ================================================================
// OAUTH FLOW
// ================================================================
function getAccessToken() {
  // Check URL for authorization code (redirect from Spotify)
  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = params.get('access_token');

  if (accessToken) {
    localStorage.setItem('spotify_access_token', accessToken);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return accessToken;
  }

  return localStorage.getItem('spotify_access_token');
}

function showAuthPrompt() {
  const playerContainer = document.getElementById('spotify-player');
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

function startAuthFlow() {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('show_dialog', 'true');

  window.location.href = authUrl.toString();
}

// ================================================================
// SPOTIFY WEB PLAYBACK SDK
// ================================================================
window.onSpotifyWebPlaybackSDKReady = () => {
  token = getAccessToken();

  if (!token) {
    showAuthPrompt();
    return;
  }

  player = new Spotify.Player({
    name: 'CAESAREAN Player',
    getOAuthToken: callback => {
      callback(token);
    },
    volume: 0.5
  });

  setupPlayerListeners();
  player.connect();
};

function setupPlayerListeners() {
  // Connection established
  player.addListener('player_state_changed', state => {
    if (!state) return;

    currentTrack = state.track_window.current_track;
    isPlaying = !state.paused;
    currentPosition = state.position;
    duration = state.duration;
    deviceId = state.device.device_id;

    updateUI();
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => {
    console.error('Player initialization error:', message);
  });

  player.addListener('authentication_error', ({ message }) => {
    console.error('Authentication error:', message);
    localStorage.removeItem('spotify_access_token');
    showAuthPrompt();
  });

  player.addListener('account_error', ({ message }) => {
    console.error('Account error:', message);
  });
}

// ================================================================
// PLAYBACK CONTROL
// ================================================================
function togglePlay() {
  if (player) {
    player.togglePlay();
  }
}

function skipToNext() {
  if (player) {
    player.nextTrack();
  }
}

function skipToPrevious() {
  if (player) {
    player.previousTrack();
  }
}

function setVolume(value) {
  if (player) {
    const volumeValue = parseFloat(value) / 100;
    player.setVolume(volumeValue);
  }
}

function seekToPosition(position) {
  if (player && deviceId) {
    fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(position)}&device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(err => console.error('Seek error:', err));
  }
}

// ================================================================
// UI UPDATE
// ================================================================
function updateUI() {
  // Update play/pause button
  const playBtn = document.getElementById('player-play-btn');
  if (playBtn) {
    playBtn.textContent = isPlaying ? '⏸' : '▶';
    playBtn.setAttribute('aria-pressed', isPlaying);
  }

  // Update track info
  if (currentTrack) {
    const trackName = document.getElementById('player-track-name');
    const artistName = document.getElementById('player-artist-name');

    if (trackName) {
      trackName.textContent = currentTrack.name;
    }
    if (artistName) {
      const artists = currentTrack.artists.map(a => a.name).join(', ');
      artistName.textContent = artists;
    }
  }

  // Update progress bar
  updateProgressBar();
}

function updateProgressBar() {
  const progressBar = document.getElementById('player-progress');
  const timeDisplay = document.getElementById('player-time');

  if (progressBar && duration > 0) {
    const percentage = (currentPosition / duration) * 100;
    progressBar.style.width = percentage + '%';
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
// ALBUM PLAYBACK
// ================================================================
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

    if (!response.ok) {
      console.error('Play album error:', response.statusText);
    }
  } catch (err) {
    console.error('Play album error:', err);
  }
}

// ================================================================
// EVENT LISTENERS
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Play button
  const playBtn = document.getElementById('player-play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', togglePlay);
  }

  // Next button
  const nextBtn = document.getElementById('player-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', skipToNext);
  }

  // Previous button
  const prevBtn = document.getElementById('player-prev-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', skipToPrevious);
  }

  // Volume slider
  const volumeSlider = document.getElementById('player-volume');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      setVolume(e.target.value);
    });
  }

  // Progress bar seek
  const progressContainer = document.getElementById('player-progress-container');
  if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.offsetWidth;
      const position = percentage * duration;
      seekToPosition(position);
    });
  }

  // Play album button
  const playAlbumBtn = document.getElementById('player-play-album-btn');
  if (playAlbumBtn) {
    playAlbumBtn.addEventListener('click', playAlbum);
  }

  // Initialize
  initPlayer();
});

// ================================================================
// POLLING FOR PROGRESS (fallback if SDK doesn't update frequently)
// ================================================================
setInterval(() => {
  if (isPlaying && player) {
    currentPosition += 1000; // Increment by 1 second
    if (currentPosition > duration) {
      currentPosition = duration;
    }
    updateProgressBar();
  }
}, 1000);

// Load Spotify SDK
const script = document.createElement('script');
script.src = 'https://sdk.scdn.co/spotify-player.js';
document.head.appendChild(script);
