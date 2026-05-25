#!/usr/bin/env node

/**
 * Inventory Audit Script
 * Checks current inventory levels and recent webhook activity
 *
 * Usage: node inventory-audit.js
 *
 * This script requires:
 * - SUPABASE_URL in environment
 * - SUPABASE_SERVICE_KEY in environment
 */

const https = require('https');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`${colors.red}Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY${colors.reset}`);
  console.error('Set these environment variables before running audit');
  process.exit(1);
}

function log(section, message) {
  console.log(`${colors.cyan}[${section}]${colors.reset} ${message}`);
}

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function auditInventory() {
  console.log(`\n${colors.blue}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}INVENTORY AUDIT${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    // Fetch current inventory
    log('SUPABASE', `Connecting to ${SUPABASE_URL.substring(0, 50)}...`);

    const response = await makeRequest('/rest/v1/inventory?order=updated_at.desc');

    if (response.status !== 200) {
      error(`Supabase returned status ${response.status}`);
      console.error(response.data);
      process.exit(1);
    }

    const inventory = response.data;
    success(`Connected! Found ${inventory.length} inventory records`);

    // Expected SKUs
    const expectedSKUs = [
      'cd',
      'head-shirt-XL',
      'head-shirt-2XL',
      'head-shirt-3XL',
      'eagle-shirt-S',
      'eagle-shirt-M',
      'eagle-shirt-L',
      'eagle-shirt-XL',
      'eagle-shirt-XXL',
      'eagle-shirt-XXXL'
    ];

    console.log(`\n${colors.cyan}━━━ Current Inventory ━━━${colors.reset}\n`);

    // Check each expected SKU
    const missing = [];
    const found = {};

    for (const sku of expectedSKUs) {
      const record = inventory.find(r => r.product === sku);
      if (record) {
        found[sku] = record;
        const updatedAt = new Date(record.updated_at);
        const hoursAgo = Math.round((Date.now() - updatedAt) / (1000 * 60 * 60));
        console.log(`${colors.green}✓${colors.reset} ${sku.padEnd(20)} : ${String(record.quantity).padStart(3)} units ${colors.gray}(updated ${hoursAgo}h ago)${colors.reset}`);
      } else {
        missing.push(sku);
        console.log(`${colors.red}✗${colors.reset} ${sku.padEnd(20)} : ${colors.red}NOT FOUND${colors.reset}`);
      }
    }

    if (missing.length > 0) {
      console.log(`\n${colors.yellow}⚠ ${missing.length} expected SKUs are missing from inventory table${colors.reset}`);
      console.log(`  Missing: ${missing.join(', ')}`);
      console.log(`\n${colors.yellow}Action: Add these SKUs to inventory table in Supabase${colors.reset}`);
    }

    // Calculate total inventory value (rough estimate)
    console.log(`\n${colors.cyan}━━━ Inventory Summary ━━━${colors.reset}\n`);

    let totalCDs = found['cd']?.quantity || 0;
    let totalHeadShirts = ['head-shirt-XL', 'head-shirt-2XL', 'head-shirt-3XL']
      .reduce((sum, sku) => sum + (found[sku]?.quantity || 0), 0);
    let totalEagleShirts = ['eagle-shirt-S', 'eagle-shirt-M', 'eagle-shirt-L', 'eagle-shirt-XL', 'eagle-shirt-XXL', 'eagle-shirt-XXXL']
      .reduce((sum, sku) => sum + (found[sku]?.quantity || 0), 0);

    console.log(`CDs:                   ${String(totalCDs).padStart(3)} units × $10 = $${(totalCDs * 10).toFixed(2)}`);
    console.log(`Head T-Shirts:         ${String(totalHeadShirts).padStart(3)} units × $20 = $${(totalHeadShirts * 20).toFixed(2)}`);
    console.log(`Eagle T-Shirts:        ${String(totalEagleShirts).padStart(3)} units × $20 = $${(totalEagleShirts * 20).toFixed(2)}`);

    const totalValue = (totalCDs * 10) + (totalHeadShirts * 20) + (totalEagleShirts * 20);
    console.log(`${colors.bright}Total Inventory Value: ${String(totalCDs + totalHeadShirts + totalEagleShirts).padStart(3)} units = $${totalValue.toFixed(2)}${colors.reset}`);

    // Check for low stock
    console.log(`\n${colors.cyan}━━━ Low Stock Alert ━━━${colors.reset}\n`);
    let lowStockFound = false;
    for (const [sku, record] of Object.entries(found)) {
      if (record.quantity <= 3) {
        warning(`${sku}: Only ${record.quantity} units remaining!`);
        lowStockFound = true;
      }
    }
    if (!lowStockFound) {
      success('No low stock items');
    }

    // Check update timestamps
    console.log(`\n${colors.cyan}━━━ Recent Updates ━━━${colors.reset}\n`);
    const sortedByUpdate = Object.entries(found)
      .sort((a, b) => new Date(b[1].updated_at) - new Date(a[1].updated_at))
      .slice(0, 5);

    for (const [sku, record] of sortedByUpdate) {
      const updatedAt = new Date(record.updated_at);
      const hoursAgo = Math.round((Date.now() - updatedAt) / (1000 * 60 * 60));
      console.log(`${sku.padEnd(20)} : Updated ${hoursAgo}h ago`);
    }

    console.log(`\n${colors.blue}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Instructions for manual refund
    console.log(`${colors.cyan}To manually adjust inventory for a refund:${colors.reset}\n`);
    console.log(`1. Go to Supabase Dashboard → Project → Editor → inventory table`);
    console.log(`2. Find the product row (e.g., head-shirt-XL)`);
    console.log(`3. Click the quantity field and update it`);
    console.log(`   Example: Customer bought 1 → increment by 1\n`);
    console.log(`${colors.cyan}Or use the refund API:${colors.reset}\n`);
    console.log(`POST /.netlify/functions/handle-refund`);
    console.log(`Headers: Authorization: Bearer {REFUND_TOKEN}`);
    console.log(`Body: { "items": [{ "sku": "head-shirt-XL", "qty": 1 }] }\n`);

  } catch (err) {
    error(`Audit failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run the audit
auditInventory().catch(err => {
  console.error(err);
  process.exit(1);
});
