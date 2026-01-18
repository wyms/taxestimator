/**
 * Type Definitions for Tax Estimator Application
 *
 * This module provides JSDoc type definitions for all data structures
 * used throughout the application. These types align with section 7
 * (Data Model) from requirements.md.
 *
 * Usage:
 * Import types in other modules using JSDoc @typedef and @type annotations.
 * This provides IDE autocomplete and type checking without TypeScript.
 */

/**
 * Session - Represents a user's tax estimation session
 *
 * @typedef {Object} Session
 * @property {number} taxYear - The tax year for estimation (e.g., 2025, 2026)
 * @property {string} filingStatus - Filing status: 'single' or 'married_filing_jointly'
 * @property {string} inputMode - Input mode: 'w2_only', 'paystub_only', or 'mixed'
 * @property {Date} [createdAt] - When the session was created
 * @property {Date} [updatedAt] - When the session was last updated
 * @property {string} [sessionId] - Optional unique identifier for the session
 */

/**
 * W2Entry - Represents a single W-2 form entry
 *
 * @typedef {Object} W2Entry
 * @property {string} [id] - Unique identifier for this W-2 entry
 * @property {string} [label] - Optional employer name or label (e.g., "Acme Corp", "Main Job")
 * @property {number} box1Wages - Box 1: Wages, tips, other compensation
 * @property {number} box2Withheld - Box 2: Federal income tax withheld
 * @property {number} [box3SocialSecurityWages] - Box 3: Social Security wages (optional/informational)
 * @property {number} [box5MedicareWages] - Box 5: Medicare wages and tips (optional/informational)
 * @property {number} [retirementContributions] - Pre-tax retirement contributions if excluded from box 1 (optional/informational)
 */

/**
 * PaystubEntry - Represents a single paycheck/paystub entry
 *
 * Supports both YTD (year-to-date) and per-check entries.
 * YTD fields are preferred for accuracy.
 *
 * @typedef {Object} PaystubEntry
 * @property {string} [id] - Unique identifier for this paystub entry
 * @property {string} [label] - Optional employer/payroll label (e.g., "Tech Corp", "Part-time job")
 * @property {string} [payFrequency] - Pay frequency: 'weekly', 'biweekly', 'semimonthly', 'monthly'
 * @property {string|Date} [payDate] - Date of this paycheck (ISO string or Date object)
 * @property {number} [ytdTaxableWages] - Year-to-date taxable wages for federal income tax (PREFERRED)
 * @property {number} [ytdFedWithheld] - Year-to-date federal income tax withheld (PREFERRED)
 * @property {number} [currentTaxableWages] - Current pay period taxable wages (optional)
 * @property {number} [currentFedWithheld] - Current pay period federal tax withheld (optional)
 * @property {number} [ytdPreTaxDeductions] - YTD pre-tax deductions like 401k, health insurance (optional)
 * @property {number} [currentGrossWages] - Current period gross wages before deductions (optional)
 * @property {boolean} [isStillEmployed] - Whether user is still employed at this job (for projections)
 * @property {number} [projectedPaychecksRemaining] - Number of paychecks remaining in year (for projections)
 */

/**
 * TaxCalculationInputs - Aggregated inputs for tax calculation
 *
 * @typedef {Object} TaxCalculationInputs
 * @property {number} totalWages - Total taxable wages from all sources
 * @property {number} totalWithheld - Total federal income tax withheld from all sources
 * @property {number} standardDeduction - Standard deduction based on filing status and year
 * @property {string} filingStatus - Filing status used for calculation
 * @property {number} taxYear - Tax year used for calculation
 */

/**
 * TaxBracketResult - Results for a single tax bracket
 *
 * @typedef {Object} TaxBracketResult
 * @property {number} rate - Tax rate as decimal (e.g., 0.10 for 10%)
 * @property {number} min - Lower bound of bracket (inclusive)
 * @property {number|null} max - Upper bound of bracket (exclusive, null for top bracket)
 * @property {number} incomeInBracket - Amount of income taxed at this rate
 * @property {number} taxFromBracket - Tax owed from this bracket
 */

/**
 * Results - Derived calculation results
 *
 * Contains all computed values from the tax estimation.
 *
 * @typedef {Object} Results
 * @property {number} totalWages - Total wages from all W-2s and/or paystubs
 * @property {number} totalWithheld - Total federal tax withheld from all sources
 * @property {number} standardDeduction - Standard deduction applied
 * @property {number} taxableIncome - Taxable income after standard deduction (max(0, wages - deduction))
 * @property {number} taxLiability - Total federal income tax liability
 * @property {number} netDueRefund - Net amount due (positive) or refund (negative)
 * @property {boolean} isRefund - True if refund, false if amount due
 * @property {number} refundAmount - Refund amount (0 if amount due)
 * @property {number} amountDue - Amount due (0 if refund)
 * @property {Array<TaxBracketResult>} [bracketBreakdown] - Detailed breakdown by tax bracket (optional)
 * @property {Date} calculatedAt - Timestamp when calculation was performed
 */

