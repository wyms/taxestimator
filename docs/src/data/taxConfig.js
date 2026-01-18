/**
 * Tax Configuration Data
 *
 * Contains tax brackets, standard deductions, and feature scope definitions
 * for the Tax Estimator application (v1).
 *
 * Data sources:
 * - IRS Publication 17 (for standard deductions and tax brackets)
 * - requirements.md (for feature scope)
 */

/**
 * Supported filing statuses
 */
export const FILING_STATUSES = {
  SINGLE: 'single',
  MARRIED_FILING_JOINTLY: 'married_filing_jointly'
};

/**
 * Supported tax years
 */
export const SUPPORTED_TAX_YEARS = [2025, 2026];

/**
 * Standard deduction amounts by tax year and filing status
 * @type {Object.<number, Object.<string, number>>}
 */
export const STANDARD_DEDUCTIONS = {
  2025: {
    [FILING_STATUSES.SINGLE]: 15000,
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: 30000
  },
  2026: {
    // TODO: Update with actual 2026 values when published by IRS
    // Using projected values based on inflation adjustments
    [FILING_STATUSES.SINGLE]: 15400,
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: 30800
  }
};

/**
 * Federal income tax brackets by tax year and filing status
 * Each bracket includes: rate (decimal), min (inclusive), max (exclusive for non-final brackets, null for final)
 *
 * @type {Object.<number, Object.<string, Array<{rate: number, min: number, max: number|null}>>>}
 */
export const TAX_BRACKETS = {
  2025: {
    [FILING_STATUSES.SINGLE]: [
      { rate: 0.10, min: 0, max: 11600 },
      { rate: 0.12, min: 11600, max: 47150 },
      { rate: 0.22, min: 47150, max: 100525 },
      { rate: 0.24, min: 100525, max: 191950 },
      { rate: 0.32, min: 191950, max: 243725 },
      { rate: 0.35, min: 243725, max: 609350 },
      { rate: 0.37, min: 609350, max: null }
    ],
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: [
      { rate: 0.10, min: 0, max: 23200 },
      { rate: 0.12, min: 23200, max: 94300 },
      { rate: 0.22, min: 94300, max: 201050 },
      { rate: 0.24, min: 201050, max: 383900 },
      { rate: 0.32, min: 383900, max: 487450 },
      { rate: 0.35, min: 487450, max: 731200 },
      { rate: 0.37, min: 731200, max: null }
    ]
  },
  2026: {
    // TODO: Update with actual 2026 brackets when published by IRS
    // Using projected values based on inflation adjustments (~2.5%)
    [FILING_STATUSES.SINGLE]: [
      { rate: 0.10, min: 0, max: 11900 },
      { rate: 0.12, min: 11900, max: 48350 },
      { rate: 0.22, min: 48350, max: 103050 },
      { rate: 0.24, min: 103050, max: 196750 },
      { rate: 0.32, min: 196750, max: 249825 },
      { rate: 0.35, min: 249825, max: 624600 },
      { rate: 0.37, min: 624600, max: null }
    ],
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: [
      { rate: 0.10, min: 0, max: 23800 },
      { rate: 0.12, min: 23800, max: 96700 },
      { rate: 0.22, min: 96700, max: 206100 },
      { rate: 0.24, min: 206100, max: 393500 },
      { rate: 0.32, min: 393500, max: 499650 },
      { rate: 0.35, min: 499650, max: 749500 },
      { rate: 0.37, min: 749500, max: null }
    ]
  }
};

/**
 * Features that are IN SCOPE for v1
 */
export const IN_SCOPE_FEATURES = [
  'Single filing status',
  'Married Filing Jointly (MFJ) status',
  'Standard deduction only (no itemization)',
  'Federal income tax estimation for selected tax year',
  'Multiple W-2 inputs (aggregate wages/withholding)',
  'Multiple paystub inputs (aggregate wages/withholding; YTD support)',
  'Estimated tax due/refund calculation',
  'Simple results explanation showing computation steps',
  'Save/export summary (PDF download and/or shareable link)',
  'No account creation required'
];

/**
 * Features that are OUT OF SCOPE for v1
 * Used to provide clear messaging when users attempt to access unavailable features
 */
export const OUT_OF_SCOPE_FEATURES = [
  'Head of Household filing status',
  'Married Filing Separately status',
  'Qualifying Widow(er) status',
  'Itemized deductions',
  'Dependent exemptions',
  'Child Tax Credit',
  'Earned Income Tax Credit (EITC)',
  'Alternative Minimum Tax (AMT)',
  'Net Investment Income Tax (NIIT)',
  'Self-employment income and SE tax',
  'Schedule K-1 income',
  'Capital gains and losses',
  'IRA deductions',
  'HSA deductions',
  'Student loan interest deduction',
  'State and local income tax calculations',
  'Full Form 1040 coverage',
  'Audit defense or accuracy guarantees'
];

