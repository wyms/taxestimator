/**
 * State Management Module
 *
 * Manages application state for the tax estimator.
 * Persists the active draft and saved scenarios to localStorage so users
 * don't lose their inputs across page reloads.
 */

/**
 * @typedef {import('./types.js').Session} Session
 * @typedef {import('./types.js').W2Entry} W2Entry
 * @typedef {import('./types.js').PaystubEntry} PaystubEntry
 * @typedef {import('./types.js').Results} Results
 * @typedef {import('./types.js').Adjustments} Adjustments
 * @typedef {import('./types.js').Credits} Credits
 * @typedef {import('./types.js').Scenario} Scenario
 * @typedef {import('./types.js').AppState} AppState
 */

const STORAGE_KEY = 'taxEstimatorState';
const SCENARIOS_KEY = 'taxEstimatorScenarios';

// =============================================================================
// Initial State
// =============================================================================

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
    adjustments: {
      iraDeduction: 0,
      hsaDeduction: 0,
      studentLoanInterest: 0
    },
    credits: {
      qualifyingChildren: 0,
      otherDependents: 0
    },
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
let scenarios = [];
let subscribers = [];

export function subscribe(callback) {
  subscribers.push(callback);
  callback(currentState);
  return () => {
    subscribers = subscribers.filter(sub => sub !== callback);
  };
}

function notifySubscribers() {
  subscribers.forEach(callback => callback(currentState));
}

export function getState() {
  return { ...currentState };
}

export function setState(updates) {
  currentState = {
    ...currentState,
    ...updates,
    session: {
      ...currentState.session,
      ...(updates.session || {}),
      updatedAt: new Date()
    }
  };

  currentState.isDirty = true;

  saveToStorage();
  notifySubscribers();
}

export const updateState = setState;

export function resetState() {
  currentState = createInitialState();
  clearStorage();
  notifySubscribers();
}

export const reset = resetState;

// =============================================================================
// Session Management
// =============================================================================

export function updateSession(sessionUpdates) {
  setState({
    session: {
      ...currentState.session,
      ...sessionUpdates
    }
  });
}

export function setTaxYear(taxYear) {
  updateSession({ taxYear: parseInt(taxYear) });
}

export function setFilingStatus(filingStatus) {
  updateSession({ filingStatus });
}

export function setInputMode(inputMode) {
  updateSession({ inputMode });
}

// =============================================================================
// W-2 Entry Management
// =============================================================================

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

export function updateW2Entry(id, updates) {
  setState({
    w2Entries: currentState.w2Entries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    )
  });
}

export function removeW2Entry(id) {
  setState({
    w2Entries: currentState.w2Entries.filter(entry => entry.id !== id)
  });
}

export function getW2Entries() {
  return [...currentState.w2Entries];
}

// =============================================================================
// Paystub Entry Management
// =============================================================================

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

export function updatePaystubEntry(id, updates) {
  setState({
    paystubEntries: currentState.paystubEntries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    )
  });
}

export function removePaystubEntry(id) {
  setState({
    paystubEntries: currentState.paystubEntries.filter(entry => entry.id !== id)
  });
}

export function getPaystubEntries() {
  return [...currentState.paystubEntries];
}

// =============================================================================
// Adjustments & Credits
// =============================================================================

export function setAdjustment(field, value) {
  setState({
    adjustments: {
      ...currentState.adjustments,
      [field]: value
    }
  });
}

export function setCredit(field, value) {
  setState({
    credits: {
      ...currentState.credits,
      [field]: value
    }
  });
}

// =============================================================================
// Results Management
// =============================================================================

export function setResults(results) {
  setState({
    results,
    isDirty: false
  });
}

export function getResults() {
  return currentState.results ? { ...currentState.results } : null;
}

export function clearResults() {
  setState({
    results: null
  });
}

// =============================================================================
// Navigation & Steps
// =============================================================================

export function setCurrentStep(step) {
  setState({
    currentStep: step
  });
}

export function getCurrentStep() {
  return currentState.currentStep;
}

export function nextStep() {
  if (currentState.currentStep < 4) {
    setCurrentStep(currentState.currentStep + 1);
  }
}

