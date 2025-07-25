export interface ContainerProps {
  /**
   * Maximum width of the container
   * @default 'xl'
   */
  maxWidth?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "full"
    | "prose"
    | "screen";

  /**
   * Whether to add horizontal padding
   * @default true
   */
  padding?: boolean;

  /**
   * Additional CSS classes
   */
  class?: string;
}
