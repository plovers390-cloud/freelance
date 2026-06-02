// ============================================
// migrate.js — Database Migration Script
// ============================================
// Run:  npm run migrate
//
// Creates all tables with proper constraints,
// indexes, and foreign keys. Safe to re-run
// (uses IF NOT EXISTS everywhere).
// ============================================

const pool = require('./db');

const migrate = async () => {
  const client = await pool.connect();

  try {
    // Wrap everything in a transaction for atomicity
    await client.query('BEGIN');

    console.log('🚀 Starting database migration...\n');

    // ------------------------------------------
    // 1. USERS TABLE
    // ------------------------------------------
    // Stores business owners who send invoices.
    // plan defaults to 'free'; upgraded via Razorpay.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        name            VARCHAR(255)    NOT NULL,
        email           VARCHAR(255)    NOT NULL UNIQUE,
        password        VARCHAR(255)    NOT NULL,
        business_name   VARCHAR(255),
        business_address TEXT,
        gstin           VARCHAR(15),
        phone           VARCHAR(15),
        logo_url        TEXT,
        signature_url   TEXT,
        plan            VARCHAR(10)     NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'paid')),
        created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
      );
    `);
    
    // Add signature_url, terms_conditions, and avatar_url for existing databases
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_url TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_conditions TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(50);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_templates JSONB DEFAULT '[]'::jsonb;`);

    console.log('  ✅ Table "users" created');

    // ------------------------------------------
    // 2. CLIENTS TABLE
    // ------------------------------------------
    // Each client belongs to a single user.
    // ON DELETE CASCADE: removing a user removes
    // all their clients automatically.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255),
        phone      VARCHAR(15),
        address    TEXT,
        created_at TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);
    
    // Add gstin for existing databases
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);`);

    console.log('  ✅ Table "clients" created');

    // Index for fast lookup of a user's clients
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_user_id
        ON clients(user_id);
    `);

    // ------------------------------------------
    // 3. INVOICES TABLE
    // ------------------------------------------
    // Core business entity.
    // - invoice_number is unique per user (INV-001).
    // - status tracks payment lifecycle.
    // - Monetary fields use NUMERIC(12,2) for
    //   precision (no floating-point drift).
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id       INTEGER        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        invoice_number  VARCHAR(20)    NOT NULL,
        status          VARCHAR(10)    NOT NULL DEFAULT 'unpaid'
                        CHECK (status IN ('unpaid', 'paid', 'overdue')),
        due_date        DATE           NOT NULL,
        subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_type   VARCHAR(10)    NOT NULL DEFAULT 'flat'
                        CHECK (discount_type IN ('flat', 'percent')),
        discount_value  NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        shipping_charges NUMERIC(12, 2) NOT NULL DEFAULT 0,
        gst_rate        NUMERIC(5, 2)  NOT NULL DEFAULT 0,
        gst_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
        notes           TEXT,
        created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),

        -- Each user has unique invoice numbers
        CONSTRAINT uq_invoice_number_per_user UNIQUE (user_id, invoice_number)
      );
    `);

    // Add new columns for existing databases (safe to re-run)
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) NOT NULL DEFAULT 'flat';`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_charges NUMERIC(12,2) NOT NULL DEFAULT 0;`);

    // Template & theme columns for invoice customization
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template_id VARCHAR(30) DEFAULT 'classic';`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS theme_id VARCHAR(30) DEFAULT 'ocean-blue';`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms_conditions TEXT;`);

    console.log('  ✅ Table "invoices" created');

    // Indexes for common query patterns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_user_id
        ON invoices(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id
        ON invoices(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status
        ON invoices(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date
        ON invoices(due_date);
    `);

    // ------------------------------------------
    // 4. INVOICE_ITEMS TABLE
    // ------------------------------------------
    // Line items for each invoice.
    // ON DELETE CASCADE: deleting an invoice
    // removes all its items.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id          SERIAL PRIMARY KEY,
        invoice_id  INTEGER        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description VARCHAR(500)   NOT NULL,
        quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
        rate        NUMERIC(12, 2) NOT NULL DEFAULT 0,
        amount      NUMERIC(12, 2) NOT NULL DEFAULT 0
      );
    `);
    console.log('  ✅ Table "invoice_items" created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
        ON invoice_items(invoice_id);
    `);

    // ------------------------------------------
    // 4.5. PRODUCTS TABLE
    // ------------------------------------------
    // Inventory items for barcode scanning.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        barcode     VARCHAR(100),
        name        VARCHAR(255)   NOT NULL,
        rate        NUMERIC(12, 2) NOT NULL DEFAULT 0,
        created_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_product_barcode_per_user UNIQUE (user_id, barcode)
      );
    `);
    console.log('  ✅ Table "products" created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_user_id
        ON products(user_id);
    `);

    // ------------------------------------------
    // 5. PAYMENTS TABLE
    // ------------------------------------------
    // Tracks Razorpay payment attempts.
    // Links to an invoice; paid_at is set when
    // the payment is verified.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                   SERIAL PRIMARY KEY,
        invoice_id           INTEGER        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        razorpay_order_id    VARCHAR(255),
        razorpay_payment_id  VARCHAR(255),
        amount               NUMERIC(12, 2) NOT NULL DEFAULT 0,
        status               VARCHAR(20)    NOT NULL DEFAULT 'created'
                             CHECK (status IN ('created', 'paid', 'failed')),
        paid_at              TIMESTAMP
      );
    `);
    console.log('  ✅ Table "payments" created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
        ON payments(invoice_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id
        ON payments(razorpay_order_id);
    `);

    // ------------------------------------------
    // 6. PLAN PAYMENTS TABLE
    // ------------------------------------------
    // Tracks Razorpay payments for Pro Plan subscriptions.
    // Links to a user; upgrades their plan when verified.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_payments (
        id                   SERIAL PRIMARY KEY,
        user_id              INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        razorpay_order_id    VARCHAR(255),
        razorpay_payment_id  VARCHAR(255),
        amount               NUMERIC(12, 2) NOT NULL DEFAULT 0,
        status               VARCHAR(20)    NOT NULL DEFAULT 'created'
                             CHECK (status IN ('created', 'paid', 'failed')),
        paid_at              TIMESTAMP
      );
    `);
    console.log('  ✅ Table "plan_payments" created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_payments_user_id
        ON plan_payments(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_payments_order_id
        ON plan_payments(razorpay_order_id);
    `);

    // ------------------------------------------
    // 7. REFRESH TOKENS TABLE
    // ------------------------------------------
    // Stores long-lived refresh tokens for JWT
    // rotation.
    // ------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       VARCHAR(255) NOT NULL UNIQUE,
        expires_at  TIMESTAMP    NOT NULL,
        created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table "refresh_tokens" created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
        ON refresh_tokens(user_id);
    `);

    await client.query('COMMIT');
    console.log('\n🎉 Migration completed successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed — rolled back:');
    console.error(err.message);
    process.exit(1);

  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
