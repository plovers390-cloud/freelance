// ============================================
// routes/reports.js — Reports Routes
// ============================================
// Provides business intelligence endpoints:
//  • Monthly earnings report (for bar charts)
//  • GST summary report (for CA / tax filing)
//
// All data scoped to the authenticated user.
// Supports year filtering via ?year= query param.
// ============================================

const express = require('express');
const { query, validationResult } = require('express-validator');

const pool           = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth guard
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

// ---- Helper: Mark overdue invoices --------------

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

const yearRule = [
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2099 })
    .withMessage('Year must be between 2020 and 2099.')
];

// ================================================
// GET /api/reports/monthly
// ================================================
// Returns month-by-month earnings for bar charts.
//
// Query params:
//   ?year=2026  — filter by year (defaults to current)
//
// Response includes all 12 months (zero-filled)
// so the frontend chart renders consistently.
// ================================================

router.get('/monthly', yearRule, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const userId = req.user.id;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    await markOverdueInvoices(userId);

    // Fetch monthly aggregates from the database
    const result = await pool.query(
      `SELECT
         EXTRACT(MONTH FROM created_at)::int               AS month_num,
         TO_CHAR(created_at, 'Mon')                        AS month_short,
         TO_CHAR(created_at, 'YYYY-MM')                    AS month,
         COUNT(*)::int                                      AS total_invoices,
         COUNT(CASE WHEN status = 'paid' THEN 1 END)::int  AS paid_invoices,
         COALESCE(SUM(total_amount), 0)                    AS total_billed,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount END), 0)
                                                            AS total_earned,
         COALESCE(SUM(CASE WHEN status != 'paid' THEN total_amount END), 0)
                                                            AS total_pending
       FROM invoices
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM created_at) = $2
       GROUP BY EXTRACT(MONTH FROM created_at),
                TO_CHAR(created_at, 'Mon'),
                TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month_num ASC`,
      [userId, year]
    );

    // Zero-fill all 12 months so the chart always has 12 bars
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const dataMap = {};
    result.rows.forEach((row) => {
      dataMap[row.month_num] = row;
    });

    const monthly = monthNames.map((name, idx) => {
      const num = idx + 1;
      const monthStr = `${year}-${String(num).padStart(2, '0')}`;

      if (dataMap[num]) {
        return {
          month:          monthStr,
          month_short:    name,
          total_invoices: dataMap[num].total_invoices,
          paid_invoices:  dataMap[num].paid_invoices,
          total_billed:   dataMap[num].total_billed,
          total_earned:   dataMap[num].total_earned,
          total_pending:  dataMap[num].total_pending,
        };
      }

      return {
        month:          monthStr,
        month_short:    name,
        total_invoices: 0,
        paid_invoices:  0,
        total_billed:   '0',
        total_earned:   '0',
        total_pending:  '0',
      };
    });

    // Compute yearly totals
    const yearTotals = {
      total_invoices: monthly.reduce((s, m) => s + m.total_invoices, 0),
      paid_invoices:  monthly.reduce((s, m) => s + m.paid_invoices, 0),
      total_billed:   monthly.reduce((s, m) => s + parseFloat(m.total_billed), 0).toFixed(2),
      total_earned:   monthly.reduce((s, m) => s + parseFloat(m.total_earned), 0).toFixed(2),
      total_pending:  monthly.reduce((s, m) => s + parseFloat(m.total_pending), 0).toFixed(2),
    };

    res.json({
      year,
      months: monthly,
      totals: yearTotals,
    });

  } catch (err) {
    console.error('Monthly report error:', err.message);
    res.status(500).json({ error: 'Could not generate monthly report.' });
  }
});

// ================================================
// GET /api/reports/gst
// ================================================
// Returns GST summary grouped by tax rate.
// Designed for CA handoff / GST filing.
//
// Query params:
//   ?year=2026   — filter by year (defaults to current)
//   ?quarter=1   — filter by quarter (1–4, optional)
//
// Response:
// {
//   gst_summary: [
//     { gst_rate: 18, taxable_amount, gst_collected,
//       total_amount, invoice_count }
//   ],
//   totals: { ... },
//   invoices: [ ... detailed list ... ]
// }
// ================================================

router.get(
  '/gst',
  [
    ...yearRule,
    query('quarter')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('Quarter must be between 1 and 4.')
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const userId  = req.user.id;
      const year    = parseInt(req.query.year, 10) || new Date().getFullYear();
      const quarter = req.query.quarter ? parseInt(req.query.quarter, 10) : null;

      await markOverdueInvoices(userId);

      // Build date range filter
      let dateFilter = `AND EXTRACT(YEAR FROM i.created_at) = $2`;
      const params = [userId, year];
      let paramIdx = 3;

      if (quarter) {
        // Quarter 1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth   = quarter * 3;
        dateFilter += ` AND EXTRACT(MONTH FROM i.created_at) BETWEEN $${paramIdx} AND $${paramIdx + 1}`;
        params.push(startMonth, endMonth);
        paramIdx += 2;
      }

      // ---- 1. GST summary grouped by rate ----
      const summaryResult = await pool.query(
        `SELECT
           i.gst_rate,
           COUNT(*)::int                    AS invoice_count,
           COALESCE(SUM(i.subtotal), 0)     AS taxable_amount,
           COALESCE(SUM(i.gst_amount), 0)   AS gst_collected,
           COALESCE(SUM(i.total_amount), 0) AS total_amount
         FROM invoices i
         WHERE i.user_id = $1
           AND i.status = 'paid'
           ${dateFilter}
         GROUP BY i.gst_rate
         ORDER BY i.gst_rate ASC`,
        params
      );

      // ---- 2. Grand totals ----
      const totals = {
        invoice_count:  0,
        taxable_amount: 0,
        gst_collected:  0,
        total_amount:   0,
      };

      summaryResult.rows.forEach((row) => {
        totals.invoice_count  += row.invoice_count;
        totals.taxable_amount += parseFloat(row.taxable_amount);
        totals.gst_collected  += parseFloat(row.gst_collected);
        totals.total_amount   += parseFloat(row.total_amount);
      });

      totals.taxable_amount = totals.taxable_amount.toFixed(2);
      totals.gst_collected  = totals.gst_collected.toFixed(2);
      totals.total_amount   = totals.total_amount.toFixed(2);

      // ---- 3. Detailed invoice list for the period ----
      const detailResult = await pool.query(
        `SELECT
           i.id, i.invoice_number, i.created_at, i.due_date,
           i.subtotal, i.gst_rate, i.gst_amount, i.total_amount,
           i.status,
           c.name AS client_name, c.gstin AS client_gstin
         FROM invoices i
         JOIN clients c ON c.id = i.client_id
         WHERE i.user_id = $1
           AND i.status = 'paid'
           ${dateFilter}
         ORDER BY i.created_at ASC`,
        params
      );

      // ---- 4. Period label ----
      const quarterLabels = {
        1: 'Q1 (Jan–Mar)',
        2: 'Q2 (Apr–Jun)',
        3: 'Q3 (Jul–Sep)',
        4: 'Q4 (Oct–Dec)',
      };

      const period = quarter
        ? `${quarterLabels[quarter]} ${year}`
        : `FY ${year}`;

      res.json({
        period,
        year,
        quarter: quarter || null,
        gst_summary: summaryResult.rows,
        totals,
        invoices: detailResult.rows,
      });

    } catch (err) {
      console.error('GST report error:', err.message);
      res.status(500).json({ error: 'Could not generate GST report.' });
    }
  }
);

module.exports = router;
