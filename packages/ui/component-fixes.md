# Component Fix Examples

## 1. Select Component - Replace Gray Colors

### Before:
```vue
// Line 218
'text-gray-700',

// Line 314-315
'bg-white',
'border border-gray-200',

// Line 345
'text-gray-500',
```

### After:
```vue
// Line 218
'text-content',

// Line 314-315
'bg-surface',
'border border-border',

// Line 345
'text-content-subtle',
```

## 2. Switch Component - Fix Unchecked State

### Before:
```vue
// Lines 87, 92, 97, 102, 107
'data-[state=unchecked]:bg-gray-300',

// Line 149
'text-gray-700',

// Line 177
'text-gray-500',
```

### After:
```vue
// Lines 87, 92, 97, 102, 107
'data-[state=unchecked]:bg-interactive',

// Line 149
'text-content-medium',

// Line 177
'text-content-subtle',
```

## 3. Alert Component - Fix Primary Text

### Before:
```vue
// Line 75
props.variant === 'solid' ? '' : 'text-primary-900'
```

### After:
```vue
// Line 75
props.variant === 'solid' ? '' : 'text-primary-800'
```

## 4. Card Component - Fix Background

### Before:
```vue
// Lines 45-47
flat: 'bg-white',
elevated: 'bg-white shadow-sm hover:shadow-md',
outlined: 'bg-white border border-primary-200',
```

### After:
```vue
// Lines 45-47
flat: 'bg-surface',
elevated: 'bg-surface-elevated shadow-sm hover:shadow-md',
outlined: 'bg-surface border border-border',
```

## 5. App Component - Fix Background

### Before:
```vue
// Line 16
class="min-h-dvh bg-white"
```

### After:
```vue
// Line 16
class="min-h-dvh bg-surface"
```

## 6. Modal Component - Improve Backdrop

### Before:
```vue
// Line 14
class="fixed inset-0 bg-primary-900 bg-opacity-75 transition-opacity duration-150 ease-out"
```

### After:
```vue
// Line 14
class="fixed inset-0 bg-content/75 backdrop-blur-sm transition-opacity duration-150 ease-out"
```

## 7. Input Component - Clear Button Accessibility

### Before:
```vue
<button
  v-if="modelValue && clearable"
  @click="clear"
  type="button"
  class="text-primary-400 hover:text-primary-600 transition-colors duration-150 ease-out"
>
  <svg>...</svg>
</button>
```

### After:
```vue
<button
  v-if="modelValue && clearable"
  @click="clear"
  type="button"
  class="text-primary-400 hover:text-primary-600 transition-colors duration-150 ease-out"
  aria-label="Clear input"
>
  <svg aria-hidden="true">...</svg>
</button>
```

## 8. Create LoadingSpinner Component

Create `packages/ui/src/components/atoms/LoadingSpinner/LoadingSpinner.vue`:

```vue
<template>
  <svg
    :class="cn(
      'animate-spin',
      sizeClasses[size],
      className
    )"
    :aria-label="ariaLabel"
    role="status"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      class="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="4"
    />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
</template>

<script setup lang="ts">
import { cn } from '@/utils/cn';
import type { LoadingSpinnerProps } from './types';

const props = withDefaults(defineProps<LoadingSpinnerProps>(), {
  size: 'md',
  ariaLabel: 'Loading',
});

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;
</script>
```

Then update Button component to use it:

```vue
// Replace lines 9-23 in Button.vue with:
<LoadingSpinner v-if="loading" class="text-inherit" />
```