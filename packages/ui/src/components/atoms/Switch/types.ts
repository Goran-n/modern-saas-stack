import type { Color, Size } from "../../../types";

export interface SwitchProps {
  /**
   * The switch state (v-model)
   */
  modelValue?: boolean;

  /**
   * The size of the switch
   * @default 'md'
   */
  size?: Size;

  /**
   * The color of the switch when checked
   * @default 'primary'
   */
  color?: Color;

  /**
   * Whether the switch is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the switch is required
   * @default false
   */
  required?: boolean;

  /**
   * Switch id
   */
  id?: string;

  /**
   * Additional CSS classes
   */
  class?: string;
}
