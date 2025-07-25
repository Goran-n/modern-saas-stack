import type { Component } from "vue";
import type { Size } from "../../../types";

export interface IconProps {
  /**
   * The size of the icon
   * @default 'md'
   */
  size?: Size;

  /**
   * The HTML element or component to render as
   * @default 'span'
   */
  as?: string | Component;

  /**
   * Accessible label for the icon
   */
  ariaLabel?: string;

  /**
   * Additional CSS classes
   */
  class?: string;
}
