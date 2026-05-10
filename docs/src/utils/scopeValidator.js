/**
 * Feature Scope Validator
 *
 * Validates user inputs and feature requests against the v1 scope defined
 * in requirements.md (Section 2). Provides clear messaging about what is
 * and is not supported.
 *
 * This module helps maintain boundaries and set proper user expectations.
 */

import {
  FILING_STATUSES,
  SUPPORTED_TAX_YEARS,
  IN_SCOPE_FEATURES,
  OUT_OF_SCOPE_FEATURES,
  INPUT_MODES,
  isSupportedTaxYear,
  isSupportedFilingStatus
} from '../data/taxConfig.js';

/**
 * @typedef {import('./types.js').ScopeValidationResult} ScopeValidationResult
 * @typedef {import('./types.js').Session} Session
 * @typedef {import('./types.js').W2Entry} W2Entry
 * @typedef {import('./types.js').PaystubEntry} PaystubEntry
 */

// =============================================================================
// Filing Status Validation
// =============================================================================

/**
 * Validates if a filing status is in scope for v1
 *
 * @param {string} filingStatus - The filing status to validate
 * @returns {ScopeValidationResult} Validation result
 */
export function validateFilingStatus(filingStatus) {
  const normalizedStatus = filingStatus?.toLowerCase().replace(/[_\s]/g, '_');

  // Check if it's a supported status
  if (isSupportedFilingStatus(normalizedStatus)) {
    return {
      isInScope: true,
      feature: 'filing_status',
      message: `Filing status '${filingStatus}' is supported in v1.`
    };
  }

  // Check for common out-of-scope statuses
  const outOfScopeStatuses = {
    'qualifying_widow': 'Qualifying Widow(er)',
    'qualifying_widower': 'Qualifying Widow(er)'
  };

  const matchedStatus = outOfScopeStatuses[normalizedStatus];

  if (matchedStatus) {
    return {
      isInScope: false,
      feature: 'filing_status',
      message: `${matchedStatus} filing status is not supported. Supported statuses: Single, MFJ, Head of Household, MFS.`,
      suggestions: [
        'Use "Single" if you are unmarried',
        'Use "Married Filing Jointly" if you are married and filing jointly',
        'Use "Head of Household" if unmarried with a qualifying dependent',
        'Use "Married Filing Separately" if married but filing separate returns'
      ]
    };
  }

  // Unknown status
  return {
    isInScope: false,
    feature: 'filing_status',
    message: `Unknown filing status '${filingStatus}'. Supported: Single, MFJ, Head of Household, MFS.`,
    suggestions: [
      'Single',
      'Married Filing Jointly',
      'Head of Household',
      'Married Filing Separately'
    ]
  };
}

// =============================================================================
// Tax Year Validation
// =============================================================================

/**
 * Validates if a tax year is supported
 *
 * @param {number} taxYear - The tax year to validate
 * @returns {ScopeValidationResult} Validation result
 */
export function validateTaxYear(taxYear) {
  if (isSupportedTaxYear(taxYear)) {
    return {
      isInScope: true,
      feature: 'tax_year',
      message: `Tax year ${taxYear} is supported.`
    };
  }

  return {
    isInScope: false,
    feature: 'tax_year',
    message: `Tax year ${taxYear} is not currently supported. Supported years: ${SUPPORTED_TAX_YEARS.join(', ')}.`,
    suggestions: SUPPORTED_TAX_YEARS.map(year => `${year}`)
  };
}

// =============================================================================
// Deduction Type Validation
// =============================================================================

/**
 * Validates deduction type (v1 only supports standard deduction)
 *
 * @param {string} deductionType - Type of deduction ('standard' or 'itemized')
 * @returns {ScopeValidationResult} Validation result
 */
