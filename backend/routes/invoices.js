// ============================================
// routes/invoices.js — Invoice Routes
// ============================================
// Handles invoice creation (with line items),
// listing, detail, status updates, and PDF
// generation via pdf-lib.
//
// Business rules enforced:
//  • Auto-generated invoice numbers (INV-001)
//  • GST calculation: subtotal × rate / 100
//  • Free plan: max 5 invoices / calendar month
//  • Auto-overdue detection on reads
// ============================================

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const pool               = require('../db');
const authMiddleware     = require('../middleware/authMiddleware');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Apply auth guard to every route in this file
router.use(authMiddleware);

// ---- Helper: Return validation errors -----------

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

// ---- Helper: Generate next invoice number -------
// Format: INV-001, INV-002, ... per user.
// Finds the highest existing number and increments.

const generateInvoiceNumber = async (userId) => {
  const result = await pool.query(
    `SELECT invoice_number
     FROM invoices
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return 'INV-001';
  }

  // Extract the numeric part from "INV-XXX"
  const lastNumber = result.rows[0].invoice_number;
  const numPart = parseInt(lastNumber.replace('INV-', ''), 10) || 0;
  const nextNum = numPart + 1;

  // Pad to at least 3 digits (INV-001 … INV-999 … INV-1000)
  return `INV-${String(nextNum).padStart(3, '0')}`;
};

// ---- Helper: Mark overdue invoices --------------
// Any unpaid invoice past its due date → 'overdue'.
// Called before reads so the UI always sees correct status.

const markOverdueInvoices = async (userId) => {
  await pool.query(
    `UPDATE invoices
     SET status = 'overdue'
     WHERE user_id = $1
       AND status = 'unpaid'
       AND due_date < CURRENT_DATE`,
    [userId]
  );
};

// ---- Validation Rules ---------------------------

const createInvoiceRules = [
  body('client_id')
    .notEmpty().withMessage('Client is required.')
    .isInt({ min: 1 }).withMessage('Client ID must be a positive integer.'),

  body('due_date')
    .notEmpty().withMessage('Due date is required.')
    .isISO8601().withMessage('Due date must be a valid date (YYYY-MM-DD).'),

  body('gst_rate')
    .notEmpty().withMessage('GST rate is required.')
    .isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100.'),

  body('discount_type')
    .optional()
    .isIn(['flat', 'percent']).withMessage('Discount type must be flat or percent.'),

  body('discount_value')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount value must be 0 or greater.'),

  body('shipping_charges')
    .optional()
    .isFloat({ min: 0 }).withMessage('Shipping charges must be 0 or greater.'),

  body('template_id')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Template ID must be 30 characters or fewer.'),

  body('theme_id')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Theme ID must be 30 characters or fewer.'),

  body('notes')
    .optional({ values: 'falsy' })
    .trim(),

  body('terms_conditions')
    .optional({ values: 'falsy' })
    .trim(),

  // Items array validation
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required.'),

  body('items.*.description')
    .trim()
    .notEmpty().withMessage('Item description is required.')
    .isLength({ max: 500 }).withMessage('Item description must be 500 characters or fewer.'),

  body('items.*.quantity')
    .notEmpty().withMessage('Item quantity is required.')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0.'),

  body('items.*.rate')
    .notEmpty().withMessage('Item rate is required.')
    .isFloat({ min: 0 }).withMessage('Rate must be 0 or greater.')
];

const idRule = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invoice ID must be a positive integer.')
];

const statusUpdateRules = [
  ...idRule,
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['unpaid', 'paid', 'overdue']).withMessage('Status must be unpaid, paid, or overdue.')
];

// ================================================
// GET /api/invoices
// ================================================
// Lists all invoices for the logged-in user.
// Includes the client name via JOIN.
//
// Query params:
//   ?status=unpaid|paid|overdue  — filter by status
//   ?search=term                 — search by client
//                                  name or invoice #
// ================================================

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Auto-mark overdue before listing
    await markOverdueInvoices(userId);

    const { status, search } = req.query;

    let queryText = `
      SELECT i.id, i.invoice_number, i.status, i.due_date,
             i.subtotal, i.discount_type, i.discount_value, i.discount_amount,
             i.shipping_charges, i.gst_rate, i.gst_amount, i.total_amount,
             i.notes, i.terms_conditions, i.template_id, i.theme_id, i.created_at,
             c.name AS client_name, c.email AS client_email, c.gstin AS client_gstin
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.user_id = $1
    `;
    const queryParams = [userId];
    let paramIndex = 2;

    // Filter by status
    if (status && ['unpaid', 'paid', 'overdue'].includes(status)) {
      queryText += ` AND i.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Search by client name or invoice number
    if (search && search.trim()) {
      queryText += ` AND (c.name ILIKE $${paramIndex} OR i.invoice_number ILIKE $${paramIndex})`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY i.created_at DESC';

    const result = await pool.query(queryText, queryParams);

    res.json({
      count: result.rows.length,
      invoices: result.rows
    });

  } catch (err) {
    console.error('Invoice list error:', err.message);
    res.status(500).json({ error: 'Could not fetch invoices.' });
  }
});

