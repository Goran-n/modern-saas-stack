import type { StatusType, StatusBadgeProps } from '@figgy/ui';
import { getStatusColor, getStatusDisplayText } from '@figgy/ui';

export interface UseStatusBadgeOptions {
  type?: StatusType;
  variant?: StatusBadgeProps['variant'];
  size?: StatusBadgeProps['size'];
}

/**
 * Composable for consistent status badge handling across the application
 */
export function useStatusBadge(options: UseStatusBadgeOptions = {}) {
  const { type, variant = 'soft', size = 'md' } = options;

  /**
   * Get badge props for a given status
   */
  const getBadgeProps = (status: string | number, overrides?: Partial<StatusBadgeProps>): StatusBadgeProps => {
    return {
      status,
      type,
      variant,
      size,
      ...overrides,
    };
  };

  /**
   * Get color for a status value
   */
  const getColor = (status: string | number) => {
    return getStatusColor(status, type);
  };

  /**
   * Get display text for a status value
   */
  const getDisplayText = (status: string | number) => {
    return getStatusDisplayText(status);
  };

  /**
   * Helper for confidence scores
   */
  const getConfidenceBadgeProps = (confidence: number, overrides?: Partial<StatusBadgeProps>): StatusBadgeProps => {
    return getBadgeProps(confidence, {
      type: 'confidence',
      ...overrides,
    });
  };

  /**
   * Helper for processing status
   */
  const getProcessingBadgeProps = (status: string, overrides?: Partial<StatusBadgeProps>): StatusBadgeProps => {
    return getBadgeProps(status, {
      type: 'processing',
      ...overrides,
    });
  };

  /**
   * Helper for verification status
   */
  const getVerificationBadgeProps = (status: string, overrides?: Partial<StatusBadgeProps>): StatusBadgeProps => {
    return getBadgeProps(status, {
      type: 'verification',
      ...overrides,
    });
  };

  /**
   * Helper for connection status
   */
  const getConnectionBadgeProps = (status: string, overrides?: Partial<StatusBadgeProps>): StatusBadgeProps => {
    return getBadgeProps(status, {
      type: 'connection',
      ...overrides,
    });
  };

  return {
    getBadgeProps,
    getColor,
    getDisplayText,
    getConfidenceBadgeProps,
    getProcessingBadgeProps,
    getVerificationBadgeProps,
    getConnectionBadgeProps,
  };
}