/**
 * Input modes supported by the estimator
 */
export const INPUT_MODES = {
  W2_ONLY: 'w2_only',
  PAYSTUB_ONLY: 'paystub_only',
  MIXED: 'mixed'
};

/**
 * Pay frequencies for paystub entries
 */
export const PAY_FREQUENCIES = {
  WEEKLY: { key: 'weekly', periodsPerYear: 52, label: 'Weekly' },
  BIWEEKLY: { key: 'biweekly', periodsPerYear: 26, label: 'Bi-weekly (every 2 weeks)' },
  SEMIMONTHLY: { key: 'semimonthly', periodsPerYear: 24, label: 'Semi-monthly (twice a month)' },
  MONTHLY: { key: 'monthly', periodsPerYear: 12, label: 'Monthly' }
};

/**
 * Application metadata and disclaimers
 */
export const APP_CONFIG = {
  version: '1.0.0',
  name: 'Tax Estimator',
  disclaimer: 'This is an informational estimate only, not tax advice. Results are based on the Standard Deduction and basic federal tax calculations. For complete tax preparation, consult a tax professional or use official IRS resources.',
  warrantyDisclaimer: 'This tool does not guarantee accuracy and should not be used as a substitute for professional tax advice.',
  assumptions: [
    'Uses Standard Deduction (no itemization)',
    'Federal income tax only (no state/local)',
    'Single or Married Filing Jointly status only',
    'Does not include tax credits or complex adjustments'
  ]
};

/**
 * Helper function to get standard deduction for a given year and filing status
 * @param {number} taxYear - The tax year (e.g., 2025, 2026)
 * @param {string} filingStatus - The filing status (use FILING_STATUSES constants)
 * @returns {number} The standard deduction amount
 * @throws {Error} If tax year or filing status is not supported
 */
export function getStandardDeduction(taxYear, filingStatus) {
  if (!STANDARD_DEDUCTIONS[taxYear]) {
    throw new Error(`Tax year ${taxYear} is not supported. Supported years: ${SUPPORTED_TAX_YEARS.join(', ')}`);
  }

  if (!STANDARD_DEDUCTIONS[taxYear][filingStatus]) {
    throw new Error(`Filing status '${filingStatus}' is not supported for ${taxYear}`);
  }

  return STANDARD_DEDUCTIONS[taxYear][filingStatus];
}

/**
 * Helper function to get tax brackets for a given year and filing status
 * @param {number} taxYear - The tax year (e.g., 2025, 2026)
 * @param {string} filingStatus - The filing status (use FILING_STATUSES constants)
 * @returns {Array<{rate: number, min: number, max: number|null}>} Array of tax brackets
 * @throws {Error} If tax year or filing status is not supported
 */
export function getTaxBrackets(taxYear, filingStatus) {
  if (!TAX_BRACKETS[taxYear]) {
    throw new Error(`Tax year ${taxYear} is not supported. Supported years: ${SUPPORTED_TAX_YEARS.join(', ')}`);
  }

  if (!TAX_BRACKETS[taxYear][filingStatus]) {
    throw new Error(`Filing status '${filingStatus}' is not supported for ${taxYear}`);
  }

  return TAX_BRACKETS[taxYear][filingStatus];
}

/**
 * Helper function to check if a tax year is supported
 * @param {number} taxYear - The tax year to check
 * @returns {boolean} True if supported, false otherwise
 */
export function isSupportedTaxYear(taxYear) {
  return SUPPORTED_TAX_YEARS.includes(taxYear);
}

/**
 * Helper function to check if a filing status is supported
 * @param {string} filingStatus - The filing status to check
 * @returns {boolean} True if supported, false otherwise
 */
export function isSupportedFilingStatus(filingStatus) {
  return Object.values(FILING_STATUSES).includes(filingStatus);
}

// Export default object with all configuration
export default {
  FILING_STATUSES,
  SUPPORTED_TAX_YEARS,
  STANDARD_DEDUCTIONS,
  TAX_BRACKETS,
  IN_SCOPE_FEATURES,
  OUT_OF_SCOPE_FEATURES,
  INPUT_MODES,
  PAY_FREQUENCIES,
  APP_CONFIG,
  getStandardDeduction,
  getTaxBrackets,
  isSupportedTaxYear,
  isSupportedFilingStatus
};
