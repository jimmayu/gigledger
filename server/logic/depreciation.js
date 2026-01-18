// Depreciation calculation engine for IRS MACRS compliance
import {
  DEPRECIATION_METHODS as IRS_DEPRECIATION_METHODS,
  MACRS_RATES,
  SECTION_179_LIMITS,
  BONUS_DEPRECIATION,
  getMacrsRates,
  getSection179Limit,
  getBonusDepreciationRate
} from '../data/irs_depreciation_tables.js';

// Combine our methods with IRS methods
// Note: Half-year convention is the default for most property types
// Mid-quarter convention is used when >40% of assets placed in service in last quarter
export const DEPRECIATION_METHODS = {
  ...IRS_DEPRECIATION_METHODS,
  // Keep backward compatibility with existing methods
  ST_3YEAR: { ...IRS_DEPRECIATION_METHODS.ST_3YEAR, life: 4, convention: 'half-year' },
  ST_5YEAR: { ...IRS_DEPRECIATION_METHODS.ST_5YEAR, life: 6, convention: 'half-year' },
  ST_7YEAR: { ...IRS_DEPRECIATION_METHODS.ST_7YEAR, life: 8, convention: 'half-year' },
  BONUS_100: { ...IRS_DEPRECIATION_METHODS.BONUS_100, life: 6, bonus: 1.00, convention: 'half-year' }
};

/**
 * Calculate the depreciation deduction for a given year
 * @param {Object} asset - Asset object with properties
 * @param {number} taxYear - Tax year (e.g., 2024)
 * @returns {Object} Depreciation calculation results
 */
