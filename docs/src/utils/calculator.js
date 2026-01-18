/**
 * Tax Calculation Engine
 *
 * Implements the core tax calculation logic as specified in requirements.md section 4.3.
 * Calculates federal income tax liability using progressive tax brackets.
 */

import {
  getStandardDeduction,
  getTaxBrackets,
  FILING_STATUSES
} from '../data/taxConfig.js';

/**
 * @typedef {import('./types.js').TaxCalculationInputs} TaxCalculationInputs
 * @typedef {import('./types.js').Results} Results
 * @typedef {import('./types.js').TaxBracketResult} TaxBracketResult
 * @typedef {import('./types.js').W2Entry} W2Entry
 * @typedef {import('./types.js').PaystubEntry} PaystubEntry
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
  // If taxable income is 0 or negative, no tax is owed
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

  // Apply progressive taxation
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const { rate, min, max } = bracket;

    // Determine how much income falls in this bracket
    let incomeInBracket = 0;

    if (remainingIncome <= 0) {
      // No more income to tax
      break;
    }

    if (max === null) {
      // Top bracket - all remaining income
      incomeInBracket = remainingIncome;
    } else {
      // Calculate bracket width
      const bracketWidth = max - min;

      if (taxableIncome <= min) {
        // Income doesn't reach this bracket
        continue;
      } else if (taxableIncome >= max) {
        // Income exceeds this bracket - use full bracket width
        incomeInBracket = Math.min(bracketWidth, remainingIncome);
      } else {
        // Income falls within this bracket
        incomeInBracket = taxableIncome - min;
      }
    }

    // Calculate tax for this bracket
    const taxFromBracket = incomeInBracket * rate;
    totalTax += taxFromBracket;
    remainingIncome -= incomeInBracket;

    // Add to breakdown
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
    taxYear
  } = inputs;

  // Calculate taxable income (wages - standard deduction, minimum 0)
  const taxableIncome = Math.max(0, totalWages - standardDeduction);

  // Calculate tax liability
  const { liability, bracketBreakdown } = calculateTaxLiability(
    taxableIncome,
    taxYear,
    filingStatus
  );

  // Calculate net due/refund
  // Positive = amount due, Negative = refund
  const netDueRefund = liability - totalWithheld;

  const isRefund = netDueRefund < 0;
  const refundAmount = isRefund ? Math.abs(netDueRefund) : 0;
  const amountDue = !isRefund ? netDueRefund : 0;

  return {
    totalWages: roundToDollar(totalWages),
    totalWithheld: roundToDollar(totalWithheld),
    standardDeduction: roundToDollar(standardDeduction),
    taxableIncome: roundToDollar(taxableIncome),
    taxLiability: roundToDollar(liability),
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
 *
 * @param {Array<W2Entry>} w2Entries - Array of W-2 entries
 * @returns {{totalWages: number, totalWithheld: number}} Aggregated totals
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
 *
 * @param {Array<PaystubEntry>} paystubEntries - Array of paystub entries
 * @returns {{totalWages: number, totalWithheld: number}} Aggregated totals
 */
export function aggregatePaystubEntries(paystubEntries) {
  if (!paystubEntries || paystubEntries.length === 0) {
    return { totalWages: 0, totalWithheld: 0 };
  }

  // Group by employer label to detect multiple stubs from same employer
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

  // For each employer, use the latest paystub (highest YTD or most recent date)
  Object.values(byEmployer).forEach(stubs => {
    // Sort by pay date (most recent first), then by YTD wages (highest first)
    const sorted = stubs.sort((a, b) => {
      // Compare dates if available
      if (a.payDate && b.payDate) {
        const dateA = new Date(a.payDate);
        const dateB = new Date(b.payDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime(); // Most recent first
        }
      }

      // Compare YTD wages
      const wagesA = a.ytdTaxableWages || 0;
      const wagesB = b.ytdTaxableWages || 0;
      return wagesB - wagesA; // Highest first
    });

    // Use the first (latest/highest) stub
    const latestStub = sorted[0];

    // Prefer YTD values
    const wages = latestStub.ytdTaxableWages || latestStub.currentTaxableWages || 0;
    const withheld = latestStub.ytdFedWithheld || latestStub.currentFedWithheld || 0;

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
 *
 * @param {Array<W2Entry>} w2Entries - Array of W-2 entries
 * @param {Array<PaystubEntry>} paystubEntries - Array of paystub entries
 * @returns {{totalWages: number, totalWithheld: number}} Aggregated totals
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

/**
 * Project year-end totals based on paystub data and pay frequency
 *
 * @param {PaystubEntry} paystub - The paystub entry with current data
 * @param {number} paychecksRemaining - Number of paychecks remaining in year
 * @returns {{projectedWages: number, projectedWithheld: number}} Projected year-end totals
 */
export function projectYearEnd(paystub, paychecksRemaining) {
  // Use YTD values as base
  const ytdWages = paystub.ytdTaxableWages || 0;
  const ytdWithheld = paystub.ytdFedWithheld || 0;

  // Calculate per-paycheck averages
  const currentWages = paystub.currentTaxableWages || 0;
  const currentWithheld = paystub.currentFedWithheld || 0;

  // Project remaining amounts
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

/**
 * Round to nearest dollar (standard rounding convention for tax calculations)
 *
 * @param {number} amount - The amount to round
 * @returns {number} Rounded amount
 */
export function roundToDollar(amount) {
  return Math.round(amount);
}

/**
 * Format currency for display
 *
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for display
 *
 * @param {number} rate - The rate as decimal (e.g., 0.10 for 10%)
 * @returns {string} Formatted percentage string (e.g., "10%")
 */
export function formatPercentage(rate) {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Get the filing status display name
 *
 * @param {string} filingStatus - The filing status code
 * @returns {string} Display name
 */
export function getFilingStatusDisplayName(filingStatus) {
  switch (filingStatus) {
    case FILING_STATUSES.SINGLE:
      return 'Single';
    case FILING_STATUSES.MARRIED_FILING_JOINTLY:
      return 'Married Filing Jointly';
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
 * @returns {Results} Complete calculation results
 */
export function calculateFromSession({ taxYear, filingStatus, w2Entries, paystubEntries }) {
  // Aggregate all entries
  const { totalWages, totalWithheld } = aggregateAllEntries(w2Entries, paystubEntries);

  // Get standard deduction for this year and status
  const standardDeduction = getStandardDeduction(taxYear, filingStatus);

  // Build calculation inputs
  const inputs = {
    totalWages,
    totalWithheld,
    standardDeduction,
    filingStatus,
    taxYear
  };

  // Calculate and return results
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
  roundToDollar,
  formatCurrency,
  formatPercentage,
  getFilingStatusDisplayName
};
