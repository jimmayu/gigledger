// IRS Depreciation Tables for MACRS (Modified Accelerated Cost Recovery System)
// Based on IRS Publication 946 and Notice 2026-11

// Equipment Categories with IRS-compliant MACRS classifications
export const EQUIPMENT_CATEGORIES = {
  'TECHNOLOGY_COMPUTING': {
    label: 'Technology & Computing',
    description: 'iPads for lyrics/charts, Performance laptops, Digital mixers, Recording software',
    macrs_class: '5-Year',
    macrs_rates_half_year: [20.0, 32.0, 19.2, 11.52, 11.52, 5.76], // Year 1-6
    bonus_eligible: true,
    section_179_eligible: true,
    examples: ['iPads', 'Performance laptops', 'Digital mixers', 'Recording software']
  },
  'INSTRUMENTS_SOUND': {
    label: 'Instruments & Sound Reinforcement',
    description: 'Guitars, Amplifiers, PA Speakers, Microphones, Drums, Keyboards',
    macrs_class: '7-Year',
    macrs_rates_half_year: [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
    bonus_eligible: true,
    section_179_eligible: true,
    examples: ['Guitars', 'Amplifiers', 'PA Speakers', 'Microphones', 'Drums', 'Keyboards']
  },
  'STAGE_STUDIO': {
    label: 'Stage & Studio Infrastructure',
    description: 'Lighting rigs, Trussing, Music stands, Flight cases, Stage furniture',
    macrs_class: '7-Year',
    macrs_rates_half_year: [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
    bonus_eligible: true,
    section_179_eligible: true,
    examples: ['Lighting rigs', 'Trussing', 'Music stands', 'Flight cases', 'Stage furniture']
  },
  'TRANSPORTATION': {
    label: 'Transportation',
    description: 'Tour vans, Equipment trailers',
    macrs_class: '5-Year',
    macrs_rates_half_year: [20.0, 32.0, 19.2, 11.52, 11.52, 5.76], // Year 1-6
    bonus_eligible: true,
    section_179_eligible: true,
    special_notes: 'Subject to vehicle weight limits for bonus depreciation and SUV/Van caps for Section 179',
    examples: ['Tour vans', 'Equipment trailers']
  }
};

// MACRS Rate Tables by Recovery Period
// Rates are percentages of cost basis per IRS Publication 946
// Half-year convention applies 50% of first/last year rates
// Note: Rates are applied to the original cost basis, not remaining basis
export const MACRS_RATES = {
  '3-Year': {
    // 200% Declining Balance, switching to Straight Line
    // Half-year convention: Year 1 gets 50% of full-year rate
    half_year: [33.33, 44.45, 14.81, 7.41], // Year 1-4
    mid_quarter: {
      Q1: [58.33, 44.45, 14.81, 7.41], // Year 1-4 (87.5% of full 33.33%)
      Q2: [41.67, 44.45, 14.81, 7.41], // Year 1-4 (62.5% of full 33.33%)
      Q3: [25.00, 44.45, 14.81, 7.41], // Year 1-4 (37.5% of full 33.33%)
      Q4: [8.33, 44.45, 14.81, 7.41]   // Year 1-4 (12.5% of full 33.33%)
    }
  },
  '5-Year': {
    half_year: [20.0, 32.0, 19.2, 11.52, 11.52, 5.76], // Year 1-6
    mid_quarter: {
      Q1: [2.5, 34.0, 19.2, 11.52, 11.52, 5.76],    // Year 1-6 (20.0 * 12.5%)
      Q2: [7.5, 34.0, 19.2, 11.52, 11.52, 5.76],    // Year 1-6 (20.0 * 37.5%)
      Q3: [12.5, 34.0, 19.2, 11.52, 11.52, 5.76],   // Year 1-6 (20.0 * 62.5%)
      Q4: [17.5, 34.0, 19.2, 11.52, 11.52, 5.76]    // Year 1-6 (20.0 * 87.5%)
    }
  },
  '7-Year': {
    half_year: [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
    mid_quarter: {
      Q1: [1.79, 25.51, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],  // Year 1-8 (14.29 * 12.5%)
      Q2: [5.36, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],  // Year 1-8 (14.29 * 37.5%)
      Q3: [8.93, 23.47, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],  // Year 1-8 (14.29 * 62.5%)
      Q4: [12.50, 22.46, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46]  // Year 1-8 (14.29 * 87.5%)
    }
  }
};

// Section 179 Expensing Limits
// Based on IRS rules: $1,250,000 max deduction, phase-out begins at $3,130,000
export const SECTION_179_LIMITS = {
  2025: {
    limit: 1250000,
    phaseout_start: 3130000,
    description: 'New and used equipment; requires business profit; must be used >50% for business.'
  },
  2026: {
    limit: 1250000,
    phaseout_start: 3130000,
    description: 'New and used equipment; requires business profit; must be used >50% for business.'
  }
};

// Bonus Depreciation Rules
// Based on IRS phase-down schedule and Notice 2026-11
export const BONUS_DEPRECIATION = {
  rates: {
    pre_jan_20_2025: 0.40, // 40% bonus depreciation (2025 qualified property)
    post_jan_19_2025: 1.00, // 100% bonus depreciation (Qualified Sound Recording Productions only)
    standard_2025: 0.40,   // Standard 2025 rate
    standard_2026: 0.20    // Standard 2026 rate
  },
  eligibility: 'New and used equipment; does not require profit (can create a loss).',
  special_note: 'Qualified Sound Recording Productions (commenced after July 4, 2025) are eligible for 100% bonus depreciation under Notice 2026-11. All other qualified property follows the phase-down schedule: 40% in 2025, 20% in 2026.'
};

// Depreciation Methods with IRS compliance
export const DEPRECIATION_METHODS = {
  // Standard MACRS methods
  // Note: Half-year convention is the default for most property types
  // The life property indicates the recovery period, but MACRS depreciation continues
  // into the year after the recovery period ends due to half-year convention
  ST_3YEAR: {
    label: '3-Year MACRS',
    description: 'For musical instruments used professionally',
    life: 4,  // 3-year property has depreciation in years 1-4 due to half-year convention
    convention: 'half-year',  // Changed from mid-quarter
    macrs_class: '3-Year'
  },
  ST_5YEAR: {
    label: '5-Year MACRS',
    description: 'For sound equipment, computers, and recording gear',
    life: 6,  // 5-year property has depreciation in years 1-6
    convention: 'half-year',
    macrs_class: '5-Year'
  },
  ST_7YEAR: {
    label: '7-Year MACRS',
    description: 'For furniture, fixtures, and other business equipment',
    life: 8,  // 7-year property has depreciation in years 1-8
    convention: 'half-year',
    macrs_class: '7-Year'
  },

  // Bonus Depreciation methods
  BONUS_100: {
    label: '100% Bonus Depreciation',
    description: 'Deduct entire cost in first year for maximum tax savings',
    life: 6, // 5-year property has depreciation in years 1-6
    bonus: 1.00,
    convention: 'half-year',
    macrs_class: '5-Year',
    applicable_date: 'post_jan_19_2025'
  },
  BONUS_40: {
    label: '40% Bonus Depreciation',
    description: 'For purchases before January 20, 2025',
    life: 6, // 5-year property has depreciation in years 1-6
    bonus: 0.40,
    convention: 'half-year',
    macrs_class: '5-Year',
    applicable_date: 'pre_jan_20_2025'
  },

  // Section 179 Expensing
  SECTION_179: {
    label: 'Section 179 Expensing',
    description: 'Immediate expensing up to annual limits',
    life: 1, // Full expensing in year 1
    convention: 'immediate',
    immediate_deduction: true
  }
};

// Get MACRS rates for a specific asset and year
export function getMacrsRates(asset, taxYear) {
  const method = DEPRECIATION_METHODS[asset.depreciation_method];
  if (!method) {
    throw new Error(`Unknown depreciation method: ${asset.depreciation_method}`);
  }

  // Parse date in local timezone to avoid UTC issues (consistent with depreciation.js)
  const dateParts = asset.purchase_date.split('-');
  const purchaseDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const purchaseYear = purchaseDate.getFullYear();
  const yearsSincePurchase = taxYear - purchaseYear + 1;
  const quarter = Math.floor(purchaseDate.getMonth() / 3) + 1;

  // For bonus depreciation, use the appropriate rate for year 1, MACRS for subsequent years
  if (asset.depreciation_method.startsWith('BONUS_')) {
    if (yearsSincePurchase === 1) {
      return method.bonus; // Returns 1.00 or 0.40 for year 1
    } else {
      // For years 2+, use MACRS rates based on the class
      return getMacrsRateForClass(method.macrs_class, yearsSincePurchase, quarter, method.convention);
    }
  }

  // For Section 179, return full deduction
  if (asset.depreciation_method === 'SECTION_179') {
    return 1.00; // Full expensing
  }

  // For standard MACRS, get the appropriate rate based on year and convention
  return getMacrsRateForClass(method.macrs_class, yearsSincePurchase, quarter, method.convention);
}

// Helper function to get MACRS rate for a specific class
function getMacrsRateForClass(macrsClass, yearsSincePurchase, quarter, convention) {
  const rates = MACRS_RATES[macrsClass];

  // Determine if mid-quarter convention should be used
  // Mid-quarter applies to Q4 placements for 3-year property
  const useMidQuarter = (convention === 'mid-quarter') || (macrsClass === '3-Year' && quarter === 4);

  if (useMidQuarter) {
    const quarterKey = `Q${quarter}`;
    // Check if mid_quarter rates exist for this MACRS class
    if (rates.mid_quarter && rates.mid_quarter[quarterKey]) {
      // Check if we're within the recovery period
      if (yearsSincePurchase - 1 < rates.mid_quarter[quarterKey].length) {
        return rates.mid_quarter[quarterKey][yearsSincePurchase - 1] / 100; // Convert percentage to decimal
      } else {
        return 0; // Beyond recovery period
      }
    }
  }

  // Use half-year convention (default)
  // Check if we're within the recovery period
  if (yearsSincePurchase - 1 < rates.half_year.length) {
    return rates.half_year[yearsSincePurchase - 1] / 100; // Convert percentage to decimal
  } else {
    return 0; // Beyond recovery period
  }
}

// Get Section 179 limit for a given tax year
export function getSection179Limit(taxYear) {
  return SECTION_179_LIMITS[taxYear]?.limit || 0;
}

// Get bonus depreciation rate based on purchase date
// Returns the appropriate rate considering:
// 1. Qualified Sound Recording Productions (100% if post Jan 19, 2025)
// 2. Standard phase-down schedule (40% in 2025, 20% in 2026)
// Note: For production sound equipment used in Qualified Sound Recording Productions,
// the 100% rate applies. For all other property, the standard phase-down applies.
export function getBonusDepreciationRate(purchaseDate) {
  const purchaseDateObj = new Date(purchaseDate);
  const purchaseYear = purchaseDateObj.getFullYear();

  // Standard phase-down schedule based on tax year
  // Note: The special 100% rule (post Jan 19, 2025) only applies to
  // Qualified Sound Recording Productions, not general equipment
  if (purchaseYear === 2025) {
    return BONUS_DEPRECIATION.rates.standard_2025; // 40%
  } else if (purchaseYear === 2026) {
    return BONUS_DEPRECIATION.rates.standard_2026; // 20%
  } else if (purchaseYear < 2025) {
    return BONUS_DEPRECIATION.rates.pre_jan_20_2025; // 40%
  }

  // Default fallback (should not reach here for valid dates)
  return BONUS_DEPRECIATION.rates.standard_2025;
}