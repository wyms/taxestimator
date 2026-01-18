/**
 * Input Validation Module
 *
 * Validates user inputs for the tax estimator according to requirements.md section 4.5.
 * Provides validation for W-2 entries, paystub entries, and form fields.
 */

import { isSupportedTaxYear, isSupportedFilingStatus } from '../data/taxConfig.js';

/**
 * @typedef {import('./types.js').ValidationResult} ValidationResult
 * @typedef {import('./types.js').W2Entry} W2Entry
 * @typedef {import('./types.js').PaystubEntry} PaystubEntry
 */

// =============================================================================
// Constants
// =============================================================================

// Validation limits
const MAX_REASONABLE_WAGES = 10000000; // $10M - soft warning
const MAX_REASONABLE_WITHHOLDING_RATE = 0.50; // 50% - soft warning
const MIN_WAGE = 0;

// =============================================================================
// W-2 Validation
// =============================================================================

/**
 * Validate a W-2 entry
 *
 * @param {W2Entry} w2Entry - The W-2 entry to validate
 * @returns {ValidationResult} Validation result
 */
export function validateW2Entry(w2Entry) {
  const errors = [];
  const warnings = [];

  // Validate box1Wages
  if (w2Entry.box1Wages == null || w2Entry.box1Wages === '') {
    errors.push('Box 1 (Wages) is required');
  } else {
    const wages = parseFloat(w2Entry.box1Wages);

    if (isNaN(wages)) {
      errors.push('Box 1 (Wages) must be a valid number');
    } else if (wages < MIN_WAGE) {
      errors.push('Box 1 (Wages) cannot be negative');
    } else if (wages > MAX_REASONABLE_WAGES) {
      warnings.push(`Box 1 (Wages) is unusually high: $${wages.toLocaleString()}. Please verify.`);
    }
  }

  // Validate box2Withheld
  if (w2Entry.box2Withheld == null || w2Entry.box2Withheld === '') {
    errors.push('Box 2 (Federal income tax withheld) is required');
  } else {
    const withheld = parseFloat(w2Entry.box2Withheld);

    if (isNaN(withheld)) {
      errors.push('Box 2 (Federal income tax withheld) must be a valid number');
    } else if (withheld < 0) {
      errors.push('Box 2 (Federal income tax withheld) cannot be negative');
    } else if (w2Entry.box1Wages > 0) {
      // Check if withholding rate is reasonable
      const withholdingRate = withheld / parseFloat(w2Entry.box1Wages);

      if (withholdingRate > MAX_REASONABLE_WITHHOLDING_RATE) {
        warnings.push(
          `Federal withholding (${(withholdingRate * 100).toFixed(0)}%) seems high relative to wages. Please verify.`
        );
      }

      if (withheld > parseFloat(w2Entry.box1Wages)) {
        warnings.push('Federal withholding exceeds wages. This is unusual but possible.');
      }
    }
  }

  // Validate optional fields if provided
  if (w2Entry.box3SocialSecurityWages != null && w2Entry.box3SocialSecurityWages !== '') {
    const ssWages = parseFloat(w2Entry.box3SocialSecurityWages);
    if (isNaN(ssWages) || ssWages < 0) {
      warnings.push('Box 3 (Social Security wages) must be a positive number if provided');
    }
  }

  if (w2Entry.box5MedicareWages != null && w2Entry.box5MedicareWages !== '') {
    const medicareWages = parseFloat(w2Entry.box5MedicareWages);
    if (isNaN(medicareWages) || medicareWages < 0) {
      warnings.push('Box 5 (Medicare wages) must be a positive number if provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    field: 'w2Entry'
  };
}

// =============================================================================
// Paystub Validation
// =============================================================================

/**
 * Validate a paystub entry
 *
 * @param {PaystubEntry} paystubEntry - The paystub entry to validate
 * @returns {ValidationResult} Validation result
 */
export function validatePaystubEntry(paystubEntry) {
  const errors = [];
  const warnings = [];

  // Must have either YTD or current period wages
  const hasYtdWages = paystubEntry.ytdTaxableWages != null && paystubEntry.ytdTaxableWages !== '';
  const hasCurrentWages = paystubEntry.currentTaxableWages != null && paystubEntry.currentTaxableWages !== '';

  if (!hasYtdWages && !hasCurrentWages) {
    errors.push('Either YTD taxable wages or current period wages is required');
  }

  // Validate YTD taxable wages
  if (hasYtdWages) {
    const ytdWages = parseFloat(paystubEntry.ytdTaxableWages);

    if (isNaN(ytdWages)) {
      errors.push('YTD taxable wages must be a valid number');
    } else if (ytdWages < MIN_WAGE) {
      errors.push('YTD taxable wages cannot be negative');
    } else if (ytdWages > MAX_REASONABLE_WAGES) {
      warnings.push(`YTD taxable wages is unusually high: $${ytdWages.toLocaleString()}. Please verify.`);
    }
  }

  // Validate YTD federal withheld
  const hasYtdWithheld = paystubEntry.ytdFedWithheld != null && paystubEntry.ytdFedWithheld !== '';
  const hasCurrentWithheld = paystubEntry.currentFedWithheld != null && paystubEntry.currentFedWithheld !== '';

  if (!hasYtdWithheld && !hasCurrentWithheld) {
    errors.push('Either YTD federal tax withheld or current period withheld is required');
  }

  if (hasYtdWithheld) {
    const ytdWithheld = parseFloat(paystubEntry.ytdFedWithheld);

    if (isNaN(ytdWithheld)) {
      errors.push('YTD federal tax withheld must be a valid number');
    } else if (ytdWithheld < 0) {
      errors.push('YTD federal tax withheld cannot be negative');
    } else if (hasYtdWages) {
      // Check withholding rate
      const ytdWages = parseFloat(paystubEntry.ytdTaxableWages);
      const withholdingRate = ytdWithheld / ytdWages;

      if (withholdingRate > MAX_REASONABLE_WITHHOLDING_RATE) {
        warnings.push(
          `YTD federal withholding (${(withholdingRate * 100).toFixed(0)}%) seems high. Please verify.`
        );
      }
    }
  }

  // Validate current period values if provided
  if (hasCurrentWages) {
    const currentWages = parseFloat(paystubEntry.currentTaxableWages);

    if (isNaN(currentWages)) {
      errors.push('Current period wages must be a valid number');
    } else if (currentWages < 0) {
      errors.push('Current period wages cannot be negative');
    }
  }

  if (hasCurrentWithheld) {
    const currentWithheld = parseFloat(paystubEntry.currentFedWithheld);

    if (isNaN(currentWithheld)) {
      errors.push('Current period federal withheld must be a valid number');
    } else if (currentWithheld < 0) {
      errors.push('Current period federal withheld cannot be negative');
    }
  }

  // Validate pay date if provided
  if (paystubEntry.payDate) {
    const payDate = new Date(paystubEntry.payDate);
    if (isNaN(payDate.getTime())) {
      warnings.push('Pay date is not a valid date');
    }
  }

  // Validate pay frequency if provided
  if (paystubEntry.payFrequency) {
    const validFrequencies = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
    if (!validFrequencies.includes(paystubEntry.payFrequency.toLowerCase())) {
      warnings.push('Pay frequency must be weekly, biweekly, semimonthly, or monthly');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    field: 'paystubEntry'
  };
}

// =============================================================================
// Session Validation
// =============================================================================

/**
 * Validate tax year
 *
 * @param {number} taxYear - The tax year to validate
 * @returns {ValidationResult} Validation result
 */
export function validateTaxYear(taxYear) {
  const errors = [];

  if (!taxYear) {
    errors.push('Tax year is required');
  } else if (!isSupportedTaxYear(taxYear)) {
    errors.push(`Tax year ${taxYear} is not supported. Please select 2025 or 2026.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    field: 'taxYear'
  };
}

/**
 * Validate filing status
 *
 * @param {string} filingStatus - The filing status to validate
 * @returns {ValidationResult} Validation result
 */
export function validateFilingStatus(filingStatus) {
  const errors = [];

  if (!filingStatus) {
    errors.push('Filing status is required');
  } else if (!isSupportedFilingStatus(filingStatus)) {
    errors.push('Invalid filing status. Please select Single or Married Filing Jointly.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    field: 'filingStatus'
  };
}

/**
 * Validate input mode
 *
 * @param {string} inputMode - The input mode to validate
 * @returns {ValidationResult} Validation result
 */
export function validateInputMode(inputMode) {
  const errors = [];
  const validModes = ['w2_only', 'paystub_only', 'mixed'];

  if (!inputMode) {
    errors.push('Input mode is required');
  } else if (!validModes.includes(inputMode)) {
    errors.push('Invalid input mode. Please select a valid option.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    field: 'inputMode'
  };
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/**
 * Detect potential duplicate entries between W-2s and paystubs
 *
 * Checks if the same employer appears in both W-2 and paystub entries,
 * which could indicate double-counting.
 *
 * @param {Array<W2Entry>} w2Entries - W-2 entries
 * @param {Array<PaystubEntry>} paystubEntries - Paystub entries
 * @returns {Object} Duplicate detection result
 */
export function detectDuplicates(w2Entries, paystubEntries) {
  if (!w2Entries || !paystubEntries || w2Entries.length === 0 || paystubEntries.length === 0) {
    return {
      hasPotentialDuplicates: false,
      matches: [],
      warningMessage: null
    };
  }

  const matches = [];

  // Compare each W-2 label with each paystub label
  w2Entries.forEach(w2 => {
    const w2Label = (w2.label || '').trim().toLowerCase();

    if (!w2Label) return; // Skip if no label

    paystubEntries.forEach(paystub => {
      const paystubLabel = (paystub.label || '').trim().toLowerCase();

      if (!paystubLabel) return; // Skip if no label

      // Check for similarity (simple substring match)
      // More sophisticated matching could use Levenshtein distance
      const similarity = calculateSimilarity(w2Label, paystubLabel);

      if (similarity > 0.6) {
        // 60% similarity threshold
        matches.push({
          w2,
          paystub,
          similarity
        });
      }
    });
  });

  if (matches.length > 0) {
    const employerNames = matches.map(m => m.w2.label || 'Unlabeled').join(', ');

    return {
      hasPotentialDuplicates: true,
      matches,
      warningMessage: `Potential duplicate detected: You have both W-2 and paystub entries for "${employerNames}". Make sure you're not double-counting income from the same employer.`
    };
  }

  return {
    hasPotentialDuplicates: false,
    matches: [],
    warningMessage: null
  };
}

/**
 * Calculate simple similarity score between two strings
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  // Simple approach: check if one contains the other or vice versa
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }

  // Check for common words
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);

  let commonWords = 0;
  words1.forEach(word => {
    if (words2.includes(word) && word.length > 2) {
      // Ignore very short words
      commonWords++;
    }
  });

  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? commonWords / maxWords : 0;
}

// =============================================================================
// Batch Validation
// =============================================================================

/**
 * Validate all W-2 entries
 *
 * @param {Array<W2Entry>} w2Entries - All W-2 entries
 * @returns {Object} Validation results
 */
export function validateAllW2Entries(w2Entries) {
  if (!w2Entries || w2Entries.length === 0) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      entryResults: []
    };
  }

  const entryResults = w2Entries.map((entry, index) => ({
    index,
    ...validateW2Entry(entry)
  }));

  const allErrors = entryResults.flatMap(r => r.errors);
  const allWarnings = entryResults.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    entryResults
  };
}

