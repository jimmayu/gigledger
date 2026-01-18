// Test script for depreciation calculation fixes
import { calculateDepreciationForYear } from './server/logic/depreciation.js';

// Test case data
// Note: For MACRS, rates are applied to the original basis (not remaining basis)
const testCases = [
  {
    name: 'Test 1: 3-year MACRS, $1000, Jan 1, 2025 (half-year convention)',
    asset: {
      id: 'test1',
      name: 'Test 1',
      purchase_date: '2025-01-01',
      cost_basis: 100000, // $1000 in cents
      depreciation_method: 'ST_3YEAR'
    },
    expected: [
      { year: 2025, deduction: 333.30, total: 333.30, remaining: 666.70 },
      { year: 2026, deduction: 444.50, total: 777.80, remaining: 222.20 },
      { year: 2027, deduction: 148.10, total: 925.90, remaining: 74.10 },
      { year: 2028, deduction: 74.10, total: 1000.00, remaining: 0.00 }
    ]
  },
  {
    name: 'Test 2: 3-year MACRS, $1000, Oct 1, 2025 (Q4 mid-quarter)',
    asset: {
      id: 'test2',
      name: 'Test 2',
      purchase_date: '2025-10-01',
      cost_basis: 100000, // $1000 in cents
      depreciation_method: 'ST_3YEAR'
    },
    expected: [
      { year: 2025, deduction: 83.30, total: 83.30, remaining: 916.70 },
      { year: 2026, deduction: 444.50, total: 527.80, remaining: 472.20 },
      { year: 2027, deduction: 148.10, total: 675.90, remaining: 324.10 },
      { year: 2028, deduction: 74.10, total: 750.00, remaining: 250.00 }
    ]
  },
  {
    name: 'Test 3: 5-year property with 40% bonus, $2000, Mar 1, 2025',
    asset: {
      id: 'test3',
      name: 'Test 3',
      purchase_date: '2025-03-01',
      cost_basis: 200000, // $2000 in cents
      depreciation_method: 'BONUS_40'
    },
    expected: [
      { year: 2025, deduction: 800.00, total: 800.00, remaining: 1200.00 },
      { year: 2026, deduction: 640.00, total: 1440.00, remaining: 560.00 },
      { year: 2027, deduction: 384.00, total: 1824.00, remaining: 176.00 },
      { year: 2028, deduction: 176.00, total: 2000.00, remaining: 0.00 }
    ]
  },
  {
    name: 'Test 4: 5-year property with 40% bonus, $2000, Mar 1, 2026',
    asset: {
      id: 'test4',
      name: 'Test 4',
      purchase_date: '2026-03-01',
      cost_basis: 200000, // $2000 in cents
      depreciation_method: 'BONUS_40'
    },
    expected: [
      { year: 2026, deduction: 400.00, total: 400.00, remaining: 1600.00 },
      { year: 2027, deduction: 640.00, total: 1040.00, remaining: 960.00 },
      { year: 2028, deduction: 384.00, total: 1424.00, remaining: 576.00 },
      { year: 2029, deduction: 230.40, total: 1654.40, remaining: 345.60 },
      { year: 2030, deduction: 230.40, total: 1884.80, remaining: 115.20 },
      { year: 2031, deduction: 115.20, total: 2000.00, remaining: 0.00 }
    ]
  },
  {
    name: 'Test 5: Section 179, $5000, Jan 1, 2025',
    asset: {
      id: 'test5',
      name: 'Test 5',
      purchase_date: '2025-01-01',
      cost_basis: 500000, // $5000 in cents
      depreciation_method: 'SECTION_179'
    },
    expected: [
      { year: 2025, deduction: 5000.00, total: 5000.00, remaining: 0.00 },
      { year: 2026, deduction: 0.00, total: 5000.00, remaining: 0.00 },
      { year: 2027, deduction: 0.00, total: 5000.00, remaining: 0.00 },
      { year: 2028, deduction: 0.00, total: 5000.00, remaining: 0.00 }
    ]
  }
];

// Run tests
console.log('Running Depreciation Calculation Tests\n');
console.log('=====================================\n');

let allPassed = true;

testCases.forEach((testCase, testIndex) => {
  console.log(`\n${testCase.name}`);
  console.log('─'.repeat(60));

  let testPassed = true;

  testCase.expected.forEach((expected) => {
    const result = calculateDepreciationForYear(testCase.asset, expected.year);

    // Check if deduction matches (with small tolerance for rounding)
    const deductionDiff = Math.abs(result.depreciation_deduction - expected.deduction);
    const totalDiff = Math.abs(result.accumulated_depreciation - expected.total);
    const remainingDiff = Math.abs(result.remaining_basis - expected.remaining);

    const deductionOk = deductionDiff < 0.01;
    const totalOk = totalDiff < 0.01;
    const remainingOk = remainingDiff < 0.01;

    if (!deductionOk || !totalOk || !remainingOk) {
      testPassed = false;
      allPassed = false;

      console.log(`\n  Year ${expected.year}:`);
      if (!deductionOk) {
        console.log(`    ❌ Deduction: Expected ${expected.deduction.toFixed(2)}, Got ${result.depreciation_deduction.toFixed(2)} (diff: ${deductionDiff.toFixed(2)})`);
      } else {
        console.log(`    ✓ Deduction: ${result.depreciation_deduction.toFixed(2)}`);
      }

      if (!totalOk) {
        console.log(`    ❌ Total Accumulated: Expected ${expected.total.toFixed(2)}, Got ${result.accumulated_depreciation.toFixed(2)} (diff: ${totalDiff.toFixed(2)})`);
      } else {
        console.log(`    ✓ Total Accumulated: ${result.accumulated_depreciation.toFixed(2)}`);
      }

      if (!remainingOk) {
        console.log(`    ❌ Remaining Basis: Expected ${expected.remaining.toFixed(2)}, Got ${result.remaining_basis.toFixed(2)} (diff: ${remainingDiff.toFixed(2)})`);
      } else {
        console.log(`    ✓ Remaining Basis: ${result.remaining_basis.toFixed(2)}`);
      }
    } else {
      console.log(`  Year ${expected.year}: ✓ ${result.depreciation_deduction.toFixed(2)} (Total: ${result.accumulated_depreciation.toFixed(2)}, Remaining: ${result.remaining_basis.toFixed(2)})`);
    }
  });

  if (testPassed) {
    console.log(`\n  ✅ ${testCase.name} - ALL TESTS PASSED`);
  } else {
    console.log(`\n  ❌ ${testCase.name} - SOME TESTS FAILED`);
  }
});

console.log('\n');
console.log('=====================================');
if (allPassed) {
  console.log('✅ ALL TESTS PASSED - Depreciation calculations are correct!');
} else {
  console.log('❌ SOME TESTS FAILED - Please review the results above');
}
console.log('=====================================\n');
