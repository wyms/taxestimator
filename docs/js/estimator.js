/**
 * Tax Estimator - Estimator Page Logic
 *
 * Handles all interactivity for the estimator.html page, including:
 * - Multi-step form navigation
 * - State management for user inputs (including adjustments & credits)
 * - Dynamic form generation for W-2s and paystubs
 * - Input validation and real-time feedback
 * - Tax calculation
 * - Final result display and PDF export
 * - Saved scenarios with side-by-side comparison
 */

import {
    getStandardDeduction,
    getAdjustmentLimits,
    getCreditConfig,
    SUPPORTED_TAX_YEARS,
    FILING_STATUSES
} from '../src/data/taxConfig.js';
import calculator from '../src/utils/calculator.js';
import state from '../src/utils/stateManager.js';

// =============================================================================
// DOM Element Selectors
// =============================================================================
const dom = {
    steps: document.querySelectorAll('.step-content'),
    progressSteps: document.querySelectorAll('.progress-step'),

    // Step 1: Tax Info
    taxYearSelect: document.getElementById('tax-year'),
    filingStatusRadios: document.querySelectorAll('input[name="filingStatus"]'),
    step1NextBtn: document.getElementById('step-1-next'),

    // Step 2: Input Mode
    inputModeRadios: document.querySelectorAll('input[name="inputMode"]'),
    step2BackBtn: document.getElementById('step-2-back'),
    step2NextBtn: document.getElementById('step-2-next'),

    // Step 3: Data Entry
    step3Title: document.getElementById('step-3-title'),
    step3Description: document.getElementById('step-3-description'),
    w2Section: document.getElementById('w2-entry-section'),
    paystubSection: document.getElementById('paystub-entry-section'),
    addW2Btn: document.getElementById('add-w2'),
    addPaystubBtn: document.getElementById('add-paystub'),
    w2EntriesContainer: document.getElementById('w2-entries-container'),
    paystubEntriesContainer: document.getElementById('paystub-entries-container'),
    summaryTotalWages: document.getElementById('summary-total-wages'),
    summaryTotalWithheld: document.getElementById('summary-total-withheld'),
    summaryAdjustmentsRow: document.getElementById('summary-adjustments-row'),
    summaryTotalAdjustments: document.getElementById('summary-total-adjustments'),
    step3BackBtn: document.getElementById('step-3-back'),
    calculateBtn: document.getElementById('step-3-calculate'),

    // Step 3 adjustments + credits
    optionalDetails: document.getElementById('optional-details'),
    adjustmentInputs: document.querySelectorAll('[data-adjustment]'),
    creditInputs: document.querySelectorAll('[data-credit]'),
    adjIraHelp: document.getElementById('adj-ira-help'),
    adjHsaHelp: document.getElementById('adj-hsa-help'),
    adjSliHelp: document.getElementById('adj-sli-help'),

    // Step 4: Results
    resultHighlight: document.getElementById('result-highlight'),
    resultLabel: document.getElementById('result-label'),
    resultAmount: document.getElementById('result-amount'),
    resultTotalWages: document.getElementById('result-total-wages'),
    resultAdjustmentsRow: document.getElementById('result-adjustments-row'),
    resultAdjustmentsTotal: document.getElementById('result-adjustments-total'),
    resultAgiRow: document.getElementById('result-agi-row'),
    resultAgi: document.getElementById('result-agi'),
    resultFilingStatus: document.getElementById('result-filing-status'),
    resultStandardDeduction: document.getElementById('result-standard-deduction'),
    resultTaxableIncome: document.getElementById('result-taxable-income'),
    resultTaxLiability: document.getElementById('result-tax-liability'),
    resultCreditsRow: document.getElementById('result-credits-row'),
    resultCreditsApplied: document.getElementById('result-credits-applied'),
    resultCreditsDetail: document.getElementById('result-credits-detail'),
    resultTaxAfterCreditsRow: document.getElementById('result-tax-after-credits-row'),
    resultTaxAfterCredits: document.getElementById('result-tax-after-credits'),
    resultTotalWithheld: document.getElementById('result-total-withheld'),
    resultNetLabel: document.getElementById('result-net-label'),
    resultNetAmount: document.getElementById('result-net-amount'),
    bracketBreakdownContainer: document.getElementById('bracket-breakdown-container'),
    assumptionsList: document.getElementById('assumptions-list'),
    step4BackBtn: document.getElementById('step-4-back'),
    exportPdfBtn: document.getElementById('export-pdf'),

    // Scenarios
    saveScenarioBtn: document.getElementById('save-scenario'),
    scenariosList: document.getElementById('scenarios-list'),
    scenariosCompare: document.getElementById('scenarios-compare'),

    // Global
    startOverBtn: document.getElementById('start-over'),
};

const renderCache = {
    inputMode: null,
    w2Ids: [],
    paystubIds: []
};

