// Sanity tests for taxConfig data and calculator. Run with: node docs/src/data/taxConfig.test.mjs
import { STANDARD_DEDUCTIONS, TAX_BRACKETS, FILING_STATUSES, getStandardDeduction, getTaxBrackets } from './taxConfig.js';
import { calculateTaxEstimate, aggregatePaystubEntries, calculateFromSession } from '../utils/calculator.js';

const SINGLE = FILING_STATUSES.SINGLE;
const MFJ = FILING_STATUSES.MARRIED_FILING_JOINTLY;

let failed = 0;
const eq = (name, actual, expected) => {
  const pass = actual === expected;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: got ${actual}, expected ${expected}`);
};

// --- Data-table assertions (IRS Rev. Proc. 2025-32 for 2026; Rev. Proc. 2024-40 + OBBBA for 2025) ---
eq('2026 std ded Single', STANDARD_DEDUCTIONS[2026][SINGLE], 16100);
eq('2026 std ded MFJ', STANDARD_DEDUCTIONS[2026][MFJ], 32200);
eq('2025 std ded Single', STANDARD_DEDUCTIONS[2025][SINGLE], 15750);
eq('2025 std ded MFJ', STANDARD_DEDUCTIONS[2025][MFJ], 31500);

eq('2026 Single top bracket min', TAX_BRACKETS[2026][SINGLE].at(-1).min, 640600);
eq('2026 MFJ top bracket min', TAX_BRACKETS[2026][MFJ].at(-1).min, 768700);
eq('2025 Single top bracket min', TAX_BRACKETS[2025][SINGLE].at(-1).min, 626350);
eq('2025 MFJ top bracket min', TAX_BRACKETS[2025][MFJ].at(-1).min, 751600);

// Bracket contiguity: each max equals the next min; top bracket max is null.
for (const year of [2025, 2026]) {
  for (const status of [SINGLE, MFJ]) {
    const bk = TAX_BRACKETS[year][status];
    let ok = bk[0].min === 0 && bk.at(-1).max === null;
    for (let i = 0; i < bk.length - 1; i++) if (bk[i].max !== bk[i + 1].min) ok = false;
    eq(`brackets contiguous ${year} ${status}`, ok, true);
  }
}

// --- End-to-end calculation checks (hand-computed) ---
const run = (year, status, wages, withheld = 0) =>
  calculateTaxEstimate({
    totalWages: wages,
    totalWithheld: withheld,
    standardDeduction: getStandardDeduction(year, status),
    filingStatus: status,
    taxYear: year
  });

// 2026 Single, $100k wages → taxable $83,900 → $1,240 + $4,560 + $7,370 = $13,170
eq('2026 Single $100k liability', run(2026, SINGLE, 100000).taxLiability, 13170);

// 2026 MFJ, $200k wages → taxable $167,800 → $2,480 + $9,120 + $14,740 = $26,340
eq('2026 MFJ $200k liability', run(2026, MFJ, 200000).taxLiability, 26340);

// 2025 Single, $60k wages → taxable $44,250 → $1,192.50 + $3,879 = $5,071.50 → $5,072
eq('2025 Single $60k liability', run(2025, SINGLE, 60000).taxLiability, 5072);

// 2025 MFJ, $150k wages → taxable $118,500 → $2,385 + $8,772 + $4,741 = $15,898
eq('2025 MFJ $150k liability', run(2025, MFJ, 150000).taxLiability, 15898);

// 2026 Single, $1M wages → taxable $983,900 → sum = $320,000.25 → $320,000
eq('2026 Single $1M liability', run(2026, SINGLE, 1000000).taxLiability, 320000);

// Zero / negative income → zero liability
eq('2026 Single $0 liability', run(2026, SINGLE, 0).taxLiability, 0);
eq('2026 MFJ below-deduction liability', run(2026, MFJ, 20000).taxLiability, 0);

// Refund path: 2026 Single, $80k wages, $15k withheld
// taxable $63,900 → $1,240 + $4,560 + (63900-50400)*0.22 = $1,240 + $4,560 + $2,970 = $8,770
// net = 8770 - 15000 = -6230 → refund $6,230
const refundCase = run(2026, SINGLE, 80000, 15000);
eq('2026 Single $80k liability', refundCase.taxLiability, 8770);
eq('2026 Single $80k isRefund', refundCase.isRefund, true);
eq('2026 Single $80k refundAmount', refundCase.refundAmount, 6230);

// --- Paystub year-end projection (paychecksReceived + paychecksRemaining) ---
const agg = (entries) => aggregatePaystubEntries(entries);

// No projection when both counts missing → totals equal YTD.
const noCounts = agg([{ label: 'A', ytdTaxableWages: 50000, ytdFedWithheld: 6000 }]);
eq('no projection (missing counts): wages', noCounts.totalWages, 50000);
eq('no projection (missing counts): withheld', noCounts.totalWithheld, 6000);

// No projection when paychecksRemaining is 0.
const zeroRemaining = agg([{ label: 'A', ytdTaxableWages: 50000, ytdFedWithheld: 6000, paychecksReceived: 20, paychecksRemaining: 0 }]);
eq('no projection (remaining=0): wages', zeroRemaining.totalWages, 50000);
eq('no projection (remaining=0): withheld', zeroRemaining.totalWithheld, 6000);

// Projection: 20 received + 6 remaining on $50,000/$6,000 → ×26/20 = $65,000/$7,800
const projected = agg([{ label: 'A', ytdTaxableWages: 50000, ytdFedWithheld: 6000, paychecksReceived: 20, paychecksRemaining: 6 }]);
eq('projected wages (26/20 multiplier)', projected.totalWages, 65000);
eq('projected withheld (26/20 multiplier)', projected.totalWithheld, 7800);

// End-to-end: 2026 Single, YTD $30k/$3k, 12 received + 14 remaining
// multiplier 26/12 → projected $65,000 wages, $6,500 withheld
// taxable 65000 - 16100 = 48900 → 10%*12400 + 12%*36500 = 1240 + 4380 = 5620
// net = 5620 - 6500 = -880 → refund $880
const projEndToEnd = calculateFromSession({
  taxYear: 2026,
  filingStatus: SINGLE,
  w2Entries: [],
  paystubEntries: [{ label: 'A', ytdTaxableWages: 30000, ytdFedWithheld: 3000, paychecksReceived: 12, paychecksRemaining: 14 }]
});
eq('projected flow: totalWages', projEndToEnd.totalWages, 65000);
eq('projected flow: totalWithheld', projEndToEnd.totalWithheld, 6500);
eq('projected flow: taxLiability', projEndToEnd.taxLiability, 5620);
eq('projected flow: isRefund', projEndToEnd.isRefund, true);
eq('projected flow: refundAmount', projEndToEnd.refundAmount, 880);

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
