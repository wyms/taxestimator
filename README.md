# Tax Estimator

## Purpose

A public-facing website that lets users quickly estimate federal income tax due or refund based on:

- One or more W-2s (annual summary), and/or
- One or more paychecks/paystubs (YTD and/or per-check details)

The estimator assumes the user uses the **Standard Deduction** for:
- Single, or
- Married Filing Jointly (MFJ)

**v1 Product Goal:** Speed and clarity, not full tax return preparation.

## Key Features

- **Quick Estimates:** Get your ESTIMATED federal tax refund or amount due in minutes
- **Flexible Input:** Support for W-2s, paystubs, or both
- **Multiple Income Sources:** Handle multiple W-2s and paystubs
- **Year-End Projections:** Estimate your tax position mid-year
- **Export Results:** Download PDF or share a link
- **No Account Required:** Use the estimator without creating an account
- **Privacy-Focused:** No SSN, address, or EIN required

## Scope (v1)

### In Scope
- Filing status: Single or Married Filing Jointly
- Standard deduction only (no itemization)
- Federal income tax estimation for the selected tax year
- Multiple W-2 inputs (aggregate wages/withholding)
- Multiple paystub inputs (aggregate wages/withholding; support YTD)
- Estimated tax due/refund calculation
- Simple results explanation showing how the estimate was computed
- Save/export a summary (PDF download and/or shareable link)

### Out of Scope
- Other filing statuses (Head of Household, Married Filing Separately, Qualifying Widow(er))
- Full Form 1040 coverage (dependents, credits, AMT, NIIT, self-employment, K-1, capital gains, etc.)
- State/local income tax calculations
- Complex deductions/adjustments (IRA, HSA, student loan interest, etc.)
- Audit defense or guarantee language

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tax
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

#### Development Mode
```bash
npm run dev
```

This will start a local development server and automatically open the application in your default browser at `http://localhost:8080`.

#### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:8080`.

### GitHub Pages Deployment

This app is static and can be hosted on GitHub Pages. The `docs/` folder contains a Pages-ready copy of the site.

1. Ensure the site assets are in `docs/` (already prepared).
2. Push to GitHub.
3. In GitHub: Settings -> Pages
   - Source: `main` branch
   - Folder: `/docs`

Notes:
- `docs/estimator.html` uses the jsPDF CDN so it works on GitHub Pages.
- For local development, continue using `npm run dev` (serves `docs/`).

### Project Structure

```
tax/
????????? docs/                # GitHub Pages build (static copy)
????????? css/                 # Stylesheets
????????? js/                  # Client-side JavaScript
????????? src/
???   ????????? components/      # Reusable UI components
???   ????????? utils/           # Utility functions (calculations, validation)
???   ????????? data/            # Tax brackets and configuration data
????????? package.json         # Project dependencies and scripts
????????? README.md            # This file
????????? requirements.md      # Detailed requirements document
```

## Usage

1. Open the application in your web browser
2. Select your tax year and filing status
3. Choose your input mode (W-2, Paystub, or Both)
4. Enter your income and withholding information
5. View your estimated refund or amount due
6. Export or share your results

## Important Disclaimers

- This is an informational estimate, not tax advice
- Results are based on the Standard Deduction and basic federal tax calculations
- For complete tax preparation, consult a tax professional or use official IRS resources
- This tool does not guarantee accuracy and should not be used as a substitute for professional tax advice

## Technology Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- jsPDF (for PDF export)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

This is a v1 product. Future enhancements may include:
- Additional filing statuses
- Tax credits (child tax credit, EITC, etc.)
- Adjustments to income (HSA, IRA, student loan interest)
- Self-employment income calculations
- State tax calculators
- User accounts for saved scenarios

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feedback, please open an issue in the repository.
