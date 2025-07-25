import type { InputHTMLAttributes } from "vue";
import type { InputVariant, Size } from "../../../types";

export interface InputProps {
  /**
   * The input value (v-model)
   */
  modelValue?: string;

  /**
   * The input type
   * @default 'text'
   */
  type?: InputHTMLAttributes["type"];

  /**
   * The size of the input
   * @default 'md'
   */
  size?: Size;

  /**
   * The visual variant of the input
   * @default 'outline'
   */
  variant?: InputVariant;

  /**
   * Input placeholder
   */
  placeholder?: string;

  /**
   * Error state for styling
   * @default false
   */
  error?: boolean;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the input is readonly
   * @default false
   */
  readonly?: boolean;

  /**
   * Whether the input is required
   * @default false
   */
  required?: boolean;

  /**
   * Whether to show clear button
   * @default false
   */
  clearable?: boolean;

  /**
   * Input id
   */
  id?: string;

  /**
   * Additional CSS classes
   */
  class?: string;
}
