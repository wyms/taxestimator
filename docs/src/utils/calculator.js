/**
 * Tax Calculation Engine
 *
 * Implements the core tax calculation logic. Calculates federal income tax
 * liability using progressive tax brackets, applies above-the-line
 * adjustments to wages, and reduces liability by non-refundable credits
 * (Child Tax Credit and Credit for Other Dependents).
 */

import {
  getStandardDeduction,
  getTaxBrackets,
  getAdjustmentLimits,
  getCreditConfig,
  FILING_STATUSES
} from '../data/taxConfig.js';

/**
 * @typedef {import('./types.js').TaxCalculationInputs} TaxCalculationInputs
 * @typedef {import('./types.js').Results} Results
 * @typedef {import('./types.js').TaxBracketResult} TaxBracketResult
 * @typedef {import('./types.js').W2Entry} W2Entry
 * @typedef {import('./types.js').PaystubEntry} PaystubEntry
 * @typedef {import('./types.js').Adjustments} Adjustments
 * @typedef {import('./types.js').Credits} Credits
 */

// =============================================================================
// Core Calculation Functions
// =============================================================================

/**
 * Calculate federal income tax liability using progressive tax brackets
 *
 * @param {number} taxableIncome - The taxable income (after deductions)
 * @param {number} taxYear - The tax year
 * @param {string} filingStatus - The filing status
 * @returns {{liability: number, bracketBreakdown: Array<TaxBracketResult>}} Tax liability and breakdown
 */
export function calculateTaxLiability(taxableIncome, taxYear, filingStatus) {
  if (taxableIncome <= 0) {
    return {
      liability: 0,
      bracketBreakdown: []
    };
  }

  const brackets = getTaxBrackets(taxYear, filingStatus);
  const bracketBreakdown = [];
  let totalTax = 0;
  let remainingIncome = taxableIncome;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const { rate, min, max } = bracket;

    let incomeInBracket = 0;

    if (remainingIncome <= 0) {
      break;
    }

    if (max === null) {
      incomeInBracket = remainingIncome;
    } else {
      const bracketWidth = max - min;

      if (taxableIncome <= min) {
        continue;
      } else if (taxableIncome >= max) {
        incomeInBracket = Math.min(bracketWidth, remainingIncome);
      } else {
        incomeInBracket = taxableIncome - min;
      }
    }

    const taxFromBracket = incomeInBracket * rate;
    totalTax += taxFromBracket;
    remainingIncome -= incomeInBracket;

    bracketBreakdown.push({
      rate,
      min,
      max,
      incomeInBracket: roundToDollar(incomeInBracket),
      taxFromBracket: roundToDollar(taxFromBracket)
    });
  }

  return {
    liability: roundToDollar(totalTax),
    bracketBreakdown
  };
}

/**
 * Clamp a user-entered adjustment to a non-negative number capped at `max`.
 * Returns 0 for non-finite/NaN/negative input.
 */
function clampAdjustment(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
}

/**
 * Normalize raw user adjustments into a clean record bounded by the per-year caps.
 *
 * @param {Adjustments|undefined} adjustments
 * @param {number} taxYear
 * @returns {{iraDeduction: number, hsaDeduction: number, studentLoanInterest: number, total: number}}
 */
export function normalizeAdjustments(adjustments, taxYear) {
  const limits = getAdjustmentLimits(taxYear);
  const ira = clampAdjustment(adjustments?.iraDeduction, limits.iraDeduction);
  const hsa = clampAdjustment(adjustments?.hsaDeduction, limits.hsaDeduction);
  const studentLoan = clampAdjustment(adjustments?.studentLoanInterest, limits.studentLoanInterest);
  return {
    iraDeduction: roundToDollar(ira),
    hsaDeduction: roundToDollar(hsa),
    studentLoanInterest: roundToDollar(studentLoan),
    total: roundToDollar(ira + hsa + studentLoan)
  };
}

/**
 * Compute the total non-refundable credit available before being capped at tax
 * liability. Applies the standard $50-per-$1,000 phase-out above the filing-status
 * threshold to the combined CTC + ODC amount.
 *
 * @param {Credits|undefined} credits
 * @param {number} agi - Adjusted gross income for phase-out (we use wages-after-adjustments)
 * @param {number} taxYear
 * @param {string} filingStatus
 * @returns {{ctcGross: number, odcGross: number, phaseoutReduction: number, totalCredit: number}}
 */
