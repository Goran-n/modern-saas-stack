/**
 * Standardized spacing scale for consistent component design
 * Based on Tailwind's spacing scale
 */

export const spacing = {
  // Component padding by size
  padding: {
    xs: "px-2 py-1",
    sm: "px-3 py-1.5",
    md: "px-4 py-2",
    lg: "px-5 py-2.5",
    xl: "px-6 py-3",
  },

  // Component gaps
  gap: {
    xs: "gap-1",
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-2.5",
    xl: "gap-3",
  },

  // Component heights
  height: {
    xs: "h-7",
    sm: "h-8",
    md: "h-10",
    lg: "h-11",
    xl: "h-12",
  },

  // Border radius
  rounded: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full",
  },

  // Form field specific spacing
  formField: {
    labelMargin: "mb-1.5",
    hintMargin: "mt-1.5",
    errorMargin: "mt-1.5",
  },
} as const;

export type SpacingSize = keyof typeof spacing.padding;