export function validateDeductionType(deductionType) {
  const normalized = deductionType?.toLowerCase();

  if (normalized === 'standard') {
    return {
      isInScope: true,
      feature: 'deduction_type',
      message: 'Standard deduction is supported.'
    };
  }

  if (normalized === 'itemized') {
    return {
      isInScope: false,
      feature: 'deduction_type',
      message: 'Itemized deductions are not supported in v1. This estimator uses the Standard Deduction only.',
      suggestions: [
        'Use the Standard Deduction for this estimate',
        'For itemized deductions, consult a tax professional or use tax preparation software'
      ]
    };
  }

  return {
    isInScope: false,
    feature: 'deduction_type',
    message: `Unknown deduction type '${deductionType}'. v1 supports Standard Deduction only.`
  };
}

// =============================================================================
// Income Type Validation
// =============================================================================

/**
 * Validates if an income type is supported
 *
 * @param {string} incomeType - Type of income (e.g., 'w2', 'self_employment', 'capital_gains')
 * @returns {ScopeValidationResult} Validation result
 */
export function validateIncomeType(incomeType) {
  const normalized = incomeType?.toLowerCase().replace(/[-\s]/g, '_');

  // Supported income types
  const supportedTypes = ['w2', 'paystub', 'paycheck'];

  if (supportedTypes.includes(normalized)) {
    return {
      isInScope: true,
      feature: 'income_type',
      message: `Income type '${incomeType}' is supported.`
    };
  }

  // Out of scope income types
  const outOfScopeTypes = {
    'self_employment': 'Self-employment income',
    'schedule_c': 'Schedule C (Business) income',
    'schedule_k1': 'Schedule K-1 (Partnership/S-Corp) income',
    'capital_gains': 'Capital gains',
    'capital_losses': 'Capital losses',
    'dividend': 'Dividend income',
    'interest': 'Interest income',
    'rental': 'Rental income',
    '1099_misc': '1099-MISC income',
    '1099_nec': '1099-NEC income',
    'gig_economy': 'Gig economy income'
  };

  const matchedType = outOfScopeTypes[normalized];

  if (matchedType) {
    return {
      isInScope: false,
      feature: 'income_type',
      message: `${matchedType} is not supported in v1. This estimator supports W-2 and paystub income only.`,
      suggestions: [
        'Use this tool for W-2 and paystub income only',
        'For other income types, consult a tax professional or use comprehensive tax software'
      ]
    };
  }

  return {
    isInScope: false,
    feature: 'income_type',
    message: `Income type '${incomeType}' is not supported. v1 supports W-2 and paystub income only.`
  };
}

// =============================================================================
// Credits and Adjustments Validation
// =============================================================================

/**
 * Validates if a tax credit is supported
 *
 * @param {string} creditType - Type of tax credit
 * @returns {ScopeValidationResult} Validation result
 */
export function validateTaxCredit(creditType) {
  const creditName = creditType?.toLowerCase().replace(/[_\s-]/g, '_');

  const inScopeCredits = {
    'child_tax_credit': 'Child Tax Credit',
    'credit_for_other_dependents': 'Credit for Other Dependents'
  };

  if (inScopeCredits[creditName]) {
    return {
      isInScope: true,
      feature: 'tax_credit',
      message: `${inScopeCredits[creditName]} is supported (non-refundable; phase-out applied).`
    };
  }

  const outOfScopeCredits = {
    'earned_income_credit': 'Earned Income Tax Credit (EITC)',
    'child_and_dependent_care_credit': 'Child and Dependent Care Credit',
    'education_credit': 'Education Credits (American Opportunity, Lifetime Learning)',
    'retirement_savings_credit': 'Retirement Savings Contributions Credit (Saver\'s Credit)',
    'residential_energy_credit': 'Residential Energy Credits',
    'additional_child_tax_credit': 'Additional (refundable) Child Tax Credit (ACTC)'
  };

  const matchedCredit = outOfScopeCredits[creditName];

  if (matchedCredit) {
    return {
      isInScope: false,
      feature: 'tax_credit',
      message: `${matchedCredit} is not modeled. Supported credits: Child Tax Credit and Credit for Other Dependents.`,
      suggestions: [
        'This estimate may understate your refund if you qualify for other credits',
        'Consult a tax professional or use tax software for full credit calculations'
      ]
    };
  }

  return {
    isInScope: false,
    feature: 'tax_credit',
    message: 'Only Child Tax Credit and Credit for Other Dependents are modeled.'
  };
}