// ================================================
// GET /api/invoices/:id
// ================================================
// Returns a single invoice with all its line items
// and client details.
// ================================================

router.get('/:id', idRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;

    // Auto-mark overdue
    await markOverdueInvoices(userId);

    // Fetch invoice with client info
    const invoiceResult = await pool.query(
      `SELECT i.id, i.invoice_number, i.status, i.due_date,
              i.subtotal, i.discount_type, i.discount_value, i.discount_amount,
              i.shipping_charges, i.gst_rate, i.gst_amount, i.total_amount,
              i.notes, i.terms_conditions, i.template_id, i.theme_id, i.created_at,
              c.id AS client_id, c.name AS client_name,
              c.email AS client_email, c.phone AS client_phone,
              c.address AS client_address, c.gstin AS client_gstin,
              u.business_name, u.business_address, u.gstin,
              u.phone AS business_phone, u.logo_url, u.signature_url, u.upi_id
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       JOIN users u ON u.id = i.user_id
       WHERE i.id = $1 AND i.user_id = $2`,
      [id, userId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Fetch line items
    const itemsResult = await pool.query(
      `SELECT id, description, quantity, rate, amount
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;

    res.json({ invoice });

  } catch (err) {
    console.error('Invoice detail error:', err.message);
    res.status(500).json({ error: 'Could not fetch invoice.' });
  }
});

// ================================================
// POST /api/invoices/create
// ================================================
// Creates a new invoice with line items.
//
// Calculates:
//   item.amount     = quantity × rate
//   subtotal        = Σ item.amount
//   discount_amount = flat value or (subtotal × percent / 100)
//   gst_amount      = subtotal × gst_rate / 100
//   total_amount    = (subtotal - discount_amount) + gst_amount + shipping_charges
//
// Free-plan limit: 5 invoices per calendar month.
// ================================================

router.post('/create', createInvoiceRules, async (req, res) => {
  // Use a DB transaction — invoice + items must succeed together
  const dbClient = await pool.connect();

  try {
    if (!validate(req, res)) {
      dbClient.release();
      return;
    }

    const userId = req.user.id;
    const { client_id, due_date, gst_rate, notes, terms_conditions, items,
            discount_type: dType, discount_value: dValue, shipping_charges: shipCharges,
            template_id: tplId, theme_id: thmId } = req.body;

    // ---- Free-plan enforcement ----
    const userResult = await dbClient.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );
    const plan = userResult.rows[0]?.plan;

    if (plan === 'free') {
      const countResult = await dbClient.query(
        `SELECT COUNT(*)::int AS count
         FROM invoices
         WHERE user_id = $1
           AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [userId]
      );

      if (countResult.rows[0].count >= 5) {
        dbClient.release();
        return res.status(403).json({
          error: 'Free plan limit reached: maximum 5 invoices per month.',
          upgrade: true
        });
      }
    }

    // ---- Verify client belongs to user ----
    const clientCheck = await dbClient.query(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [client_id, userId]
    );

    if (clientCheck.rows.length === 0) {
      dbClient.release();
      return res.status(404).json({ error: 'Client not found.' });
    }

    // ---- Begin transaction ----
    await dbClient.query('BEGIN');

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(userId);

    // Calculate amounts
    let subtotal = 0;
    const processedItems = items.map((item) => {
      const qty    = parseFloat(item.quantity);
      const rate   = parseFloat(item.rate);
      const amount = Math.round(qty * rate * 100) / 100; // Round to 2 decimals
      subtotal += amount;
      return {
        description: item.description.trim(),
        quantity: qty,
        rate,
        amount
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    const gstRateNum  = parseFloat(gst_rate);
    const gstAmount   = Math.round(subtotal * gstRateNum) / 100;

    // Discount calculation
    const discountType  = dType === 'percent' ? 'percent' : 'flat';
    const discountValue = Math.round((parseFloat(dValue) || 0) * 100) / 100;
    let discountAmount  = 0;
    if (discountType === 'percent') {
      discountAmount = Math.round(subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }
    // Cap discount at subtotal (can't go negative)
    discountAmount = Math.min(discountAmount, subtotal);
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Shipping
    const shippingCharges = Math.round((parseFloat(shipCharges) || 0) * 100) / 100;

    // Total = (subtotal - discount) + gst + shipping
    const totalAmount = Math.round(((subtotal - discountAmount) + gstAmount + shippingCharges) * 100) / 100;

    // Template & theme
    const templateId = (tplId || 'classic').substring(0, 30);
    const themeId = (thmId || 'ocean-blue').substring(0, 30);

    // Insert the invoice
    const invoiceResult = await dbClient.query(
      `INSERT INTO invoices
         (user_id, client_id, invoice_number, due_date,
          subtotal, discount_type, discount_value, discount_amount,
          shipping_charges, gst_rate, gst_amount, total_amount, notes, terms_conditions,
          template_id, theme_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, invoice_number, status, due_date,
                 subtotal, discount_type, discount_value, discount_amount,
                 shipping_charges, gst_rate, gst_amount, total_amount,
                 notes, terms_conditions, template_id, theme_id, created_at`,
      [userId, client_id, invoiceNumber, due_date,
       subtotal, discountType, discountValue, discountAmount,
       shippingCharges, gstRateNum, gstAmount, totalAmount, notes || null, terms_conditions || null,
       templateId, themeId]
    );

    const invoice = invoiceResult.rows[0];

    // Insert all line items
    const insertedItems = [];
    for (const item of processedItems) {
      const itemResult = await dbClient.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, description, quantity, rate, amount`,
        [invoice.id, item.description, item.quantity, item.rate, item.amount]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    await dbClient.query('COMMIT');

    invoice.items = insertedItems;

    res.status(201).json({
      message: 'Invoice created successfully.',
      invoice
    });

  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('Invoice create error:', err.message);
    res.status(500).json({ error: 'Could not create invoice.' });

  } finally {
    dbClient.release();
  }
});

// ================================================
// PUT /api/invoices/:id/status
// ================================================
// Manually update an invoice's payment status.
// Used for "Mark as Paid" etc.
// ================================================

router.put('/:id/status', statusUpdateRules, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const existing = await pool.query(
      'SELECT id, status FROM invoices WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Don't allow changing from paid back to unpaid
    // (payments are immutable once confirmed)
    if (existing.rows[0].status === 'paid' && status !== 'paid') {
      return res.status(400).json({
        error: 'Cannot change status of a paid invoice. Contact support if this is an error.'
      });
    }

    const result = await pool.query(
      `UPDATE invoices
       SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, invoice_number, status, due_date,
                 subtotal, discount_amount, shipping_charges,
                 gst_amount, total_amount`,
      [status, id, userId]
    );

    res.json({
      message: `Invoice status updated to "${status}".`,
      invoice: result.rows[0]
    });

  } catch (err) {
    console.error('Invoice status update error:', err.message);
    res.status(500).json({ error: 'Could not update invoice status.' });
  }
});

// ================================================
// GET /api/invoices/:id/pdf
// ================================================
// Generates a professional PDF for the invoice
// and streams it as a downloadable file.
// ================================================

router.get('/:id/pdf', idRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;

    // Fetch full invoice data (same query as detail endpoint)
    const invoiceResult = await pool.query(
      `SELECT i.id, i.invoice_number, i.status, i.due_date,
              i.subtotal, i.discount_type, i.discount_value, i.discount_amount,
              i.shipping_charges, i.gst_rate, i.gst_amount, i.total_amount,
              i.notes, i.terms_conditions, i.template_id, i.theme_id, i.created_at,
              c.id AS client_id, c.name AS client_name,
              c.email AS client_email, c.phone AS client_phone,
              c.address AS client_address, c.gstin AS client_gstin,
              u.business_name, u.business_address, u.gstin,
              u.phone AS business_phone, u.logo_url, u.signature_url, u.upi_id
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       JOIN users u ON u.id = i.user_id
       WHERE i.id = $1 AND i.user_id = $2`,
      [id, userId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Fetch line items
    const itemsResult = await pool.query(
      `SELECT id, description, quantity, rate, amount
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    const invoiceData = invoiceResult.rows[0];
    invoiceData.items = itemsResult.rows;

    // Generate PDF buffer (pass template/theme for styled output)
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Set response headers for PDF download
    const filename = `${invoiceData.invoice_number}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error('Invoice PDF error:', err.message);
    res.status(500).json({ error: 'Could not generate PDF.' });
  }
});

// ================================================
// DELETE /api/invoices/:id
// ================================================
// Deletes an invoice and its line items.
// ================================================

router.delete('/:id', idRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      await dbClient.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      await dbClient.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);
      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }

    res.json({ message: 'Invoice deleted successfully.' });

  } catch (err) {
    console.error('Invoice delete error:', err.message);
    res.status(500).json({ error: 'Could not delete invoice.' });
  }
});

module.exports = router;