export function calculateDepreciationForYear(asset, taxYear) {
  // DEBUG: Add debug at start
  // console.log('DEBUG calculateDepreciationForYear', asset.id, 'year', taxYear);

  // Parse date in local timezone to avoid UTC issues
  const dateParts = asset.purchase_date.split('-');
  const purchaseDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const purchaseYear = purchaseDate.getFullYear();

  // Initialize result
  const result = {
    asset_id: asset.id,
    asset_name: asset.name,
    tax_year: taxYear,
    cost_basis: asset.cost_basis / 100, // Convert cents to dollars
    depreciation_deduction: 0,
    accumulated_depreciation: 0,
    remaining_basis: asset.cost_basis / 100,
    is_disposed: !!asset.disposal_date,
    calculations: []
  };

  // Years since purchase (including current year)
  const yearsSincePurchase = taxYear - purchaseYear + 1;

  // If asset was disposed in or before this year, no depreciation
  if (asset.disposal_date) {
    const disposalYear = new Date(asset.disposal_date).getFullYear();
    if (taxYear >= disposalYear) {
      return { ...result, depreciation_deduction: 0 };
    }
  }

  // Skip if asset purchased after the tax year
  if (purchaseYear > taxYear) {
    return { ...result, depreciation_deduction: 0 };
  }

  const method = DEPRECIATION_METHODS[asset.depreciation_method];
  if (!method) {
    throw new Error(`Unknown depreciation method: ${asset.depreciation_method}`);
  }

  // For Section 179 assets, the recovery period extends beyond the initial life
  // because MACRS depreciation continues on the remaining basis
  const effectiveLife = asset.depreciation_method === 'SECTION_179'
    ? Math.max(method.life, 6) // Use at least 6 years (5-year MACRS) for Section 179
    : method.life;

  // Calculate deduction for this year
  // For years beyond the recovery period, no depreciation
  if (yearsSincePurchase > effectiveLife) {
    result.depreciation_deduction = 0;
    result.remaining_basis = 0;
    // accumulated_depreciation will be calculated in the previous years loop
    return result;
  }

  // Get the deduction for this year
  const currentBasis = result.cost_basis;
  let deduction = 0;

  // Calculate accumulated depreciation from previous years
  let accumulatedDepreciation = 0;
  let remainingBasis = currentBasis;
  // DEBUG: Track initial state
  console.log('DEBUG year', taxYear, 'initial accumDeprec:', accumulatedDepreciation, 'remainingBasis:', remainingBasis);

  if (yearsSincePurchase > 1) {
    // DEBUG: Track previous years processing
    console.log('DEBUG year', taxYear, 'processing prev years 1 to', (yearsSincePurchase - 1));
    for (let prevYear = 1; prevYear < yearsSincePurchase; prevYear++) {
      const prevYearTaxYear = purchaseYear + prevYear - 1;

      // Handle previous years depreciation calculations
      if (asset.depreciation_method === 'SECTION_179' && prevYear === 1) {
        // Year 1 was Section 179 deduction - we need to calculate what that was
        const section179Limit = getSection179Limit(prevYearTaxYear);
        const section179Deduction = Math.min(currentBasis, section179Limit);
        accumulatedDepreciation += section179Deduction;
        remainingBasis -= section179Deduction;
      } else if (asset.depreciation_method === 'SECTION_179' && prevYear > 1) {
        // Years 2+ for Section 179 assets use MACRS on remaining basis
        const macrsAsset = { ...asset, depreciation_method: 'ST_5YEAR' };
        const prevYearRate = getMacrsRates(macrsAsset, prevYearTaxYear);
        const prevYearDeduction = remainingBasis * prevYearRate;
        accumulatedDepreciation += prevYearDeduction;
        remainingBasis -= prevYearDeduction;
      } else if (asset.depreciation_method.startsWith('BONUS_') && prevYear === 1) {
        // Year 1 for bonus depreciation methods uses bonus rate
        const bonusRate = getBonusDepreciationRate(asset.purchase_date);
        const prevYearDeduction = currentBasis * bonusRate;
        accumulatedDepreciation += prevYearDeduction;
        remainingBasis -= prevYearDeduction;
      } else if (asset.depreciation_method.startsWith('BONUS_')) {
        // Years 2+ for bonus depreciation methods use MACRS rates
        const prevYearRate = getMacrsRates({ ...asset, purchase_date: asset.purchase_date }, prevYearTaxYear);

        // For bonus years beyond recovery period, use remaining basis
        const prevYearMethod = DEPRECIATION_METHODS[asset.depreciation_method];
        const basisForPrevYear = prevYear > prevYearMethod.life
          ? remainingBasis
          : currentBasis;

        const prevYearDeduction = basisForPrevYear * prevYearRate;
        accumulatedDepreciation += prevYearDeduction;
        remainingBasis -= prevYearDeduction;
      } else {
        // Standard MACRS depreciation
        const prevYearRate = getMacrsRates({ ...asset, purchase_date: asset.purchase_date }, prevYearTaxYear);
        const prevYearDeduction = currentBasis * prevYearRate;
        accumulatedDepreciation += prevYearDeduction;
        remainingBasis -= prevYearDeduction;
      }
    }
  }

  // Calculate current year deduction based on method

  if (asset.depreciation_method.startsWith('BONUS_') && yearsSincePurchase === 1) {
    // Bonus depreciation in year 1 (applied to original basis)
    const bonusRate = getBonusDepreciationRate(asset.purchase_date);
    deduction = currentBasis * bonusRate;
    result.calculations.push({
      year: 1,
      method: `BONUS_${Math.round(bonusRate * 100)}%`,
      rate: `${(bonusRate * 100).toFixed(0)}%`,
      deduction: deduction,
      formula: `${currentBasis.toFixed(2)} × ${bonusRate.toFixed(2)} = ${deduction.toFixed(2)}`
    });
  } else if (asset.depreciation_method === 'SECTION_179' && yearsSincePurchase === 1) {
    // Section 179 expensing in year 1 (deduct up to annual limit)
    const section179Limit = getSection179Limit(taxYear);
    const section179Deduction = Math.min(currentBasis, section179Limit);
    deduction = section179Deduction;
    result.calculations.push({
      year: 1,
      method: 'SECTION_179',
      rate: '100.0%',
      deduction: deduction,
      formula: `MIN(${currentBasis.toFixed(2)}, ${section179Limit.toFixed(2)}) (Section 179) = ${deduction.toFixed(2)}`
    });
  } else if (method.convention === 'mid-quarter' || method.convention === 'half-year') {
    // MACRS depreciation (uses IRS tables)
    const macrsRate = getMacrsRates(asset, taxYear);

    // For standard MACRS and bonus depreciation years 1-3, use original basis
    // For Section 179 methods or bonus years beyond recovery period, use remaining basis
    const basisForDepreciation = ((asset.depreciation_method === 'SECTION_179') && yearsSincePurchase > 1) ||
                                  (asset.depreciation_method.startsWith('BONUS_') && yearsSincePurchase > method.life)
      ? remainingBasis
      : currentBasis;

    deduction = basisForDepreciation * macrsRate;

    const quarter = Math.floor(purchaseDate.getMonth() / 3) + 1;
    const quarterName = `Q${quarter}`;
    const conventionName = method.convention === 'half-year' ? 'MACRS Half-Year' : 'MACRS Mid-Quarter';

    result.calculations.push({
      year: yearsSincePurchase,
      method: conventionName,
      rate: `${(macrsRate * 100).toFixed(2)}%`,
      quarter: quarterName,
      deduction: deduction,
      formula: `${basisForDepreciation.toFixed(2)} × ${macrsRate.toFixed(4)} = ${deduction.toFixed(2)}`
    });
  } else if (asset.depreciation_method === 'SECTION_179' && yearsSincePurchase > 1) {
    // For Section 179 assets in years after year 1, apply MACRS to remaining basis
    // Use 5-year MACRS for Section 179 assets (common practice)
    const macrsAsset = { ...asset, depreciation_method: 'ST_5YEAR' };
    const macrsRate = getMacrsRates(macrsAsset, taxYear);

    // Use remaining basis for MACRS calculation
    const basisForDepreciation = remainingBasis;
    deduction = basisForDepreciation * macrsRate;

    const quarter = Math.floor(purchaseDate.getMonth() / 3) + 1;
    const quarterName = `Q${quarter}`;
    const conventionName = method.convention === 'half-year' ? 'MACRS Half-Year' : 'MACRS Mid-Quarter';

    result.calculations.push({
      year: yearsSincePurchase,
      method: `SECTION_179 + ${conventionName}`,
      rate: `${(macrsRate * 100).toFixed(2)}%`,
      quarter: quarterName,
      deduction: deduction,
      formula: `${basisForDepreciation.toFixed(2)} × ${macrsRate.toFixed(4)} = ${deduction.toFixed(2)}`
    });
  } else {
    throw new Error(`Unknown convention: ${method.convention}`);
  }

  // Apply over-depreciation cap (IRS compliance)
  // If remaining basis is 0 or negative, no depreciation should be taken
  // Handle floating point precision by using a small tolerance
  const TOLERANCE = 1e-10;
  if (remainingBasis <= TOLERANCE) {
    // console.log('DEBUG: over-depreciation check hit, accumulatedDepreciation =', accumulatedDepreciation);
    result.depreciation_deduction = 0;
    result.accumulated_depreciation = accumulatedDepreciation;
    result.remaining_basis = 0;
    return result;
  }

  deduction = Math.min(deduction, remainingBasis);
  deduction = Math.max(deduction, 0); // Don't allow negative

  // For bonus depreciation in the final year, deplete the entire remaining basis
  // Only apply this if we're in the final year of the recovery period
  if (asset.depreciation_method.startsWith('BONUS_') &&
      yearsSincePurchase >= method.life &&
      deduction < remainingBasis) {
    deduction = remainingBasis;
  }

  result.depreciation_deduction = deduction;
  result.accumulated_depreciation = accumulatedDepreciation + deduction;
  result.remaining_basis = remainingBasis - deduction;

  return result;
}

/**
 * Calculate depreciation for all assets in a given tax year
 * @param {Array} assets - Array of asset objects
 * @param {number} taxYear - Tax year
 * @returns {Array} Array of depreciation calculations
 */
export function calculateDepreciationSummary(assets, taxYear) {
  const results = assets
    .filter(asset => !asset.disposal_date || new Date(asset.disposal_date).getFullYear() > taxYear)
    .map(asset => calculateDepreciationForYear(asset, taxYear));

  return results.filter(result => result.depreciation_deduction > 0 || result.is_disposed);
}

/**
 * Get allowed depreciation years for display
 * @returns {Array} Array of tax year objects
 */
export function getAllowedTaxYears() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10; // Last 10 years
  const years = [];

  for (let year = startYear; year <= currentYear + 1; year++) { // Next year for advance planning
    years.push({
      value: year,
      label: `Tax Year ${year}`,
      is_future: year > currentYear
    });
  }

  return years.reverse(); // Most recent first
}