export function calculateCredits(credits, agi, taxYear, filingStatus) {
  const cfg = getCreditConfig(taxYear);
  const qualifyingChildren = Math.max(0, Math.floor(Number(credits?.qualifyingChildren) || 0));
  const otherDependents = Math.max(0, Math.floor(Number(credits?.otherDependents) || 0));

  const ctcGross = qualifyingChildren * cfg.ctcPerChild;
  const odcGross = otherDependents * cfg.odcPerDependent;
  const beforePhaseout = ctcGross + odcGross;

  if (beforePhaseout === 0) {
    return { ctcGross: 0, odcGross: 0, phaseoutReduction: 0, totalCredit: 0 };
  }

  const threshold = cfg.phaseoutThreshold[filingStatus] ?? cfg.phaseoutThreshold[FILING_STATUSES.SINGLE];
  let phaseoutReduction = 0;
  if (agi > threshold) {
    const thousandsOver = Math.ceil((agi - threshold) / 1000);
    phaseoutReduction = Math.min(beforePhaseout, thousandsOver * cfg.phaseoutPerThousand);
  }

  return {
    ctcGross: roundToDollar(ctcGross),
    odcGross: roundToDollar(odcGross),
    phaseoutReduction: roundToDollar(phaseoutReduction),
    totalCredit: roundToDollar(beforePhaseout - phaseoutReduction)
  };
}

/**
 * Calculate complete tax estimate
 *
 * @param {TaxCalculationInputs} inputs - Calculation inputs
 * @returns {Results} Complete calculation results
 */
export function calculateTaxEstimate(inputs) {
  const {
    totalWages,
    totalWithheld,
    standardDeduction,
    filingStatus,
    taxYear,
    adjustments,
    credits
  } = inputs;

  const normalizedAdjustments = normalizeAdjustments(adjustments, taxYear);
  const adjustedGrossIncome = Math.max(0, totalWages - normalizedAdjustments.total);
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

  const { liability, bracketBreakdown } = calculateTaxLiability(
    taxableIncome,
    taxYear,
    filingStatus
  );

  const creditResult = calculateCredits(credits, adjustedGrossIncome, taxYear, filingStatus);
  // Non-refundable: credits cannot reduce liability below zero.
  const appliedCredits = Math.min(liability, creditResult.totalCredit);
  const taxAfterCredits = Math.max(0, liability - appliedCredits);

  // Positive = amount due, Negative = refund
  const netDueRefund = taxAfterCredits - totalWithheld;

  const isRefund = netDueRefund < 0;
  const refundAmount = isRefund ? Math.abs(netDueRefund) : 0;
  const amountDue = !isRefund ? netDueRefund : 0;

  return {
    totalWages: roundToDollar(totalWages),
    totalWithheld: roundToDollar(totalWithheld),
    standardDeduction: roundToDollar(standardDeduction),
    adjustments: normalizedAdjustments,
    adjustedGrossIncome: roundToDollar(adjustedGrossIncome),
    taxableIncome: roundToDollar(taxableIncome),
    taxLiability: roundToDollar(liability),
    credits: {
      qualifyingChildren: Math.max(0, Math.floor(Number(credits?.qualifyingChildren) || 0)),
      otherDependents: Math.max(0, Math.floor(Number(credits?.otherDependents) || 0)),
      ctcGross: creditResult.ctcGross,
      odcGross: creditResult.odcGross,
      phaseoutReduction: creditResult.phaseoutReduction,
      totalCredit: creditResult.totalCredit,
      appliedCredit: roundToDollar(appliedCredits)
    },
    taxAfterCredits: roundToDollar(taxAfterCredits),
    netDueRefund: roundToDollar(netDueRefund),
    isRefund,
    refundAmount: roundToDollar(refundAmount),
    amountDue: roundToDollar(amountDue),
    bracketBreakdown,
    calculatedAt: new Date()
  };
}

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * Aggregate W-2 entries into total wages and withholding
 */
export function aggregateW2Entries(w2Entries) {
  if (!w2Entries || w2Entries.length === 0) {
    return { totalWages: 0, totalWithheld: 0 };
  }

  const totalWages = w2Entries.reduce((sum, entry) => {
    return sum + (entry.box1Wages || 0);
  }, 0);

  const totalWithheld = w2Entries.reduce((sum, entry) => {
    return sum + (entry.box2Withheld || 0);
  }, 0);

  return {
    totalWages: roundToDollar(totalWages),
    totalWithheld: roundToDollar(totalWithheld)
  };
}

/**
 * Aggregate paystub entries into total wages and withholding
 *
 * For multiple paystubs from the same employer, uses the latest YTD value.
 * For paystubs from different employers, sums all values.
 */
