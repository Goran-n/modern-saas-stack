export interface SkeletonProps {
  /**
   * The height of the skeleton
   * @default 'md'
   */
  height?: "xs" | "sm" | "md" | "lg" | "xl" | "full" | string;

  /**
   * The width of the skeleton
   * @default 'full'
   */
  width?: "xs" | "sm" | "md" | "lg" | "xl" | "full" | string;

  /**
   * Whether to show rounded corners
   * @default true
   */
  rounded?: boolean;

  /**
   * Whether to animate the skeleton
   * @default true
   */
  animate?: boolean;

  /**
   * Additional CSS classes
   */
  class?: string;
}
