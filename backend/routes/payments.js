// ============================================
// routes/payments.js — Razorpay Payment Routes
// ============================================
// Handles payment order creation and verification.
//
// Flow:
//   1. Frontend calls POST /create-order with
//      invoice_id → receives Razorpay order_id
//   2. Frontend opens Razorpay checkout modal
//   3. After payment, frontend calls POST /verify
//      with order_id, payment_id, signature
//   4. Backend verifies HMAC signature →
//      marks payment + invoice as "paid"
// ============================================

const express = require('express');
const crypto  = require('crypto');
const Razorpay = require('razorpay');
const { body, validationResult } = require('express-validator');

const pool           = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ---- Initialize Razorpay instance ---------------

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---- Helper: Return validation errors -----------

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

// ================================================
// POST /api/payments/create-order
// ================================================
// Creates a Razorpay order for a specific invoice.
// The order amount comes from the invoice's
// total_amount (converted to paise for Razorpay).
//
// Auth: Required (invoice owner only)
// ================================================

router.post(
  '/create-order',
  authMiddleware,
  [
    body('invoice_id')
      .notEmpty().withMessage('Invoice ID is required.')
      .isInt({ min: 1 }).withMessage('Invoice ID must be a positive integer.')
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const userId = req.user.id;
      const { invoice_id } = req.body;

      // Check if user is on paid plan
      const userCheck = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0 || userCheck.rows[0].plan !== 'paid') {
        return res.status(403).json({ error: 'Please upgrade to a paid plan to generate payment links.' });
      }

      // Fetch the invoice (verify ownership + status)
      const invoiceResult = await pool.query(
        `SELECT i.id, i.invoice_number, i.status, i.total_amount,
                c.name AS client_name, c.email AS client_email
         FROM invoices i
         JOIN clients c ON c.id = i.client_id
         WHERE i.id = $1 AND i.user_id = $2`,
        [invoice_id, userId]
      );

      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found.' });
      }

      const invoice = invoiceResult.rows[0];

      // Don't create orders for already-paid invoices
      if (invoice.status === 'paid') {
        return res.status(400).json({
          error: 'This invoice is already paid.'
        });
      }

      // Convert amount to paise (Razorpay uses smallest currency unit)
      // e.g. ₹1,500.50 → 150050 paise
      const amountInPaise = Math.round(parseFloat(invoice.total_amount) * 100);

      // Create Razorpay payment link
      const paymentLink = await razorpay.paymentLink.create({
        amount:   amountInPaise,
        currency: 'INR',
        accept_partial: false,
        description: `Payment for Invoice ${invoice.invoice_number}`,
        customer: {
          name: invoice.client_name || 'Client',
          email: invoice.client_email || ''
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        notes: {
          invoice_id:     invoice.id,
          invoice_number: invoice.invoice_number,
          client_name:    invoice.client_name,
        }
      });

      // Save the payment record in our DB
      await pool.query(
        `INSERT INTO payments (invoice_id, razorpay_order_id, amount, status)
         VALUES ($1, $2, $3, 'created')`,
        [invoice_id, paymentLink.id, invoice.total_amount]
      );

      // Return order details for the frontend checkout
      res.status(201).json({
        message: 'Payment link created.',
        paymentLink: paymentLink.short_url,
        order: {
          id:       paymentLink.id,
          amount:   paymentLink.amount,
          currency: paymentLink.currency,
        },
        invoice: {
          id:             invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount:   invoice.total_amount,
          client_name:    invoice.client_name,
          client_email:   invoice.client_email,
        },
        // Frontend needs this to open checkout
        razorpay_key: process.env.RAZORPAY_KEY_ID,
      });

    } catch (err) {
      console.error('Payment order creation error:', err.message);
      res.status(500).json({ error: 'Could not create payment order.' });
    }
  }
);

// ================================================
// POST /api/payments/verify
// ================================================
// Verifies a Razorpay payment using HMAC-SHA256
// signature validation.
//
// On success:
//   1. Updates payment record → status = 'paid'
//   2. Updates invoice → status = 'paid'
//
// This is called by the frontend after the
// Razorpay checkout modal returns success.
//
// Auth: Required
// ================================================

