import type { Color } from "../../../types";
import type { StatusType } from "./types";

/**
 * Maps status values to badge colors based on status type
 */
export function getStatusColor(
  status: string | number,
  type?: StatusType,
): Color {
  // Handle confidence scores (numbers)
  if (typeof status === "number") {
    if (status >= 90) return "success";
    if (status >= 70) return "warning";
    return "error";
  }

  const normalizedStatus = status.toLowerCase();

  // Type-specific mappings
  switch (type) {
    case "processing":
      switch (normalizedStatus) {
        case "completed":
        case "complete":
          return "success";
        case "processing":
        case "pending":
          return "warning";
        case "failed":
        case "error":
          return "error";
        default:
          return "neutral";
      }

    case "verification":
      switch (normalizedStatus) {
        case "verified":
        case "confirmed":
          return "success";
        case "pending":
        case "awaiting":
          return "warning";
        case "expired":
        case "failed":
          return "error";
        default:
          return "neutral";
      }

    case "connection":
      switch (normalizedStatus) {
        case "active":
        case "connected":
        case "online":
          return "success";
        case "inactive":
        case "disconnected":
        case "offline":
          return "neutral";
        case "error":
        case "failed":
          return "error";
        default:
          return "neutral";
      }

    case "validation":
      switch (normalizedStatus) {
        case "valid":
        case "validated":
          return "success";
        case "invalid":
        case "failed":
          return "error";
        case "needs_review":
        case "pending":
          return "warning";
        default:
          return "neutral";
      }

    default:
      // Generic status mappings
      if (
        normalizedStatus.includes("success") ||
        normalizedStatus.includes("complete") ||
        normalizedStatus.includes("active")
      ) {
        return "success";
      }
      if (
        normalizedStatus.includes("error") ||
        normalizedStatus.includes("fail")
      ) {
        return "error";
      }
      if (
        normalizedStatus.includes("warning") ||
        normalizedStatus.includes("pending")
      ) {
        return "warning";
      }
      return "neutral";
  }
}

/**
 * Formats status text for display
 */
export function getStatusDisplayText(status: string | number): string {
  if (typeof status === "number") {
    return `${Math.round(status)}%`;
  }

  // Convert snake_case or kebab-case to Title Case
  return status
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Gets the appropriate icon for a status
 */
export function getStatusIcon(
  status: string | number,
): { icon: string; animation?: "spin" | "pulse" | "none" } | undefined {
  if (typeof status === "number") {
    if (status >= 90)
      return { icon: "i-heroicons-check-circle", animation: "none" };
    if (status >= 70)
      return { icon: "i-heroicons-exclamation-triangle", animation: "none" };
    return { icon: "i-heroicons-x-circle", animation: "none" };
  }

  const normalizedStatus = status.toLowerCase();

  // Status-specific icons
  switch (normalizedStatus) {
    case "pending":
    case "awaiting":
      return { icon: "i-heroicons-clock", animation: "none" };

    case "in_progress":
    case "in progress":
    case "processing":
      return { icon: "i-heroicons-arrow-path", animation: "spin" };

    case "submitted":
      return { icon: "i-heroicons-paper-airplane", animation: "none" };

    case "in_review":
    case "in review":
    case "reviewing":
      return { icon: "i-heroicons-eye", animation: "none" };

    case "success":
    case "successful":
    case "completed":
    case "complete":
    case "verified":
    case "active":
    case "connected":
    case "valid":
      return { icon: "i-heroicons-check-circle", animation: "none" };

    case "failed":
    case "failure":
    case "error":
    case "invalid":
      return { icon: "i-heroicons-x-circle", animation: "none" };

    case "expired":
      return { icon: "i-heroicons-clock", animation: "none" };

    case "warning":
    case "needs_review":
      return { icon: "i-heroicons-exclamation-triangle", animation: "none" };

    case "inactive":
    case "disconnected":
    case "offline":
      return { icon: "i-heroicons-minus-circle", animation: "none" };

    default:
      return undefined;
  }
}
