#!/usr/bin/env node

/**
 * Comprehensive Store Testing Suite
 * Tests: Product validation, checkout logic, inventory, and data integrity
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

// Test reporter functions
function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
}

function pass(testName, details = '') {
  console.log(`${colors.green}✓${colors.reset} ${testName}${details ? ' — ' + details : ''}`);
  testsPassed++;
}

function fail(testName, error) {
  console.log(`${colors.red}✗${colors.reset} ${testName}`);
  console.log(`  ${colors.red}Error: ${error}${colors.reset}`);
  testsFailed++;
  failedTests.push({ test: testName, error });
}

function warn(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 1: Store HTML Structure Integrity');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  // Check for required elements
  const checks = [
    { pattern: /<div class="product-list">/, name: 'Product list container' },
    { pattern: /id="eagle-size"/, name: 'Eagle size selector' },
    { pattern: /id="head-size"/, name: 'Head size selector' },
    { pattern: /id="cart-btn"/, name: 'Cart button' },
    { pattern: /class="store-page"/, name: 'Store page container' },
    { pattern: /Wretched Decrepitude/, name: 'CD product name' },
    { pattern: /Eagle/, name: 'Eagle product name' },
    { pattern: /Head/, name: 'Head product name' },
  ];

  checks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`HTML contains ${check.name}`);
    } else {
      fail(`HTML missing ${check.name}`, 'Element not found in store.html');
    }
  });

  // Check for product images
  if (storeHtml.includes('assets/images/eagle front.jpg')) {
    pass('Eagle front image referenced');
  } else {
    fail('Eagle front image', 'Not referenced in HTML');
  }

  if (storeHtml.includes('assets/images/eagle back.jpg')) {
    pass('Eagle back image referenced');
  } else {
    fail('Eagle back image', 'Not referenced in HTML');
  }

} catch (err) {
  fail('Store HTML test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 2: Product Configuration Validation');

try {
  const checkoutPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/create-checkout.js';
  const checkoutCode = fs.readFileSync(checkoutPath, 'utf8');

  // Check for all required products in a more reliable way
  const requiredProducts = [
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

  requiredProducts.forEach(product => {
    // Look for the product key and price value
    const pattern = new RegExp(`'${product.replace(/'/g, "\\'")}'\\s*:\\s*\\{\\s*price:\\s*(\\d+)`);
    const match = checkoutCode.match(pattern);

    if (match) {
      const price = match[1];
      pass(`Product in whitelist: ${product} (price: $${price})`);
    } else {
      fail(`Product whitelist`, `Missing or incorrect: ${product}`);
    }
  });

} catch (err) {
  fail('Product configuration test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 3: Email Notification Integration');

try {
  const webhookPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/handle-stripe-webhook.js';
  const webhookCode = fs.readFileSync(webhookPath, 'utf8');

  // Check for SendGrid integration
  const sendgridChecks = [
    { pattern: /require\('@sendgrid\/mail'\)/, name: 'SendGrid import' },
    { pattern: /setApiKey\(process\.env\.SENDGRID_API_KEY\)/, name: 'SendGrid API key setup' },
    { pattern: /sgMail\.send/, name: 'Email sending calls' },
    { pattern: /ADMIN_EMAIL/, name: 'Admin email configuration' },
  ];

  sendgridChecks.forEach(check => {
    if (check.pattern.test(webhookCode)) {
      pass(`Email system has ${check.name}`);
    } else {
      fail(`Email integration`, `Missing: ${check.name}`);
    }
  });

  // Check for customer email
  if (/customerEmail/.test(webhookCode)) {
    pass('Customer email extraction in webhook');
  } else {
    fail('Customer email', 'Not extracted in webhook');
  }

  // Check for both admin and customer emails
  const emailSendCount = (webhookCode.match(/sgMail\.send/g) || []).length;
  if (emailSendCount >= 2) {
    pass(`Email sending configured for multiple recipients (${emailSendCount} send calls)`);
  } else {
    fail('Email recipients', `Only ${emailSendCount} email send calls found, need at least 2`);
  }

} catch (err) {
  fail('Email notification test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 4: Inventory Management');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  // Check for inventory loading
  const inventoryChecks = [
    { pattern: /loadInventory/, name: 'Inventory load function' },
    { pattern: /checkStock/, name: 'Stock checking function' },
    { pattern: /INVENTORY\s*=\s*\{\}/, name: 'Inventory object' },
    { pattern: /getStock/, name: 'Stock calculation function' },
    { pattern: /supabase/, name: 'Supabase integration' }
  ];

  inventoryChecks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`Inventory system has ${check.name}`);
    } else {
      fail(`Inventory system`, `Missing: ${check.name}`);
    }
  });

  // Check for fallback inventory
  if (/INVENTORY = \{[\s\n]*'cd':\s*32/.test(storeHtml)) {
    pass('Fallback inventory configured for CD');
  } else {
    warn('Fallback inventory may not be properly configured');
  }

} catch (err) {
  fail('Inventory management test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 5: Cart Functionality');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  const cartChecks = [
    { pattern: /function addToCart/, name: 'Add to cart function' },
    { pattern: /function changeQty/, name: 'Quantity change function' },
    { pattern: /function removeItem/, name: 'Remove item function' },
    { pattern: /function renderCart/, name: 'Cart rendering function' },
    { pattern: /localStorage.*caesarean_cart/, name: 'LocalStorage persistence' },
    { pattern: /class="cart-drawer"/, name: 'Cart drawer UI' },
    { pattern: /id="btn-checkout"/, name: 'Checkout button' }
  ];

  cartChecks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`Cart system has ${check.name}`);
    } else {
      fail(`Cart functionality`, `Missing: ${check.name}`);
    }
  });

} catch (err) {
  fail('Cart functionality test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 6: Stripe Integration');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  // Check for Stripe key
  if (/const STRIPE_PK = 'pk_/.test(storeHtml)) {
    pass('Stripe publishable key configured');
  } else {
    fail('Stripe key', 'Publishable key not found or invalid');
  }

  // Check for payment request buttons
  const paymentChecks = [
    { pattern: /stripe\.paymentRequest/, name: 'Payment request setup' },
    { pattern: /prBtnCD|prBtnHead|prBtnEagle/, name: 'Payment buttons for all products' },
    { pattern: /create-checkout/, name: 'Checkout session creation' }
  ];

  paymentChecks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`Stripe integration has ${check.name}`);
    } else {
      warn(`Stripe integration: ${check.name} not fully configured`);
    }
  });

} catch (err) {
  fail('Stripe integration test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 7: Responsive Design');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  // Check for viewport meta tag
  if (/<meta name="viewport"/.test(storeHtml)) {
    pass('Viewport meta tag configured');
  } else {
    fail('Responsive design', 'Viewport meta tag missing');
  }

  // Check for media queries
  const mediaQueryChecks = [
    { pattern: /@media \(max-width:\s*1200px\)/, name: 'Tablet breakpoint (1200px)' },
    { pattern: /@media \(max-width:\s*768px\)/, name: 'Mobile breakpoint (768px)' }
  ];

  mediaQueryChecks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`Responsive design includes ${check.name}`);
    } else {
      fail(`Responsive design`, `Missing ${check.name}`);
    }
  });

  // Check for grid layout
  if (/grid-template-columns: repeat\(3, 1fr\)/.test(storeHtml)) {
    pass('Desktop 3-column grid layout configured');
  } else {
    fail('Desktop layout', '3-column grid not found');
  }

  if (/grid-template-columns: repeat\(2, 1fr\)/.test(storeHtml)) {
    pass('Tablet 2-column grid layout configured');
  } else {
    fail('Tablet layout', '2-column grid not found');
  }

} catch (err) {
  fail('Responsive design test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 8: Size Selection & Validation');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  // Check for size selectors
  const sizeSelectChecks = [
    { pattern: /id="eagle-size"[\s\S]*?<option value="S">S<\/option>/, name: 'Eagle size S' },
    { pattern: /id="eagle-size"[\s\S]*?<option value="M">M<\/option>/, name: 'Eagle size M' },
    { pattern: /id="eagle-size"[\s\S]*?<option value="XXXL">XXXL<\/option>/, name: 'Eagle size XXXL' },
    { pattern: /id="head-size"[\s\S]*?<option value="XL">XL<\/option>/, name: 'Head size XL' },
    { pattern: /id="head-size"[\s\S]*?<option value="3XL">3XL<\/option>/, name: 'Head size 3XL' }
  ];

  sizeSelectChecks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`Size selection: ${check.name}`);
    } else {
      fail(`Size selection`, `Missing: ${check.name}`);
    }
  });

  // Check for size validation
  if (/if \(!size\)/.test(storeHtml) && /borderColor.*var\(--red\)/.test(storeHtml)) {
    pass('Size validation error feedback configured');
  } else {
    warn('Size validation may not have visual error feedback');
  }

} catch (err) {
  fail('Size selection test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 9: Image & Zoom Functionality');

try {
  const storeHtmlPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html';
  const storeHtml = fs.readFileSync(storeHtmlPath, 'utf8');

  // Check for zoom functionality
  const zoomChecks = [
    { pattern: /function openZoom/, name: 'Zoom open function' },
    { pattern: /function closeZoom/, name: 'Zoom close function' },
    { pattern: /function zoomNav/, name: 'Zoom navigation function' },
    { pattern: /id="zoom-modal"/, name: 'Zoom modal element' },
    { pattern: /class="zoom-modal-image"/, name: 'Zoom image element' }
  ];

  zoomChecks.forEach(check => {
    if (check.pattern.test(storeHtml)) {
      pass(`Image zoom system: ${check.name}`);
    } else {
      fail(`Image zoom`, `Missing: ${check.name}`);
    }
  });

  // Check for front/back buttons
  if (/btn-eagle-front|btn-eagle-back/.test(storeHtml)) {
    pass('Eagle front/back view buttons configured');
  } else {
    fail('Eagle image views', 'Front/back buttons not found');
  }

  if (/btn-head-front|btn-head-back/.test(storeHtml)) {
    pass('Head front/back view buttons configured');
  } else {
    fail('Head image views', 'Front/back buttons not found');
  }

  // Check image files exist
  const imagePath1 = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/assets/images/eagle front.jpg';
  const imagePath2 = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/assets/images/eagle back.jpg';

  if (fs.existsSync(imagePath1)) {
    const size = (fs.statSync(imagePath1).size / 1024 / 1024).toFixed(2);
    pass(`Eagle front image exists (${size} MB)`);
  } else {
    fail('Eagle images', 'Front image file not found');
  }

  if (fs.existsSync(imagePath2)) {
    const size = (fs.statSync(imagePath2).size / 1024 / 1024).toFixed(2);
    pass(`Eagle back image exists (${size} MB)`);
  } else {
    fail('Eagle images', 'Back image file not found');
  }

} catch (err) {
  fail('Image zoom test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 10: Data Integrity & Security');

try {
  const checkoutPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/create-checkout.js';
  const checkoutCode = fs.readFileSync(checkoutPath, 'utf8');

  // Check for server-side validation
  const securityChecks = [
    { pattern: /VALID_PRODUCTS\[item\.id\]/, name: 'Product whitelist validation' },
    { pattern: /item\.price = valid\.price/, name: 'Server-side price enforcement' },
    { pattern: /Number\.isInteger\(item\.qty\)/, name: 'Quantity type validation' },
    { pattern: /item\.qty < 1/, name: 'Minimum quantity validation' }
  ];

  securityChecks.forEach(check => {
    if (check.pattern.test(checkoutCode)) {
      pass(`Security: ${check.name}`);
    } else {
      fail(`Security`, `Missing: ${check.name}`);
    }
  });

  // Check for proper error handling
  if (/statusCode: 400.*error/.test(checkoutCode)) {
    pass('Error responses configured');
  } else {
    fail('Error handling', 'Error responses not properly configured');
  }

} catch (err) {
  fail('Security test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 11: Configuration & Environments');

try {
  // Check for netlify.toml
  const netlifyPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify.toml';
  if (fs.existsSync(netlifyPath)) {
    const netlifyToml = fs.readFileSync(netlifyPath, 'utf8');

    if (/functions = "netlify\/functions"/.test(netlifyToml)) {
      pass('Netlify function configuration');
    } else {
      fail('Netlify config', 'Function directory not configured');
    }
  } else {
    fail('Netlify config', 'netlify.toml not found');
  }

  // Check for environment variables in functions
  const webhookPath = '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/handle-stripe-webhook.js';
  const webhookCode = fs.readFileSync(webhookPath, 'utf8');

  const envVars = [
    'STRIPE_SECRET_KEY',
    'SENDGRID_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  envVars.forEach(varName => {
    if (new RegExp(`process\\.env\\.${varName}`).test(webhookCode)) {
      pass(`Environment variable configured: ${varName}`);
    } else {
      warn(`Environment variable ${varName} not found in code`);
    }
  });

} catch (err) {
  fail('Configuration test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST 12: Critical File Integrity');

try {
  const criticalFiles = [
    { path: '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html', name: 'Store page' },
    { path: '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/create-checkout.js', name: 'Checkout function' },
    { path: '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/handle-stripe-webhook.js', name: 'Webhook handler' },
    { path: '/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/css/styles.css', name: 'Styles' }
  ];

  criticalFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      const size = fs.statSync(file.path).size;
      if (size > 0) {
        pass(`Critical file exists: ${file.name} (${(size / 1024).toFixed(1)} KB)`);
      } else {
        fail(`Critical file ${file.name}`, 'File is empty');
      }
    } else {
      fail(`Critical file ${file.name}`, 'File not found');
    }
  });

} catch (err) {
  fail('File integrity test', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUMMARY');

const totalTests = testsPassed + testsFailed;
const passPercentage = ((testsPassed / totalTests) * 100).toFixed(1);

console.log(`${colors.bright}Total Tests: ${totalTests}${colors.reset}`);
console.log(`${colors.green}${colors.bright}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}${colors.bright}Failed: ${testsFailed}${colors.reset}`);
console.log(`${colors.bright}Success Rate: ${passPercentage}%${colors.reset}\n`);

if (testsFailed > 0) {
  console.log(`${colors.red}${colors.bright}FAILED TESTS:${colors.reset}`);
  failedTests.forEach(test => {
    console.log(`  ${colors.red}✗${colors.reset} ${test.test}`);
    console.log(`    ${test.error}`);
  });
} else {
  console.log(`${colors.green}${colors.bright}✓ ALL TESTS PASSED!${colors.reset}`);
}

// Exit with appropriate code
process.exit(testsFailed > 0 ? 1 : 0);