function hasSameIds(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function shouldRebuildEntries(inputMode, w2Entries, paystubEntries) {
    const w2Ids = w2Entries.map(entry => entry.id);
    const paystubIds = paystubEntries.map(entry => entry.id);
    const needsRebuild = renderCache.inputMode !== inputMode ||
        !hasSameIds(renderCache.w2Ids, w2Ids) ||
        !hasSameIds(renderCache.paystubIds, paystubIds);

    if (needsRebuild) {
        renderCache.inputMode = inputMode;
        renderCache.w2Ids = w2Ids;
        renderCache.paystubIds = paystubIds;
    }

    return needsRebuild;
}

// IDs of scenarios currently selected for comparison.
let selectedComparison = [];

// =============================================================================
// Main Application Logic
// =============================================================================

function init() {
    console.log('Tax Estimator Initializing...');
    setupEventListeners();
    state.subscribe(render);
    console.log('Tax Estimator Ready.');
}

function render(appState) {
    const { currentStep } = appState;

    dom.steps.forEach(step => {
        const stepNumber = parseInt(step.id.split('-')[1], 10);
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    dom.progressSteps.forEach(step => {
        const stepNumber = parseInt(step.dataset.step, 10);
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active');
            step.classList.remove('completed');
        }
    });

    renderStep1(appState);
    renderStep2(appState);
    renderStep3(appState);
    renderStep4(appState);
    renderScenarios(appState);
}

function renderStep1(appState) {
    const { taxYear, filingStatus } = appState.session;
    dom.taxYearSelect.value = taxYear;
    dom.filingStatusRadios.forEach(radio => {
        radio.checked = radio.value === filingStatus;
    });
    const radioCards = document.querySelectorAll('.radio-card');
    radioCards.forEach(card => {
        const status = card.querySelector('input').value;
        const deductionEl = card.querySelector('.radio-card-deduction strong');
        if (deductionEl) {
            try {
                const deduction = getStandardDeduction(taxYear, status);
                deductionEl.textContent = calculator.formatCurrency(deduction);
            } catch (_) {
                // Unsupported combination — leave whatever was there.
            }
        }
    });
}

function renderStep2(appState) {
    const { inputMode } = appState.session;
    dom.inputModeRadios.forEach(radio => {
        radio.checked = radio.value === inputMode;
    });
}

function renderStep3(appState) {
    const { inputMode, taxYear } = appState.session;
    const { w2Entries, paystubEntries, adjustments, credits } = appState;

    dom.w2Section.style.display = (inputMode === 'w2_only' || inputMode === 'mixed') ? 'block' : 'none';
    dom.paystubSection.style.display = (inputMode === 'paystub_only' || inputMode === 'mixed') ? 'block' : 'none';

    if (shouldRebuildEntries(inputMode, w2Entries, paystubEntries)) {
        dom.w2EntriesContainer.innerHTML = w2Entries.map((entry, i) => w2EntryTemplate(entry, i)).join('');
        dom.paystubEntriesContainer.innerHTML = paystubEntries.map((entry, i) => paystubEntryTemplate(entry, i)).join('');
    }

    // Sync adjustment / credit inputs to state values
    dom.adjustmentInputs.forEach(input => {
        const field = input.dataset.adjustment;
        const v = adjustments?.[field] ?? 0;
        if (document.activeElement !== input) input.value = v;
    });
    dom.creditInputs.forEach(input => {
        const field = input.dataset.credit;
        const v = credits?.[field] ?? 0;
        if (document.activeElement !== input) input.value = v;
    });

    // Update adjustment cap help text for the active tax year
    const limits = getAdjustmentLimits(taxYear);
    if (dom.adjIraHelp) dom.adjIraHelp.textContent = `Max ${calculator.formatCurrency(limits.iraDeduction)}.`;
    if (dom.adjHsaHelp) dom.adjHsaHelp.textContent = `Max ${calculator.formatCurrency(limits.hsaDeduction)} (family) / ${calculator.formatCurrency(Math.round(limits.hsaDeduction / 2))} (self-only).`;
    if (dom.adjSliHelp) dom.adjSliHelp.textContent = `Max ${calculator.formatCurrency(limits.studentLoanInterest)}.`;

    updateSummary(appState);
}

function renderStep4(appState) {
    const { results, session } = appState;
    if (!results) {
        return;
    }

    if (results.isRefund) {
        dom.resultLabel.textContent = 'Estimated Refund';
        dom.resultAmount.textContent = calculator.formatCurrency(results.refundAmount);
        dom.resultHighlight.className = 'result-highlight refund';
        dom.resultNetLabel.textContent = 'Net Refund';
        dom.resultNetAmount.textContent = calculator.formatCurrency(results.refundAmount);
    } else {
        dom.resultLabel.textContent = 'Estimated Amount Due';
        dom.resultAmount.textContent = calculator.formatCurrency(results.amountDue);
        dom.resultHighlight.className = 'result-highlight due';
        dom.resultNetLabel.textContent = 'Net Amount Due';
        dom.resultNetAmount.textContent = calculator.formatCurrency(results.amountDue);
    }

    dom.resultTotalWages.textContent = calculator.formatCurrency(results.totalWages);
    dom.resultFilingStatus.textContent = calculator.getFilingStatusDisplayName(session.filingStatus);
    dom.resultStandardDeduction.textContent = `- ${calculator.formatCurrency(results.standardDeduction)}`;
    dom.resultTaxableIncome.textContent = calculator.formatCurrency(results.taxableIncome);
    dom.resultTaxLiability.textContent = calculator.formatCurrency(results.taxLiability);
    dom.resultTotalWithheld.textContent = `- ${calculator.formatCurrency(results.totalWithheld)}`;

    const adjustmentsTotal = results.adjustments?.total || 0;
    if (adjustmentsTotal > 0) {
        dom.resultAdjustmentsRow.hidden = false;
        dom.resultAgiRow.hidden = false;
        dom.resultAdjustmentsTotal.textContent = `- ${calculator.formatCurrency(adjustmentsTotal)}`;
        dom.resultAgi.textContent = calculator.formatCurrency(results.adjustedGrossIncome);
    } else {
        dom.resultAdjustmentsRow.hidden = true;
        dom.resultAgiRow.hidden = true;
    }

    const appliedCredit = results.credits?.appliedCredit || 0;
    if (appliedCredit > 0) {
        dom.resultCreditsRow.hidden = false;
        dom.resultTaxAfterCreditsRow.hidden = false;
        dom.resultCreditsApplied.textContent = `- ${calculator.formatCurrency(appliedCredit)}`;
        const phaseoutNote = results.credits.phaseoutReduction > 0
            ? ` (after ${calculator.formatCurrency(results.credits.phaseoutReduction)} phase-out)`
            : '';
        dom.resultCreditsDetail.textContent = phaseoutNote;
        dom.resultTaxAfterCredits.textContent = calculator.formatCurrency(results.taxAfterCredits);
    } else {
        dom.resultCreditsRow.hidden = true;
        dom.resultTaxAfterCreditsRow.hidden = true;
        dom.resultCreditsDetail.textContent = '';
    }

    dom.bracketBreakdownContainer.innerHTML = results.bracketBreakdown.map(b => `
        <div class="breakdown-row">
            <span>${calculator.formatPercentage(b.rate)} of ${calculator.formatCurrency(b.incomeInBracket)}</span>
            <span>${calculator.formatCurrency(b.taxFromBracket)}</span>
        </div>
    `).join('');
}


function setupEventListeners() {
    // Step 1
    dom.taxYearSelect.addEventListener('change', handleTaxYearChange);
    dom.filingStatusRadios.forEach(radio => radio.addEventListener('change', handleFilingStatusChange));
    dom.step1NextBtn.addEventListener('click', () => handleNavigation('next'));

    // Step 2
    dom.inputModeRadios.forEach(radio => radio.addEventListener('change', handleInputModeChange));
    dom.step2BackBtn.addEventListener('click', () => handleNavigation('back'));
    dom.step2NextBtn.addEventListener('click', () => handleNavigation('next'));

    // Step 3 — income entries
    dom.addW2Btn.addEventListener('click', addW2Entry);
    dom.addPaystubBtn.addEventListener('click', addPaystubEntry);
    dom.w2EntriesContainer.addEventListener('input', handleEntryPreview);
    dom.paystubEntriesContainer.addEventListener('input', handleEntryPreview);
    dom.w2EntriesContainer.addEventListener('change', handleEntryCommit);
    dom.paystubEntriesContainer.addEventListener('change', handleEntryCommit);
    dom.w2EntriesContainer.addEventListener('click', handleRemoveEntry);
    dom.paystubEntriesContainer.addEventListener('click', handleRemoveEntry);

    // Step 3 — adjustments + credits
    dom.adjustmentInputs.forEach(input => {
        input.addEventListener('input', handleAdjustmentPreview);
        input.addEventListener('change', handleAdjustmentCommit);
    });
    dom.creditInputs.forEach(input => {
        input.addEventListener('change', handleCreditCommit);
    });

    dom.step3BackBtn.addEventListener('click', () => handleNavigation('back'));
    dom.calculateBtn.addEventListener('click', handleCalculation);

    // Step 4
    dom.step4BackBtn.addEventListener('click', () => handleNavigation('back', 3));
    dom.exportPdfBtn.addEventListener('click', handleExportPdf);

    // Scenarios
    dom.saveScenarioBtn?.addEventListener('click', handleSaveScenario);
    dom.scenariosList?.addEventListener('click', handleScenariosListClick);
    dom.scenariosList?.addEventListener('change', handleScenariosListChange);

    // Global
    dom.startOverBtn.addEventListener('click', () => {
        if (confirm('Clear the current estimate? Saved scenarios will be kept.')) {
            state.reset();
        }
    });
}

// =============================================================================
// Event Handlers
// =============================================================================

function handleTaxYearChange(event) {
    const newYear = parseInt(event.target.value, 10);
    state.updateState({ session: { ...state.getState().session, taxYear: newYear } });
}

function handleFilingStatusChange(event) {
    const newStatus = event.target.value;
    state.updateState({ session: { ...state.getState().session, filingStatus: newStatus } });
}

function handleInputModeChange(event) {
    const newMode = event.target.value;
    const updates = { session: { ...state.getState().session, inputMode: newMode } };
    if (newMode === 'w2_only') updates.paystubEntries = [];
    if (newMode === 'paystub_only') updates.w2Entries = [];
    state.updateState(updates);
}

function addW2Entry() {
    const newEntry = { id: Date.now(), box1Wages: 0, box2Withheld: 0 };
    const w2Entries = [...state.getState().w2Entries, newEntry];
    state.updateState({ w2Entries });
}

function addPaystubEntry() {
    const newEntry = { id: Date.now(), ytdTaxableWages: 0, ytdFedWithheld: 0, paychecksReceived: 0, paychecksRemaining: 0 };
    const paystubEntries = [...state.getState().paystubEntries, newEntry];
    state.updateState({ paystubEntries });
}

function parseNumericValue(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function collectEntriesFromDom() {
    const w2Entries = Array.from(dom.w2EntriesContainer.querySelectorAll('.entry-card')).map(card => {
        const entry = { id: parseInt(card.dataset.id, 10) };
        card.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            entry[field] = input.type === 'number' ? parseNumericValue(input.value) : input.value;
        });
        return entry;
    });

    const paystubEntries = Array.from(dom.paystubEntriesContainer.querySelectorAll('.entry-card')).map(card => {
        const entry = { id: parseInt(card.dataset.id, 10) };
        card.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            entry[field] = input.type === 'number' ? parseNumericValue(input.value) : input.value;
        });
        return entry;
    });

    return { w2Entries, paystubEntries };
}

