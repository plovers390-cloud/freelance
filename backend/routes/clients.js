// ============================================
// routes/clients.js — Client CRUD Routes
// ============================================
// Manages the authenticated user's client list.
// Enforces free-plan limit: max 2 clients/month.
// All routes require a valid JWT.
// ============================================

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const pool           = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

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

// ---- Validation Rules ---------------------------

const clientRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Client name is required.')
    .isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),

  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 15 }).withMessage('Phone must be 15 characters or fewer.'),

  body('address')
    .optional({ values: 'falsy' })
    .trim(),

  body('gstin')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 15 }).withMessage('GSTIN must be 15 characters or fewer.')
];

const idRule = [
  param('id')
    .isInt({ min: 1 }).withMessage('Client ID must be a positive integer.')
];

// ================================================
// GET /api/clients
// ================================================
// Lists all clients belonging to the logged-in user.
// Supports search by name/email/phone via ?search=
// ================================================

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const search = req.query.search ? req.query.search.trim() : null;

    let queryText;
    let queryParams;

    if (search) {
      // Case-insensitive search across name, email, phone
      queryText = `
        SELECT id, name, email, phone, address, gstin, created_at
        FROM clients
        WHERE user_id = $1
          AND (
            name  ILIKE $2 OR
            email ILIKE $2 OR
            phone ILIKE $2
          )
        ORDER BY name ASC
      `;
      queryParams = [userId, `%${search}%`];
    } else {
      queryText = `
        SELECT id, name, email, phone, address, gstin, created_at
        FROM clients
        WHERE user_id = $1
        ORDER BY name ASC
      `;
      queryParams = [userId];
    }

    const result = await pool.query(queryText, queryParams);

    res.json({
      count: result.rows.length,
      clients: result.rows
    });

  } catch (err) {
    console.error('Client list error:', err.message);
    res.status(500).json({ error: 'Could not fetch clients.' });
  }
});

// ================================================
// GET /api/clients/:id
// ================================================
// Returns a single client with their invoice count.
// ================================================

router.get('/:id', idRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, c.address, c.gstin, c.created_at,
              COUNT(i.id)::int AS invoice_count
       FROM clients c
       LEFT JOIN invoices i ON i.client_id = c.id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    res.json({ client: result.rows[0] });

  } catch (err) {
    console.error('Client detail error:', err.message);
    res.status(500).json({ error: 'Could not fetch client.' });
  }
});

// ================================================
// GET /api/clients/:id/invoices
// ================================================
// Lists all invoices for a specific client.
// Used on the client detail view.
// ================================================

router.get('/:id/invoices', idRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;

    // Verify client belongs to user
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const result = await pool.query(
      `SELECT id, invoice_number, status, due_date,
              subtotal, gst_amount, total_amount, created_at
       FROM invoices
       WHERE client_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [id, userId]
    );

    res.json({
      count: result.rows.length,
      invoices: result.rows
    });

  } catch (err) {
    console.error('Client invoices error:', err.message);
    res.status(500).json({ error: 'Could not fetch invoices for this client.' });
  }
});

// ================================================
// POST /api/clients
// ================================================
// Creates a new client for the authenticated user.
// Free-plan limit: max 2 new clients per calendar
// month.
// ================================================

router.post('/', clientRules, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const userId = req.user.id;
    const { name, email, phone, address, gstin } = req.body;

    // ---- Free-plan enforcement ----
    // Check user's plan
    const userResult = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );
    const plan = userResult.rows[0]?.plan;

    if (plan === 'free') {
      // Count clients created this calendar month
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM clients
         WHERE user_id = $1
           AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [userId]
      );

      if (countResult.rows[0].count >= 2) {
        return res.status(403).json({
          error: 'Free plan limit reached: maximum 2 clients per month.',
          upgrade: true
        });
      }
    }

    // ---- Check for duplicate email (same user) ----
    if (email) {
      const duplicate = await pool.query(
        'SELECT id FROM clients WHERE user_id = $1 AND email = $2',
        [userId, email]
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          error: 'A client with this email already exists.'
        });
      }
    }

    // ---- Insert the client ----
    const result = await pool.query(
      `INSERT INTO clients (user_id, name, email, phone, address, gstin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, address, gstin, created_at`,
      [userId, name, email || null, phone || null, address || null, gstin || null]
    );

    res.status(201).json({
      message: 'Client added successfully.',
      client: result.rows[0]
    });

  } catch (err) {
    console.error('Client create error:', err.message);
    res.status(500).json({ error: 'Could not add client.' });
  }
});

// ================================================
// PUT /api/clients/:id
// ================================================
// Updates an existing client (ownership verified).
// ================================================

router.put('/:id', [...idRule, ...clientRules], async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;
    const { name, email, phone, address, gstin } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // Check for duplicate email (exclude this client)
    if (email) {
      const duplicate = await pool.query(
        'SELECT id FROM clients WHERE user_id = $1 AND email = $2 AND id != $3',
        [userId, email, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          error: 'Another client with this email already exists.'
        });
      }
    }

    // Update
    const result = await pool.query(
      `UPDATE clients
       SET name = $1, email = $2, phone = $3, address = $4, gstin = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, name, email, phone, address, gstin, created_at`,
      [name, email || null, phone || null, address || null, gstin || null, id, userId]
    );

    res.json({
      message: 'Client updated successfully.',
      client: result.rows[0]
    });

  } catch (err) {
    console.error('Client update error:', err.message);
    res.status(500).json({ error: 'Could not update client.' });
  }
});

// ================================================
// DELETE /api/clients/:id
// ================================================
// Deletes a client (ownership verified).
// Blocks deletion if the client has linked invoices
// (ON DELETE RESTRICT on invoices.client_id).
// ================================================

router.delete('/:id', idRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // Check for linked invoices (DELETE RESTRICT will fail at DB level,
    // but we give a friendlier error message here)
    const invoiceCheck = await pool.query(
      'SELECT COUNT(*)::int AS count FROM invoices WHERE client_id = $1',
      [id]
    );

    if (invoiceCheck.rows[0].count > 0) {
      return res.status(409).json({
        error: `Cannot delete this client — they have ${invoiceCheck.rows[0].count} linked invoice(s). Delete or reassign the invoices first.`
      });
    }

    // Delete
    await pool.query(
      'DELETE FROM clients WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Client deleted successfully.' });

  } catch (err) {
    console.error('Client delete error:', err.message);
    res.status(500).json({ error: 'Could not delete client.' });
  }
});

module.exports = router;