export function aggregatePaystubEntries(paystubEntries) {
  if (!paystubEntries || paystubEntries.length === 0) {
    return { totalWages: 0, totalWithheld: 0 };
  }

  const byEmployer = {};

  paystubEntries.forEach(entry => {
    const label = (entry.label || 'Unlabeled').trim().toLowerCase();

    if (!byEmployer[label]) {
      byEmployer[label] = [];
    }

    byEmployer[label].push(entry);
  });

  let totalWages = 0;
  let totalWithheld = 0;

  Object.values(byEmployer).forEach(stubs => {
    const sorted = stubs.sort((a, b) => {
      if (a.payDate && b.payDate) {
        const dateA = new Date(a.payDate);
        const dateB = new Date(b.payDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
      }

      const wagesA = a.ytdTaxableWages || 0;
      const wagesB = b.ytdTaxableWages || 0;
      return wagesB - wagesA;
    });

    const latestStub = sorted[0];

    const ytdWages = latestStub.ytdTaxableWages || latestStub.currentTaxableWages || 0;
    const ytdWithheld = latestStub.ytdFedWithheld || latestStub.currentFedWithheld || 0;

    const received = latestStub.paychecksReceived || 0;
    const remaining = latestStub.paychecksRemaining || 0;
    let wages = ytdWages;
    let withheld = ytdWithheld;
    if (received > 0 && remaining > 0) {
      const multiplier = (received + remaining) / received;
      wages = ytdWages * multiplier;
      withheld = ytdWithheld * multiplier;
    }

    totalWages += wages;
    totalWithheld += withheld;
  });

  return {
    totalWages: roundToDollar(totalWages),
    totalWithheld: roundToDollar(totalWithheld)
  };
}

/**
 * Aggregate all entries (both W-2 and paystub) into totals
 */
export function aggregateAllEntries(w2Entries, paystubEntries) {
  const w2Totals = aggregateW2Entries(w2Entries);
  const paystubTotals = aggregatePaystubEntries(paystubEntries);

  return {
    totalWages: roundToDollar(w2Totals.totalWages + paystubTotals.totalWages),
    totalWithheld: roundToDollar(w2Totals.totalWithheld + paystubTotals.totalWithheld)
  };
}

// =============================================================================
// Year-End Projection (for paystubs)
// =============================================================================

export function projectYearEnd(paystub, paychecksRemaining) {
  const ytdWages = paystub.ytdTaxableWages || 0;
  const ytdWithheld = paystub.ytdFedWithheld || 0;

  const currentWages = paystub.currentTaxableWages || 0;
  const currentWithheld = paystub.currentFedWithheld || 0;

  const projectedAdditionalWages = currentWages * paychecksRemaining;
  const projectedAdditionalWithheld = currentWithheld * paychecksRemaining;

  return {
    projectedWages: roundToDollar(ytdWages + projectedAdditionalWages),
    projectedWithheld: roundToDollar(ytdWithheld + projectedAdditionalWithheld)
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function roundToDollar(amount) {
  return Math.round(amount);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercentage(rate) {
  return `${(rate * 100).toFixed(0)}%`;
}

export function getFilingStatusDisplayName(filingStatus) {
  switch (filingStatus) {
    case FILING_STATUSES.SINGLE:
      return 'Single';
    case FILING_STATUSES.MARRIED_FILING_JOINTLY:
      return 'Married Filing Jointly';
    case FILING_STATUSES.HEAD_OF_HOUSEHOLD:
      return 'Head of Household';
    case FILING_STATUSES.MARRIED_FILING_SEPARATELY:
      return 'Married Filing Separately';
    default:
      return filingStatus;
  }
}

// =============================================================================
// Complete Calculation Workflow
// =============================================================================

/**
 * Calculate tax estimate from session data
 * This is the main entry point for calculations
 *
 * @param {Object} params - Calculation parameters
 * @param {number} params.taxYear - Tax year
 * @param {string} params.filingStatus - Filing status
 * @param {Array<W2Entry>} params.w2Entries - W-2 entries
 * @param {Array<PaystubEntry>} params.paystubEntries - Paystub entries
 * @param {Adjustments} [params.adjustments] - Optional above-the-line adjustments
 * @param {Credits} [params.credits] - Optional dependent counts for CTC/ODC
 * @returns {Results} Complete calculation results
 */
export function calculateFromSession({ taxYear, filingStatus, w2Entries, paystubEntries, adjustments, credits }) {
  const { totalWages, totalWithheld } = aggregateAllEntries(w2Entries, paystubEntries);

  const standardDeduction = getStandardDeduction(taxYear, filingStatus);

  const inputs = {
    totalWages,
    totalWithheld,
    standardDeduction,
    filingStatus,
    taxYear,
    adjustments,
    credits
  };

  return calculateTaxEstimate(inputs);
}

// =============================================================================
// Exports
// =============================================================================

export default {
  calculateTaxLiability,
  calculateTaxEstimate,
  aggregateW2Entries,
  aggregatePaystubEntries,
  aggregateAllEntries,
  projectYearEnd,
  calculateFromSession,
  normalizeAdjustments,
  calculateCredits,
  roundToDollar,
  formatCurrency,
  formatPercentage,
  getFilingStatusDisplayName
};