function collectAdjustmentsFromDom() {
    const adjustments = { ...state.getState().adjustments };
    dom.adjustmentInputs.forEach(input => {
        adjustments[input.dataset.adjustment] = parseNumericValue(input.value);
    });
    return adjustments;
}

function updateSummaryFromDom() {
    const { w2Entries, paystubEntries } = collectEntriesFromDom();
    const adjustments = collectAdjustmentsFromDom();
    const { totalWages, totalWithheld } = calculator.aggregateAllEntries(w2Entries, paystubEntries);
    dom.summaryTotalWages.textContent = calculator.formatCurrency(totalWages);
    dom.summaryTotalWithheld.textContent = calculator.formatCurrency(totalWithheld);
    const normalized = calculator.normalizeAdjustments(adjustments, state.getState().session.taxYear);
    if (normalized.total > 0) {
        dom.summaryAdjustmentsRow.hidden = false;
        dom.summaryTotalAdjustments.textContent = `- ${calculator.formatCurrency(normalized.total)}`;
    } else {
        dom.summaryAdjustmentsRow.hidden = true;
    }
}

function syncEntriesToState() {
    const { w2Entries, paystubEntries } = collectEntriesFromDom();
    state.updateState({ w2Entries, paystubEntries });
}

function handleEntryPreview(event) {
    const target = event.target;
    if (target.tagName !== 'INPUT') return;
    updateSummaryFromDom();
}

