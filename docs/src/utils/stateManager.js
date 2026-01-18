/**
 * State Management Module
 *
 * Manages application state for the tax estimator.
 * Handles session data, entries, and persists to sessionStorage.
 */

/**
 * @typedef {import('./types.js').Session} Session
 * @typedef {import('./types.js').W2Entry} W2Entry
 * @typedef {import('./types.js').PaystubEntry} PaystubEntry
 * @typedef {import('./types.js').Results} Results
 * @typedef {import('./types.js').AppState} AppState
 */

const STORAGE_KEY = 'taxEstimatorState';

// =============================================================================
// Initial State
// =============================================================================

/**
 * Create initial application state
 *
 * @returns {AppState} Initial state
 */
function createInitialState() {
  return {
    session: {
      taxYear: 2025,
      filingStatus: null,
      inputMode: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    w2Entries: [],
    paystubEntries: [],
    results: null,
    isDirty: false,
    currentStep: 1,
    errors: {}
  };
}

// =============================================================================
// State Storage
// =============================================================================

let currentState = createInitialState();
let subscribers = [];

/**
 * Subscribe to state changes
 *
 * @param {Function} callback - Function to call when state changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  subscribers.push(callback);

  // Call immediately with current state
  callback(currentState);

  // Return unsubscribe function
  return () => {
    subscribers = subscribers.filter(sub => sub !== callback);
  };
}

/**
 * Notify all subscribers of state changes
 */
function notifySubscribers() {
  subscribers.forEach(callback => callback(currentState));
}

/**
 * Get current application state
 *
 * @returns {AppState} Current state
 */
export function getState() {
  return { ...currentState };
}

/**
 * Update application state
 *
 * @param {Partial<AppState>} updates - State updates
 */
export function setState(updates) {
  // Create a new state object to avoid direct mutation of the current state during processing
  const newState = {
    ...currentState,
    ...updates,
  };

  // If there's a session update, merge it with the existing session to prevent data loss
  if (updates.session) {
    newState.session = {
      ...currentState.session, // Start with the session from the original state
      ...updates.session,     // Apply the updates
    };
  }

  // Ensure the session always has an update timestamp
  if (newState.session) {
    newState.session.updatedAt = new Date();
  }
  
  newState.isDirty = true;

  // Now, atomically update the main state variable
  currentState = newState;

  // Persist to sessionStorage and notify subscribers
  saveToStorage();
  notifySubscribers();
}

/**
 * Alias for setState to match the API used in estimator.js
 */
export const updateState = setState;

/**
 * Reset state to initial values
 */
export function resetState() {
  currentState = createInitialState();
  clearStorage();
  notifySubscribers();
}

/**
 * Alias for resetState to match the API used in estimator.js
 */
export const reset = resetState;

// =============================================================================
// Session Management
// =============================================================================

/**
 * Update session data
 *
 * @param {Partial<Session>} sessionUpdates - Session updates
 */
export function updateSession(sessionUpdates) {
  setState({
    session: {
      ...currentState.session,
      ...sessionUpdates
    }
  });
}

/**
 * Set tax year
 *
 * @param {number} taxYear - The tax year
 */
export function setTaxYear(taxYear) {
  updateSession({ taxYear: parseInt(taxYear) });
}

/**
 * Set filing status
 *
 * @param {string} filingStatus - The filing status
 */
export function setFilingStatus(filingStatus) {
  updateSession({ filingStatus });
}

/**
 * Set input mode
 *
 * @param {string} inputMode - The input mode
 */
export function setInputMode(inputMode) {
  updateSession({ inputMode });
}

// =============================================================================
// W-2 Entry Management
// =============================================================================

/**
 * Add a new W-2 entry
 *
 * @param {W2Entry} entry - The W-2 entry to add
 * @returns {string} The ID of the added entry
 */
export function addW2Entry(entry) {
  const id = `w2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newEntry = {
    id,
    ...entry
  };

  setState({
    w2Entries: [...currentState.w2Entries, newEntry]
  });

  return id;
}

/**
 * Update an existing W-2 entry
 *
 * @param {string} id - The entry ID
 * @param {Partial<W2Entry>} updates - Updates to apply
 */
export function updateW2Entry(id, updates) {
  setState({
    w2Entries: currentState.w2Entries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    )
  });
}

/**
 * Remove a W-2 entry
 *
 * @param {string} id - The entry ID to remove
 */
export function removeW2Entry(id) {
  setState({
    w2Entries: currentState.w2Entries.filter(entry => entry.id !== id)
  });
}

/**
 * Get all W-2 entries
 *
 * @returns {Array<W2Entry>} All W-2 entries
 */
export function getW2Entries() {
  return [...currentState.w2Entries];
}

// =============================================================================
// Paystub Entry Management
// =============================================================================

/**
 * Add a new paystub entry
 *
 * @param {PaystubEntry} entry - The paystub entry to add
 * @returns {string} The ID of the added entry
 */
export function addPaystubEntry(entry) {
  const id = `paystub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newEntry = {
    id,
    ...entry
  };

  setState({
    paystubEntries: [...currentState.paystubEntries, newEntry]
  });

  return id;
}

/**
 * Update an existing paystub entry
 *
 * @param {string} id - The entry ID
 * @param {Partial<PaystubEntry>} updates - Updates to apply
 */
export function updatePaystubEntry(id, updates) {
  setState({
    paystubEntries: currentState.paystubEntries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    )
  });
}

/**
 * Remove a paystub entry
 *
 * @param {string} id - The entry ID to remove
 */
export function removePaystubEntry(id) {
  setState({
    paystubEntries: currentState.paystubEntries.filter(entry => entry.id !== id)
  });
}

