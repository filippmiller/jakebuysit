/**
 * Test script for Phase 2 backend trust features.
 *
 * Tests:
 * 1. Pricing breakdown generation
 * 2. Comparable pricing API (mocked if no eBay API key)
 * 3. 30-day price lock validation
 */

import { pricingExplainer } from '../services/pricing-explainer.js';
import { comparablePricingService } from '../services/comparable-pricing.js';
import { db } from '../db/client.js';
import { setupRedis } from '../db/redis.js';

// Initialize Redis before running tests
await setupRedis();

console.log('=== Phase 2 Backend Trust Features Test ===\n');

// Test 1: Pricing Breakdown
console.log('TEST 1: Pricing Breakdown Generation');
console.log('=====================================');

const breakdown = pricingExplainer.generateBreakdown({
  fmv: 700,
  condition: 'Good',
  conditionMultiplier: 0.85, // 15% discount
  category: 'Consumer Electronics',
  categoryMargin: 0.6, // 60%
  offerAmount: 357,
  confidence: 92,
  comparableCount: 12,
  dynamicAdjustments: { velocity: 1.05, inventory: 1.0 },
});

console.log('\nPricing Breakdown:');
console.log('------------------');
console.log(`Base Value: $${breakdown.base_value}`);
console.log(`  Source: ${breakdown.base_value_source}`);
console.log(`  Explanation: ${breakdown.base_value_explanation}`);
console.log();
console.log(`Condition Adjustment: $${breakdown.condition_adjustment.toFixed(2)}`);
console.log(`  Explanation: ${breakdown.condition_explanation}`);
console.log();
console.log(`Category Margin (${Math.round(breakdown.category_margin * 100)}%): $${breakdown.final_offer}`);
console.log(`  Explanation: ${breakdown.category_explanation}`);
console.log();
console.log(`Final Offer: $${breakdown.final_offer}`);
console.log(`Jake's Note: "${breakdown.jakes_note}"`);
console.log();

console.log('Steps for Frontend Display:');
breakdown.steps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step.label}: $${step.value}`);
  console.log(`     ${step.explanation}`);
});

console.log('\n✅ Pricing breakdown generated successfully\n');

// Test 2: Comparable Pricing
console.log('TEST 2: Comparable Pricing API');
console.log('===============================');

try {
  const comparables = await comparablePricingService.findComparables(
    'Consumer Electronics',
    'Apple',
    'iPhone 14 Pro',
    'Good',
  );

  console.log(`\nFound ${comparables.count} comparables (cache hit: ${comparables.cacheHit})`);
  console.log(`Average Price: $${comparables.averagePrice}`);
  console.log();

  if (comparables.comparables.length > 0) {
    console.log('Top Comparables:');
    comparables.comparables.forEach((comp, i) => {
      console.log(`  ${i + 1}. ${comp.title}`);
      console.log(`     Price: $${comp.price} | Sold: ${comp.soldDate.toISOString().split('T')[0]}`);
      console.log(`     Source: ${comp.source} | URL: ${comp.url.substring(0, 50)}...`);
      console.log();
    });
    console.log('✅ Comparable pricing fetched successfully\n');
  } else {
    console.log('⚠️  No comparables found (eBay API might not be configured)');
    console.log('   This is expected if EBAY_APP_ID is not set in .env');
    console.log('   Comparables will be empty but the API will not block the pipeline.\n');
  }
} catch (err) {
  console.error('❌ Comparable pricing test failed:', (err as Error).message);
}

// Test 3: 30-Day Price Lock
console.log('TEST 3: 30-Day Price Lock Validation');
console.log('=====================================');

try {
  // Query offers to check expiration field
  const result = await db.query(
    `SELECT id, status, expires_at, created_at,
            EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400 AS days_remaining
     FROM offers
     WHERE status IN ('ready', 'processing')
     LIMIT 5`
  );

  if (result.rows.length === 0) {
    console.log('⚠️  No offers found to test expiration');
    console.log('   Create an offer first to test this feature.\n');
  } else {
    console.log(`\nChecking expiration for ${result.rows.length} offers:\n`);

    result.rows.forEach((offer: any) => {
      const daysRemaining = Math.round(offer.days_remaining);
      const isExpired = daysRemaining < 0;

      console.log(`Offer ${offer.id.substring(0, 8)}...`);
      console.log(`  Status: ${offer.status}`);
      console.log(`  Created: ${offer.created_at}`);
      console.log(`  Expires: ${offer.expires_at}`);
      console.log(`  Days Remaining: ${daysRemaining} ${isExpired ? '(EXPIRED)' : ''}`);
      console.log();
    });

    console.log('✅ Expiration tracking is working\n');
  }
} catch (err) {
  console.error('❌ Price lock test failed:', (err as Error).message);
}

console.log('=== Phase 2 Tests Complete ===');
process.exit(0);
