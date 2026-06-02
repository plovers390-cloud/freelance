// ============================================
// routes/dashboard.js — Dashboard Stats Route
// ============================================
// Returns aggregated business metrics for the
// authenticated user's dashboard view.
//
// Single endpoint that provides:
//  • Total earned (sum of paid invoices)
//  • Count of paid / unpaid / overdue invoices
//  • 5 most recent invoices with client names
//  • Monthly revenue for the current year
// ============================================

const express = require('express');

const pool           = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth guard
router.use(authMiddleware);

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

// ================================================
// GET /api/dashboard/stats
// ================================================
// Returns all dashboard data in a single request
// to minimize frontend API calls.
//
// Response shape:
// {
//   total_earned:    "125000.00",
//   total_pending:   "45000.00",
//   paid_count:      12,
//   unpaid_count:    3,
//   overdue_count:   2,
//   total_invoices:  17,
//   total_clients:   8,
//   recent_invoices: [ ... top 5 ... ],
//   monthly_revenue: [ { month: "2026-01", total: "25000" }, ... ]
// }
// ================================================

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Auto-mark overdue before computing stats
    await markOverdueInvoices(userId);

    // ---- 1. Aggregate counts + totals (single query) ----
    const statsResult = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'paid'    THEN total_amount END), 0)  AS total_earned,
         COALESCE(SUM(CASE WHEN status != 'paid'   THEN total_amount END), 0)  AS total_pending,
         COUNT(CASE WHEN status = 'paid'    THEN 1 END)::int  AS paid_count,
         COUNT(CASE WHEN status = 'unpaid'  THEN 1 END)::int  AS unpaid_count,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END)::int  AS overdue_count,
         COUNT(*)::int                                         AS total_invoices
       FROM invoices
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    // ---- 2. Total clients ----
    const clientsResult = await pool.query(
      'SELECT COUNT(*)::int AS total_clients FROM clients WHERE user_id = $1',
      [userId]
    );

    // ---- 3. Recent 5 invoices with client names ----
    const recentResult = await pool.query(
      `SELECT i.id, i.invoice_number, i.status, i.due_date,
              i.total_amount, i.created_at,
              c.name AS client_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC
       LIMIT 5`,
      [userId]
    );

    // ---- 4. Monthly revenue for the current year ----
    const monthlyResult = await pool.query(
      `SELECT
         TO_CHAR(created_at, 'YYYY-MM') AS month,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount END), 0) AS earned,
         COALESCE(SUM(total_amount), 0) AS total,
         COUNT(*)::int AS invoice_count
       FROM invoices
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month ASC`,
      [userId]
    );

    res.json({
      total_earned:    stats.total_earned,
      total_pending:   stats.total_pending,
      paid_count:      stats.paid_count,
      unpaid_count:    stats.unpaid_count,
      overdue_count:   stats.overdue_count,
      total_invoices:  stats.total_invoices,
      total_clients:   clientsResult.rows[0].total_clients,
      recent_invoices: recentResult.rows,
      monthly_revenue: monthlyResult.rows,
    });

  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: 'Could not fetch dashboard stats.' });
  }
});

module.exports = router;
