# Figgy UI Component Templates

## 🎯 Quick Reference Templates

### Basic Atom Component

```vue
<!-- ComponentName.vue -->
<template>
  <component
    :is="tag"
    :class="componentClasses"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '../../../utils/cn'
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions'
import type { ComponentNameProps } from './types'

const props = withDefaults(defineProps<ComponentNameProps>(), {
  tag: 'div',
  size: 'md',
  variant: 'solid',
  color: 'primary',
  disabled: false,
})

const componentClasses = computed(() => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    transitions.base,
    focusRing,
    disabledClasses,
  ]
  
  return cn(
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant][props.color],
    props.class
  )
})

// Size mappings
const sizeClasses = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-11 px-5 text-lg',
  xl: 'h-12 px-6 text-xl',
}

// Variant mappings
const variantClasses = {
  solid: {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600',
    neutral: 'bg-neutral-700 text-white hover:bg-neutral-800',
  },
  outline: {
    primary: 'border border-primary-500 text-primary-600 hover:bg-primary-50',
    secondary: 'border border-secondary-500 text-secondary-600 hover:bg-secondary-50',
    neutral: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50',
  },
}
</script>
```

### Atom Types File

```typescript
// types.ts
import type { Component } from 'vue'
import type { Size, Color, Variant, ClassProp } from '../../../types'

export interface ComponentNameProps {
  /**
   * HTML tag or Vue component to render
   * @default 'div'
   */
  tag?: string | Component
  
  /**
   * Size of the component
   * @default 'md'
   */
  size?: Size
  
  /**
   * Visual variant of the component
   * @default 'solid'
   */
  variant?: Variant
  
  /**
   * Color theme of the component
   * @default 'primary'
   */
  color?: Color
  
  /**
   * Whether the component is disabled
   * @default false
   */
  disabled?: boolean
  
  /**
   * Additional CSS classes
   */
  class?: ClassProp
  
  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string
}
```

### Atom Index File

```typescript
// index.ts
export { default as FigComponentName } from './ComponentName.vue'
export type { ComponentNameProps } from './types'
```

### Form Input Atom

```vue
<!-- Input.vue -->
<template>
  <input
    :id="id"
    ref="inputRef"
    v-model="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :required="required"
    :class="inputClasses"
    :aria-invalid="error"
    v-bind="$attrs"
    @blur="emit('blur', $event)"
    @focus="emit('focus', $event)"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { cn } from '../../../utils/cn'
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions'
import type { InputProps } from './types'

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  size: 'md',
  variant: 'outline',
  disabled: false,
  readonly: false,
  required: false,
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
}>()

const inputRef = ref<HTMLInputElement>()

const modelValue = computed({
  get: () => props.modelValue || '',
  set: (value) => emit('update:modelValue', value),
})

const inputClasses = computed(() => {
  const baseClasses = [
    'block w-full',
    transitions.base,
    'placeholder:text-neutral-400',
    disabledClasses,
    focusRing,
  ]
  
  const sizeClasses = {
    xs: 'h-7 px-2.5 text-xs rounded-md',
    sm: 'h-8 px-3 text-sm rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-11 px-5 text-base rounded-lg',
    xl: 'h-12 px-6 text-base rounded-lg',
  }
  
  const variantClasses = {
    outline: [
      'border',
      props.error
        ? 'border-error-500 text-error-900'
        : 'border-neutral-300 text-neutral-900 focus:border-primary-500',
      'bg-white',
    ],
    filled: [
      'border border-transparent',
      props.error
        ? 'bg-error-50 text-error-900'
        : 'bg-neutral-100 text-neutral-900',
    ],
  }
  
  return cn(
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant],
    props.class
  )
})

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>
```

### Molecule Component (FormField)

```vue
<!-- FormField.vue -->
<template>
  <div :class="containerClasses">
    <label
      v-if="label || $slots.label"
      :for="inputId"
      :class="labelClasses"
    >
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="text-error-500 ml-1">*</span>
    </label>
    
    <div class="relative">
      <slot :id="inputId" />
    </div>
    
    <p v-if="hint && !error" :class="hintClasses">
      {{ hint }}
    </p>
    
    <p v-if="error" :class="errorClasses">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '../../../utils/cn'
import type { FormFieldProps } from './types'

const props = withDefaults(defineProps<FormFieldProps>(), {
  required: false,
  disabled: false,
})

const inputId = useId()

const containerClasses = computed(() => cn('space-y-1.5', props.class))
const labelClasses = computed(() => cn(
  'block text-sm font-medium text-neutral-700',
  props.disabled && 'text-neutral-400',
))
const hintClasses = computed(() => cn(
  'text-sm text-neutral-500',
  props.disabled && 'text-neutral-400',
))
const errorClasses = computed(() => 'text-sm text-error-600')
</script>
```

