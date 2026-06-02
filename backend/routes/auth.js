// ============================================
// routes/auth.js — Authentication Routes
// ============================================
// Handles user registration, login, and profile
// management (view + update with logo upload).
// ============================================

const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const pool           = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ---- Rate Limiters ------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // max 3 attempts
  message: { error: 'Too many password reset requests from this IP, please try again after 15 minutes.' }
});

// ---- Multer Config (Logo Upload) ---------------

// Store logos and signatures in /uploads/logos with timestamped filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'logos'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'signature' ? 'signature' : 'logo';
    const uniqueName = `${prefix}_${req.user.id}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

// Accept only image files, max 2 MB
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype.split('/')[1]);

    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed.'));
    }
  }
});

// ---- Validation Rules ---------------------------

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

  body('business_name')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Business name must be 255 characters or fewer.')
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
];

const profileUpdateRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),

  body('business_name')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Business name must be 255 characters or fewer.'),

  body('business_address')
    .optional()
    .trim(),

  body('gstin')
    .optional()
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format.'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian mobile number.'),

  body('razorpay_account_id')
    .optional()
    .trim(),

  body('upi_id')
    .optional()
    .trim()
    .matches(/^[\w.-]+@[\w.-]+$/)
    .withMessage('Please provide a valid UPI ID (e.g. phone@ybl).')
];

// ---- Helper: Return validation errors -----------

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

// ---- Helper: Generate JWT Tokens ----------------

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// ================================================
// POST /api/auth/register
// ================================================
// Creates a new user account.
// Returns JWT token + user profile on success.
// ================================================

router.post('/register', registerRules, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { name, email, password, business_name } = req.body;

    // Check if email is already taken
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'An account with this email already exists.'
      });
    }

    // Hash the password (cost factor 12 for production strength)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, business_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, business_name, business_address,
                 gstin, phone, logo_url, signature_url, avatar_url, plan, unlocked_templates, created_at`,
      [name, email, hashedPassword, business_name || null]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in DB
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token: accessToken,
      refreshToken,
      user
    });

  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ================================================
// POST /api/auth/login
// ================================================
// Authenticates a user with email + password.
// Returns JWT token + user profile on success.
// ================================================

