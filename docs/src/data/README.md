# Data Directory

This directory contains tax brackets, standard deductions, and other configuration data.

## Planned Data Files

### Tax Brackets
- **taxBrackets2025.json** - 2025 federal tax brackets
- **taxBrackets2026.json** - 2026 federal tax brackets
- **taxBracketsTemplate.json** - Template for future years

### Standard Deductions
- **standardDeductions.json** - Standard deduction amounts by year and filing status

### Configuration
- **payFrequencies.json** - Pay frequency definitions and calculations
- **filingStatuses.json** - Filing status definitions and rules

## Data Structure Examples

### Tax Brackets Format
```json
{
  "taxYear": 2025,
  "filingStatus": {
    "single": [
      {
        "lowerBound": 0,
        "upperBound": 11600,
        "marginalRate": 0.10
      },
      {
        "lowerBound": 11600,
        "upperBound": 47150,
        "marginalRate": 0.12
      },
      {
        "lowerBound": 47150,
        "upperBound": 100525,
        "marginalRate": 0.22
      }
      // ... more brackets
    ],
    "marriedFilingJointly": [
      // ... brackets for MFJ
    ]
  }
}
```

### Standard Deductions Format
```json
{
  "2025": {
    "single": 14600,
    "marriedFilingJointly": 29200
  },
  "2026": {
    "single": 14900,
    "marriedFilingJointly": 29800
  }
}
```

### Pay Frequencies Format
```json
{
  "weekly": {
    "label": "Weekly",
    "periodsPerYear": 52,
    "description": "Paid once per week"
  },
  "biweekly": {
    "label": "Bi-Weekly (Every 2 Weeks)",
    "periodsPerYear": 26,
    "description": "Paid every two weeks"
  },
  "semimonthly": {
    "label": "Semi-Monthly (Twice per Month)",
    "periodsPerYear": 24,
    "description": "Paid twice per month (e.g., 1st and 15th)"
  },
  "monthly": {
    "label": "Monthly",
    "periodsPerYear": 12,
    "description": "Paid once per month"
  }
}
```

## Data Sources

Tax bracket and standard deduction data should be sourced from:
- IRS.gov official publications
- IRS Revenue Procedures
- Tax year-specific Form 1040 instructions

## Data Validation

All data files should:
- Be valid JSON
- Include a `lastUpdated` field with ISO date
- Include a `source` field with the official IRS reference
- Be validated before application deployment

## Usage

```javascript
// Import data
import taxBrackets2025 from './data/taxBrackets2025.json';
import standardDeductions from './data/standardDeductions.json';

// Use data
const brackets = taxBrackets2025.filingStatus.single;
const deduction = standardDeductions['2025'].single;
```