/**
 * Validate all paystub entries
 *
 * @param {Array<PaystubEntry>} paystubEntries - All paystub entries
 * @returns {Object} Validation results
 */
export function validateAllPaystubEntries(paystubEntries) {
  if (!paystubEntries || paystubEntries.length === 0) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      entryResults: []
    };
  }

  const entryResults = paystubEntries.map((entry, index) => ({
    index,
    ...validatePaystubEntry(entry)
  }));

  const allErrors = entryResults.flatMap(r => r.errors);
  const allWarnings = entryResults.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    entryResults
  };
}

/**
 * Validate entire session before calculation
 *
 * @param {Object} session - Session data
 * @returns {ValidationResult} Validation result
 */
export function validateSession(session) {
  const errors = [];
  const warnings = [];

  // Validate tax year
  const yearResult = validateTaxYear(session.taxYear);
  if (!yearResult.isValid) {
    errors.push(...yearResult.errors);
  }

  // Validate filing status
  const statusResult = validateFilingStatus(session.filingStatus);
  if (!statusResult.isValid) {
    errors.push(...statusResult.errors);
  }

  // Validate input mode
  const modeResult = validateInputMode(session.inputMode);
  if (!modeResult.isValid) {
    errors.push(...modeResult.errors);
  }

  // Validate entries
  const w2Result = validateAllW2Entries(session.w2Entries || []);
  if (!w2Result.isValid) {
    errors.push(...w2Result.errors);
  }
  warnings.push(...w2Result.warnings);

  const paystubResult = validateAllPaystubEntries(session.paystubEntries || []);
  if (!paystubResult.isValid) {
    errors.push(...paystubResult.errors);
  }
  warnings.push(...paystubResult.warnings);

  // Check for duplicates
  const duplicateResult = detectDuplicates(session.w2Entries, session.paystubEntries);
  if (duplicateResult.hasPotentialDuplicates) {
    warnings.push(duplicateResult.warningMessage);
  }

  // Ensure at least one entry exists
  const totalEntries = (session.w2Entries?.length || 0) + (session.paystubEntries?.length || 0);
  if (totalEntries === 0) {
    errors.push('Please add at least one W-2 or paystub entry');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    field: 'session'
  };
}

// =============================================================================
// Exports
// =============================================================================

export default {
  validateW2Entry,
  validatePaystubEntry,
  validateTaxYear,
  validateFilingStatus,
  validateInputMode,
  validateAllW2Entries,
  validateAllPaystubEntries,
  validateSession,
  detectDuplicates
};
