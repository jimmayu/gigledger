// Comprehensive test script for depreciation calculation fixes
import { calculateDepreciationForYear } from './server/logic/depreciation.js';

// Test case data - focusing on standard MACRS calculations
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
    name: 'Test 3: 5-year MACRS, $1000, Jan 1, 2025 (half-year convention)',
    asset: {
      id: 'test3',
      name: 'Test 3',
      purchase_date: '2025-01-01',
      cost_basis: 100000, // $1000 in cents
      depreciation_method: 'ST_5YEAR'
    },
    expected: [
      { year: 2025, deduction: 200.00, total: 200.00, remaining: 800.00 },
      { year: 2026, deduction: 320.00, total: 520.00, remaining: 480.00 },
      { year: 2027, deduction: 192.00, total: 712.00, remaining: 288.00 },
      { year: 2028, deduction: 115.20, total: 827.20, remaining: 172.80 },
      { year: 2029, deduction: 115.20, total: 942.40, remaining: 57.60 },
      { year: 2030, deduction: 57.60, total: 1000.00, remaining: 0.00 }
    ]
  },
  {
    name: 'Test 4: 7-year MACRS, $2000, Mar 1, 2025 (half-year convention)',
    asset: {
      id: 'test4',
      name: 'Test 4',
      purchase_date: '2025-03-01',
      cost_basis: 200000, // $2000 in cents
      depreciation_method: 'ST_7YEAR'
    },
    expected: [
      { year: 2025, deduction: 285.80, total: 285.80, remaining: 1714.20 },
      { year: 2026, deduction: 489.80, total: 775.60, remaining: 1224.40 },
      { year: 2027, deduction: 349.80, total: 1125.40, remaining: 874.60 },
      { year: 2028, deduction: 249.80, total: 1375.20, remaining: 624.80 },
      { year: 2029, deduction: 178.60, total: 1553.80, remaining: 446.20 },
      { year: 2030, deduction: 178.40, total: 1732.20, remaining: 267.80 },
      { year: 2031, deduction: 178.60, total: 1910.80, remaining: 89.20 },
      { year: 2032, deduction: 89.20, total: 2000.00, remaining: 0.00 }
    ]
  },
  {
    name: 'Test 5: 5-year MACRS with 40% bonus, $2000, Mar 1, 2025',
    asset: {
      id: 'test5',
      name: 'Test 5',
      purchase_date: '2025-03-01',
      cost_basis: 200000, // $2000 in cents
      depreciation_method: 'BONUS_40'
    },
    expected: [
      { year: 2025, deduction: 800.00, total: 800.00, remaining: 1200.00 },
      { year: 2026, deduction: 640.00, total: 1440.00, remaining: 560.00 },
      { year: 2027, deduction: 384.00, total: 1824.00, remaining: 176.00 },
      { year: 2028, deduction: 176.00, total: 2000.00, remaining: 0.00 },
      { year: 2029, deduction: 0.00, total: 2000.00, remaining: 0.00 }
    ]
  }
];

// Run tests
console.log('Running Comprehensive Depreciation Calculation Tests\n');
console.log('===================================================\n');

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
console.log('===================================================');
if (allPassed) {
  console.log('✅ ALL TESTS PASSED - Depreciation calculations are correct!');
} else {
  console.log('❌ SOME TESTS FAILED - Please review the results above');
}
console.log('===================================================\n');
