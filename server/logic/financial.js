// Financial calculation utilities for GigLedger
// All currency calculations use integers (cents) to avoid floating point errors

import { perfLogger, logPerformance, businessLogger, logValidation } from '../utils/logger.js';

/**
 * Calculate YTD (Year-to-Date) income and expenses
 * @param {Array} transactions - Array of transaction objects
 * @param {number} year - Tax year
 * @returns {Object} YTD financial summary
 */
export function calculateYearToDateFinancials(transactions, year) {
  const startTime = performance.now();

  const ytdTransactions = transactions.filter(t => {
    try {
      // Parse date in YYYY-MM-DD format to avoid timezone issues
      const dateStr = String(t.date || '');
      if (!dateStr.includes('-')) {
        logValidation('date_format', false, {
          date_value: t.date,
          expected_format: 'YYYY-MM-DD'
        });
        return false; // Invalid date format
      }
      const dateParts = dateStr.split('-');
      const transactionYear = parseInt(dateParts[0]);
      return transactionYear === year;
    } catch (error) {
      // If date parsing fails, exclude this transaction
      logValidation('date_parsing', false, {
        date_value: t.date,
        error: error.message,
        transaction_id: t.id
      });
      return false;
    }
   });

   const income = ytdTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const expenses = ytdTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Log validation summary
  logValidation('financial_calculation', true, {
    total_transactions: transactions.length,
    ytd_transactions: ytdTransactions.length,
    tax_year: year,
    total_income: income / 100,
    total_expenses: expenses / 100
  });

  const result = {
    year,
    total_income: income / 100, // Convert cents to dollars
    total_expenses: expenses / 100,
    net_income: (income - expenses) / 100,
    transaction_count: ytdTransactions.length,
    income_transactions: ytdTransactions.filter(t => t.type === 'INCOME').length,
    expense_transactions: ytdTransactions.filter(t => t.type === 'EXPENSE').length
  };

  // Log performance metrics
  const duration = performance.now() - startTime;
  logPerformance('calculateYearToDateFinancials', duration, {
    transaction_count: transactions.length,
    ytd_transaction_count: ytdTransactions.length,
    year,
    total_income: result.total_income
  });

  return result;
}

/**
 * Calculate total depreciation deductions for a tax year
 * @param {Array}assets - Array of asset depreciation results
 * @returns {number} Total depreciation deduction in dollars
 */
export function calculateTotalDepreciation(assets) {
  return (assets || []).reduce((total, asset) => total + (asset?.depreciation_deduction || 0), 0);
}

/**
 * Format currency for display
 * @param {number} cents - Amount in cents
 * @param {boolean} showCents - Whether to show the cent denomination
 * @returns {string} Formatted currency string
 */
export function formatCurrency(cents, showCents = true) {
  const dollars = Math.abs(cents) / 100;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2
  });

  return cents < 0 ? `-${formatter.format(dollars)}` : formatter.format(dollars);
}

/**
 * Format date for consistent display across the application
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'medium', 'long')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'medium') {
  const d = new Date(date);

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'medium':
    default:
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
  }
}

/**
 * Calculate quarter for date (1-4)
 * @param {string|Date} date - Date to check
 * @returns {number} Quarter (1-4)
 */
export function getQuarter(date) {
  const month = new Date(date).getMonth() + 1; // JavaScript months are 0-indexed
  return Math.ceil(month / 3);
}

/**
 * Group transactions by month for reporting
 * @param {Array} transactions - Array of transactions
 * @param {number} year - Tax year to filter by
 * @returns {Object} Transactions grouped by month
 */
export function groupTransactionsByMonth(transactions, year) {
  const filteredTransactions = transactions.filter(t => {
    const transactionYear = new Date(t.date).getFullYear();
    return transactionYear === year;
  });

  const monthly = {};

  // Initialize all months
  for (let month = 1; month <= 12; month++) {
    const monthKey = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
    monthly[monthKey] = {
      month: month,
      income: 0,
      expenses: 0,
      net: 0,
      transaction_count: 0
    };
  }

  // Aggregate actual transactions
  filteredTransactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });

    if (monthly[monthKey]) {
      const amountDollars = t.amount / 100;
      if (t.type === 'INCOME') {
        monthly[monthKey].income += amountDollars;
        monthly[monthKey].net += amountDollars;
      } else if (t.type === 'EXPENSE') {
        monthly[monthKey].expenses += amountDollars;
        monthly[monthKey].net -= amountDollars;
      }
      monthly[monthKey].transaction_count += 1;
    }
  });

  return monthly;
}

/**
 * Calculate tax-year tax liability estimate (rough estimate)
 * @param {Object} financials - YTD financial data
 * @param {number} totalDepreciation - Total depreciation deductions in dollars
 * @returns {Object} Tax calculation estimates
 */
export function calculateTaxLiability(financials, totalDepreciation) {
  // Simplified tax calculation - in reality this would depend on many factors
  const taxableIncome = financials.net_income - totalDepreciation;

  // Federal tax brackets (2024 - single filer, simplified)
  const taxBrackets = [
    { maxIncome: 11000, rate: 0.10 },
    { maxIncome: 44725, rate: 0.12 },
    { maxIncome: 95375, rate: 0.22 },
    { maxIncome: 182100, rate: 0.24 },
    { maxIncome: 231250, rate: 0.32 },
    { maxIncome: 578125, rate: 0.35 },
    { maxIncome: Infinity, rate: 0.37 }
  ];

  // Very rough self-employment tax (15.3%)
  const selfEmploymentTax = taxableIncome * 0.153;
  const adjustedGrossIncome = taxableIncome - (selfEmploymentTax * 0.5); // Deductible portion

  // Calculate income tax
  let incomeTax = 0;
  let remainingIncome = Math.max(0, adjustedGrossIncome);

  for (const bracket of taxBrackets) {
    if (remainingIncome <= 0) break;

    const taxableInBracket = Math.min(remainingIncome, bracket.maxIncome);
    incomeTax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  const totalTax = selfEmploymentTax + incomeTax;

  return {
    taxable_income: taxableIncome,
    self_employment_tax: selfEmploymentTax,
    agi: adjustedGrossIncome,
    income_tax: incomeTax,
    total_tax: totalTax,
    effective_tax_rate: taxableIncome > 0 ? totalTax / taxableIncome : 0,
    estimated_tax_savings: totalDepreciation * 0.32 // Rough estimate
  };
}