router.post(
  '/verify',
  authMiddleware,
  [
    body('razorpay_order_id')
      .notEmpty().withMessage('Razorpay order ID is required.')
      .trim(),

    body('razorpay_payment_id')
      .notEmpty().withMessage('Razorpay payment ID is required.')
      .trim(),

    body('razorpay_signature')
      .notEmpty().withMessage('Razorpay signature is required.')
      .trim()
  ],
  async (req, res) => {
    const dbClient = await pool.connect();

    try {
      if (!validate(req, res)) {
        dbClient.release();
        return;
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // ---- Step 1: Verify the signature ----
      // Razorpay signs: order_id + "|" + payment_id
      // with the key_secret using HMAC-SHA256.
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          error: 'Payment verification failed. Invalid signature.'
        });
      }

      // ---- Step 2: Look up the payment record ----
      const paymentResult = await dbClient.query(
        `SELECT p.id, p.invoice_id, p.status
         FROM payments p
         WHERE p.razorpay_order_id = $1`,
        [razorpay_order_id]
      );

      if (paymentResult.rows.length === 0) {
        dbClient.release();
        return res.status(404).json({
          error: 'Payment record not found for this order.'
        });
      }

      const payment = paymentResult.rows[0];

      // Don't process already-verified payments
      if (payment.status === 'paid') {
        dbClient.release();
        return res.json({
          message: 'Payment was already verified.',
          payment_id: payment.id
        });
      }

      // ---- Step 3: Update payment + invoice in a transaction ----
      await dbClient.query('BEGIN');

      // Mark payment as paid
      await dbClient.query(
        `UPDATE payments
         SET razorpay_payment_id = $1,
             status = 'paid',
             paid_at = NOW()
         WHERE id = $2`,
        [razorpay_payment_id, payment.id]
      );

      // Mark the linked invoice as paid
      await dbClient.query(
        `UPDATE invoices
         SET status = 'paid'
         WHERE id = $1`,
        [payment.invoice_id]
      );

      await dbClient.query('COMMIT');

      res.json({
        message: 'Payment verified successfully. Invoice marked as paid.',
        payment: {
          id: payment.id,
          invoice_id: payment.invoice_id,
          razorpay_order_id,
          razorpay_payment_id,
          status: 'paid'
        }
      });

    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Payment verification error:', err.message);
      res.status(500).json({ error: 'Could not verify payment.' });

    } finally {
      dbClient.release();
    }
  }
);

// ================================================
// GET /api/payments/invoice/:invoice_id
// ================================================
// Returns payment history for a specific invoice.
// Useful for the invoice detail page.
//
// Auth: Required (invoice owner only)
// ================================================

router.get(
  '/invoice/:invoice_id',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { invoice_id } = req.params;

      // Verify the invoice belongs to this user
      const invoiceCheck = await pool.query(
        'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
        [invoice_id, userId]
      );

      if (invoiceCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found.' });
      }

      // Fetch all payment attempts for this invoice
      const result = await pool.query(
        `SELECT id, razorpay_order_id, razorpay_payment_id,
                amount, status, paid_at
         FROM payments
         WHERE invoice_id = $1
         ORDER BY id DESC`,
        [invoice_id]
      );

      res.json({
        count: result.rows.length,
        payments: result.rows
      });

    } catch (err) {
      console.error('Payment history error:', err.message);
      res.status(500).json({ error: 'Could not fetch payment history.' });
    }
  }
);

// ================================================
// POST /api/payments/create-plan-order
// ================================================
// Creates a Razorpay order for purchasing a plan.
// Fixed price: ₹999 / year
// ================================================

router.post(
  '/create-plan-order',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const planPriceINR = 99;
      const amountInPaise = planPriceINR * 100;

      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `plan_upgrade_${userId}_${Date.now()}`,
        notes: {
          user_id: userId,
          type: 'plan_upgrade'
        }
      });

      // Save the plan payment record
      await pool.query(
        `INSERT INTO plan_payments (user_id, razorpay_order_id, amount, status)
         VALUES ($1, $2, $3, 'created')`,
        [userId, order.id, planPriceINR]
      );

      res.status(201).json({
        message: 'Plan upgrade order created.',
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
        razorpay_key: process.env.RAZORPAY_KEY_ID,
      });

    } catch (err) {
      console.error('Plan order creation error:', err.message);
      res.status(500).json({ error: 'Could not create plan order.' });
    }
  }
);

// ================================================
// POST /api/payments/verify-plan
// ================================================
// Verifies plan purchase signature and upgrades user.
// ================================================

