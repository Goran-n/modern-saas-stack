import type { Color, Size } from "../../../types";

export type BadgeVariant = "solid" | "soft" | "outline";

export interface BadgeProps {
  /**
   * The visual style variant of the badge
   * @default 'solid'
   */
  variant?: BadgeVariant;

  /**
   * The size of the badge
   * @default 'md'
   */
  size?: Size;

  /**
   * The color theme of the badge
   * @default 'neutral'
   */
  color?: Color;

  /**
   * Icon to display before the text
   */
  icon?: string;

  /**
   * Icon to display after the text
   */
  trailingIcon?: string;

  /**
   * Whether the icon should be animated (e.g., spinning)
   */
  iconAnimation?: "spin" | "pulse" | "none";

  /**
   * Additional CSS classes
   */
  class?: string;

  /**
   * Accessible label for the badge
   */
  ariaLabel?: string;
}
