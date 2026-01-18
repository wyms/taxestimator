/**
 * Tax Estimator - Estimator Page Logic
 *
 * This script handles all the interactivity for the estimator.html page, including:
 * - Multi-step form navigation
 * - State management for user inputs
 * - Dynamic form generation for W-2s and paystubs
 * - Input validation and real-time feedback
 * - Integration with the tax calculation engine
 * - Displaying final results
 */

import { getStandardDeduction, getTaxBrackets, SUPPORTED_TAX_YEARS, FILING_STATUSES } from '../src/data/taxConfig.js';
import calculator from '../src/utils/calculator.js';
import state from '../src/utils/stateManager.js';

// =============================================================================
// DOM Element Selectors
// =============================================================================
const dom = {
    // Steps
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
    step3BackBtn: document.getElementById('step-3-back'),
    calculateBtn: document.getElementById('step-3-calculate'),

    // Step 4: Results
    resultHighlight: document.getElementById('result-highlight'),
    resultLabel: document.getElementById('result-label'),
    resultAmount: document.getElementById('result-amount'),
    resultTotalWages: document.getElementById('result-total-wages'),
    resultFilingStatus: document.getElementById('result-filing-status'),
    resultStandardDeduction: document.getElementById('result-standard-deduction'),
    resultTaxableIncome: document.getElementById('result-taxable-income'),
    resultTaxLiability: document.getElementById('result-tax-liability'),
    resultTotalWithheld: document.getElementById('result-total-withheld'),
    resultNetLabel: document.getElementById('result-net-label'),
    resultNetAmount: document.getElementById('result-net-amount'),
    bracketBreakdownContainer: document.getElementById('bracket-breakdown-container'),
    assumptionsList: document.getElementById('assumptions-list'),
    step4BackBtn: document.getElementById('step-4-back'),
    exportPdfBtn: document.getElementById('export-pdf'),

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

// =============================================================================
// Main Application Logic
// =============================================================================

/**
 * Initializes the estimator application
 */
function init() {
    console.log('Tax Estimator Initializing...');
    setupEventListeners();
    state.subscribe(render); // Subscribe the render function to state changes
    state.reset(); // Initialize state and trigger first render
    console.log('Tax Estimator Ready.');
}

/**
 * Central render function to update the UI based on state
 * @param {object} appState - The current application state
 */
function render(appState) {
    // console.log('Rendering state:', appState);
    const { currentStep } = appState;

    // Update visibility of step content
    dom.steps.forEach(step => {
        const stepNumber = parseInt(step.id.split('-')[1], 10);
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Update state of progress bar
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

    // Render specific step details
    renderStep1(appState);
    renderStep2(appState);
    renderStep3(appState);
    renderStep4(appState);
}

/**
 * Renders the UI for Step 1 based on the current state
 * @param {object} appState - The current application state
 */
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
            const deduction = getStandardDeduction(taxYear, status);
            deductionEl.textContent = calculator.formatCurrency(deduction);
        }
    });
}

/**
 * Renders the UI for Step 2 based on the current state
 * @param {object} appState - The current application state
 */
function renderStep2(appState) {
    const { inputMode } = appState.session;
    dom.inputModeRadios.forEach(radio => {
        radio.checked = radio.value === inputMode;
    });
}

/**
 * Renders the UI for Step 3 based on the current state
 * @param {object} appState - The current application state
 */
function renderStep3(appState) {
    const { inputMode } = appState.session;
    const { w2Entries, paystubEntries } = appState;

    // Show/hide sections based on input mode
    dom.w2Section.style.display = (inputMode === 'w2_only' || inputMode === 'mixed') ? 'block' : 'none';
    dom.paystubSection.style.display = (inputMode === 'paystub_only' || inputMode === 'mixed') ? 'block' : 'none';

    if (shouldRebuildEntries(inputMode, w2Entries, paystubEntries)) {
        // Generate and render entry cards only when structure changes
        dom.w2EntriesContainer.innerHTML = w2Entries.map((entry, i) => w2EntryTemplate(entry, i)).join('');
        dom.paystubEntriesContainer.innerHTML = paystubEntries.map((entry, i) => paystubEntryTemplate(entry, i)).join('');
    }

    // Update summary
    updateSummary(appState);
}

