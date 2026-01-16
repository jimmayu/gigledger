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
export const MACRS_RATES = {
  '3-Year': {
    half_year: [87.5, 37.5, 37.5, 25.0], // Year 1-4 (mid-quarter convention for 3-year)
    mid_quarter: {
      Q1: [87.5, 37.5, 37.5, 25.0], // Year 1-4
      Q2: [62.5, 50.0, 37.5, 25.0], // Year 1-4
      Q3: [37.5, 62.5, 37.5, 25.0], // Year 1-4
      Q4: [12.5, 37.5, 37.5, 25.0]  // Year 1-4
    }
  },
  '5-Year': {
    half_year: [20.0, 32.0, 19.2, 11.52, 11.52, 5.76], // Year 1-6
    mid_quarter: {
      Q1: [15.0, 34.0, 19.2, 11.52, 11.52, 5.76], // Year 1-6
      Q2: [10.0, 32.0, 19.2, 11.52, 11.52, 5.76], // Year 1-6
      Q3: [5.0, 30.0, 19.2, 11.52, 11.52, 5.76],  // Year 1-6
      Q4: [0.0, 32.0, 19.2, 11.52, 11.52, 5.76]   // Year 1-6
    }
  },
  '7-Year': {
    half_year: [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
    mid_quarter: {
      Q1: [10.71, 25.51, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
      Q2: [7.15, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
      Q3: [3.57, 23.47, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46], // Year 1-8
      Q4: [0.0, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46]   // Year 1-8
    }
  }
};

// Section 179 Expensing Limits
export const SECTION_179_LIMITS = {
  2025: {
    limit: 2500000,
    phaseout_start: 2500000,
    description: 'New and used equipment; requires business profit; must be used >50% for business.'
  },
  2026: {
    limit: 2560000,
    phaseout_start: 2560000,
    description: 'New and used equipment; requires business profit; must be used >50% for business.'
  }
};

// Bonus Depreciation Rules
export const BONUS_DEPRECIATION = {
  rates: {
    pre_jan_20_2025: 0.40, // 40% bonus depreciation
    post_jan_19_2025: 1.00 // 100% bonus depreciation
  },
  eligibility: 'New and used equipment; does not require profit (can create a loss).',
  special_note: 'Qualified Sound Recording Productions (commenced after July 4, 2025) are eligible for 100% bonus depreciation under Notice 2026-11.'
};

// Depreciation Methods with IRS compliance
export const DEPRECIATION_METHODS = {
  // Standard MACRS methods
  ST_3YEAR: {
    label: '3-Year MACRS',
    description: 'For musical instruments used professionally',
    life: 3,
    convention: 'mid-quarter',
    macrs_class: '3-Year'
  },
  ST_5YEAR: {
    label: '5-Year MACRS',
    description: 'For sound equipment, computers, and recording gear',
    life: 5,
    convention: 'half-year',
    macrs_class: '5-Year'
  },
  ST_7YEAR: {
    label: '7-Year MACRS',
    description: 'For furniture, fixtures, and other business equipment',
    life: 7,
    convention: 'half-year',
    macrs_class: '7-Year'
  },

  // Bonus Depreciation methods
  BONUS_100: {
    label: '100% Bonus Depreciation',
    description: 'Deduct entire cost in first year for maximum tax savings',
    life: 5, // Typically 5-year property
    bonus: 1.00,
    convention: 'half-year',
    macrs_class: '5-Year',
    applicable_date: 'post_jan_19_2025'
  },
  BONUS_40: {
    label: '40% Bonus Depreciation',
    description: 'For purchases before January 20, 2025',
    life: 5,
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

  // For bonus depreciation, use the appropriate rate
  if (asset.depreciation_method.startsWith('BONUS_')) {
    return method.bonus; // Returns 1.00 or 0.40
  }

  // For Section 179, return full deduction
  if (asset.depreciation_method === 'SECTION_179') {
    return 1.00; // Full expensing
  }

  // For standard MACRS, get the appropriate rate based on year and convention
  const rates = MACRS_RATES[method.macrs_class];

  if (method.convention === 'half-year') {
    // Check if we're within the recovery period
    if (yearsSincePurchase - 1 < rates.half_year.length) {
      return rates.half_year[yearsSincePurchase - 1] / 100; // Convert percentage to decimal
    } else {
      return 0; // Beyond recovery period
    }
  } else if (method.convention === 'mid-quarter') {
    const quarter = Math.floor(purchaseDate.getMonth() / 3) + 1;
    const quarterKey = `Q${quarter}`;

    // Check if mid_quarter rates exist for this MACRS class
    if (rates.mid_quarter && rates.mid_quarter[quarterKey]) {
      // Check if we're within the recovery period
      if (yearsSincePurchase - 1 < rates.mid_quarter[quarterKey].length) {
        return rates.mid_quarter[quarterKey][yearsSincePurchase - 1] / 100; // Convert percentage to decimal
      } else {
        return 0; // Beyond recovery period
      }
    } else {
      // Fallback to half-year rates if mid-quarter not available
      if (yearsSincePurchase - 1 < rates.half_year.length) {
        return rates.half_year[yearsSincePurchase - 1] / 100; // Convert percentage to decimal
      } else {
        return 0; // Beyond recovery period
      }
    }
  }

  return 0; // Fallback
}

// Get Section 179 limit for a given tax year
export function getSection179Limit(taxYear) {
  return SECTION_179_LIMITS[taxYear]?.limit || 0;
}

// Get bonus depreciation rate based on purchase date
export function getBonusDepreciationRate(purchaseDate) {
  const purchaseDateObj = new Date(purchaseDate);
  const cutoffDate = new Date('2025-01-19');

  if (purchaseDateObj >= cutoffDate) {
    return BONUS_DEPRECIATION.rates.post_jan_19_2025; // 100%
  } else {
    return BONUS_DEPRECIATION.rates.pre_jan_20_2025; // 40%
  }
}