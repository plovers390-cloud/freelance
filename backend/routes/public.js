// ============================================
// routes/public.js — Public API Routes
// ============================================
// Handles routes that do not require authentication,
// such as public payment pages for clients.
// ============================================

const express = require('express');
const crypto  = require('crypto');
const Razorpay = require('razorpay');
const { body, validationResult } = require('express-validator');

const pool = require('../db');

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
// GET /api/public/invoices/:id
// ================================================
// Fetches invoice details for the public payment page.
// Returns only the necessary information for a client
// to review and pay.
// ================================================

router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(
      `SELECT i.id, i.invoice_number, i.status, i.due_date,
              i.subtotal, i.discount_type, i.discount_value, i.discount_amount,
              i.shipping_charges, i.gst_rate, i.gst_amount, i.total_amount,
              i.notes, i.terms_conditions, i.template_id, i.theme_id, i.created_at,
              c.name AS client_name, c.email AS client_email, c.phone AS client_phone, c.address AS client_address, c.gstin AS client_gstin,
              u.name AS user_name, u.business_name, u.business_address, u.gstin AS business_gstin,
              u.phone AS business_phone, u.logo_url, u.signature_url, u.razorpay_account_id, u.upi_id
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       JOIN users u ON u.id = i.user_id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = invoiceResult.rows[0];

    // Fetch line items
    const itemsResult = await pool.query(
      `SELECT id, description, quantity, rate, amount
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    invoice.items = itemsResult.rows;

    // Do NOT send the raw razorpay_account_id directly. We just need to know if it's set.
    const hasLinkedAccount = !!invoice.razorpay_account_id;
    delete invoice.razorpay_account_id;

    res.json({ invoice, hasLinkedAccount });
  } catch (err) {
    console.error('Public invoice fetch error:', err.message);
    res.status(500).json({ error: 'Could not fetch invoice details.' });
  }
});

// ================================================
// POST /api/public/payments/create-route-order
// ================================================
// Creates a Razorpay Order using Razorpay Route.
// It automatically transfers (total_amount - 2 INR)
// to the freelancer's Linked Account, keeping 2 INR
// as a platform fee.
// ================================================

router.post(
  '/payments/create-route-order',
  [
    body('invoice_id')
      .notEmpty().withMessage('Invoice ID is required.')
      .isInt({ min: 1 }).withMessage('Invoice ID must be a positive integer.')
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const { invoice_id } = req.body;

      // Fetch the invoice and the user's Razorpay Account ID
      const invoiceResult = await pool.query(
        `SELECT i.id, i.invoice_number, i.status, i.total_amount,
                u.razorpay_account_id, c.name AS client_name, c.email AS client_email
         FROM invoices i
         JOIN users u ON u.id = i.user_id
         JOIN clients c ON c.id = i.client_id
         WHERE i.id = $1`,
        [invoice_id]
      );

      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found.' });
      }

      const invoice = invoiceResult.rows[0];

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'This invoice is already paid.' });
      }

      if (!invoice.razorpay_account_id) {
        return res.status(400).json({ 
          error: 'The freelancer has not linked their Razorpay account yet. Cannot process payment.' 
        });
      }

      const totalAmountInPaise = Math.round(parseFloat(invoice.total_amount) * 100);
      const commissionInPaise = 200; // 2 INR flat fee
      
      if (totalAmountInPaise <= commissionInPaise) {
        return res.status(400).json({ 
          error: 'Invoice amount is too low to process via Route.' 
        });
      }

      const transferAmountInPaise = totalAmountInPaise - commissionInPaise;

      // Create Razorpay order with transfers
      const order = await razorpay.orders.create({
        amount: totalAmountInPaise,
        currency: 'INR',
        receipt: `receipt_${invoice.invoice_number}`,
        notes: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
        transfers: [
          {
            account: invoice.razorpay_account_id,
            amount: transferAmountInPaise,
            currency: 'INR',
            notes: {
              invoice_id: invoice.id,
              type: 'freelancer_payout'
            },
            on_hold: false
          }
        ]
      });

      // Save the payment record in our DB
      await pool.query(
        `INSERT INTO payments (invoice_id, razorpay_order_id, amount, status)
         VALUES ($1, $2, $3, 'created')`,
        [invoice_id, order.id, invoice.total_amount]
      );

      // Return order details for the frontend checkout
      res.status(201).json({
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
        razorpay_key: process.env.RAZORPAY_KEY_ID,
      });

    } catch (err) {
      console.error('Route order creation error:', err.message);
      res.status(500).json({ error: 'Could not create secure payment.' });
    }
  }
);

// ================================================
// POST /api/public/payments/verify-route-order
// ================================================
// Verifies the Razorpay payment.
// ================================================

router.post(
  '/payments/verify-route-order',
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

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
      }

      const paymentResult = await dbClient.query(
        `SELECT p.id, p.invoice_id, p.status FROM payments p WHERE p.razorpay_order_id = $1`,
        [razorpay_order_id]
      );

      if (paymentResult.rows.length === 0) {
        dbClient.release();
        return res.status(404).json({ error: 'Payment record not found for this order.' });
      }

      const payment = paymentResult.rows[0];

      if (payment.status === 'paid') {
        dbClient.release();
        return res.json({ message: 'Payment was already verified.', payment_id: payment.id });
      }

      await dbClient.query('BEGIN');

      await dbClient.query(
        `UPDATE payments SET razorpay_payment_id = $1, status = 'paid', paid_at = NOW() WHERE id = $2`,
        [razorpay_payment_id, payment.id]
      );

      await dbClient.query(
        `UPDATE invoices SET status = 'paid' WHERE id = $1`,
        [payment.invoice_id]
      );

      await dbClient.query('COMMIT');

      res.json({ message: 'Payment successful!' });

    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Payment verification error:', err.message);
      res.status(500).json({ error: 'Could not verify payment.' });
    } finally {
      dbClient.release();
    }
  }
);

module.exports = router;