router.post(
  '/verify-plan',
  authMiddleware,
  [
    body('razorpay_order_id').notEmpty().trim(),
    body('razorpay_payment_id').notEmpty().trim(),
    body('razorpay_signature').notEmpty().trim()
  ],
  async (req, res) => {
    const dbClient = await pool.connect();

    try {
      if (!validate(req, res)) {
        dbClient.release();
        return;
      }

      const userId = req.user.id;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // ---- Step 1: Try HMAC signature verification ----
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      let signatureValid = (expectedSignature === razorpay_signature);

      // ---- Step 2: Fallback — verify via Razorpay API if signature fails ----
      // QR code payments and some UPI flows can return mismatched signatures
      // in the client-side handler. We double-check with Razorpay's API.
      if (!signatureValid) {
        console.warn(`[verify-plan] Signature mismatch for order ${razorpay_order_id}, trying Razorpay API fallback...`);
        try {
          const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
          if (
            rzpPayment &&
            rzpPayment.order_id === razorpay_order_id &&
            (rzpPayment.status === 'captured' || rzpPayment.status === 'authorized')
          ) {
            console.log(`[verify-plan] Razorpay API confirms payment ${razorpay_payment_id} is ${rzpPayment.status}. Proceeding.`);
            signatureValid = true;
          } else {
            console.warn(`[verify-plan] Razorpay API payment status: ${rzpPayment?.status}, order_id match: ${rzpPayment?.order_id === razorpay_order_id}`);
          }
        } catch (apiErr) {
          console.error(`[verify-plan] Razorpay API fallback failed:`, apiErr.message);
        }
      }

      if (!signatureValid) {
        dbClient.release();
        return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
      }

      // ---- Step 3: Look up the plan payment record ----
      const paymentResult = await dbClient.query(
        `SELECT id, user_id, status FROM plan_payments WHERE razorpay_order_id = $1`,
        [razorpay_order_id]
      );

      if (paymentResult.rows.length === 0) {
        dbClient.release();
        console.error(`[verify-plan] No plan_payments record found for order ${razorpay_order_id}`);
        return res.status(404).json({ error: 'Payment record not found.' });
      }

      const payment = paymentResult.rows[0];

      if (payment.user_id !== userId) {
         dbClient.release();
         return res.status(403).json({ error: 'Unauthorized to verify this payment.' });
      }

      if (payment.status === 'paid') {
        dbClient.release();
        return res.json({ message: 'Payment already verified.' });
      }

      // ---- Step 4: Upgrade user in a transaction ----
      await dbClient.query('BEGIN');

      // Update payment status
      await dbClient.query(
        `UPDATE plan_payments
         SET razorpay_payment_id = $1, status = 'paid', paid_at = NOW()
         WHERE id = $2`,
        [razorpay_payment_id, payment.id]
      );

      // Upgrade user plan
      await dbClient.query(
        `UPDATE users SET plan = 'paid' WHERE id = $1`,
        [userId]
      );

      await dbClient.query('COMMIT');
      console.log(`[verify-plan] User ${userId} upgraded to paid plan successfully.`);

      res.json({ message: 'Plan upgraded successfully!' });

    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Plan verification error:', err.message, err.stack);
      res.status(500).json({ error: 'Could not verify plan payment.' });
    } finally {
      dbClient.release();
    }
  }
);

// ================================================
// POST /api/payments/create-template-order
// ================================================
// Creates a Razorpay order for purchasing a premium
// template. Fixed price: ₹10
// ================================================

router.post(
  '/create-template-order',
  authMiddleware,
  [body('template_id').notEmpty().trim()],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;
      const userId = req.user.id;
      const { template_id } = req.body;
      
      const templatePriceINR = 10;
      const amountInPaise = templatePriceINR * 100;

      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `template_${userId}_${Date.now()}`,
        notes: {
          user_id: userId,
          template_id: template_id,
          type: 'template_purchase'
        }
      });

      res.status(201).json({
        message: 'Template order created.',
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
        razorpay_key: process.env.RAZORPAY_KEY_ID,
      });

    } catch (err) {
      console.error('Template order creation error:', err.message);
      res.status(500).json({ error: 'Could not create template order.' });
    }
  }
);

// ================================================
// POST /api/payments/verify-template
// ================================================
// Verifies template purchase signature and unlocks
// the template for the user.
// ================================================

router.post(
  '/verify-template',
  authMiddleware,
  [
    body('razorpay_order_id').notEmpty().trim(),
    body('razorpay_payment_id').notEmpty().trim(),
    body('razorpay_signature').notEmpty().trim(),
    body('template_id').notEmpty().trim()
  ],
  async (req, res) => {
    const dbClient = await pool.connect();

    try {
      if (!validate(req, res)) {
        dbClient.release();
        return;
      }

      const userId = req.user.id;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, template_id } = req.body;

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
      }

      await dbClient.query('BEGIN');

      // Append the template_id to the unlocked_templates JSONB array.
      // Uses the jsonb || operator to concatenate arrays.
      await dbClient.query(
        `UPDATE users 
         SET unlocked_templates = COALESCE(unlocked_templates, '[]'::jsonb) || $1::jsonb
         WHERE id = $2 AND NOT (COALESCE(unlocked_templates, '[]'::jsonb) @> $1::jsonb)`,
        [JSON.stringify([template_id]), userId]
      );

      await dbClient.query('COMMIT');

      res.json({ message: 'Template unlocked successfully!' });

    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Template verification error:', err.message);
      res.status(500).json({ error: 'Could not verify template payment.' });
    } finally {
      dbClient.release();
    }
  }
);

module.exports = router;
