import type { Size } from "../../../types";

export type SelectVariant = "outline" | "filled";

export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps {
  /**
   * The selected value (v-model)
   */
  modelValue?: any;

  /**
   * Array of options
   */
  options?: SelectOption[];

  /**
   * The size of the select
   * @default 'md'
   */
  size?: Size;

  /**
   * The visual variant of the select
   * @default 'outline'
   */
  variant?: SelectVariant;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Error state for styling
   * @default false
   */
  error?: boolean;

  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the select is required
   * @default false
   */
  required?: boolean;

  /**
   * Whether multiple selection is allowed
   * @default false
   */
  multiple?: boolean;

  /**
   * Select id
   */
  id?: string;

  /**
   * Positioning mode for the dropdown
   * @default 'popper'
   */
  position?: "popper" | "item-aligned";

  /**
   * Additional CSS classes
   */
  class?: string;
}
