import express from 'express';
import { getDatabase } from '../database/schema.js';
import { calculateDepreciationForYear, calculateDepreciationSummary } from '../logic/depreciation.js';
import { calculateYearToDateFinancials, calculateTotalDepreciation, calculateTaxLiability } from '../logic/financial.js';
import { logAudit, businessLogger } from '../utils/logger.js';

const router = express.Router();

const authenticate = (req, res, next) => {
  const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');

  if (AUTH_MODE === 'disabled') {
    req.userId = 1;
    req.userRole = 'admin';
    return next();
  }

  const userId = req.cookies?.user_id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getRequestDb(req);
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(401).json({ error: 'Invalid user session' });
  }

  req.userId = parseInt(userId);
  req.userRole = user.role;

  const auth = import('../auth/auth.js');
  auth.then(module => {
    if (!module.isSessionValid(userId)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    module.updateLastActivity(userId);
    next();
  }).catch(error => {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
};

const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/summary - Dashboard financial summary for tax year
router.get('/summary', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const userId = req.userId;

    // Get all transactions for the user
    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC
    `).all(userId);

    // Get all assets for depreciation calculation
    const assets = db.prepare(`
      SELECT * FROM assets WHERE user_id = ? ORDER BY purchase_date DESC
    `).all(userId);

    const financials = calculateYearToDateFinancials(transactions, taxYear);
    const depreciationResults = calculateDepreciationSummary(assets, taxYear);
    const totalDepreciation = calculateTotalDepreciation(depreciationResults);

    // Calculate tax estimates
    const taxCalculation = calculateTaxLiability(financials, totalDepreciation);

    res.json({
      year: taxYear,
      financials,
      depreciation: {
        total_deduction: totalDepreciation,
        assets_count: depreciationResults.length,
        asset_detail: depreciationResults
      },
      tax_estimation: taxCalculation,
      recent_transactions: transactions.slice(0, 10), // Last 10 transactions
      summary_stats: {
        q1_revenue: (financials?.total_income ?? 0) * 0.25,
        q2_revenue: (financials?.total_income ?? 0) * 0.5,
        q3_revenue: (financials?.total_income ?? 0) * 0.75,
        q4_revenue: financials?.total_income ?? 0,
        average_monthly_income: (financials?.total_income ?? 0) / 12,
        average_monthly_expenses: (financials?.total_expenses ?? 0) / 12
      }
    });
  } catch (error) {
    console.error('Summary API error:', error.message || error, error.stack);
    res.status(500).json({ error: 'Failed to generate financial summary' });
  }
});

// GET /api/transactions - Get all transactions with filtering
router.get('/transactions', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const {
      year,
      month,
      type,
      category,
      limit = 50,
      offset = 0
    } = req.query;

    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    let params = [req.userId];
    let conditions = [];

    if (year) {
      conditions.push('strftime(\'%Y\', date) = ?');
      params.push(year);
    }

    if (month) {
      conditions.push('strftime(\'%m\', date) = ?');
      params.push(String(month).padStart(2, '0'));
    }

    if (type) {
      conditions.push('type = ?');
      params.push(type.toUpperCase());
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error) {
    console.error('Transactions API error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions - Add new transaction
router.post('/transactions', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const {
      date,
      type,
      category,
      amount,
      description,
      payment_method,
      venue,
      vendor
    } = req.body;

    if (!date || !type || !category || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const result = db.prepare(`
      INSERT INTO transactions (
        user_id, date, type, category, amount,
        description, payment_method, venue, vendor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId,
      date,
      type.toUpperCase(),
      category,
      Math.floor(amount * 100),
      description || null,
      payment_method || null,
      venue || null,
      vendor || null
    );

    const newTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);

    // Audit log the transaction creation
    logAudit('CREATE', 'transaction', newTransaction.id, {
      old_values: null,
      new_values: {
        date: newTransaction.date,
        type: newTransaction.type,
        category: newTransaction.category,
        amount_cents: newTransaction.amount,
        amount_dollars: (newTransaction.amount / 100).toFixed(2),
        description: newTransaction.description,
        payment_method: newTransaction.payment_method
      }
    }, {
      userId: req.userId,
      requestId: req.requestId
    });

    res.status(201).json(newTransaction);
  } catch (error) {
    businessLogger.error({
      error: error.message,
      stack: error.stack,
      requestId: req.requestId,
      userId: req.userId,
      transactionData: req.body
    }, 'Transaction creation failed');
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id - Update transaction
router.put('/transactions/:id', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const transactionId = req.params.id;
    const updates = req.body;

    const existing = db.prepare(`
      SELECT * FROM transactions WHERE id = ? AND user_id = ?
    `).get(transactionId, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const fields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        if (key === 'amount') {
          params.push(Math.floor(updates[key] * 100));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(transactionId);

    db.prepare(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...params, req.userId);

    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
    res.json(updated);
  } catch (error) {
    console.error('Transaction update error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/transactions/:id', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const transactionId = req.params.id;

    const result = db.prepare(`
      DELETE FROM transactions WHERE id = ? AND user_id = ?
    `).run(transactionId, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Transaction deletion error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// GET /api/assets - Get all assets
router.get('/assets', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();

    const assets = db.prepare(`
      SELECT * FROM assets WHERE user_id = ? ORDER BY purchase_date DESC
    `).all(req.userId);

    // Add depreciation calculations for each asset
    const assetsWithDepreciation = assets.map(asset => {
      const depreciationResult = calculateDepreciationForYear(asset, taxYear);
      return {
        ...asset,
        depreciationResult
      };
    });

    res.json(assetsWithDepreciation);
  } catch (error) {
    console.error('Assets API error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST /api/assets - Add new asset
router.post('/assets', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const {
      name,
      purchase_date,
      cost_basis,
      depreciation_method,
      equipment_category,
      notes
    } = req.body;

    if (!name || !purchase_date || !cost_basis || !depreciation_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validMethods = ['ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179'];
    if (!validMethods.includes(depreciation_method)) {
      return res.status(400).json({ error: 'Invalid depreciation method' });
    }

    if (equipment_category !== null && equipment_category !== undefined && equipment_category !== '') {
      const validCategories = ['TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION'];
      if (!validCategories.includes(equipment_category)) {
        return res.status(400).json({
          error: 'Invalid equipment category',
          validCategories: validCategories
        });
      }
    }

    const result = db.prepare(`
      INSERT INTO assets (
        user_id, name, purchase_date, cost_basis, depreciation_method, equipment_category, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId,
      name,
      purchase_date,
      Math.floor(cost_basis * 100),
      depreciation_method,
      equipment_category || null,
      notes || null
    );

    const newAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);

    // Audit log the asset creation
    logAudit('CREATE', 'asset', newAsset.id, {
      old_values: null,
      new_values: {
        name: newAsset.name,
        purchase_date: newAsset.purchase_date,
        cost_basis_cents: newAsset.cost_basis,
        cost_basis_dollars: (newAsset.cost_basis / 100).toFixed(2),
        depreciation_method: newAsset.depreciation_method,
        equipment_category: newAsset.equipment_category
      }
    }, {
      userId: req.userId,
      requestId: req.requestId
    });

    res.status(201).json(newAsset);
  } catch (error) {
    businessLogger.error({
      error: error.message,
      code: error.code,
      requestId: req.requestId,
      userId: req.userId,
      assetData: req.body
    }, 'Asset creation failed');

    if (error.code === 'SQLITE_CONSTRAINT') {
      if (error.message.includes('equipment_category')) {
        res.status(400).json({
          error: 'Invalid equipment category value. Please select a valid category.',
          validCategories: ['TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION']
        });
      } else if (error.message.includes('depreciation_method')) {
        res.status(400).json({
          error: 'Invalid depreciation method. Please select a valid method.',
          validMethods: ['ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179']
        });
      } else {
        res.status(400).json({ error: 'Database constraint violation: ' + error.message });
      }
    } else if (error.code === 'SQLITE_ERROR') {
      res.status(500).json({ error: 'Database error: ' + error.message });
    } else {
      res.status(500).json({ error: 'Failed to create asset: ' + error.message });
    }
  }
});

// PUT /api/assets/:id/sell - Mark asset as sold
router.put('/assets/:id/sell', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const assetId = req.params.id;
    const { disposal_date, disposal_price } = req.body;

    if (!disposal_date) {
      return res.status(400).json({ error: 'Disposal date is required' });
    }

    const existing = db.prepare(`
      SELECT * FROM assets WHERE id = ? AND user_id = ?
    `).get(assetId, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    db.prepare(`
      UPDATE assets SET
        disposal_date = ?,
        disposal_price = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      disposal_date,
      disposal_price ? Math.floor(disposal_price * 100) : null,
      assetId,
      req.userId
    );

    const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    res.json(updatedAsset);
  } catch (error) {
    console.error('Asset disposal error:', error);

    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Database constraint violation: ' + error.message });
    } else if (error.code === 'SQLITE_ERROR') {
      res.status(500).json({ error: 'Database error: ' + error.message });
    } else {
      res.status(500).json({ error: 'Failed to mark asset as sold: ' + error.message });
    }
  }
});

// PUT /api/assets/:id - Update asset
router.put('/assets/:id', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const assetId = req.params.id;
    const updates = req.body;

    const existing = db.prepare(`
      SELECT * FROM assets WHERE id = ? AND user_id = ?
    `).get(assetId, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (updates.equipment_category !== null && updates.equipment_category !== undefined && updates.equipment_category !== '') {
      const validCategories = ['TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION'];
      if (!validCategories.includes(updates.equipment_category)) {
        return res.status(400).json({
          error: 'Invalid equipment category',
          validCategories: validCategories
        });
      }
    }

    if (updates.depreciation_method) {
      const validMethods = ['ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179'];
      if (!validMethods.includes(updates.depreciation_method)) {
        return res.status(400).json({ error: 'Invalid depreciation method' });
      }
    }

    const fields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        if (key === 'cost_basis') {
          params.push(Math.floor(updates[key] * 100));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(assetId, req.userId);

    db.prepare(
      `UPDATE assets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...params);

    const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    res.json(updatedAsset);
  } catch (error) {
    console.error('Asset update error:', error);

    if (error.code === 'SQLITE_CONSTRAINT') {
      if (error.message.includes('equipment_category')) {
        res.status(400).json({
          error: 'Invalid equipment category value. Please select a valid category.',
          validCategories: ['TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION']
        });
      } else if (error.message.includes('depreciation_method')) {
        res.status(400).json({
          error: 'Invalid depreciation method. Please select a valid method.',
          validMethods: ['ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179']
        });
      } else {
        res.status(400).json({ error: 'Database constraint violation: ' + error.message });
      }
    } else if (error.code === 'SQLITE_ERROR') {
      res.status(500).json({ error: 'Database error: ' + error.message });
    } else {
      res.status(500).json({ error: 'Failed to update asset: ' + error.message });
    }
  }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/assets/:id', authenticate, (req, res) => {
  try {
    const db = getRequestDb(req);
    const assetId = req.params.id;

    const result = db.prepare(`
      DELETE FROM assets WHERE id = ? AND user_id = ?
    `).run(assetId, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Asset deletion error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Admin user management endpoints

// GET /api/admin/users - List all users (admin only)
router.get('/admin/users', authenticate, requireAdmin, (req, res) => {
  try {
    const db = getRequestDb(req);
    const users = db.prepare(`
      SELECT id, username, role, created_at, last_activity, failed_attempts, locked_until
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - Create new user (admin only)
router.post('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getRequestDb(req);
    const auth = await import('../auth/auth.js');
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordValidation = auth.validatePassword(password);

    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.default.hash(password, saltRounds);

    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, role);

    const newUser = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id/password - Reset user password (admin only)
router.put('/admin/users/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getRequestDb(req);
    const auth = await import('../auth/auth.js');
    const userId = parseInt(req.params.id);
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const passwordValidation = auth.validatePassword(password);

    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.default.hash(password, saltRounds);

    db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?').run(passwordHash, userId);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// PUT /api/admin/users/:id - Update user (admin only)
router.put('/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const db = getRequestDb(req);
    const userId = parseInt(req.params.id);
    const { username, role } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) {
      const usernameExists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);

      if (usernameExists) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const fields = [];
    const params = [];

    if (username) {
      fields.push('username = ?');
      params.push(username);
    }

    if (role) {
      fields.push('role = ?');
      params.push(role);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(userId);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updatedUser = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user (admin only)
router.delete('/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const db = getRequestDb(req);
    const userId = parseInt(req.params.id);

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/login-attempts - Get login attempts (admin only)
router.get('/admin/login-attempts', authenticate, requireAdmin, (req, res) => {
  try {
    const db = getRequestDb(req);
    const limit = parseInt(req.query.limit) || 50;

    const attempts = db.prepare(`
      SELECT * FROM login_attempts
      ORDER BY attempted_at DESC
      LIMIT ?
    `).all(limit);

    const stats = {
      totalAttempts: db.prepare('SELECT COUNT(*) as count FROM login_attempts').get().count,
      successfulAttempts: db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE success = 1').get().count,
      failedAttempts: db.prepare('SELECT COUNT(*) as count FROM login_attempts WHERE success = 0').get().count,
      recentFailed: db.prepare(`SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND attempted_at > datetime('now', '-15 minutes')`).get().count
    };

    res.json({ attempts, stats });
  } catch (error) {
    console.error('Get login attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch login attempts' });
  }
});

// DELETE /api/admin/login-attempts - Clear login attempts (admin only)
router.delete('/admin/login-attempts', authenticate, requireAdmin, (req, res) => {
  try {
    const db = getRequestDb(req);
    db.prepare('DELETE FROM login_attempts').run();

    res.json({ message: 'Login attempts cleared successfully' });
  } catch (error) {
    console.error('Clear login attempts error:', error);
    res.status(500).json({ error: 'Failed to clear login attempts' });
  }
});

export default router;