router.post('/login', loginLimiter, loginRules, async (req, res) => {
  try {
    if (!validate(req, res)) return;

    const { email, password } = req.body;

    // Look up user by email
    const userResult = await pool.query(
      `SELECT id, name, email, password, business_name, business_address,
              gstin, phone, logo_url, signature_url, avatar_url, plan, unlocked_templates, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // Error message sanitization: don't reveal if user exists
      return res.status(401).json({
        error: 'Invalid credentials.'
      });
    }

    const user = userResult.rows[0];

    // Compare plaintext password against stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Error message sanitization: don't reveal if password is wrong
      return res.status(401).json({
        error: 'Invalid credentials.'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in DB
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    // Remove password from response
    delete user.password;

    res.json({
      message: 'Login successful.',
      token: accessToken,
      refreshToken,
      user
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ================================================
// POST /api/auth/refresh
// ================================================
// Issues a new access token using a valid refresh
// token.
// ================================================

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    // Verify token in DB
    const dbToken = await pool.query(
      'SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    if (dbToken.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid refresh token.' });
    }

    const tokenData = dbToken.rows[0];

    // Check expiration
    if (new Date() > new Date(tokenData.expires_at)) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return res.status(403).json({ error: 'Refresh token expired. Please log in again.' });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(403).json({ error: 'Invalid refresh token signature.' });
    }

    // Generate new access token
    const user = { id: decoded.id, email: decoded.email };
    const newAccessToken = generateAccessToken(user);

    res.json({ token: newAccessToken });

  } catch (err) {
    console.error('Refresh error:', err.message);
    res.status(500).json({ error: 'Could not refresh token.' });
  }
});

// ================================================
// POST /api/auth/logout
// ================================================
// Logs the user out by deleting their refresh token.
// ================================================

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// ================================================
// GET /api/auth/profile
// ================================================
// Returns the authenticated user's profile.
// Protected — requires valid JWT.
// ================================================

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, business_name, business_address,
              gstin, phone, logo_url, signature_url, terms_conditions, avatar_url, razorpay_account_id, upi_id, plan, unlocked_templates, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error('Profile fetch error:', err.message);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// ================================================
// PUT /api/auth/profile
// ================================================
// Updates authenticated user's business info.
// Optionally accepts a logo file upload.
// Protected — requires valid JWT.
// ================================================

router.put(
  '/profile',
  authMiddleware,
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }, { name: 'avatar', maxCount: 1 }]),
  profileUpdateRules,
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const { name, business_name, business_address, gstin, phone, terms_conditions, razorpay_account_id, upi_id } = req.body;

      // Build dynamic SET clause — only update provided fields
      const updates = [];
      const values  = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (business_name !== undefined) {
        updates.push(`business_name = $${paramIndex++}`);
        values.push(business_name);
      }
      if (business_address !== undefined) {
        updates.push(`business_address = $${paramIndex++}`);
        values.push(business_address);
      }
      if (gstin !== undefined) {
        updates.push(`gstin = $${paramIndex++}`);
        values.push(gstin);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
      }
      if (terms_conditions !== undefined) {
        updates.push(`terms_conditions = $${paramIndex++}`);
        values.push(terms_conditions);
      }
      if (razorpay_account_id !== undefined) {
        updates.push(`razorpay_account_id = $${paramIndex++}`);
        values.push(razorpay_account_id);
      }
      if (upi_id !== undefined) {
        updates.push(`upi_id = $${paramIndex++}`);
        values.push(upi_id);
      }

      // If a logo file was uploaded
      if (req.files && req.files['logo']) {
        const logoUrl = `/uploads/logos/${req.files['logo'][0].filename}`;
        updates.push(`logo_url = $${paramIndex++}`);
        values.push(logoUrl);
      }

      // If a signature file was uploaded
      if (req.files && req.files['signature']) {
        const signatureUrl = `/uploads/logos/${req.files['signature'][0].filename}`;
        updates.push(`signature_url = $${paramIndex++}`);
        values.push(signatureUrl);
      }

      // If an avatar file was uploaded
      if (req.files && req.files['avatar']) {
        const avatarUrl = `/uploads/logos/${req.files['avatar'][0].filename}`;
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }

      // Nothing to update
      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No fields provided to update.'
        });
      }

      // Execute the dynamic UPDATE
      values.push(req.user.id);
      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, email, business_name, business_address,
                  gstin, phone, logo_url, signature_url, terms_conditions, avatar_url, razorpay_account_id, upi_id, plan, unlocked_templates, created_at
      `;

      const result = await pool.query(query, values);

      res.json({
        message: 'Profile updated successfully.',
        user: result.rows[0]
      });

    } catch (err) {
      // Handle multer-specific errors (file too large, bad type)
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE'
            ? 'File must be under 2 MB.'
            : err.message
        });
      }

      console.error('Profile update error:', err.message);
      res.status(500).json({ error: 'Could not update profile.' });
    }
  }
);

// ================================================
// PUT /api/auth/change-password
// ================================================
// Changes the authenticated user's password.
// Requires current password for verification.
// Protected — requires valid JWT.
// ================================================

router.put(
  '/change-password',
  authMiddleware,
  [
    body('current_password')
      .notEmpty().withMessage('Current password is required.'),
    body('new_password')
      .notEmpty().withMessage('New password is required.')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('New password must contain at least one number.')
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const { current_password, new_password } = req.body;

      // Fetch current hash
      const result = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(current_password, result.rows[0].password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      // Prevent reusing the same password
      const isSame = await bcrypt.compare(new_password, result.rows[0].password);
      if (isSame) {
        return res.status(400).json({
          error: 'New password must be different from the current password.'
        });
      }

      // Hash and save the new password
      const hashedPassword = await bcrypt.hash(new_password, 12);
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, req.user.id]
      );

      res.json({ message: 'Password changed successfully.' });

    } catch (err) {
      console.error('Password change error:', err.message);
      res.status(500).json({ error: 'Could not change password.' });
    }
  }
);

module.exports = router;
