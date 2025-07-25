export interface FormFieldProps {
  /**
   * Label text for the form field
   */
  label?: string;
  /**
   * Helper text to display below the input
   */
  hint?: string;
  /**
   * Error message to display (replaces hint when present)
   */
  error?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Additional classes for the container
   */
  class?: string;
  /**
   * Additional classes for the label
   */
  labelClass?: string;
}