export function previousStep() {
  if (currentState.currentStep > 1) {
    setCurrentStep(currentState.currentStep - 1);
  }
}

// =============================================================================
// Error Management
// =============================================================================

export function setErrors(field, errors) {
  setState({
    errors: {
      ...currentState.errors,
      [field]: errors
    }
  });
}

export function clearErrors(field) {
  const errors = { ...currentState.errors };
  delete errors[field];

  setState({
    errors
  });
}

export function clearAllErrors() {
  setState({
    errors: {}
  });
}

export function getErrors(field) {
  return currentState.errors[field] || [];
}

// =============================================================================
// Persistence (localStorage)
// =============================================================================

function pickStorage() {
  // Prefer localStorage for cross-session persistence; fall back to sessionStorage
  // (e.g. when localStorage is disabled by privacy settings).
  try {
    if (typeof localStorage !== 'undefined') {
      const probeKey = '__taxEstimatorProbe__';
      localStorage.setItem(probeKey, '1');
      localStorage.removeItem(probeKey);
      return localStorage;
    }
  } catch (_) { /* fall through */ }
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch (_) { /* fall through */ }
  return null;
}

const storage = pickStorage();

export function saveToStorage() {
  if (!storage) return;
  try {
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
            calculatedAt: currentState.results.calculatedAt instanceof Date
              ? currentState.results.calculatedAt.toISOString()
              : currentState.results.calculatedAt
          }
        : null
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save state to storage:', error);
  }
}

export function loadFromStorage() {
  if (!storage) return false;
  try {
    const savedState = storage.getItem(STORAGE_KEY);

    if (!savedState) {
      return false;
    }

    const parsed = JSON.parse(savedState);

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

export function clearStorage() {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

// =============================================================================
// Scenarios (saved snapshots)
// =============================================================================

function loadScenariosFromStorage() {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    return [];
  }
}

function saveScenariosToStorage() {
  if (!storage) return;
  try {
    storage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  } catch (error) {
    console.error('Failed to save scenarios:', error);
  }
}

/**
 * Save the current state as a named scenario snapshot.
 * @param {string} name
 * @returns {Scenario}
 */
export function saveScenario(name) {
  const id = `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const trimmedName = (name || '').trim() || `Scenario ${scenarios.length + 1}`;
  const snapshot = {
    id,
    name: trimmedName,
    savedAt: new Date().toISOString(),
    session: { ...currentState.session },
    w2Entries: currentState.w2Entries.map(e => ({ ...e })),
    paystubEntries: currentState.paystubEntries.map(e => ({ ...e })),
    adjustments: { ...currentState.adjustments },
    credits: { ...currentState.credits },
    results: currentState.results
      ? { ...currentState.results, calculatedAt: currentState.results.calculatedAt instanceof Date
          ? currentState.results.calculatedAt.toISOString()
          : currentState.results.calculatedAt }
      : null
  };
  scenarios = [snapshot, ...scenarios];
  saveScenariosToStorage();
  notifySubscribers();
  return snapshot;
}

/**
 * Get a copy of all saved scenarios, most-recent first.
 * @returns {Array<Scenario>}
 */
export function getScenarios() {
  return scenarios.map(s => ({ ...s }));
}

export function removeScenario(id) {
  scenarios = scenarios.filter(s => s.id !== id);
  saveScenariosToStorage();
  notifySubscribers();
}

export function renameScenario(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  scenarios = scenarios.map(s => s.id === id ? { ...s, name: trimmed } : s);
  saveScenariosToStorage();
  notifySubscribers();
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isSessionComplete() {
  const { session, w2Entries, paystubEntries } = currentState;

  if (!session.taxYear || !session.filingStatus || !session.inputMode) {
    return false;
  }

  const totalEntries = w2Entries.length + paystubEntries.length;
  return totalEntries > 0;
}

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

loadFromStorage();
scenarios = loadScenariosFromStorage();

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
  setAdjustment,
  setCredit,
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
  saveScenario,
  getScenarios,
  removeScenario,
  renameScenario,
  isSessionComplete,
  getStateSummary
};
