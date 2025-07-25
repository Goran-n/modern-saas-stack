import type { Variant } from "../../../types";

export interface EmptyStateAction {
  label: string;
  icon?: string;
  variant?: Variant;
  onClick: () => void;
}

export interface EmptyStateProps {
  /**
   * Type of empty state - determines default icon, title and description
   */
  type?:
    | "empty"
    | "no-results"
    | "error"
    | "no-access"
    | "no-files"
    | "no-data"
    | "coming-soon"
    | "success";

  /**
   * Custom icon to override the default
   */
  icon?: string;

  /**
   * Custom title to override the default
   */
  title?: string;

  /**
   * Custom description to override the default
   */
  description?: string;

  /**
   * Primary action button
   */
  primaryAction?: EmptyStateAction;

  /**
   * Secondary action button
   */
  secondaryAction?: EmptyStateAction;
}
