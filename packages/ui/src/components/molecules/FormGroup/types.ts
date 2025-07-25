export interface FormGroupProps {
  /**
   * The label for the form field
   */
  label?: string;

  /**
   * A description to help users understand the field
   */
  description?: string;

  /**
   * Hint text shown below the field
   */
  hint?: string;

  /**
   * Error message to display or boolean to show error state
   */
  error?: string | boolean;

  /**
   * Whether the field is required
   * @default false
   */
  required?: boolean;

  /**
   * Whether to show "Optional" label
   * @default false
   */
  optional?: boolean;

  /**
   * Whether the field is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * ID to associate the label with the field
   */
  id?: string;

  /**
   * Additional CSS classes
   */
  class?: string;
}
