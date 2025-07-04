/**
 * Design System Tokens
 * 
 * Central source of truth for design tokens used throughout the application.
 * These tokens map to the Tailwind configuration and provide type safety.
 */

// Component sizes
export const sizes = {
  xs: 'xs',
  sm: 'sm', 
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const

// Component variants
export const variants = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  ghost: 'ghost',
  outline: 'outline',
} as const

// Input states
export const inputStates = {
  default: 'default',
  focused: 'focused',
  error: 'error',
  disabled: 'disabled',
  readonly: 'readonly',
} as const

// Button states  
export const buttonStates = {
  default: 'default',
  hover: 'hover',
  active: 'active',
  disabled: 'disabled',
  loading: 'loading',
} as const

// Spacing scale (maps to Tailwind spacing)
export const spacing = {
  none: '0',
  xs: '0.5', // 2px
  sm: '1',   // 4px
  md: '1.5', // 6px
  lg: '2',   // 8px
  xl: '3',   // 12px
  '2xl': '4', // 16px
  '3xl': '6', // 24px
  '4xl': '8', // 32px
} as const

// Border radius scale
export const borderRadius = {
  none: 'none',
  sm: 'sm',
  md: 'md', 
  lg: 'lg',
  xl: 'xl',
  '2xl': '2xl',
  '3xl': '3xl',
  full: 'full',
} as const

// Font weights
export const fontWeights = {
  normal: 'normal',
  medium: 'medium',
  semibold: 'semibold',
  bold: 'bold',
} as const

// Font sizes
export const fontSizes = {
  '2xs': '2xs',
  xs: 'xs',
  sm: 'sm',
  base: 'base',
  lg: 'lg',
  xl: 'xl',
  '2xl': '2xl',
  '3xl': '3xl',
} as const

// Z-index scale
export const zIndex = {
  dropdown: 50,
  sticky: 100,
  overlay: 200,
  modal: 300,
  tooltip: 400,
} as const

// Animation durations
export const durations = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const

// Transition easings
export const easings = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
} as const

// Type exports for TypeScript
export type Size = keyof typeof sizes
export type Variant = keyof typeof variants
export type InputState = keyof typeof inputStates
export type ButtonState = keyof typeof buttonStates
export type Spacing = keyof typeof spacing
export type BorderRadius = keyof typeof borderRadius
export type FontWeight = keyof typeof fontWeights
export type FontSize = keyof typeof fontSizes

/**
 * Component-specific token mappings
 */

// Input component tokens
export const inputTokens = {
  sizes: {
    xs: {
      height: 'h-6',
      padding: 'px-2 py-1',
      fontSize: 'text-xs',
    },
    sm: {
      height: 'h-8',
      padding: 'px-3 py-1.5',
      fontSize: 'text-sm',
    },
    md: {
      height: 'h-10', 
      padding: 'px-3 py-2',
      fontSize: 'text-sm',
    },
    lg: {
      height: 'h-12',
      padding: 'px-4 py-3',
      fontSize: 'text-base',
    },
    xl: {
      height: 'h-14',
      padding: 'px-6 py-4',
      fontSize: 'text-lg',
    },
  },
  variants: {
    default: {
      border: 'border-neutral-300',
      background: 'bg-white',
      text: 'text-neutral-900',
      placeholder: 'placeholder-neutral-500',
      focus: 'focus:border-primary-500 focus:ring-primary-500',
    },
    error: {
      border: 'border-error-300',
      background: 'bg-white',
      text: 'text-neutral-900',
      placeholder: 'placeholder-neutral-500',
      focus: 'focus:border-error-500 focus:ring-error-500',
    },
  },
} as const

// Button component tokens
export const buttonTokens = {
  sizes: {
    xs: {
      height: 'h-6',
      padding: 'px-2 py-1',
      fontSize: 'text-xs',
      iconSize: 'h-3 w-3',
    },
    sm: {
      height: 'h-8',
      padding: 'px-3 py-1.5',
      fontSize: 'text-sm',
      iconSize: 'h-4 w-4',
    },
    md: {
      height: 'h-10',
      padding: 'px-4 py-2',
      fontSize: 'text-sm',
      iconSize: 'h-4 w-4',
    },
    lg: {
      height: 'h-12',
      padding: 'px-6 py-3',
      fontSize: 'text-base',
      iconSize: 'h-5 w-5',
    },
    xl: {
      height: 'h-14',
      padding: 'px-8 py-4',
      fontSize: 'text-lg',
      iconSize: 'h-6 w-6',
    },
  },
  variants: {
    primary: {
      background: 'bg-primary-600 hover:bg-primary-700',
      text: 'text-white',
      border: 'border-transparent',
      focus: 'focus:ring-primary-500',
      disabled: 'disabled:bg-primary-300',
    },
    secondary: {
      background: 'bg-white hover:bg-neutral-50',
      text: 'text-neutral-700',
      border: 'border-neutral-300',
      focus: 'focus:ring-primary-500',
      disabled: 'disabled:bg-neutral-100 disabled:text-neutral-400',
    },
    success: {
      background: 'bg-success-600 hover:bg-success-700',
      text: 'text-white',
      border: 'border-transparent',
      focus: 'focus:ring-success-500',
      disabled: 'disabled:bg-success-300',
    },
    error: {
      background: 'bg-error-600 hover:bg-error-700',
      text: 'text-white',
      border: 'border-transparent',
      focus: 'focus:ring-error-500',
      disabled: 'disabled:bg-error-300',
    },
    ghost: {
      background: 'bg-transparent hover:bg-neutral-100',
      text: 'text-neutral-700',
      border: 'border-transparent',
      focus: 'focus:ring-primary-500',
      disabled: 'disabled:text-neutral-400',
    },
  },
} as const