### Interactive Component with Loading

```vue
<!-- Button.vue -->
<template>
  <component
    :is="Component"
    :class="buttonClasses"
    :disabled="disabled || loading"
    v-bind="forwarded"
  >
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <FigSpinner :size="spinnerSize" />
    </span>
    <span :class="contentClasses">
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from '../../../utils/cn'
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions'
import type { ButtonProps } from './types'
import FigSpinner from '../Spinner/Spinner.vue'

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'solid',
  size: 'md',
  color: 'primary',
  type: 'button',
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const Component = computed(() => props.asChild ? Primitive : 'button')

const forwarded = computed(() => {
  if (props.asChild) {
    return { asChild: true }
  }
  return {
    type: props.type,
    'aria-label': props.ariaLabel,
    onClick: (e: MouseEvent) => emit('click', e),
  }
})

const buttonClasses = computed(() => {
  // Implementation...
})

const contentClasses = computed(() => ({
  'opacity-0': props.loading,
  'opacity-100': !props.loading,
}))

const spinnerSize = computed(() => {
  const sizeMap = { xs: 'xs', sm: 'sm', md: 'sm', lg: 'md', xl: 'lg' } as const
  return sizeMap[props.size]
})
</script>
```

### Storybook Story Template

```typescript
// ComponentName.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { FigComponentName } from './'

const meta = {
  title: 'Atoms/ComponentName',
  component: FigComponentName,
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: 'select',
      options: ['solid', 'outline', 'ghost', 'soft'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error', 'neutral'],
    },
  },
} satisfies Meta<typeof FigComponentName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Component Text',
  },
}

export const AllVariants: Story = {
  render: () => ({
    components: { FigComponentName },
    template: `
      <div class="space-y-4">
        <div class="flex gap-4">
          <FigComponentName variant="solid">Solid</FigComponentName>
          <FigComponentName variant="outline">Outline</FigComponentName>
          <FigComponentName variant="ghost">Ghost</FigComponentName>
          <FigComponentName variant="soft">Soft</FigComponentName>
        </div>
      </div>
    `,
  }),
}
```


## Usage Examples

### Form with Validation

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <FigFormField 
      label="Email" 
      :error="errors.email"
      required
    >
      <FigInput 
        v-model="form.email" 
        type="email"
        placeholder="you@example.com"
        :error="!!errors.email"
      />
    </FigFormField>
    
    <FigFormField 
      label="Password" 
      :error="errors.password"
      hint="Must be at least 8 characters"
      required
    >
      <FigInput 
        v-model="form.password" 
        type="password"
        :error="!!errors.password"
      />
    </FigFormField>
    
    <FigButton 
      type="submit" 
      :loading="isSubmitting"
      class="w-full"
    >
      Sign In
    </FigButton>
  </form>
</template>
```

### Card with Actions

```vue
<template>
  <FigCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Card Title</h3>
        <FigBadge color="success" size="sm">Active</FigBadge>
      </div>
    </template>
    
    <p class="text-neutral-600">Card content goes here...</p>
    
    <template #footer>
      <div class="flex gap-2">
        <FigButton size="sm">Edit</FigButton>
        <FigButton size="sm" variant="ghost" color="error">
          Delete
        </FigButton>
      </div>
    </template>
  </FigCard>
</template>
```

### Modal Dialog

```vue
<template>
  <FigModal v-model:open="isOpen">
    <template #header>
      <h2 class="text-xl font-semibold">Confirm Action</h2>
    </template>
    
    <p>Are you sure you want to proceed with this action?</p>
    
    <template #footer>
      <div class="flex gap-2 justify-end">
        <FigButton variant="ghost" @click="isOpen = false">
          Cancel
        </FigButton>
        <FigButton color="primary" @click="handleConfirm">
          Confirm
        </FigButton>
      </div>
    </template>
  </FigModal>
</template>
```