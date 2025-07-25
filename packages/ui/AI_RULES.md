# AI Development Rules for Figgy UI Component Library

## 🎯 Project Context

You are working on the **Figgy UI Component Library** (@figgy/ui), a Vue 3 component library built with:
- **Vue 3** (Composition API with `<script setup>`)
- **TypeScript** (strict mode enabled)
- **Tailwind CSS v4** (with custom theme)
- **Reka UI** (headless component primitives)
- **Atomic Design** methodology

### Brand Identity
- **Primary Color**: Fig Purple (#5e2b94)
- **Secondary Color**: Sunburst Orange (#f76b1c)
- **Success**: Leaf Green (#7ac943)
- **Warning**: Seed Gold (#f4c542)
- **Error**: Standard error red
- **Neutral**: Gray scale (not "gray")
- **Background**: Cream Canvas (#faf2e8)

## 📁 Component Structure

### Directory Organization
```
src/components/
├── atoms/       # Basic building blocks (Button, Input, Badge)
├── molecules/   # Combinations of atoms (FormField, Modal)
├── organisms/   # Complex components (future: DataTable, Form)
└── templates/   # Page layouts (future: DashboardLayout)
```

### File Structure for Each Component
```
ComponentName/
├── ComponentName.vue    # Main component file
├── types.ts            # TypeScript interfaces
├── index.ts            # Exports
├── variants.ts         # Style variants (if applicable)
└── ComponentName.stories.ts  # Storybook stories
```

## 🚨 Critical Rules - MUST FOLLOW

### 1. Atomic Design Principles
- **Atoms** must be simple, single-purpose components
- **Atoms** must NOT include form logic (labels, hints, errors)
- **Molecules** combine atoms and add business logic
- **Keep components under 150 lines** - refactor if larger

### 2. Component Development Rules

#### Always Use This Template for New Atoms:
```vue
<template>
  <div :class="componentClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '../../../utils/cn'
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions'
import type { ComponentNameProps } from './types'

const props = withDefaults(defineProps<ComponentNameProps>(), {
  size: 'md',
  variant: 'solid',
  color: 'primary',
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  'change': [value: any]
}>()

const componentClasses = computed(() => {
  const baseClasses = [
    // Base styles
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
</script>
```

#### Types File Template:
```typescript
import type { Size, Color, Variant, ClassProp } from '../../../types'

export interface ComponentNameProps {
  /**
   * Size of the component
   * @default 'md'
   */
  size?: Size
  
  /**
   * Visual variant
   * @default 'solid'
   */
  variant?: Variant
  
  /**
   * Color theme
   * @default 'primary'
   */
  color?: Color
  
  /**
   * Additional CSS classes
   */
  class?: ClassProp
  
  /**
   * Accessible label
   */
  ariaLabel?: string
}
```

### 3. TypeScript Requirements
- **ALWAYS** use TypeScript, no exceptions
- **ALWAYS** define prop interfaces in `types.ts`
- **ALWAYS** use the shared types: `Size`, `Color`, `Variant`, `ClassProp`
- **NEVER** use `any` type except for `emit` values
- **ALWAYS** add JSDoc comments for props

### 4. Styling Rules

#### MUST Use Theme Tokens:
```vue
<!-- ✅ CORRECT -->
<div class="bg-primary-500 text-white border-neutral-200">

<!-- ❌ WRONG - Never hardcode colors -->
<div class="bg-purple-500 text-white border-gray-200">
<div class="bg-[#5e2b94]">
```

#### Consistent Spacing:
```vue
<!-- ✅ CORRECT - Use standard spacing scale -->
<div class="px-4 py-2 gap-2">

<!-- ❌ WRONG - Avoid arbitrary values -->
<div class="px-[18px] py-[9px] gap-1.5">
```

#### Use Utility Functions:
- **Always** use `cn()` for class merging
- **Always** use shared utilities from `utils/transitions.ts`
- **Always** use `focusRing` for focus states
- **Always** use `disabledClasses` for disabled states

### 5. Component Patterns

#### Form Components:
```vue
<!-- ✅ CORRECT - Use FormField for labels/errors -->
<FigFormField label="Email" error={error}>
  <FigInput v-model="value" />
</FigFormField>

<!-- ❌ WRONG - Don't put form logic in atoms -->
<FigInput label="Email" error={error} />
```

#### Loading States:
```vue
<!-- ✅ CORRECT - Use Spinner component -->
<FigSpinner v-if="loading" size="sm" />

<!-- ❌ WRONG - Don't use inline SVGs -->
<svg class="animate-spin">...</svg>
```

### 6. Accessibility Requirements
- **ALWAYS** include proper ARIA attributes
- **ALWAYS** support keyboard navigation
- **ALWAYS** provide `ariaLabel` prop for non-text components
- **ALWAYS** use semantic HTML elements

### 7. Event Handling
```typescript
// ✅ CORRECT - Consistent event naming
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
}>()

// ❌ WRONG - Inconsistent naming
const emit = defineEmits(['input', 'onchange', 'focusout'])
```

## 📝 Code Generation Guidelines

### When Creating a New Component:

1. **Determine the atomic level**:
   - Single purpose, no children → Atom
   - Combines atoms → Molecule
   - Complex business logic → Organism

2. **Check for existing components**:
   - Don't duplicate functionality
   - Extend existing components when possible

3. **Follow the file structure**:
   - Create all required files
   - Export from index files
   - Add to parent index

4. **Use consistent naming**:
   - PascalCase for components: `FigButton`
   - camelCase for props: `modelValue`
   - kebab-case for files: `button.vue`
   - UPPERCASE for constants: `BUTTON_SIZES`

### Common Implementations:

#### Button with Loading:
```vue
<FigButton :loading="isSubmitting">
  Save Changes
</FigButton>
```

#### Form Field with Validation:
```vue
<FigFormField 
  label="Email Address" 
  :error="errors.email"
  required
>
  <FigInput 
    v-model="form.email" 
    type="email"
    placeholder="Enter your email"
  />
</FigFormField>
```

#### Select with Options:
```vue
<FigFormField label="Country">
  <FigSelect 
    v-model="form.country"
    :options="countryOptions"
    placeholder="Select a country"
  />
</FigFormField>
```

## 🚫 Anti-Patterns to Avoid

### DON'T Do This:
```vue
<!-- ❌ Complex atom with form logic -->
<template>
  <div>
    <label>{{ label }}</label>
    <input v-model="value" />
    <span v-if="error">{{ error }}</span>
  </div>
</template>

<!-- ❌ Hardcoded values -->
<div class="mt-4 mb-6 text-gray-700">

<!-- ❌ Inline styles -->
<div :style="{ marginTop: '10px' }">

<!-- ❌ Direct DOM manipulation -->
<div ref="el" @click="el.classList.add('active')">

<!-- ❌ Non-semantic HTML -->
<div @click="submit">Submit</div> <!-- Use <button> -->
```

## ✅ Quality Checklist

Before submitting any component code, verify:

- [ ] TypeScript interfaces defined in `types.ts`
- [ ] Props have JSDoc comments
- [ ] Uses theme tokens (no hardcoded colors)
- [ ] Uses `cn()` for class merging
- [ ] Includes ARIA attributes
- [ ] Follows atomic design level rules
- [ ] Exports from index files
- [ ] Under 150 lines of code
- [ ] Handles loading/error states properly
- [ ] Uses semantic HTML elements


## 📚 Resources and Examples

### Study These Well-Implemented Components:
- `Button` - Proper variant system with loading state
- `Badge` - Clean atom with color variants  
- `FormField` - Molecule that composes atoms
- `Input` - Refactored atom without form logic
- `Select` - Complex atom using Reka UI

### Utility Usage:
```typescript
// Always import from utils
import { cn } from '../../../utils/cn'
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions'
import { spacing } from '../../../utils/spacing'

// Use ClassProp type for flexible class props
import type { ClassProp } from '../../../types'
```

## 🎨 Figma to Code

When implementing designs:
1. Identify atomic level first
2. Check if component exists
3. Use exact theme tokens from design
4. Match spacing using Tailwind scale
5. Implement responsive breakpoints
6. Add hover/focus states
7. Ensure dark mode support

## 🚀 Quick Commands

### Generate New Atom:
```bash
# Structure to create:
src/components/atoms/NewComponent/
├── NewComponent.vue
├── types.ts
├── index.ts
└── NewComponent.stories.ts
```

### Add to Exports:
```typescript
// src/components/atoms/index.ts
export * from './NewComponent'
```

---

**Remember**: When in doubt, keep it simple. Atoms should be dumb, molecules add logic, and the design system handles the complexity. Always prioritize consistency over cleverness.