/**
 * Renders the UI for Step 4 (Results) based on the current state
 * @param {object} appState - The current application state
 */
function renderStep4(appState) {
    const { results, session } = appState;
    if (!results) {
        // You could hide the results section or show a placeholder
        return;
    }

    // Main result display
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

    // Calculation breakdown
    dom.resultTotalWages.textContent = calculator.formatCurrency(results.totalWages);
    dom.resultFilingStatus.textContent = calculator.getFilingStatusDisplayName(session.filingStatus);
    dom.resultStandardDeduction.textContent = `- ${calculator.formatCurrency(results.standardDeduction)}`;
    dom.resultTaxableIncome.textContent = calculator.formatCurrency(results.taxableIncome);
    dom.resultTaxLiability.textContent = calculator.formatCurrency(results.taxLiability);
    dom.resultTotalWithheld.textContent = `- ${calculator.formatCurrency(results.totalWithheld)}`;

    // Bracket breakdown
    dom.bracketBreakdownContainer.innerHTML = results.bracketBreakdown.map(b => `
        <div class="breakdown-row">
            <span>${calculator.formatPercentage(b.rate)} of ${calculator.formatCurrency(b.incomeInBracket)}</span>
            <span>${calculator.formatCurrency(b.taxFromBracket)}</span>
        </div>
    `).join('');
}


/**
 * Sets up all event listeners for the application
 */
function setupEventListeners() {
    // Step 1
    dom.taxYearSelect.addEventListener('change', handleTaxYearChange);
    dom.filingStatusRadios.forEach(radio => radio.addEventListener('change', handleFilingStatusChange));
    dom.step1NextBtn.addEventListener('click', () => handleNavigation('next'));

    // Step 2
    dom.inputModeRadios.forEach(radio => radio.addEventListener('change', handleInputModeChange));
    dom.step2BackBtn.addEventListener('click', () => handleNavigation('back'));
    dom.step2NextBtn.addEventListener('click', () => handleNavigation('next'));

    // Step 3
    dom.addW2Btn.addEventListener('click', addW2Entry);
    dom.addPaystubBtn.addEventListener('click', addPaystubEntry);
    dom.w2EntriesContainer.addEventListener('input', handleEntryPreview);
    dom.paystubEntriesContainer.addEventListener('input', handleEntryPreview);
    dom.w2EntriesContainer.addEventListener('change', handleEntryCommit);
    dom.paystubEntriesContainer.addEventListener('change', handleEntryCommit);
    dom.w2EntriesContainer.addEventListener('click', handleRemoveEntry);
    dom.paystubEntriesContainer.addEventListener('click', handleRemoveEntry);
    dom.step3BackBtn.addEventListener('click', () => handleNavigation('back'));
    dom.calculateBtn.addEventListener('click', handleCalculation);

    // Step 4
    dom.step4BackBtn.addEventListener('click', () => handleNavigation('back', 3));
    dom.exportPdfBtn.addEventListener('click', handleExportPdf);

    // Global
    dom.startOverBtn.addEventListener('click', () => state.reset());
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
    // When mode changes, clear out entries that are no longer visible
    const { w2Entries, paystubEntries } = state.getState();
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
    const newEntry = { id: Date.now(), ytdTaxableWages: 0, ytdFedWithheld: 0 };
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

function updateSummaryFromDom() {
    const { w2Entries, paystubEntries } = collectEntriesFromDom();
    const { totalWages, totalWithheld } = calculator.aggregateAllEntries(w2Entries, paystubEntries);
    dom.summaryTotalWages.textContent = calculator.formatCurrency(totalWages);
    dom.summaryTotalWithheld.textContent = calculator.formatCurrency(totalWithheld);
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

// =============================================================================
// Summary & Validation
// =============================================================================

function updateSummary(appState) {
    const { w2Entries, paystubEntries } = appState;
    const { totalWages, totalWithheld } = calculator.aggregateAllEntries(w2Entries, paystubEntries);
    dom.summaryTotalWages.textContent = calculator.formatCurrency(totalWages);
    dom.summaryTotalWithheld.textContent = calculator.formatCurrency(totalWithheld);
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

/**
 * Validates the inputs for the current step before proceeding
 * @param {number} step - The step number to validate
 * @returns {boolean} - True if the step is valid, false otherwise
 */
function validateStep(step) {
    const { session, w2Entries, paystubEntries } = state.getState();
    let isValid = true;
    clearAllErrors();

    switch (step) {
        case 1:
            if (!session.taxYear) {
                isValid = false;
                // In a real app, you'd show an error, but this is handled by `required`
            }
            if (!session.filingStatus) {
                isValid = false;
                // In a real app, you'd show an error
            }
            return isValid;
        case 2:
            if (!session.inputMode) isValid = false;
            return isValid;
        case 3:
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
                });
            }
            return isValid;
        default:
            return true;
    }
}