/**
 * Get all paystub entries
 *
 * @returns {Array<PaystubEntry>} All paystub entries
 */
export function getPaystubEntries() {
  return [...currentState.paystubEntries];
}

// =============================================================================
// Results Management
// =============================================================================

/**
 * Set calculation results
 *
 * @param {Results} results - The calculation results
 */
export function setResults(results) {
  setState({
    results,
    isDirty: false
  });
}

/**
 * Get calculation results
 *
 * @returns {Results|null} The calculation results
 */
export function getResults() {
  return currentState.results ? { ...currentState.results } : null;
}

/**
 * Clear calculation results
 */
export function clearResults() {
  setState({
    results: null
  });
}

// =============================================================================
// Navigation & Steps
// =============================================================================

/**
 * Set current step
 *
 * @param {number} step - The step number (1-4)
 */
export function setCurrentStep(step) {
  setState({
    currentStep: step
  });
}

/**
 * Get current step
 *
 * @returns {number} Current step number
 */
export function getCurrentStep() {
  return currentState.currentStep;
}

/**
 * Go to next step
 */
export function nextStep() {
  if (currentState.currentStep < 4) {
    setCurrentStep(currentState.currentStep + 1);
  }
}

/**
 * Go to previous step
 */
export function previousStep() {
  if (currentState.currentStep > 1) {
    setCurrentStep(currentState.currentStep - 1);
  }
}

// =============================================================================
// Error Management
// =============================================================================

/**
 * Set validation errors
 *
 * @param {string} field - The field name
 * @param {Array<string>} errors - Array of error messages
 */
export function setErrors(field, errors) {
  setState({
    errors: {
      ...currentState.errors,
      [field]: errors
    }
  });
}

/**
 * Clear errors for a field
 *
 * @param {string} field - The field name
 */
export function clearErrors(field) {
  const errors = { ...currentState.errors };
  delete errors[field];

  setState({
    errors
  });
}

/**
 * Clear all errors
 */
export function clearAllErrors() {
  setState({
    errors: {}
  });
}

/**
 * Get errors for a field
 *
 * @param {string} field - The field name
 * @returns {Array<string>} Array of error messages
 */
export function getErrors(field) {
  return currentState.errors[field] || [];
}

// =============================================================================
// Persistence (sessionStorage)
// =============================================================================

/**
 * Save state to sessionStorage
 */
export function saveToStorage() {
  try {
    // Convert dates to ISO strings for JSON serialization
    const stateToSave = {
      ...currentState,
      session: {
        ...currentState.session,
        createdAt: currentState.session.createdAt.toISOString(),
        updatedAt: currentState.session.updatedAt.toISOString()
      },
      results: currentState.results
        ? {
            ...currentState.results,
            calculatedAt: currentState.results.calculatedAt.toISOString()
          }
        : null
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save state to storage:', error);
  }
}

/**
 * Load state from sessionStorage
 *
 * @returns {boolean} True if state was loaded, false otherwise
 */
export function loadFromStorage() {
  try {
    const savedState = sessionStorage.getItem(STORAGE_KEY);

    if (!savedState) {
      return false;
    }

    const parsed = JSON.parse(savedState);

    // Convert ISO strings back to Date objects
    if (parsed.session) {
      if (parsed.session.createdAt) {
        parsed.session.createdAt = new Date(parsed.session.createdAt);
      }
      if (parsed.session.updatedAt) {
        parsed.session.updatedAt = new Date(parsed.session.updatedAt);
      }
    }

    if (parsed.results && parsed.results.calculatedAt) {
      parsed.results.calculatedAt = new Date(parsed.results.calculatedAt);
    }

    currentState = {
      ...createInitialState(),
      ...parsed
    };

    return true;
  } catch (error) {
    console.error('Failed to load state from storage:', error);
    return false;
  }
}

/**
 * Clear state from sessionStorage
 */
export function clearStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if session is complete (all required fields filled)
 *
 * @returns {boolean} True if session is complete
 */
export function isSessionComplete() {
  const { session, w2Entries, paystubEntries } = currentState;

  // Check required session fields
  if (!session.taxYear || !session.filingStatus || !session.inputMode) {
    return false;
  }

  // Check if at least one entry exists
  const totalEntries = w2Entries.length + paystubEntries.length;
  return totalEntries > 0;
}

/**
 * Get a summary of current state for debugging
 *
 * @returns {Object} State summary
 */
export function getStateSummary() {
  return {
    taxYear: currentState.session.taxYear,
    filingStatus: currentState.session.filingStatus,
    inputMode: currentState.session.inputMode,
    w2Count: currentState.w2Entries.length,
    paystubCount: currentState.paystubEntries.length,
    hasResults: currentState.results !== null,
    currentStep: currentState.currentStep,
    isDirty: currentState.isDirty
  };
}

// =============================================================================
// Initialization
// =============================================================================

// Try to load saved state on module load
loadFromStorage();

// =============================================================================
// Exports
// =============================================================================

export default {
  getState,
  setState,
  updateState,
  resetState,
  reset,
  subscribe,
  updateSession,
  setTaxYear,
  setFilingStatus,
  setInputMode,
  addW2Entry,
  updateW2Entry,
  removeW2Entry,
  getW2Entries,
  addPaystubEntry,
  updatePaystubEntry,
  removePaystubEntry,
  getPaystubEntries,
  setResults,
  getResults,
  clearResults,
  setCurrentStep,
  getCurrentStep,
  nextStep,
  previousStep,
  setErrors,
  clearErrors,
  clearAllErrors,
  getErrors,
  saveToStorage,
  loadFromStorage,
  clearStorage,
  isSessionComplete,
  getStateSummary
};
