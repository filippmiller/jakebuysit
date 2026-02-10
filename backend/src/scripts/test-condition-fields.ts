/**
 * Test script to verify condition and confidence fields are working
 */
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

async function testConditionFields() {
  try {
    // Create a test offer with new fields
    const testOffer = await db.create('offers', {
      status: 'ready',
      photos: JSON.stringify([{ url: 'test.jpg', uploaded_at: new Date().toISOString() }]),
      offer_amount: 100.00,
      item_brand: 'Apple',
      item_model: 'iPhone 12',
      item_category: 'Phones & Tablets',
      item_condition: 'Good',
      condition_grade: 'Good',
      condition_notes: 'Minor scratches on back, screen is pristine',
      pricing_confidence: 85,
      comparable_sales: JSON.stringify([
        { source: 'eBay', price: 299.99, date: '2026-02-05', url: 'https://ebay.com/item/123', title: 'iPhone 12 64GB' },
        { source: 'Facebook', price: 285.00, date: '2026-02-08', title: 'iPhone 12 Good Condition' },
        { source: 'eBay', price: 310.00, date: '2026-02-03', url: 'https://ebay.com/item/456', title: 'iPhone 12 Unlocked' }
      ]),
      expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    });

    console.log('\n=== Test Offer Created ===');
    console.log(`ID: ${testOffer.id}`);
    console.log(`Condition Grade: ${testOffer.condition_grade}`);
    console.log(`Condition Notes: ${testOffer.condition_notes}`);
    console.log(`Pricing Confidence: ${testOffer.pricing_confidence}`);
    console.log(`Comparable Sales: ${JSON.stringify(testOffer.comparable_sales, null, 2)}`);

    // Retrieve the offer to verify fields are returned correctly
    const retrieved = await db.findOne('offers', { id: testOffer.id });

    console.log('\n=== Retrieved Offer ===');
    console.log(`Condition Grade: ${retrieved.condition_grade}`);
    console.log(`Condition Notes: ${retrieved.condition_notes}`);
    console.log(`Pricing Confidence: ${retrieved.pricing_confidence}`);
    // PostgreSQL JSONB is automatically parsed by pg driver
    const comparables = Array.isArray(retrieved.comparable_sales) ? retrieved.comparable_sales : JSON.parse(retrieved.comparable_sales);
    console.log(`Comparable Sales Count: ${comparables.length}`);

    // Clean up test data
    await db.delete('offers', { id: testOffer.id });
    console.log('\n✓ Test offer deleted');

    // Test update operation
    const updateTest = await db.create('offers', {
      status: 'processing',
      photos: JSON.stringify([{ url: 'test2.jpg' }]),
      offer_amount: 50.00,
    });

    await db.update('offers', { id: updateTest.id }, {
      condition_grade: 'Excellent',
      pricing_confidence: 92,
      comparable_sales: JSON.stringify([
        { source: 'eBay', price: 150.00, date: '2026-02-10' }
      ]),
    });

    const updated = await db.findOne('offers', { id: updateTest.id });
    console.log('\n=== Update Test ===');
    console.log(`Condition Grade: ${updated.condition_grade}`);
    console.log(`Pricing Confidence: ${updated.pricing_confidence}`);

    await db.delete('offers', { id: updateTest.id });
    console.log('✓ Update test offer deleted');

    logger.info('All tests passed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Test failed');
    process.exit(1);
  }
}

testConditionFields();
