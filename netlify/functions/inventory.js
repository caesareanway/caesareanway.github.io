// Netlify Function: Serves secure inventory manager with credentials from env vars
exports.handler = async (event) => {
  // Get credentials from Netlify environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const adminPassword = process.env.INVENTORY_PASSWORD || 'caesarean2025';

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment.'
    };
  }

  // HTML with injected credentials
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAESAREAN Inventory Manager</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      color: #f0f0f0;
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
    }
    h1 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 2.5rem;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
      color: #c00000;
    }
    .subtitle {
      color: #888;
      font-size: 0.9rem;
    }

    /* Login Screen */
    .login-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      position: fixed;
      inset: 0;
      background: #0a0a0a;
      z-index: 1000;
    }
    .login-screen.hidden {
      display: none;
    }
    .login-box {
      width: 100%;
      max-width: 300px;
      border: 1px solid #1c1c1c;
      padding: 40px 30px;
      background: #0a0a0a;
    }
    .login-box h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 1.5rem;
      margin-bottom: 30px;
      letter-spacing: 0.05em;
    }
    .login-box input {
      width: 100%;
      padding: 12px;
      margin-bottom: 20px;
      background: #1c1c1c;
      border: 1px solid #333;
      color: #f0f0f0;
      font-size: 1rem;
    }
    .login-box input:focus {
      outline: none;
      border-color: #c00000;
    }
    .login-box button {
      width: 100%;
      padding: 12px;
      background: #c00000;
      color: #f0f0f0;
      border: none;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      letter-spacing: 0.05em;
    }
    .login-box button:hover {
      background: #b00000;
    }

    /* Main App */
    .app-screen {
      display: none;
    }
    .app-screen.visible {
      display: block;
    }

    .status {
      background: #1c1c1c;
      border: 1px solid #333;
      padding: 15px;
      margin-bottom: 30px;
      font-size: 0.85rem;
    }
    .status.synced {
      border-color: #2d7d2d;
      color: #5dd95d;
    }
    .status.syncing {
      border-color: #7d7d2d;
      color: #ffff88;
    }
    .status.error {
      border-color: #7d2d2d;
      color: #ff6666;
    }

    .inventory-grid {
      display: grid;
      gap: 20px;
      margin-bottom: 30px;
    }
    .product-card {
      border: 1px solid #1c1c1c;
      padding: 20px;
      background: #0a0a0a;
      transition: border-color 0.2s;
    }
    .product-card:hover {
      border-color: #333;
    }
    .product-name {
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 1.1rem;
    }
    .quantity-display {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 12px;
    }
    .quantity-number {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 2rem;
      color: #c00000;
      min-width: 60px;
    }
    .quantity-low {
      color: #ff6666;
    }
    .controls {
      display: flex;
      gap: 10px;
    }
    button {
      padding: 8px 16px;
      background: #1c1c1c;
      color: #f0f0f0;
      border: 1px solid #333;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      font-size: 0.9rem;
    }
    button:hover {
      background: #333;
      border-color: #555;
    }
    button.subtract {
      color: #ff6666;
    }
    button.subtract:hover {
      background: #7d2d2d;
      border-color: #c00000;
    }
    button.add {
      color: #5dd95d;
    }
    button.add:hover {
      background: #2d7d2d;
      border-color: #5dd95d;
    }
    .last-updated {
      font-size: 0.75rem;
      color: #666;
      margin-top: 8px;
    }

    .code-section {
      background: #1c1c1c;
      border: 1px solid #333;
      padding: 20px;
      margin-bottom: 20px;
    }
    .code-section h3 {
      margin-bottom: 15px;
      font-family: 'Bebas Neue', sans-serif;
      letter-spacing: 0.05em;
    }
    .code-display {
      background: #0a0a0a;
      border: 1px solid #333;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      color: #5dd95d;
      overflow-x: auto;
      margin-bottom: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
    .copy-btn {
      width: 100%;
      background: #c00000;
      border: none;
      color: #f0f0f0;
      padding: 10px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 8px;
    }
    .copy-btn:hover {
      background: #b00000;
    }
    .logout-btn {
      width: 100%;
      background: #333;
      border: 1px solid #555;
      color: #f0f0f0;
      padding: 10px;
      cursor: pointer;
    }
    .logout-btn:hover {
      background: #555;
    }

    .footer {
      text-align: center;
      color: #666;
      font-size: 0.8rem;
      margin-top: 40px;
    }
  </style>
</head>
<body>

<!-- Login Screen -->
<div class="login-screen" id="loginScreen">
  <div class="login-box">
    <h2>Inventory</h2>
    <input type="password" id="passwordInput" placeholder="Enter password" autocomplete="off">
    <button onclick="handleLogin()">Sign In</button>
  </div>
</div>

<!-- Main App -->
<div class="app-screen" id="appScreen">
  <div class="container">
    <header>
      <h1>Inventory</h1>
      <p class="subtitle">CAESAREAN</p>
    </header>

    <div class="status" id="status">
      <span id="statusText">Connecting...</span>
    </div>

    <div class="inventory-grid" id="inventoryGrid">
      <!-- Populated by JS -->
    </div>

    <div class="code-section">
      <h3>Deploy to Store</h3>
      <p style="font-size: 0.85rem; color: #888; margin-bottom: 12px;">
        Copy this code and paste it into <code style="color: #c00000;">store.html</code> to update live inventory:
      </p>
      <div class="code-display" id="codeDisplay"></div>
      <button class="copy-btn" onclick="copyCode()">Copy Code</button>
      <button class="logout-btn" onclick="handleLogout()">Sign Out</button>
    </div>

    <div class="footer">
      Last synced: <span id="lastSynced">—</span>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
<script>
  // Credentials injected from server
  const SUPABASE_URL = '${supabaseUrl}';
  const SUPABASE_ANON_KEY = '${supabaseKey}';
  const ADMIN_PASSWORD = '${adminPassword}';

  const { createClient } = window.supabase;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let inventory = {};
  let isLoggedIn = false;

  // Check if already logged in
  function checkLogin() {
    if (localStorage.getItem('caesarean_inventory_auth')) {
      isLoggedIn = true;
      showApp();
      initializeApp();
    }
  }

  function handleLogin() {
    const password = document.getElementById('passwordInput').value;
    if (password === ADMIN_PASSWORD) {
      isLoggedIn = true;
      localStorage.setItem('caesarean_inventory_auth', 'true');
      showApp();
      initializeApp();
    } else {
      alert('Invalid password');
      document.getElementById('passwordInput').value = '';
    }
  }

  function handleLogout() {
    isLoggedIn = false;
    localStorage.removeItem('caesarean_inventory_auth');
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.remove('visible');
  }

  function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.add('visible');
  }

  async function initializeApp() {
    setStatus('Connecting to Supabase...', 'syncing');

    try {
      // Fetch current inventory
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('product', { ascending: true });

      if (error) throw error;

      data.forEach(item => {
        inventory[item.product] = item.quantity;
      });

      renderInventory();
      setStatus('Connected', 'synced');

      // Subscribe to real-time changes
      supabase
        .channel('inventory_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inventory'
        }, (payload) => {
          console.log('Real-time update:', payload);
          inventory[payload.new.product] = payload.new.quantity;
          renderInventory();
          setStatus('Updated', 'synced');
        })
        .subscribe();

    } catch (err) {
      console.error('Error:', err);
      setStatus('Connection error: ' + err.message, 'error');
    }
  }

  function renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = '';

    const products = [
      { id: 'cd', label: 'CD - Wretched Decrepitude' },
      { id: 'shirt-XL', label: 'T-Shirt - XL' },
      { id: 'shirt-2XL', label: 'T-Shirt - 2XL' },
      { id: 'shirt-3XL', label: 'T-Shirt - 3XL' }
    ];

    products.forEach(product => {
      const qty = inventory[product.id] || 0;
      const isLow = qty < 3;

      grid.innerHTML += \`
        <div class="product-card">
          <div class="product-name">\${product.label}</div>
          <div class="quantity-display">
            <div class="quantity-number \${isLow ? 'quantity-low' : ''}">\${qty}</div>
          </div>
          <div class="controls">
            <button class="subtract" onclick="updateInventory('\${product.id}', -1)">−</button>
            <button class="add" onclick="updateInventory('\${product.id}', 1)">+</button>
          </div>
          <div class="last-updated" id="updated-\${product.id}"></div>
        </div>
      \`;
    });

    updateCodeDisplay();
    updateLastSynced();
  }

  async function updateInventory(product, delta) {
    const newQty = Math.max(0, (inventory[product] || 0) + delta);

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('product', product);

      if (error) throw error;

      inventory[product] = newQty;
      renderInventory();
      setStatus('Updated', 'synced');
    } catch (err) {
      console.error('Error updating inventory:', err);
      setStatus('Update failed: ' + err.message, 'error');
    }
  }

  function updateCodeDisplay() {
    const code = \`INVENTORY = { 'cd': \${inventory['cd'] || 0}, 'shirt-XL': \${inventory['shirt-XL'] || 0}, 'shirt-2XL': \${inventory['shirt-2XL'] || 0}, 'shirt-3XL': \${inventory['shirt-3XL'] || 0} }\`;
    document.getElementById('codeDisplay').textContent = code;
  }

  function copyCode() {
    const code = document.getElementById('codeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    });
  }

  function setStatus(text, status) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = text;
    statusEl.className = 'status ' + status;
    updateLastSynced();
  }

  function updateLastSynced() {
    const now = new Date();
    const time = now.toLocaleTimeString();
    document.getElementById('lastSynced').textContent = time;
  }

  // Initialize
  checkLogin();

  // Allow Enter key to submit password
  document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
</script>

</body>
</html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html
  };
};
