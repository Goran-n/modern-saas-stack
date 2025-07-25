export interface AvatarProps {
  /**
   * The URL of the avatar image
   */
  src?: string;

  /**
   * Alternative text for the avatar image - required for accessibility
   */
  alt: string;

  /**
   * The size of the avatar
   * @default 'md'
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

  /**
   * Additional CSS classes
   */
  class?: string;
}
