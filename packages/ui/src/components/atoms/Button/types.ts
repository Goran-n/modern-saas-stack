import type { PrimitiveProps } from "reka-ui";
import type { ButtonHTMLAttributes } from "vue";
import type { Color, Size, Variant } from "../../../types";

export interface ButtonProps extends PrimitiveProps {
  /**
   * The visual style variant of the button
   * @default 'solid'
   */
  variant?: Variant;

  /**
   * The size of the button
   * @default 'md'
   */
  size?: Size;

  /**
   * The color theme of the button
   * @default 'primary'
   */
  color?: Exclude<Color, "info">;

  /**
   * The HTML button type
   * @default 'button'
   */
  type?: ButtonHTMLAttributes["type"];

  /**
   * Whether the button is in a loading state
   * @default false
   */
  loading?: boolean;

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  class?: string;

  /**
   * Accessible label for the button, especially important for icon-only buttons
   */
  ariaLabel?: string;
}