// =============================================================================
// Calculation Logic
// =============================================================================

/**
 * Gathers data, runs calculations, and navigates to the results step
 */
function handleCalculation() {
    syncEntriesToState();

    if (!validateStep(3)) {
        // Errors are shown visually by validateStep
        return;
    }

    const currentState = state.getState();
    const { session, w2Entries, paystubEntries } = currentState;
    try {
        const results = calculator.calculateFromSession({
            taxYear: session.taxYear,
            filingStatus: session.filingStatus,
            w2Entries,
            paystubEntries
        });
        state.updateState({ results });
        handleNavigation('next');
    } catch (error) {
        console.error('Failed to calculate estimate:', error);
        alert('Unable to calculate estimate. Please check your inputs and try again.');
    }
}

// =============================================================================
// Export & Reset Logic
// =============================================================================

/**
 * Handles the PDF export functionality
 */
function handleExportPdf() {
    const { results, session, w2Entries, paystubEntries } = state.getState();
    if (!results) {
        alert('Please calculate an estimate before exporting.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add content to the PDF
    doc.setFontSize(22);
    doc.text(`Tax Estimate - ${session.taxYear}`, 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
    doc.text(`Filing Status: ${calculator.getFilingStatusDisplayName(session.filingStatus)}`, 105, 36, { align: 'center' });

    // Main result
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
        ['Total Wages', calculator.formatCurrency(results.totalWages)],
        ['Standard Deduction', `- ${calculator.formatCurrency(results.standardDeduction)}`],
        ['Taxable Income', calculator.formatCurrency(results.taxableIncome)],
        ['Estimated Tax Liability', calculator.formatCurrency(results.taxLiability)],
        ['Total Federal Withheld', `- ${calculator.formatCurrency(results.totalWithheld)}`],
    ];
    summary.forEach(([label, value]) => {
        doc.text(label, 20, y);
        doc.text(value, 180, y, { align: 'right' });
        y += 7;
    });

    // Inputs
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


    // Disclaimer
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(150);
    const disclaimer = "This is an informational estimate, not tax advice. Consult a tax professional for filing.";
    doc.text(disclaimer, 105, y, { align: 'center', maxWidth: 180 });


    // Save the PDF
    const date = new Date().toISOString().split('T')[0];
    doc.save(`tax_estimate_${session.taxYear}_${date}.pdf`);
}

// =============================================================================
// Navigation
// =============================================================================

/**
 * Handles navigation between steps
 * @param {string} direction - 'next' or 'back'
 * @param {number} [targetStep] - Optional specific step to navigate to
 */
function handleNavigation(direction, targetStep) {
    const currentState = state.getState();
    const { currentStep } = currentState;
    let nextStep;

    if (targetStep !== undefined) {
        nextStep = targetStep;
    } else if (direction === 'next') {
        // Validate before moving forward
        if (!validateStep(currentStep)) {
            return;
        }
        nextStep = currentStep + 1;
    } else if (direction === 'back') {
        nextStep = currentStep - 1;
    }

    // Ensure we stay within bounds
    if (nextStep < 1 || nextStep > 4) {
        return;
    }

    state.updateState({ currentStep: nextStep });
    window.scrollTo(0, 0);
}

// =============================================================================
// Entry Card Templates
// =============================================================================

/**
 * Generate HTML for a W-2 entry card
 * @param {object} entry - The W-2 entry data
 * @param {number} index - The entry index
 * @returns {string} HTML string
 */
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

/**
 * Generate HTML for a paystub entry card
 * @param {object} entry - The paystub entry data
 * @param {number} index - The entry index
 * @returns {string} HTML string
 */
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
            </div>
        </div>
    `;
}

// =============================================================================
// Initialization
// =============================================================================

// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
