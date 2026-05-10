// Sanity tests for taxConfig data and calculator. Run with: node docs/src/data/taxConfig.test.mjs
import {
  STANDARD_DEDUCTIONS,
  TAX_BRACKETS,
  FILING_STATUSES,
  getStandardDeduction,
  getTaxBrackets,
  getAdjustmentLimits,
  getCreditConfig
} from './taxConfig.js';
import {
  calculateTaxEstimate,
  aggregatePaystubEntries,
  calculateFromSession,
  normalizeAdjustments,
  calculateCredits
} from '../utils/calculator.js';

const SINGLE = FILING_STATUSES.SINGLE;
const MFJ = FILING_STATUSES.MARRIED_FILING_JOINTLY;
const HOH = FILING_STATUSES.HEAD_OF_HOUSEHOLD;
const MFS = FILING_STATUSES.MARRIED_FILING_SEPARATELY;

let failed = 0;
const eq = (name, actual, expected) => {
  const pass = actual === expected;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: got ${actual}, expected ${expected}`);
};

// --- Data-table assertions (IRS Rev. Proc. 2025-32 for 2026; Rev. Proc. 2024-40 + OBBBA for 2025) ---
eq('2026 std ded Single', STANDARD_DEDUCTIONS[2026][SINGLE], 16100);
eq('2026 std ded MFJ', STANDARD_DEDUCTIONS[2026][MFJ], 32200);
eq('2026 std ded HoH', STANDARD_DEDUCTIONS[2026][HOH], 24150);
eq('2026 std ded MFS', STANDARD_DEDUCTIONS[2026][MFS], 16100);
eq('2025 std ded Single', STANDARD_DEDUCTIONS[2025][SINGLE], 15750);
eq('2025 std ded MFJ', STANDARD_DEDUCTIONS[2025][MFJ], 31500);
eq('2025 std ded HoH', STANDARD_DEDUCTIONS[2025][HOH], 23625);
eq('2025 std ded MFS', STANDARD_DEDUCTIONS[2025][MFS], 15750);

eq('2026 Single top bracket min', TAX_BRACKETS[2026][SINGLE].at(-1).min, 640600);
eq('2026 MFJ top bracket min', TAX_BRACKETS[2026][MFJ].at(-1).min, 768700);
eq('2026 HoH top bracket min', TAX_BRACKETS[2026][HOH].at(-1).min, 640600);
eq('2026 MFS top bracket min', TAX_BRACKETS[2026][MFS].at(-1).min, 384350);
eq('2025 Single top bracket min', TAX_BRACKETS[2025][SINGLE].at(-1).min, 626350);
eq('2025 MFJ top bracket min', TAX_BRACKETS[2025][MFJ].at(-1).min, 751600);
eq('2025 HoH top bracket min', TAX_BRACKETS[2025][HOH].at(-1).min, 626350);
eq('2025 MFS top bracket min', TAX_BRACKETS[2025][MFS].at(-1).min, 375800);

// Bracket contiguity: each max equals the next min; top bracket max is null.
for (const year of [2025, 2026]) {
  for (const status of [SINGLE, MFJ, HOH, MFS]) {
    const bk = TAX_BRACKETS[year][status];
    let ok = bk[0].min === 0 && bk.at(-1).max === null;
    for (let i = 0; i < bk.length - 1; i++) if (bk[i].max !== bk[i + 1].min) ok = false;
    eq(`brackets contiguous ${year} ${status}`, ok, true);
  }
}

// --- End-to-end calculation checks (hand-computed) ---
const run = (year, status, wages, withheld = 0, extras = {}) =>
  calculateTaxEstimate({
    totalWages: wages,
    totalWithheld: withheld,
    standardDeduction: getStandardDeduction(year, status),
    filingStatus: status,
    taxYear: year,
    ...extras
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

// --- New filing status checks (HoH / MFS) ---
// 2025 HoH, $80,000 wages → taxable 80000 - 23625 = 56,375.
//   10% × 17,000 = 1,700; 12% × 47,850 ... wait, capped at 64,850-17,000=47,850.
//   But we only have 56,375 of taxable income.
//   10% × 17,000 = 1,700
//   12% × (56,375 - 17,000) = 12% × 39,375 = 4,725
//   Total = 6,425
eq('2025 HoH $80k liability', run(2025, HOH, 80000).taxLiability, 6425);

// 2026 MFS, $200,000 wages → taxable 200000 - 16100 = 183,900
//   10% × 12,400 = 1,240
//   12% × (50,400 - 12,400) = 12% × 38,000 = 4,560
//   22% × (105,700 - 50,400) = 22% × 55,300 = 12,166
//   24% × (183,900 - 105,700) = 24% × 78,200 = 18,768
//   Total = 36,734
eq('2026 MFS $200k liability', run(2026, MFS, 200000).taxLiability, 36734);

// --- Adjustments: wages should be reduced by capped adjustments before standard deduction ---
// 2026 Single, $100k wages with $7,000 IRA + $2,500 SLI = $9,500 adjustments
// AGI 90,500; taxable 90,500 - 16,100 = 74,400
// 10% × 12,400 = 1,240; 12% × 38,000 = 4,560; 22% × (74,400 - 50,400) = 22% × 24,000 = 5,280
// Total = 11,080
const adjResult = run(2026, SINGLE, 100000, 0, {
  adjustments: { iraDeduction: 7000, studentLoanInterest: 2500 }
});
eq('adjustments: total adjustments', adjResult.adjustments.total, 9500);
eq('adjustments: AGI', adjResult.adjustedGrossIncome, 90500);
eq('adjustments: taxable income', adjResult.taxableIncome, 74400);
eq('adjustments: tax liability', adjResult.taxLiability, 11080);

// Over-cap adjustment is clamped to the year's limit (2026 SLI cap = $2,500).
const overCap = normalizeAdjustments({ studentLoanInterest: 999999 }, 2026);
eq('overcap clamp: studentLoanInterest', overCap.studentLoanInterest, 2500);
eq('overcap clamp: total only includes capped value', overCap.total, 2500);

// Negative / NaN values clamp to zero
const neg = normalizeAdjustments({ iraDeduction: -100, hsaDeduction: 'oops' }, 2026);
eq('clamp negative ira to 0', neg.iraDeduction, 0);
eq('clamp NaN hsa to 0', neg.hsaDeduction, 0);

// --- Credits: CTC + ODC reduce tax non-refundably ---
// 2026 Single, $100k wages, 2 qualifying children, 0 other
// liability $13,170, CTC = $4,400, no phase-out (income under $200k)
// tax after credits = 13,170 - 4,400 = 8,770
const creditResult = run(2026, SINGLE, 100000, 0, {
  credits: { qualifyingChildren: 2 }
});
eq('credit: total credit', creditResult.credits.totalCredit, 4400);
eq('credit: applied credit', creditResult.credits.appliedCredit, 4400);
eq('credit: tax after credits', creditResult.taxAfterCredits, 8770);
eq('credit: phaseout reduction', creditResult.credits.phaseoutReduction, 0);

// Credit cannot exceed tax liability (non-refundable)
// 2026 MFJ, $30,000 wages → taxable income below deduction → liability $0
// 3 qualifying children → CTC theoretical $6,600, but applied is $0.
const lowIncomeWithKids = run(2026, MFJ, 30000, 0, {
  credits: { qualifyingChildren: 3 }
});
eq('credit non-refundable: liability 0', lowIncomeWithKids.taxLiability, 0);
eq('credit non-refundable: applied 0', lowIncomeWithKids.credits.appliedCredit, 0);
eq('credit non-refundable: tax after credits 0', lowIncomeWithKids.taxAfterCredits, 0);

// Phase-out: 2026 Single AGI = $250k, 2 children → gross CTC $4,400
// Phase-out applies $50/$1,000 above $200k = $50 × 50 = $2,500.
const phaseOut = calculateCredits({ qualifyingChildren: 2 }, 250000, 2026, SINGLE);
eq('phaseout: reduction', phaseOut.phaseoutReduction, 2500);
eq('phaseout: total credit after reduction', phaseOut.totalCredit, 1900);

// Phase-out can fully zero the credit when AGI is far enough above the threshold.
const phasedOutEntirely = calculateCredits({ qualifyingChildren: 1 }, 250000, 2026, SINGLE);
eq('phaseout fully eliminates 1-child CTC', phasedOutEntirely.totalCredit, 0);

// Adjustment caps loaded from config
const limits2026 = getAdjustmentLimits(2026);
eq('adjustment limit 2026 IRA', limits2026.iraDeduction, 7500);
eq('adjustment limit 2026 student loan', limits2026.studentLoanInterest, 2500);

// Credit config thresholds
const cfg = getCreditConfig(2026);
eq('credit config CTC/child 2026', cfg.ctcPerChild, 2200);
eq('credit config phase-out threshold MFJ', cfg.phaseoutThreshold[MFJ], 400000);

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

// End-to-end with adjustments and credits via calculateFromSession
// 2026 MFJ, two W-2s totaling $200k, 1 child, $7,500 IRA
// AGI 192,500; taxable 192,500 - 32,200 = 160,300
// 10% × 24,800 = 2,480; 12% × (100,800-24,800)=12% × 76,000 = 9,120
// 22% × (160,300-100,800)=22% × 59,500 = 13,090; Total = 24,690
// CTC 2,200 (no phase-out for MFJ at $400k), applied 2,200; tax after credits = 22,490
const e2e = calculateFromSession({
  taxYear: 2026,
  filingStatus: MFJ,
  w2Entries: [
    { box1Wages: 120000, box2Withheld: 18000 },
    { box1Wages: 80000, box2Withheld: 9000 }
  ],
  paystubEntries: [],
  adjustments: { iraDeduction: 7500 },
  credits: { qualifyingChildren: 1 }
});
eq('e2e: total wages', e2e.totalWages, 200000);
eq('e2e: adjustments total', e2e.adjustments.total, 7500);
eq('e2e: AGI', e2e.adjustedGrossIncome, 192500);
eq('e2e: taxable', e2e.taxableIncome, 160300);
eq('e2e: liability', e2e.taxLiability, 24690);
eq('e2e: applied credit', e2e.credits.appliedCredit, 2200);
eq('e2e: tax after credits', e2e.taxAfterCredits, 22490);
// withheld 27,000 → refund 4,510
eq('e2e: isRefund', e2e.isRefund, true);
eq('e2e: refundAmount', e2e.refundAmount, 4510);

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
