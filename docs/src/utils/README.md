# Utils Directory

This directory contains utility functions for calculations, validation, and data manipulation.

## Planned Utility Modules

### Tax Calculation
- **taxCalculator.js** - Core tax calculation engine
  - `calculateTaxLiability(taxableIncome, filingStatus, taxYear)` - Calculate federal tax liability
  - `calculateTaxableIncome(totalWages, standardDeduction)` - Calculate taxable income
  - `calculateNetDueOrRefund(taxLiability, totalWithholding)` - Calculate refund or amount due

### Data Processing
- **dataAggregator.js** - Aggregate data from multiple sources
  - `aggregateW2Data(w2Entries)` - Sum W-2 wages and withholding
  - `aggregatePaystubData(paystubEntries)` - Sum paystub wages and withholding
  - `detectDuplicates(w2Entries, paystubEntries)` - Detect duplicate employer entries

### Validation
- **validators.js** - Input validation functions
  - `validateWages(amount)` - Validate wage input
  - `validateWithholding(amount, wages)` - Validate withholding amount
  - `validateTaxYear(year)` - Validate tax year selection
  - `validateFilingStatus(status)` - Validate filing status

### Formatting
- **formatters.js** - Data formatting functions
  - `formatCurrency(amount)` - Format numbers as currency
  - `formatNumber(num)` - Format numbers with commas
  - `formatPercentage(decimal)` - Format decimals as percentages
  - `roundToNearestDollar(amount)` - Round to nearest whole dollar

### Projection
- **projectionCalculator.js** - Year-end projection calculations
  - `projectYearEndWages(ytdWages, payFrequency, currentDate)` - Project year-end wages
  - `projectYearEndWithholding(ytdWithheld, payFrequency, currentDate)` - Project year-end withholding
  - `calculateRemainingPayPeriods(payFrequency, currentDate, yearEndDate)` - Calculate remaining pay periods

### Export
- **pdfExporter.js** - PDF export functionality
  - `generateResultsPDF(resultsData)` - Generate PDF with results
  - `createShareableLink(resultsData)` - Create shareable link

## Usage Example

```javascript
// Import utilities
import { calculateTaxLiability } from './utils/taxCalculator.js';
import { validateWages } from './utils/validators.js';
import { formatCurrency } from './utils/formatters.js';

// Use utilities
if (validateWages(wages)) {
    const taxLiability = calculateTaxLiability(taxableIncome, 'single', 2025);
    console.log(`Tax Liability: ${formatCurrency(taxLiability)}`);
}
```

## Testing

All utility functions should:
- Have comprehensive unit tests
- Handle edge cases (negative numbers, zero, null, undefined)
- Return consistent data types
- Be pure functions where possible (no side effects)
