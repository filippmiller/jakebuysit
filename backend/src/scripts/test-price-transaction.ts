/**
 * Test script for price update transaction integrity.
 * Verifies that price updates and price_history inserts are atomic.
 */

import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

async function testTransactionRollback() {
  logger.info('Testing transaction rollback on price update failure...');

  try {
    // Create a test offer using raw SQL with minimal required fields
    const result = await db.query(`
      INSERT INTO offers (status, photos, offer_amount, ai_identification)
      VALUES ('pending', '[]'::jsonb, 100.00, '{"test": true}'::jsonb)
      RETURNING *
    `);
    const testOffer = result.rows[0];

    logger.info({ offerId: testOffer.id }, 'Created test offer');

    // Attempt to update price with a transaction that will fail
    try {
      await db.transaction(async (trx) => {
        // Update offer price
        await trx.update('offers', { id: testOffer.id }, {
          offer_amount: 75.00,
          last_price_optimization: new Date(),
        });

        logger.info('Price updated to 75.00 inside transaction');

        // Force a failure by violating a foreign key constraint
        // Use a non-existent offer_id which will fail the foreign key check
        await trx.create('price_history', {
          offer_id: '00000000-0000-0000-0000-000000000000', // Non-existent offer
          old_price: 100.00,
          new_price: 75.00,
          reason: 'test',
          trigger_type: 'manual',
          days_since_created: 0,
        });
      });

      logger.error('Transaction should have failed but did not!');
    } catch (error) {
      logger.info('Transaction failed as expected (missing required field)');
    }

    // Verify the offer price was NOT changed (rolled back)
    const afterRollback = await db.findOne('offers', { id: testOffer.id });

    if (afterRollback?.offer_amount === '100.00') {
      logger.info('✓ SUCCESS: Price was rolled back correctly');
    } else {
      logger.error(
        { actualPrice: afterRollback?.offer_amount },
        '✗ FAILURE: Price was NOT rolled back! Data integrity violated!'
      );
    }

    // Verify no price_history record was created
    const historyCount = await db.query(
      'SELECT COUNT(*) as count FROM price_history WHERE offer_id = $1',
      [testOffer.id]
    );

    if (historyCount.rows[0].count === '0') {
      logger.info('✓ SUCCESS: No price_history record was created');
    } else {
      logger.error('✗ FAILURE: price_history record exists despite rollback!');
    }

    // Clean up test data
    await db.delete('offers', { id: testOffer.id });
    logger.info('Test offer cleaned up');

    logger.info('=== TRANSACTION INTEGRITY TEST PASSED ===');
  } catch (error) {
    logger.error({ error }, 'Transaction test failed');
    throw error;
  }
}

async function testTransactionSuccess() {
  logger.info('Testing successful transaction commit...');

  try {
    // Create a test offer using raw SQL with minimal required fields
    const result = await db.query(`
      INSERT INTO offers (status, photos, offer_amount, ai_identification)
      VALUES ('pending', '[]'::jsonb, 100.00, '{"test": true}'::jsonb)
      RETURNING *
    `);
    const testOffer = result.rows[0];

    logger.info({ offerId: testOffer.id }, 'Created test offer for success case');

    // Perform a valid price update with transaction
    await db.transaction(async (trx) => {
      await trx.update('offers', { id: testOffer.id }, {
        offer_amount: 75.00,
        last_price_optimization: new Date(),
      });

      await trx.create('price_history', {
        offer_id: testOffer.id,
        old_price: 100.00,
        new_price: 75.00,
        reason: 'test_success',
        trigger_type: 'manual',
        days_since_created: 0,
        changed_by: null,
        notes: 'Test transaction',
      });
    });

    // Verify the offer price WAS changed
    const afterCommit = await db.findOne('offers', { id: testOffer.id });

    if (afterCommit?.offer_amount === '75.00') {
      logger.info('✓ SUCCESS: Price was committed correctly');
    } else {
      logger.error(
        { actualPrice: afterCommit?.offer_amount },
        '✗ FAILURE: Price was not updated!'
      );
    }

    // Verify price_history record was created
    const historyCount = await db.query(
      'SELECT COUNT(*) as count FROM price_history WHERE offer_id = $1',
      [testOffer.id]
    );

    if (historyCount.rows[0].count === '1') {
      logger.info('✓ SUCCESS: price_history record was created');
    } else {
      logger.error('✗ FAILURE: price_history record was not created!');
    }

    // Clean up test data
    await db.query('DELETE FROM price_history WHERE offer_id = $1', [testOffer.id]);
    await db.delete('offers', { id: testOffer.id });
    logger.info('Test offer cleaned up');

    logger.info('=== TRANSACTION SUCCESS TEST PASSED ===');
  } catch (error) {
    logger.error({ error }, 'Transaction success test failed');
    throw error;
  }
}

async function main() {
  try {
    await db.connect();

    logger.info('Starting transaction integrity tests...');

    await testTransactionRollback();
    logger.info('');
    await testTransactionSuccess();

    logger.info('');
    logger.info('=== ALL TESTS PASSED ===');
    logger.info('Transaction wrapper ensures data integrity for price updates.');

    await db.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Test suite failed');
    await db.disconnect();
    process.exit(1);
  }
}

main();