function handleEntryCommit(event) {
    const target = event.target;
    if (target.tagName !== 'INPUT') return;

    const id = parseInt(target.closest('.entry-card').dataset.id, 10);
    const field = target.dataset.field;
    const value = target.type === 'number' ? parseNumericValue(target.value) : target.value;

    const container = target.closest('.entries-container');
    const isW2 = container.id === 'w2-entries-container';

    const entriesKey = isW2 ? 'w2Entries' : 'paystubEntries';
    const updatedEntries = state.getState()[entriesKey].map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
    );

    state.updateState({ [entriesKey]: updatedEntries });
}

function handleRemoveEntry(event) {
    const target = event.target;
    if (!target.classList.contains('btn-remove')) return;

    const id = parseInt(target.dataset.id, 10);
    const type = target.dataset.type;
    const entriesKey = type === 'w2' ? 'w2Entries' : 'paystubEntries';

    const updatedEntries = state.getState()[entriesKey].filter(entry => entry.id !== id);
    state.updateState({ [entriesKey]: updatedEntries });
}

function handleAdjustmentPreview() {
    updateSummaryFromDom();
}

function handleAdjustmentCommit(event) {
    const field = event.target.dataset.adjustment;
    state.setAdjustment(field, parseNumericValue(event.target.value));
}

function handleCreditCommit(event) {
    const field = event.target.dataset.credit;
    const value = Math.max(0, Math.floor(parseNumericValue(event.target.value)));
    state.setCredit(field, value);
}

// =============================================================================
// Summary & Validation
// =============================================================================

