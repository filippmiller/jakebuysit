/**
 * Seed script for admin users and test data.
 *
 * Usage: npx tsx src/scripts/seed-admin.ts
 *
 * Creates:
 * - 1 super_admin user
 * - 1 admin user
 * - 1 reviewer user
 * - 1 warehouse user
 * - 3 regular test users with mock offers, shipments, payouts
 */
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jakebuysit';

const pool = new Pool({ connectionString: DATABASE_URL });

async function seed() {
  console.log('Seeding admin users and test data...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ───── Admin Users ─────
    const adminUsers = [
      { email: 'superadmin@jakebuysit.com', name: 'Jake Boss', role: 'super_admin', password: 'admin123456' },
      { email: 'admin@jakebuysit.com', name: 'Admin Jake', role: 'admin', password: 'admin123456' },
      { email: 'reviewer@jakebuysit.com', name: 'Review Jake', role: 'reviewer', password: 'admin123456' },
      { email: 'warehouse@jakebuysit.com', name: 'Warehouse Jake', role: 'warehouse', password: 'admin123456' },
    ];

    const adminIds: string[] = [];
    for (const u of adminUsers) {
      const result = await client.query(
        `INSERT INTO users (email, name, auth_provider, password_hash, verified, role, trust_score)
         VALUES ($1, $2, 'email', crypt($3, gen_salt('bf', 10)), true, $4, 100)
         ON CONFLICT (email) DO UPDATE SET role = $4, name = $2
         RETURNING id`,
        [u.email, u.name, u.password, u.role],
      );
      adminIds.push(result.rows[0].id);
      console.log(`  [${u.role}] ${u.email} (id: ${result.rows[0].id})`);
    }

    // ───── Test Users ─────
    const testUsers = [
      { email: 'alice@test.com', name: 'Alice Seller', familiarity: 'regular', bucks: 25.00 },
      { email: 'bob@test.com', name: 'Bob Buyer', familiarity: 'new', bucks: 0 },
      { email: 'carol@test.com', name: 'Carol VIP', familiarity: 'vip', bucks: 150.00 },
    ];

    const userIds: string[] = [];
    for (const u of testUsers) {
      const result = await client.query(
        `INSERT INTO users (email, name, auth_provider, password_hash, verified, jake_familiarity, jake_bucks_balance, trust_score)
         VALUES ($1, $2, 'email', crypt('test123456', gen_salt('bf', 10)), true, $3, $4, 65)
         ON CONFLICT (email) DO UPDATE SET name = $2
         RETURNING id`,
        [u.email, u.name, u.familiarity, u.bucks],
      );
      userIds.push(result.rows[0].id);
      console.log(`  [user] ${u.email} (id: ${result.rows[0].id})`);
    }

    // ───── Mock Offers ─────
    const mockOffers = [
      { userId: userIds[0], status: 'ready', brand: 'Apple', model: 'iPhone 14 Pro', category: 'Phones & Tablets', condition: 'Good', amount: 450, confidence: 92, fmv: 680 },
      { userId: userIds[0], status: 'accepted', brand: 'Sony', model: 'PlayStation 5', category: 'Gaming', condition: 'Like New', amount: 280, confidence: 88, fmv: 420 },
      { userId: userIds[1], status: 'processing', brand: 'Samsung', model: 'Galaxy S24', category: 'Phones & Tablets', condition: 'Fair', amount: 0, confidence: null, fmv: null },
      { userId: userIds[2], status: 'paid', brand: 'Rolex', model: 'Submariner', category: 'Collectibles & Vintage', condition: 'Good', amount: 4200, confidence: 75, fmv: 7500, escalated: true },
      { userId: userIds[2], status: 'shipped', brand: 'Canon', model: 'EOS R5', category: 'Consumer Electronics', condition: 'Like New', amount: 1800, confidence: 94, fmv: 2800 },
      { userId: userIds[0], status: 'declined', brand: 'Nintendo', model: 'Switch OLED', category: 'Gaming', condition: 'Good', amount: 180, confidence: 90, fmv: 280 },
      { userId: null, status: 'ready', brand: 'Bose', model: 'QuietComfort 45', category: 'Consumer Electronics', condition: 'New', amount: 190, confidence: 95, fmv: 280, escalated: false },
      { userId: userIds[1], status: 'ready', brand: 'DeWalt', model: 'Impact Driver', category: 'Tools & Equipment', condition: 'Fair', amount: 45, confidence: 62, fmv: 80, escalated: true },
    ];

    const offerIds: string[] = [];
    for (const o of mockOffers) {
      const result = await client.query(
        `INSERT INTO offers (
          user_id, status, item_brand, item_model, item_category, item_condition,
          offer_amount, ai_confidence, fmv, fmv_confidence, escalated,
          escalation_reason, photos, ai_model_used, condition_multiplier, category_margin
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          o.userId, o.status, o.brand, o.model, o.category, o.condition,
          o.amount || 0, o.confidence, o.fmv, o.confidence ? o.confidence - 5 : null,
          o.escalated || false,
          o.escalated ? 'High value item or low confidence' : null,
          JSON.stringify([{ url: `https://images.jakebuysit.com/mock-${Date.now()}.jpg` }]),
          'gpt-4o-vision', 0.8, 0.6,
        ],
      );
      offerIds.push(result.rows[0].id);
    }
    console.log(`\n  Created ${offerIds.length} mock offers`);

    // ───── Mock Shipments ─────
    // For the accepted and shipped offers
    const shippedOffers = [1, 4]; // indices into offerIds
    for (const idx of shippedOffers) {
      const offerId = offerIds[idx];
      const user = idx === 1 ? userIds[0] : userIds[2];
      await client.query(
        `INSERT INTO shipments (offer_id, user_id, carrier, service, tracking_number, label_url, label_cost, address, status, status_history)
         VALUES ($1, $2, 'USPS', 'Priority', $3, $4, 7.75, $5, $6, $7)`,
        [
          offerId, user,
          `JBI${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          `https://labels.jakebuysit.com/mock-${idx}.pdf`,
          JSON.stringify({ name: 'Test User', street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' }),
          idx === 4 ? 'in_transit' : 'delivered',
          JSON.stringify([{ status: 'label_created', timestamp: new Date().toISOString() }]),
        ],
      );
    }
    console.log('  Created 2 mock shipments');

    // ───── Mock Payouts ─────
    const payoutData = [
      { userId: userIds[0], offerId: offerIds[1], amount: 280, status: 'completed', method: 'paypal' },
      { userId: userIds[2], offerId: offerIds[3], amount: 4200, status: 'completed', method: 'bank' },
      { userId: userIds[2], offerId: offerIds[4], amount: 1800, status: 'pending', method: 'venmo' },
    ];

    for (const p of payoutData) {
      await client.query(
        `INSERT INTO payouts (user_id, offer_id, amount, method, status, fee, net_amount)
         VALUES ($1, $2, $3, $4, $5, 0, $3)`,
        [p.userId, p.offerId, p.amount, p.method, p.status],
      );
    }
    console.log('  Created 3 mock payouts');

    // ───── Mock Fraud Checks ─────
    for (const offerId of offerIds.slice(0, 5)) {
      await client.query(
        `INSERT INTO fraud_checks (user_id, offer_id, check_type, result, confidence, details, action_taken)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userIds[0], offerId,
          ['stock_photo', 'reverse_image', 'device_fingerprint'][Math.floor(Math.random() * 3)],
          Math.random() > 0.8 ? 'flag' : 'pass',
          0.7 + Math.random() * 0.3,
          JSON.stringify({ source: 'automated_scan' }),
          'none',
        ],
      );
    }
    console.log('  Created 5 mock fraud checks');

    // ───── Mock Audit Entries ─────
    const actions = ['created', 'state_change', 'admin_update', 'admin_login'];
    for (let i = 0; i < 20; i++) {
      await client.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, actor_type, actor_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ['offer', 'user', 'payout'][Math.floor(Math.random() * 3)],
          offerIds[Math.floor(Math.random() * offerIds.length)],
          actions[Math.floor(Math.random() * actions.length)],
          Math.random() > 0.5 ? 'admin' : 'system',
          adminIds[Math.floor(Math.random() * adminIds.length)],
        ],
      );
    }
    console.log('  Created 20 mock audit entries');

    await client.query('COMMIT');

    console.log('\nSeed complete!\n');
    console.log('Admin login credentials:');
    console.log('  superadmin@jakebuysit.com / admin123456 (super_admin)');
    console.log('  admin@jakebuysit.com / admin123456 (admin)');
    console.log('  reviewer@jakebuysit.com / admin123456 (reviewer)');
    console.log('  warehouse@jakebuysit.com / admin123456 (warehouse)');
    console.log('\nTest user credentials:');
    console.log('  alice@test.com / test123456');
    console.log('  bob@test.com / test123456');
    console.log('  carol@test.com / test123456');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