/**
 * Validates if an adjustment to income is supported
 *
 * @param {string} adjustmentType - Type of adjustment (e.g., 'ira', 'hsa', 'student_loan')
 * @returns {ScopeValidationResult} Validation result
 */
export function validateAdjustment(adjustmentType) {
  const normalized = adjustmentType?.toLowerCase().replace(/[_\s-]/g, '_');

  const inScopeAdjustments = {
    'ira_deduction': 'Traditional IRA deduction',
    'hsa_deduction': 'Health Savings Account (HSA) deduction',
    'student_loan_interest': 'Student loan interest deduction'
  };

  if (inScopeAdjustments[normalized]) {
    return {
      isInScope: true,
      feature: 'adjustment_to_income',
      message: `${inScopeAdjustments[normalized]} is supported as an optional adjustment to income.`
    };
  }

  const outOfScopeAdjustments = {
    'self_employment_tax': 'Self-employment tax deduction',
    'self_employed_health_insurance': 'Self-employed health insurance deduction',
    'alimony_paid': 'Alimony paid',
    'educator_expenses': 'Educator expenses'
  };

  const matchedAdjustment = outOfScopeAdjustments[normalized];

  if (matchedAdjustment) {
    return {
      isInScope: false,
      feature: 'adjustment_to_income',
      message: `${matchedAdjustment} is not modeled. Supported: Traditional IRA, HSA, student loan interest.`,
      suggestions: [
        'Use only the supported adjustment fields',
        'For other adjustments, consult a tax professional or use comprehensive tax software'
      ]
    };
  }

  return {
    isInScope: false,
    feature: 'adjustment_to_income',
    message: 'Supported adjustments: Traditional IRA, HSA, student loan interest.'
  };
}

// =============================================================================
// Dependent Validation
// =============================================================================

/**
 * Validates dependent/exemption inputs (not supported in v1)
 *
 * @param {number} numberOfDependents - Number of dependents
 * @returns {ScopeValidationResult} Validation result
 */
export function validateDependents(numberOfDependents) {
  const n = Number(numberOfDependents);
  if (!Number.isFinite(n) || n < 0) {
    return {
      isInScope: false,
      feature: 'dependents',
      message: 'Number of dependents must be a non-negative integer.'
    };
  }

  return {
    isInScope: true,
    feature: 'dependents',
    message: 'Dependents are supported for Child Tax Credit and Credit for Other Dependents.'
  };
}

// =============================================================================
// Session Validation
// =============================================================================

/**
 * Validates an entire session object for scope compliance
 *
 * @param {Session} session - The session to validate
 * @returns {ScopeValidationResult} Validation result
 */
