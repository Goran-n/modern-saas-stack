export const transitions = {
  base: "transition-all duration-150 ease-out",
  colors: "transition-colors duration-150 ease-out",
  transform: "transition-transform duration-150 ease-out",
  opacity: "transition-opacity duration-150 ease-out",
} as const;

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

export const disabledClasses =
  "disabled:opacity-50 disabled:cursor-not-allowed";
