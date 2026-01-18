# Components Directory

This directory will contain reusable UI components for the tax estimator application.

## Planned Components

### Input Components
- **W2Form.js** - Component for entering W-2 information
- **PaystubForm.js** - Component for entering paystub information
- **FilingStatusSelector.js** - Component for selecting tax year and filing status
- **TaxYearSelector.js** - Component for selecting the tax year

### Display Components
- **ResultsCard.js** - Component for displaying tax estimate results
- **ResultsBreakdown.js** - Component for showing calculation breakdown
- **ProgressStepper.js** - Component for showing user progress through steps

### Common Components
- **Button.js** - Reusable button component
- **Input.js** - Reusable input field component
- **Card.js** - Reusable card container component
- **Modal.js** - Reusable modal dialog component
- **Notification.js** - Notification/toast component

## Component Structure

Each component should follow this structure:

```javascript
/**
 * ComponentName
 *
 * @description Brief description of what the component does
 * @param {Object} props - Component props
 * @returns {HTMLElement} - The rendered component
 */
function ComponentName(props) {
    // Component logic

    return element;
}
```

## Usage Notes

- All components should be standalone and reusable
- Components should handle their own validation where appropriate
- Components should emit events for parent components to handle state changes
- Follow accessibility best practices (ARIA labels, keyboard navigation, etc.)