function updateSummary(appState) {
    const { w2Entries, paystubEntries, adjustments, session } = appState;
    const { totalWages, totalWithheld } = calculator.aggregateAllEntries(w2Entries, paystubEntries);
    dom.summaryTotalWages.textContent = calculator.formatCurrency(totalWages);
    dom.summaryTotalWithheld.textContent = calculator.formatCurrency(totalWithheld);
    const normalized = calculator.normalizeAdjustments(adjustments, session.taxYear);
    if (normalized.total > 0) {
        dom.summaryAdjustmentsRow.hidden = false;
        dom.summaryTotalAdjustments.textContent = `- ${calculator.formatCurrency(normalized.total)}`;
    } else {
        dom.summaryAdjustmentsRow.hidden = true;
    }
}

function showError(element, message) {
    element.classList.add('error');
    let errorEl = element.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('error-message')) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        element.parentNode.insertBefore(errorEl, element.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function clearAllErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
}

function validateStep(step) {
    const { session, w2Entries, paystubEntries } = state.getState();
    let isValid = true;
    clearAllErrors();

    switch (step) {
        case 1:
            if (!session.taxYear) isValid = false;
            if (!session.filingStatus) isValid = false;
            return isValid;
        case 2:
            if (!session.inputMode) isValid = false;
            return isValid;
        case 3: {
            const checkW2s = session.inputMode === 'w2_only' || session.inputMode === 'mixed';
            const checkPaystubs = session.inputMode === 'paystub_only' || session.inputMode === 'mixed';

            if (checkW2s) {
                if (w2Entries.length === 0) isValid = false;
                w2Entries.forEach(w2 => {
                    const w2Card = dom.w2EntriesContainer.querySelector(`[data-id="${w2.id}"]`);
                    if (w2.box1Wages === undefined || w2.box1Wages < 0) {
                        isValid = false;
                        showError(w2Card.querySelector('[data-field="box1Wages"]'), 'Wages must be a positive number.');
                    }
                    if (w2.box2Withheld === undefined || w2.box2Withheld < 0) {
                        isValid = false;
                        showError(w2Card.querySelector('[data-field="box2Withheld"]'), 'Withholding must be a positive number.');
                    }
                });
            }
            if (checkPaystubs) {
                if (paystubEntries.length === 0) isValid = false;
                paystubEntries.forEach(ps => {
                    const psCard = dom.paystubEntriesContainer.querySelector(`[data-id="${ps.id}"]`);
                     if (ps.ytdTaxableWages === undefined || ps.ytdTaxableWages < 0) {
                        isValid = false;
                        showError(psCard.querySelector('[data-field="ytdTaxableWages"]'), 'Wages must be a positive number.');
                    }
                    if (ps.ytdFedWithheld === undefined || ps.ytdFedWithheld < 0) {
                        isValid = false;
                        showError(psCard.querySelector('[data-field="ytdFedWithheld"]'), 'Withholding must be a positive number.');
                    }
                    const received = ps.paychecksReceived || 0;
                    const remaining = ps.paychecksRemaining || 0;
                    if (received < 0 || !Number.isInteger(received)) {
                        isValid = false;
                        showError(psCard.querySelector('[data-field="paychecksReceived"]'), 'Must be a whole number 0 or greater.');
                    }
                    if (remaining < 0 || !Number.isInteger(remaining)) {
                        isValid = false;
                        showError(psCard.querySelector('[data-field="paychecksRemaining"]'), 'Must be a whole number 0 or greater.');
                    }
                    if (remaining > 0 && received <= 0) {
                        isValid = false;
                        showError(psCard.querySelector('[data-field="paychecksReceived"]'), 'Enter paychecks received to project year-end.');
                    }
                });
            }
            return isValid;
        }
        default:
            return true;
    }
}

// =============================================================================
// Calculation Logic
// =============================================================================

function handleCalculation() {
    syncEntriesToState();

    if (!validateStep(3)) {
        return;
    }

    const currentState = state.getState();
    const { session, w2Entries, paystubEntries, adjustments, credits } = currentState;
    try {
        const results = calculator.calculateFromSession({
            taxYear: session.taxYear,
            filingStatus: session.filingStatus,
            w2Entries,
            paystubEntries,
            adjustments,
            credits
        });
        state.updateState({ results });
        handleNavigation('next');
    } catch (error) {
        console.error('Failed to calculate estimate:', error);
        alert('Unable to calculate estimate. Please check your inputs and try again.');
    }
}

// =============================================================================
// Scenarios
// =============================================================================

function handleSaveScenario() {
    const defaultName = `Scenario ${state.getScenarios().length + 1}`;
    const name = prompt('Name this scenario:', defaultName);
    if (name === null) return; // cancelled
    state.saveScenario(name || defaultName);
}

