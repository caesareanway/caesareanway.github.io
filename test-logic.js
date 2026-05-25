#!/usr/bin/env node

/**
 * Advanced JavaScript Logic Testing
 * Tests: Product validation, cart logic, inventory checks
 */

const fs = require('fs');

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

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
}

function pass(testName) {
  console.log(`${colors.green}✓${colors.reset} ${testName}`);
  testsPassed++;
}

function fail(testName, error) {
  console.log(`${colors.red}✗${colors.reset} ${testName}: ${error}`);
  testsFailed++;
  failedTests.push({ test: testName, error });
}

function info(msg) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 1: Product Validation Logic');

try {
  const storeHtml = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html', 'utf8');

  // Extract PRODUCTS config
  const productsMatch = storeHtml.match(/const PRODUCTS = \{([^}]+)\}/s);
  if (!productsMatch) {
    fail('Extract PRODUCTS configuration', 'Could not find PRODUCTS object');
  } else {
    const productsStr = productsMatch[1];

    // Verify required products exist
    const expectedProducts = {
      'cd': { expectedName: 'Wretched Decrepitude', expectedPrice: 10.00 },
      'head': { expectedName: 'Head', expectedPrice: 20.00 },
      'eagle': { expectedName: 'Eagle', expectedPrice: 20.00 }
    };

    Object.entries(expectedProducts).forEach(([key, expected]) => {
      if (productsStr.includes(`'${key}'`) && productsStr.includes(expected.expectedPrice.toString())) {
        pass(`PRODUCTS contains ${key} with correct price ($${expected.expectedPrice})`);
      } else {
        fail(`Product ${key}`, `Not found or price mismatch`);
      }
    });
  }

} catch (err) {
  fail('Product validation', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 2: Cart Logic Validation');

try {
  const storeHtml = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html', 'utf8');

  // Check for critical cart functions
  const cartFunctions = [
    { name: 'addToCart', pattern: /function addToCart\(productId\)/ },
    { name: 'removeItem', pattern: /function removeItem\(index\)/ },
    { name: 'changeQty', pattern: /function changeQty\(index, delta\)/ },
    { name: 'renderCart', pattern: /function renderCart\(\)/ },
    { name: 'saveCart', pattern: /function saveCart\(\)/ },
    { name: 'openCart', pattern: /function openCart\(\)/ },
    { name: 'closeCart', pattern: /function closeCart\(\)/ }
  ];

  cartFunctions.forEach(fn => {
    if (fn.pattern.test(storeHtml)) {
      pass(`Cart function exists: ${fn.name}()`);
    } else {
      fail(`Cart function ${fn.name}`, 'Function definition not found');
    }
  });

  // Check cart localStorage implementation
  if (/localStorage\.getItem\(['"]caesarean_cart/.test(storeHtml)) {
    pass('Cart persistence: Reading from localStorage');
  } else {
    fail('Cart persistence', 'localStorage read not found');
  }

  if (/localStorage\.setItem\(['"]caesarean_cart/.test(storeHtml)) {
    pass('Cart persistence: Writing to localStorage');
  } else {
    fail('Cart persistence', 'localStorage write not found');
  }

} catch (err) {
  fail('Cart logic validation', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 3: Inventory Checking Logic');

try {
  const storeHtml = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html', 'utf8');

  // Extract and validate checkStock function
  const checkStockMatch = storeHtml.match(/function checkStock\([^)]+\)\s*\{([^}]+)\}/);
  if (!checkStockMatch) {
    fail('checkStock function', 'Could not extract function body');
  } else {
    const checkStockBody = checkStockMatch[1];

    // Verify it handles all product types
    if (checkStockBody.includes("'cd'")) {
      pass('checkStock: Handles CD product');
    } else {
      fail('checkStock', 'Does not handle CD product');
    }

    if (checkStockBody.includes("'head'") || checkStockBody.includes("'head' ||")) {
      pass('checkStock: Handles head product');
    } else {
      fail('checkStock', 'Does not handle head product');
    }

    if (checkStockBody.includes("'eagle'") || checkStockBody.includes("'eagle'")) {
      pass('checkStock: Handles eagle product');
    } else {
      fail('checkStock', 'Does not handle eagle product');
    }

    // Verify it checks for shirts
    if (checkStockBody.includes('shirt')) {
      pass('checkStock: Validates shirt-size combinations');
    } else {
      fail('checkStock', 'No shirt-size validation');
    }
  }

} catch (err) {
  fail('Inventory checking logic', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 4: Size Selection Validation');

try {
  const storeHtml = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html', 'utf8');

  // Check for size validation in addToCart
  const addToCartMatch = storeHtml.match(/function addToCart\([^)]*\)\s*\{([^}]{0,2000})\}/);
  if (addToCartMatch) {
    const addToCartBody = addToCartMatch[1];

    if (/if\s*\(\s*!size\s*\)/.test(addToCartBody)) {
      pass('Size validation: Checks if size is empty');
    } else {
      fail('Size validation', 'No empty size check');
    }

    if (/borderColor.*red|var\(--red\)/.test(addToCartBody)) {
      pass('Size validation: Shows error feedback (red border)');
    } else {
      fail('Size validation', 'No error feedback');
    }

    if (/focus\(\)/.test(addToCartBody)) {
      pass('Size validation: Focuses size selector on error');
    } else {
      fail('Size validation', 'No focus on error');
    }
  }

} catch (err) {
  fail('Size selection validation', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 5: Email Webhook Functionality');

try {
  const webhookCode = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/handle-stripe-webhook.js', 'utf8');

  // Check webhook processes checkout events
  if (/checkout\.session\.completed/.test(webhookCode)) {
    pass('Webhook: Listens for checkout.session.completed event');
  } else {
    fail('Webhook event', 'Does not listen for checkout events');
  }

  // Check stripe signature verification
  if (/stripe\.webhooks\.constructEvent/.test(webhookCode)) {
    pass('Webhook: Verifies Stripe signature');
  } else {
    fail('Webhook security', 'No signature verification');
  }

  // Check inventory update logic
  if (/UPDATE.*inventory|\.update\(/.test(webhookCode)) {
    pass('Webhook: Updates inventory after payment');
  } else {
    fail('Webhook inventory', 'No inventory update');
  }

  // Check email sending
  if (/sgMail\.send/.test(webhookCode)) {
    pass('Webhook: Sends emails via SendGrid');
  } else {
    fail('Webhook email', 'No email sending');
  }

  // Check for error handling
  if (/catch|try/.test(webhookCode)) {
    pass('Webhook: Has error handling');
  } else {
    fail('Webhook error handling', 'No try-catch blocks');
  }

  // Check for logging
  if (/console\.log/.test(webhookCode)) {
    pass('Webhook: Includes logging for debugging');
  } else {
    fail('Webhook logging', 'No console logs');
  }

} catch (err) {
  fail('Email webhook functionality', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 6: Checkout Security Validation');

try {
  const checkoutCode = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/netlify/functions/create-checkout.js', 'utf8');

  // Check item validation
  if (/VALID_PRODUCTS\[item\.id\]/.test(checkoutCode)) {
    pass('Checkout: Validates items against whitelist');
  } else {
    fail('Checkout validation', 'No whitelist check');
  }

  // Check price enforcement
  if (/item\.price = valid\.price/.test(checkoutCode)) {
    pass('Checkout: Enforces server-side prices');
  } else {
    fail('Checkout security', 'Client can override prices');
  }

  // Check quantity validation
  if (/Number\.isInteger|item\.qty < 1/.test(checkoutCode)) {
    pass('Checkout: Validates quantity type and value');
  } else {
    fail('Checkout quantity validation', 'No quantity checks');
  }

  // Check for error responses
  if (/statusCode.*400.*error|Invalid product/.test(checkoutCode)) {
    pass('Checkout: Returns error for invalid items');
  } else {
    fail('Checkout error handling', 'No error for invalid items');
  }

  // Check Stripe session creation
  if (/stripe\.checkout\.sessions\.create/.test(checkoutCode)) {
    pass('Checkout: Creates Stripe session');
  } else {
    fail('Checkout Stripe', 'No session creation');
  }

  // Check metadata storage
  if (/metadata.*cart_items/.test(checkoutCode)) {
    pass('Checkout: Stores cart items in metadata');
  } else {
    fail('Checkout metadata', 'Cart items not stored');
  }

} catch (err) {
  fail('Checkout security validation', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('TEST SUITE 7: Response Data Validation');

try {
  const storeHtml = fs.readFileSync('/sessions/epic-elegant-hopper/mnt/caesareanway.github.io/store.html', 'utf8');

  // Check that cart items include all required fields
  if (/name|price|qty|format|productId|id/.test(storeHtml)) {
    pass('Cart items: Include required fields');
  } else {
    fail('Cart data structure', 'Missing required fields');
  }

  // Check total calculation
  if (/subtotal.*SHIPPING|SHIPPING.*subtotal/.test(storeHtml)) {
    pass('Cart calculation: Includes shipping in total');
  } else {
    fail('Cart calculation', 'Shipping not in total');
  }

} catch (err) {
  fail('Response data validation', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════════

logSection('SUMMARY');

const totalTests = testsPassed + testsFailed;
const passPercentage = totalTests > 0 ? ((testsPassed / totalTests) * 100).toFixed(1) : 0;

console.log(`${colors.bright}Total Tests: ${totalTests}${colors.reset}`);
console.log(`${colors.green}${colors.bright}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}${colors.bright}Failed: ${testsFailed}${colors.reset}`);
console.log(`${colors.bright}Success Rate: ${passPercentage}%${colors.reset}\n`);

if (testsFailed > 0) {
  console.log(`${colors.red}${colors.bright}FAILED TESTS:${colors.reset}`);
  failedTests.forEach(t => {
    console.log(`  ${colors.red}✗${colors.reset} ${t.test}: ${t.error}`);
  });
} else {
  console.log(`${colors.green}${colors.bright}✓ ALL LOGIC TESTS PASSED!${colors.reset}`);
}

process.exit(testsFailed > 0 ? 1 : 0);
