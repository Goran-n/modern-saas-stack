import type { BadgeProps } from "../Badge/types";

export type StatusType =
  | "processing"
  | "verification"
  | "connection"
  | "validation"
  | "confidence"
  | "general";

export type ProcessingStatus =
  | "completed"
  | "processing"
  | "failed"
  | "pending";
export type VerificationStatus = "verified" | "pending" | "expired";
export type ConnectionStatus =
  | "active"
  | "inactive"
  | "connected"
  | "disconnected";
export type ValidationStatus =
  | "valid"
  | "invalid"
  | "needs_review"
  | "not_validated";

export interface StatusBadgeProps
  extends Omit<BadgeProps, "color" | "icon" | "iconAnimation"> {
  /**
   * The status value to display
   */
  status: string | number;

  /**
   * The type of status for automatic color mapping
   */
  type?: StatusType;

  /**
   * Optional override for the display text
   */
  displayText?: string;

  /**
   * Optional override for the color
   */
  color?: BadgeProps["color"];

  /**
   * Whether to show the status icon
   * @default true
   */
  showIcon?: boolean;
}