export function validateSession(session) {
  const errors = [];
  const warnings = [];

  // Validate tax year
  const yearResult = validateTaxYear(session.taxYear);
  if (!yearResult.isInScope) {
    errors.push(yearResult.message);
  }

  // Validate filing status
  const statusResult = validateFilingStatus(session.filingStatus);
  if (!statusResult.isInScope) {
    errors.push(statusResult.message);
  }

  // Validate input mode
  const validInputModes = Object.values(INPUT_MODES);
  if (!validInputModes.includes(session.inputMode)) {
    errors.push(`Invalid input mode '${session.inputMode}'. Must be one of: ${validInputModes.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      isInScope: false,
      feature: 'session',
      message: `Session validation failed: ${errors.join('; ')}`,
      suggestions: [
        'Check tax year (must be 2025 or 2026)',
        'Check filing status (must be Single or Married Filing Jointly)',
        'Check input mode (must be w2_only, paystub_only, or mixed)'
      ]
    };
  }

  return {
    isInScope: true,
    feature: 'session',
    message: 'Session is valid and in scope for v1.'
  };
}

// =============================================================================
// Feature Request Validation
// =============================================================================

/**
 * Checks if a requested feature is in scope
 *
 * @param {string} featureDescription - Description of the feature
 * @returns {ScopeValidationResult} Validation result
 */
export function isFeatureInScope(featureDescription) {
  const normalized = featureDescription?.toLowerCase();

  // Check if it matches any in-scope features
  const inScope = IN_SCOPE_FEATURES.some(feature =>
    normalized.includes(feature.toLowerCase())
  );

  if (inScope) {
    return {
      isInScope: true,
      feature: featureDescription,
      message: `This feature is in scope for v1.`
    };
  }

  // Check if it matches any out-of-scope features
  const outOfScope = OUT_OF_SCOPE_FEATURES.find(feature =>
    normalized.includes(feature.toLowerCase())
  );

  if (outOfScope) {
    return {
      isInScope: false,
      feature: featureDescription,
      message: `This feature is out of scope for v1: ${outOfScope}`,
      suggestions: [
        'Use this tool for basic W-2 and paystub income estimation only',
        'For advanced features, consult a tax professional or use comprehensive tax software'
      ]
    };
  }

  // Unknown feature
  return {
    isInScope: false,
    feature: featureDescription,
    message: `Feature status unknown. This tool supports basic federal income tax estimation for W-2 and paystub income only.`
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets a user-friendly message about v1 scope limitations
 *
 * @returns {Object} Object with scope information
 */
export function getScopeInfo() {
  return {
    supported: {
      title: 'What\'s Included in v1',
      features: IN_SCOPE_FEATURES
    },
    notSupported: {
      title: 'What\'s NOT Included in v1',
      features: OUT_OF_SCOPE_FEATURES
    },
    disclaimer: 'This is a basic federal income tax estimator. For complete tax preparation including credits, deductions, and other income types, please consult a tax professional or use comprehensive tax software.'
  };
}

/**
 * Checks if user needs to be warned about scope limitations
 * based on their session and inputs
 *
 * @param {Session} session - The user's session
 * @param {Array<W2Entry>} w2Entries - W-2 entries
 * @param {Array<PaystubEntry>} paystubEntries - Paystub entries
 * @returns {Array<string>} Array of warning messages
 */
export function getScopeWarnings(session, w2Entries = [], paystubEntries = []) {
  const warnings = [];

  // Check for very high income (potential AMT territory)
  const totalWages = w2Entries.reduce((sum, w2) => sum + w2.box1Wages, 0) +
    paystubEntries.reduce((sum, stub) => sum + (stub.ytdTaxableWages || stub.currentTaxableWages || 0), 0);

  if (totalWages > 500000) {
    warnings.push(
      'Your income may subject you to Alternative Minimum Tax (AMT), which is not calculated in this estimator.'
    );
  }

  const niitThresholds = {
    [FILING_STATUSES.SINGLE]: 200000,
    [FILING_STATUSES.HEAD_OF_HOUSEHOLD]: 200000,
    [FILING_STATUSES.MARRIED_FILING_JOINTLY]: 250000,
    [FILING_STATUSES.MARRIED_FILING_SEPARATELY]: 125000
  };
  const niitThreshold = niitThresholds[session.filingStatus];
  if (niitThreshold && totalWages > niitThreshold) {
    warnings.push(
      'Your income may subject you to Net Investment Income Tax (NIIT, 3.8%), which is not included in this estimate.'
    );
  }

  return warnings;
}

// =============================================================================
// Exports
// =============================================================================

export default {
  // Validation functions
  validateFilingStatus,
  validateTaxYear,
  validateDeductionType,
  validateIncomeType,
  validateTaxCredit,
  validateAdjustment,
  validateDependents,
  validateSession,
  isFeatureInScope,

  // Helper functions
  getScopeInfo,
  getScopeWarnings
};
