// Depreciation calculation engine for IRS MACRS compliance
// Constants for depreciation methods (MACRS recovery periods)
export const DEPRECIATION_METHODS = {
  ST_3YEAR: { life: 3, convention: 'mid-quarter' },
  ST_5YEAR: { life: 5, convention: 'mid-quarter' },
  ST_7YEAR: { life: 7, convention: 'mid-quarter' },
  BONUS_100: { life: 5, bonus: 1.00, convention: 'half-year' } // 100% bonus depreciation
};

// Half-year convention lookup table
const HALF_YEAR_TABLE = {
  Q1: 0.875, // January-March: 87.5%
  Q2: 0.625, // April-June: 62.5%
  Q3: 0.375, // July-September: 37.5%
  Q4: 0.125  // October-December: 12.5%
};

/**
 * Calculate the depreciation deduction for a given year
 * @param {Object} asset - Asset object with properties
 * @param {number} taxYear - Tax year (e.g., 2024)
 * @returns {Object} Depreciation calculation results
 */
export function calculateDepreciationForYear(asset, taxYear) {
  const purchaseDate = new Date(asset.purchase_date);
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

  // Years since purchase (including current year)
  const yearsSincePurchase = taxYear - purchaseYear + 1;
  const method = DEPRECIATION_METHODS[asset.depreciation_method];

  if (!method) {
    throw new Error(`Unknown depreciation method: ${asset.depreciation_method}`);
  }

  // Handle bonus depreciation
  if (asset.depreciation_method === 'BONUS_100' && yearsSincePurchase === 1) {
    const bonusDeduction = result.cost_basis * method.bonus;
    result.depreciation_deduction = bonusDeduction;
    result.remaining_basis = result.cost_basis - bonusDeduction;
    result.calculations.push({
      year: 1,
      method: 'BONUS_100%',
      rate: '100.0%',
      deduction: bonusDeduction,
      formula: `${result.cost_basis} × 1.00 = ${bonusDeduction}`
    });
    return result;
  }

  // Standard MACRS depreciation
  const halfYearYear = method.convention === 'half-year' ? taxYear :
    purchaseYear; // For mid-quarter, use purchase year for half-year calc

  // Calculate depreciation for each year up to the recovery period
  let accumulatedDepreciation = 0;

  for (let year = 1; year <= method.life; year++) {
    const calendarYear = purchaseYear + year - 1;

    let deduction = 0;

    // Skip if this year is not the target tax year
    if (calendarYear !== taxYear) {
      if (calendarYear < taxYear) {
        // Accumulate previous year's depreciation
        const prevYearResult = calculateDepreciationForYear(asset, calendarYear);
        accumulatedDepreciation += prevYearResult.depreciation_deduction;
      }
      continue;
    }

    // Calculate this year's deduction
    if (year === 1) {
      // First year: Half-year convention
      const quarter = Math.floor((purchaseDate.getMonth() / 12) * 4) + 1;
      const quarterName = `Q${quarter}`;
      const firstYearRate = HALF_YEAR_TABLE[quarterName];
      deduction = result.cost_basis * firstYearRate;

      result.calculations.push({
        year,
        method: method.convention,
        rate: `${(firstYearRate * 100).toFixed(1)}%`,
        quarter: quarterName,
        deduction: deduction,
        formula: `${result.cost_basis} × ${firstYearRate.toFixed(3)} (${quarterName}) = ${deduction.toFixed(2)}`
      });
    } else {
      // Subsequent years: Full-year rates
      const remainingDosage = method.life - year + 1;
      const annualRate = remainingDosage !== 0 ? 2 / remainingDosage : 1;

      deduction = result.cost_basis * annualRate;

      result.calculations.push({
        year,
        method: 'EAD',
        rate: `${(annualRate * 100).toFixed(1)}%`,
        deduction: deduction,
        formula: `${result.cost_basis} × ${annualRate.toFixed(3)} = ${deduction.toFixed(2)}`
      });
    }

    // Ensure we don't exceed remaining basis
    deduction = Math.min(deduction, result.remaining_basis - accumulatedDepreciation);

    result.depreciation_deduction = deduction;
    break;
  }

  result.accumulated_depreciation = accumulatedDepreciation;
  result.remaining_basis = result.cost_basis - accumulatedDepreciation - result.depreciation_deduction;

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