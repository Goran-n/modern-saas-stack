import type { Color } from "../../../types";

export interface AlertProps {
  /**
   * The visual style variant
   * @default 'subtle'
   */
  variant?: "subtle" | "solid" | "outlined";

  /**
   * The color theme
   * @default 'primary'
   */
  color?: Exclude<Color, "secondary" | "info">;

  /**
   * Alert title
   */
  title?: string;

  /**
   * Alert description
   */
  description?: string;

  /**
   * Whether to show an icon
   * @default true
   */
  icon?: boolean;

  /**
   * Whether the alert can be dismissed
   * @default false
   */
  dismissible?: boolean;

  /**
   * Additional CSS classes
   */
  class?: string;
}
