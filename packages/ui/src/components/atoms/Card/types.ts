import type { ClassProp } from "../../../types";

export interface CardProps {
  /**
   * The visual style variant
   * @default 'elevated'
   */
  variant?: "flat" | "elevated" | "outlined";

  /**
   * Card padding size
   * @default 'md'
   */
  padding?: "none" | "xs" | "sm" | "md" | "lg" | "xl";

  /**
   * Whether to show rounded corners
   * @default true
   */
  rounded?: boolean;

  /**
   * Card header text
   */
  header?: string;

  /**
   * HTML tag to use for the header
   * @default 'h3'
   */
  headerTag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  /**
   * Additional CSS classes
   */
  class?: ClassProp;

  /**
   * ARIA role for the card
   */
  role?: string;

  /**
   * Accessible label for the card
   */
  ariaLabel?: string;
}