function handleScenariosListClick(event) {
    const target = event.target;
    if (target.classList.contains('scenario-remove')) {
        const id = target.dataset.id;
        if (confirm('Delete this scenario?')) {
            selectedComparison = selectedComparison.filter(sid => sid !== id);
            state.removeScenario(id);
        }
    } else if (target.classList.contains('scenario-load')) {
        const id = target.dataset.id;
        const scenario = state.getScenarios().find(s => s.id === id);
        if (!scenario) return;
        if (!confirm(`Load "${scenario.name}" into the estimator? Your current inputs will be replaced.`)) return;
        state.updateState({
            session: { ...scenario.session },
            w2Entries: scenario.w2Entries.map(e => ({ ...e })),
            paystubEntries: scenario.paystubEntries.map(e => ({ ...e })),
            adjustments: { ...scenario.adjustments },
            credits: { ...scenario.credits },
            results: scenario.results
                ? { ...scenario.results, calculatedAt: scenario.results.calculatedAt ? new Date(scenario.results.calculatedAt) : new Date() }
                : null
        });
    } else if (target.classList.contains('scenario-rename')) {
        const id = target.dataset.id;
        const scenario = state.getScenarios().find(s => s.id === id);
        if (!scenario) return;
        const newName = prompt('Rename scenario:', scenario.name);
        if (newName) state.renameScenario(id, newName);
    }
}

function handleScenariosListChange(event) {
    const target = event.target;
    if (!target.classList.contains('scenario-compare-toggle')) return;
    const id = target.dataset.id;
    if (target.checked) {
        if (!selectedComparison.includes(id)) selectedComparison.push(id);
        // Limit to 3 scenarios in the comparison view to keep it readable
        if (selectedComparison.length > 3) {
            const removed = selectedComparison.shift();
            const removedInput = dom.scenariosList.querySelector(`.scenario-compare-toggle[data-id="${removed}"]`);
            if (removedInput) removedInput.checked = false;
        }
    } else {
        selectedComparison = selectedComparison.filter(sid => sid !== id);
    }
    renderComparison();
}

function renderScenarios() {
    if (!dom.scenariosList) return;
    const scenarios = state.getScenarios();
    // Drop any selected IDs that no longer exist
    selectedComparison = selectedComparison.filter(id => scenarios.some(s => s.id === id));

    if (scenarios.length === 0) {
        dom.scenariosList.innerHTML = '<p class="form-help">No saved scenarios yet. Save the current estimate to start comparing.</p>';
        dom.scenariosCompare.hidden = true;
        dom.scenariosCompare.innerHTML = '';
        return;
    }

    dom.scenariosList.innerHTML = scenarios.map(s => scenarioCardTemplate(s, selectedComparison.includes(s.id))).join('');
    renderComparison();
}

