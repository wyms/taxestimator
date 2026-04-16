/**
 * Tax Configuration Data
 *
 * Contains tax brackets, standard deductions, and feature scope definitions
 * for the Tax Estimator application (v1).
 *
 * Data sources:
 * - 2025: Rev. Proc. 2024-40 (brackets) and the One, Big, Beautiful Bill Act (OBBBA, 2025),
 *   which raised the 2025 standard deduction to $15,750 single / $31,500 MFJ.
 * - 2026: Rev. Proc. 2025-32 (IRS inflation adjustments for tax year 2026, including
 *   OBBBA amendments). See https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
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
    // Per OBBBA (2025), retroactive to tax year 2025.
    [FILING_STATUSES.SINGLE]: 15750,
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: 31500
  },
  2026: {
    // Per IRS Rev. Proc. 2025-32.
    [FILING_STATUSES.SINGLE]: 16100,
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: 32200
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
    // Per IRS Rev. Proc. 2024-40.
    [FILING_STATUSES.SINGLE]: [
      { rate: 0.10, min: 0, max: 11925 },
      { rate: 0.12, min: 11925, max: 48475 },
      { rate: 0.22, min: 48475, max: 103350 },
      { rate: 0.24, min: 103350, max: 197300 },
      { rate: 0.32, min: 197300, max: 250525 },
      { rate: 0.35, min: 250525, max: 626350 },
      { rate: 0.37, min: 626350, max: null }
    ],
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: [
      { rate: 0.10, min: 0, max: 23850 },
      { rate: 0.12, min: 23850, max: 96950 },
      { rate: 0.22, min: 96950, max: 206700 },
      { rate: 0.24, min: 206700, max: 394600 },
      { rate: 0.32, min: 394600, max: 501050 },
      { rate: 0.35, min: 501050, max: 751600 },
      { rate: 0.37, min: 751600, max: null }
    ]
  },
  2026: {
    // Per IRS Rev. Proc. 2025-32 (includes OBBBA amendments).
    [FILING_STATUSES.SINGLE]: [
      { rate: 0.10, min: 0, max: 12400 },
      { rate: 0.12, min: 12400, max: 50400 },
      { rate: 0.22, min: 50400, max: 105700 },
      { rate: 0.24, min: 105700, max: 201775 },
      { rate: 0.32, min: 201775, max: 256225 },
      { rate: 0.35, min: 256225, max: 640600 },
      { rate: 0.37, min: 640600, max: null }
    ],
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: [
      { rate: 0.10, min: 0, max: 24800 },
      { rate: 0.12, min: 24800, max: 100800 },
      { rate: 0.22, min: 100800, max: 211400 },
      { rate: 0.24, min: 211400, max: 403550 },
      { rate: 0.32, min: 403550, max: 512450 },
      { rate: 0.35, min: 512450, max: 768700 },
      { rate: 0.37, min: 768700, max: null }
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
