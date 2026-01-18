import express from 'express';
import { getDatabase } from '../database/schema.js';
import { calculateDepreciationForYear, calculateDepreciationSummary } from '../logic/depreciation.js';
import { calculateYearToDateFinancials, calculateTotalDepreciation, calculateTaxLiability } from '../logic/financial.js';

const router = express.Router();

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
  // Check if authentication is disabled
  const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');

  if (AUTH_MODE === 'disabled') {
    // When authentication is disabled, use default user ID
    req.userId = 1;
    return next();
  }

  // Standard authentication when enabled
  const userId = req.cookies?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDatabase();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid user session' });
  }

  req.userId = parseInt(userId);
  next();
};

// GET /api/summary - Dashboard financial summary for tax year
router.get('/summary', authenticate, (req, res) => {
  try {
    const db = getDatabase();
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();

    // Get all transactions for the user
    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC
    `).all(req.userId);

    // Get all assets for depreciation calculation
    const assets = db.prepare(`
      SELECT * FROM assets WHERE user_id = ? ORDER BY purchase_date DESC
    `).all(req.userId);

    // Calculate financial summaries
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
        q1_revenue: financials.total_income * 0.25, // Rough quarterly estimate
        q2_revenue: financials.total_income * 0.5,
        q3_revenue: financials.total_income * 0.75,
        q4_revenue: financials.total_income,
        average_monthly_income: financials.total_income / 12,
        average_monthly_expenses: financials.total_expenses / 12
      }
    });
  } catch (error) {
    console.error('Summary API error:', error);
    res.status(500).json({ error: 'Failed to generate financial summary' });
  }
});

// GET /api/transactions - Get all transactions with filtering
router.get('/transactions', authenticate, (req, res) => {
  try {
    const db = getDatabase();
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
    const db = getDatabase();
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

    // Validation
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
      Math.floor(amount * 100), // Convert dollars to cents
      description || null,
      payment_method || null,
      venue || null,
      vendor || null
    );

    const newTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id - Update transaction
router.put('/transactions/:id', authenticate, (req, res) => {
  try {
    const db = getDatabase();
    const transactionId = req.params.id;
    const updates = req.body;

    // Check ownership
    const existing = db.prepare(`
      SELECT * FROM transactions WHERE id = ? AND user_id = ?
    `).get(transactionId, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Build update query
    const fields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        if (key === 'amount') {
          params.push(Math.floor(updates[key] * 100)); // Convert to cents
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add update timestamp
    fields.push('updated_at = datetime(\'now\')');
    params.push(transactionId); // For WHERE id = ?

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
    const db = getDatabase();
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
    const db = getDatabase();
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
    const db = getDatabase();
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

    // Validate depreciation method
    const validMethods = ['ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179'];
    if (!validMethods.includes(depreciation_method)) {
      return res.status(400).json({ error: 'Invalid depreciation method' });
    }

    // Validate equipment category (can be null, but must be valid if provided)
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
      Math.floor(cost_basis * 100), // Convert dollars to cents
      depreciation_method,
      equipment_category || null,
      notes || null
    );

    const newAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Asset creation error:', error);

    // Provide more specific error messages based on error type
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
    const db = getDatabase();
    const assetId = req.params.id;
    const { disposal_date, disposal_price } = req.body;

    if (!disposal_date) {
      return res.status(400).json({ error: 'Disposal date is required' });
    }

    // Check ownership
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

    // Provide more specific error messages based on error type
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
    const db = getDatabase();
    const assetId = req.params.id;
    const updates = req.body;

    // Check ownership
    const existing = db.prepare(`
      SELECT * FROM assets WHERE id = ? AND user_id = ?
    `).get(assetId, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Validate equipment category if provided
    if (updates.equipment_category !== null && updates.equipment_category !== undefined && updates.equipment_category !== '') {
      const validCategories = ['TECHNOLOGY_COMPUTING', 'INSTRUMENTS_SOUND', 'STAGE_STUDIO', 'TRANSPORTATION'];
      if (!validCategories.includes(updates.equipment_category)) {
        return res.status(400).json({
          error: 'Invalid equipment category',
          validCategories: validCategories
        });
      }
    }

    // Validate depreciation method if provided
    if (updates.depreciation_method) {
      const validMethods = ['ST_3YEAR', 'ST_5YEAR', 'ST_7YEAR', 'BONUS_100', 'BONUS_40', 'SECTION_179'];
      if (!validMethods.includes(updates.depreciation_method)) {
        return res.status(400).json({ error: 'Invalid depreciation method' });
      }
    }

    // Build update query
    const fields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        if (key === 'cost_basis') {
          params.push(Math.floor(updates[key] * 100)); // Convert to cents
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = datetime(\'now\')');
    params.push(assetId, req.userId); // For WHERE id = ? AND user_id = ?

    db.prepare(
      `UPDATE assets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...params);

    const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    res.json(updatedAsset);
  } catch (error) {
    console.error('Asset update error:', error);

    // Provide more specific error messages based on error type
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
    const db = getDatabase();
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

export default router;