function renderComparison() {
    if (!dom.scenariosCompare) return;
    const scenarios = state.getScenarios().filter(s => selectedComparison.includes(s.id));
    if (scenarios.length < 2) {
        dom.scenariosCompare.hidden = true;
        dom.scenariosCompare.innerHTML = '';
        return;
    }

    const rows = [
        { label: 'Filing Status', getValue: s => calculator.getFilingStatusDisplayName(s.session.filingStatus) },
        { label: 'Tax Year', getValue: s => s.session.taxYear },
        { label: 'Total Wages', getValue: s => calculator.formatCurrency(s.results?.totalWages || 0) },
        { label: 'Adjustments', getValue: s => calculator.formatCurrency(s.results?.adjustments?.total || 0) },
        { label: 'Standard Deduction', getValue: s => calculator.formatCurrency(s.results?.standardDeduction || 0) },
        { label: 'Taxable Income', getValue: s => calculator.formatCurrency(s.results?.taxableIncome || 0) },
        { label: 'Tax Liability', getValue: s => calculator.formatCurrency(s.results?.taxLiability || 0) },
        { label: 'Credits Applied', getValue: s => calculator.formatCurrency(s.results?.credits?.appliedCredit || 0) },
        { label: 'Withholding', getValue: s => calculator.formatCurrency(s.results?.totalWithheld || 0) },
        { label: 'Refund / (Due)', getValue: s => {
            if (!s.results) return '—';
            return s.results.isRefund
                ? calculator.formatCurrency(s.results.refundAmount)
                : `(${calculator.formatCurrency(s.results.amountDue)})`;
        }}
    ];

    dom.scenariosCompare.hidden = false;
    dom.scenariosCompare.innerHTML = `
        <h4>Side-by-Side Comparison</h4>
        <div class="compare-table-wrap">
            <table class="compare-table">
                <thead>
                    <tr>
                        <th></th>
                        ${scenarios.map(s => `<th>${escapeHtml(s.name)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <th scope="row">${row.label}</th>
                            ${scenarios.map(s => `<td>${row.getValue(s)}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function scenarioCardTemplate(scenario, isSelected) {
    const summary = scenario.results
        ? (scenario.results.isRefund
            ? `Refund: ${calculator.formatCurrency(scenario.results.refundAmount)}`
            : `Owed: ${calculator.formatCurrency(scenario.results.amountDue)}`)
        : 'Not yet calculated';
    const saved = new Date(scenario.savedAt).toLocaleString();
    return `
        <div class="scenario-card">
            <div class="scenario-card-header">
                <label class="scenario-select">
                    <input type="checkbox" class="scenario-compare-toggle" data-id="${scenario.id}" ${isSelected ? 'checked' : ''} />
                    <span class="scenario-name">${escapeHtml(scenario.name)}</span>
                </label>
                <span class="scenario-summary">${summary}</span>
            </div>
            <div class="scenario-card-meta">
                <span>${calculator.getFilingStatusDisplayName(scenario.session.filingStatus)} · ${scenario.session.taxYear}</span>
                <span class="scenario-date">${saved}</span>
            </div>
            <div class="scenario-card-actions">
                <button type="button" class="btn-link scenario-load" data-id="${scenario.id}">Load</button>
                <button type="button" class="btn-link scenario-rename" data-id="${scenario.id}">Rename</button>
                <button type="button" class="btn-link scenario-remove" data-id="${scenario.id}">Delete</button>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =============================================================================
// Export & Reset Logic
// =============================================================================

function handleExportPdf() {
    const { results, session, w2Entries, paystubEntries } = state.getState();
    if (!results) {
        alert('Please calculate an estimate before exporting.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text(`Tax Estimate - ${session.taxYear}`, 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
    doc.text(`Filing Status: ${calculator.getFilingStatusDisplayName(session.filingStatus)}`, 105, 36, { align: 'center' });

    doc.setFontSize(18);
    const resultText = results.isRefund
        ? `Estimated Refund: ${calculator.formatCurrency(results.refundAmount)}`
        : `Estimated Amount Due: ${calculator.formatCurrency(results.amountDue)}`;
    doc.text(resultText, 20, 50);

    let y = 65;
    doc.setFontSize(14);
    doc.text('Calculation Summary', 20, y);
    y += 7;
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 7;

    doc.setFontSize(12);
    const summary = [
        ['Total Wages', calculator.formatCurrency(results.totalWages)]
    ];
    if (results.adjustments && results.adjustments.total > 0) {
        summary.push(['Adjustments to Income', `- ${calculator.formatCurrency(results.adjustments.total)}`]);
        summary.push(['Adjusted Gross Income', calculator.formatCurrency(results.adjustedGrossIncome)]);
    }
    summary.push(['Standard Deduction', `- ${calculator.formatCurrency(results.standardDeduction)}`]);
    summary.push(['Taxable Income', calculator.formatCurrency(results.taxableIncome)]);
    summary.push(['Estimated Tax Liability', calculator.formatCurrency(results.taxLiability)]);
    if (results.credits && results.credits.appliedCredit > 0) {
        summary.push(['Non-refundable Credits', `- ${calculator.formatCurrency(results.credits.appliedCredit)}`]);
        summary.push(['Tax After Credits', calculator.formatCurrency(results.taxAfterCredits)]);
    }
    summary.push(['Total Federal Withheld', `- ${calculator.formatCurrency(results.totalWithheld)}`]);

    summary.forEach(([label, value]) => {
        doc.text(label, 20, y);
        doc.text(value, 180, y, { align: 'right' });
        y += 7;
    });

    y += 10;
    doc.setFontSize(14);
    doc.text('Income & Withholding Inputs', 20, y);
    y += 7;
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 7;
    doc.setFontSize(12);

    w2Entries.forEach((w2, i) => {
        doc.text(`W-2 #${i + 1}: Wages ${calculator.formatCurrency(w2.box1Wages)}, Withheld ${calculator.formatCurrency(w2.box2Withheld)}`, 20, y);
        y += 7;
    });
    paystubEntries.forEach((ps, i) => {
        doc.text(`Paystub #${i + 1}: YTD Wages ${calculator.formatCurrency(ps.ytdTaxableWages)}, YTD Withheld ${calculator.formatCurrency(ps.ytdFedWithheld)}`, 20, y);
        y += 7;
    });

    if (results.adjustments && results.adjustments.total > 0) {
        y += 5;
        doc.text('Adjustments:', 20, y); y += 7;
        if (results.adjustments.iraDeduction > 0) { doc.text(`  Traditional IRA: ${calculator.formatCurrency(results.adjustments.iraDeduction)}`, 20, y); y += 7; }
        if (results.adjustments.hsaDeduction > 0) { doc.text(`  HSA: ${calculator.formatCurrency(results.adjustments.hsaDeduction)}`, 20, y); y += 7; }
        if (results.adjustments.studentLoanInterest > 0) { doc.text(`  Student loan interest: ${calculator.formatCurrency(results.adjustments.studentLoanInterest)}`, 20, y); y += 7; }
    }
    if (results.credits && (results.credits.qualifyingChildren > 0 || results.credits.otherDependents > 0)) {
        y += 5;
        doc.text(`Credits: ${results.credits.qualifyingChildren} qualifying child(ren), ${results.credits.otherDependents} other dependent(s)`, 20, y);
        y += 7;
    }

    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(150);
    const disclaimer = "This is an informational estimate, not tax advice. Consult a tax professional for filing.";
    doc.text(disclaimer, 105, y, { align: 'center', maxWidth: 180 });


    const date = new Date().toISOString().split('T')[0];
    doc.save(`tax_estimate_${session.taxYear}_${date}.pdf`);
}

// =============================================================================
// Navigation
// =============================================================================

function handleNavigation(direction, targetStep) {
    const currentState = state.getState();
    const { currentStep } = currentState;
    let nextStep;

    if (targetStep !== undefined) {
        nextStep = targetStep;
    } else if (direction === 'next') {
        if (!validateStep(currentStep)) {
            return;
        }
        nextStep = currentStep + 1;
    } else if (direction === 'back') {
        nextStep = currentStep - 1;
    }

    if (nextStep < 1 || nextStep > 4) {
        return;
    }

    state.updateState({ currentStep: nextStep });
    window.scrollTo(0, 0);
}

// =============================================================================
// Entry Card Templates
// =============================================================================

function w2EntryTemplate(entry, index) {
    return `
        <div class="entry-card" data-id="${entry.id}">
            <div class="entry-header">
                <h4>W-2 #${index + 1}</h4>
                <button type="button" class="btn-remove" data-id="${entry.id}" data-type="w2">Remove</button>
            </div>
            <div class="entry-body">
                <div class="form-group">
                    <label class="form-label">
                        Employer Name (Optional)
                    </label>
                    <input
                        type="text"
                        class="form-input"
                        data-field="label"
                        value="${entry.label || ''}"
                        placeholder="e.g., Acme Corp"
                    />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            Box 1: Wages
                            <span class="required">*</span>
                        </label>
                        <div class="input-with-icon">
                            <span class="input-icon">$</span>
                            <input
                                type="number"
                                class="form-input"
                                data-field="box1Wages"
                                value="${entry.box1Wages || 0}"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <small class="form-help">Wages, tips, other compensation</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            Box 2: Federal Tax Withheld
                            <span class="required">*</span>
                        </label>
                        <div class="input-with-icon">
                            <span class="input-icon">$</span>
                            <input
                                type="number"
                                class="form-input"
                                data-field="box2Withheld"
                                value="${entry.box2Withheld || 0}"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <small class="form-help">Federal income tax withheld</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function paystubEntryTemplate(entry, index) {
    return `
        <div class="entry-card" data-id="${entry.id}">
            <div class="entry-header">
                <h4>Paystub #${index + 1}</h4>
                <button type="button" class="btn-remove" data-id="${entry.id}" data-type="paystub">Remove</button>
            </div>
            <div class="entry-body">
                <div class="form-group">
                    <label class="form-label">
                        Employer Name (Optional)
                    </label>
                    <input
                        type="text"
                        class="form-input"
                        data-field="label"
                        value="${entry.label || ''}"
                        placeholder="e.g., Acme Corp"
                    />
                </div>
                <div class="form-group">
                    <label class="form-label">
                        Pay Date (Optional)
                    </label>
                    <input
                        type="date"
                        class="form-input"
                        data-field="payDate"
                        value="${entry.payDate || ''}"
                    />
                    <small class="form-help">Date of this paystub</small>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            YTD Taxable Wages
                            <span class="required">*</span>
                        </label>
                        <div class="input-with-icon">
                            <span class="input-icon">$</span>
                            <input
                                type="number"
                                class="form-input"
                                data-field="ytdTaxableWages"
                                value="${entry.ytdTaxableWages || 0}"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <small class="form-help">Year-to-date taxable wages</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            YTD Federal Tax Withheld
                            <span class="required">*</span>
                        </label>
                        <div class="input-with-icon">
                            <span class="input-icon">$</span>
                            <input
                                type="number"
                                class="form-input"
                                data-field="ytdFedWithheld"
                                value="${entry.ytdFedWithheld || 0}"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <small class="form-help">Year-to-date federal tax withheld</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            Paychecks Received
                        </label>
                        <input
                            type="number"
                            class="form-input"
                            data-field="paychecksReceived"
                            value="${entry.paychecksReceived || 0}"
                            min="0"
                            step="1"
                        />
                        <small class="form-help">Paychecks this YTD total covers</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            Paychecks Remaining
                        </label>
                        <input
                            type="number"
                            class="form-input"
                            data-field="paychecksRemaining"
                            value="${entry.paychecksRemaining || 0}"
                            min="0"
                            step="1"
                        />
                        <small class="form-help">Paychecks still to come this year</small>
                    </div>
                </div>
                <small class="form-help">
                    If both are provided, year-end wages and withholding are projected by extrapolating the YTD average.
                </small>
            </div>
        </div>
    `;
}

// =============================================================================
// Initialization
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