/**
 * ProjectedResults - Results including year-end projection
 *
 * Used when estimating based on paystubs mid-year.
 *
 * @typedef {Object} ProjectedResults
 * @property {Results} ytdResults - Results based on year-to-date values only
 * @property {Results} projectedYearEndResults - Projected results for end of year
 * @property {number} projectedTotalWages - Projected total wages for full year
 * @property {number} projectedTotalWithheld - Projected total withholding for full year
 * @property {number} paychecksRemaining - Number of paychecks remaining in year
 * @property {string} [projectionMethod] - Method used for projection (e.g., "pay_frequency", "manual")
 */

/**
 * ValidationResult - Result of input validation
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the input is valid
 * @property {Array<string>} errors - Array of error messages (empty if valid)
 * @property {Array<string>} warnings - Array of warning messages (non-blocking)
 * @property {string} [field] - Field name that was validated
 */

/**
 * ScopeValidationResult - Result of feature scope validation
 *
 * @typedef {Object} ScopeValidationResult
 * @property {boolean} isInScope - Whether the feature/input is in scope for v1
 * @property {string} [message] - Explanation message
 * @property {Array<string>} [suggestions] - Suggested alternatives or workarounds
 * @property {string} [feature] - The feature that was validated
 */

/**
 * ExportData - Data structure for PDF export or shareable link
 *
 * @typedef {Object} ExportData
 * @property {Session} session - Session information
 * @property {Array<W2Entry>} w2Entries - All W-2 entries
 * @property {Array<PaystubEntry>} paystubEntries - All paystub entries
 * @property {Results|ProjectedResults} results - Calculation results
 * @property {Array<string>} assumptions - List of assumptions made
 * @property {string} disclaimer - Disclaimer text
 * @property {Date} exportedAt - When the export was created
 * @property {string} [shareableId] - Unique ID for shareable link (optional)
 */

/**
 * DuplicateDetectionResult - Result of duplicate job detection
 *
 * Used to warn users when they may have entered the same employer twice
 * (e.g., both a W-2 and paystub from the same company).
 *
 * @typedef {Object} DuplicateDetectionResult
 * @property {boolean} hasPotentialDuplicates - Whether duplicates were detected
 * @property {Array<{w2: W2Entry, paystub: PaystubEntry, similarity: number}>} matches - Potential duplicate matches
 * @property {string} [warningMessage] - Warning message to display to user
 */

/**
 * AppState - Global application state
 *
 * @typedef {Object} AppState
 * @property {Session} session - Current session data
 * @property {Array<W2Entry>} w2Entries - All W-2 entries
 * @property {Array<PaystubEntry>} paystubEntries - All paystub entries
 * @property {Results|null} results - Current calculation results (null if not calculated)
 * @property {boolean} isDirty - Whether there are unsaved changes
 * @property {string} currentStep - Current step in the UI flow (e.g., 'status', 'input', 'results')
 * @property {Object} [errors] - Current validation errors by field
 */

// =============================================================================
// Utility type guards and validators
// =============================================================================

/**
 * Type guard to check if results include projection
 * @param {Results|ProjectedResults} results - Results object to check
 * @returns {results is ProjectedResults} True if results include projection
 */
export function isProjectedResults(results) {
  return results && 'ytdResults' in results && 'projectedYearEndResults' in results;
}

/**
 * Type guard to check if a value is a valid W2Entry
 * @param {any} value - Value to check
 * @returns {value is W2Entry} True if value is a valid W2Entry
 */
export function isW2Entry(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.box1Wages === 'number' &&
    typeof value.box2Withheld === 'number'
  );
}

/**
 * Type guard to check if a value is a valid PaystubEntry
 * @param {any} value - Value to check
 * @returns {value is PaystubEntry} True if value is a valid PaystubEntry
 */
export function isPaystubEntry(value) {
  return (
    value &&
    typeof value === 'object' &&
    (typeof value.ytdTaxableWages === 'number' || typeof value.currentTaxableWages === 'number')
  );
}

/**
 * Type guard to check if a value is a valid Session
 * @param {any} value - Value to check
 * @returns {value is Session} True if value is a valid Session
 */
export function isSession(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.taxYear === 'number' &&
    typeof value.filingStatus === 'string' &&
    typeof value.inputMode === 'string'
  );
}

// Export all type guards
export default {
  isProjectedResults,
  isW2Entry,
  isPaystubEntry,
  isSession
};
