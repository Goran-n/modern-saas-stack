# FigModal Component Documentation

## Overview

FigModal is a fully accessible, flexible modal dialog component that follows WAI-ARIA best practices. It provides features like focus management, scroll locking, keyboard navigation, and customisable animations.

## Basic Usage

```vue
<template>
  <FigButton @click="isOpen = true">Open Modal</FigButton>
  
  <FigModal v-model="isOpen" title="Welcome">
    <p>This is a simple modal dialog.</p>
  </FigModal>
</template>

<script setup>
import { ref } from 'vue'
import { FigModal, FigButton } from '@figgy/ui'

const isOpen = ref(false)
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | Controls modal visibility (v-model) |
| `open` | `boolean` | `false` | Alternative to modelValue |
| `title` | `string` | `undefined` | Modal title |
| `description` | `string` | `undefined` | Modal description (below title) |
| `size` | `string` | `'md'` | Modal size: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl`, `7xl`, `full` |
| `closable` | `boolean` | `true` | Show close button |
| `closeOnBackdrop` | `boolean` | `true` | Close when clicking backdrop |
| `closeOnEscape` | `boolean` | `true` | Close when pressing Escape |
| `padding` | `boolean` | `true` | Apply padding to content areas |
| `class` | `string` | `undefined` | Additional CSS classes |

## Slots

### Default Slot
The main content of the modal.

```vue
<FigModal v-model="isOpen">
  <p>Modal content goes here</p>
</FigModal>
```

### Body Slot
Alternative to default slot for consistency with legacy APIs.

```vue
<FigModal v-model="isOpen">
  <template #body>
    <p>Modal content goes here</p>
  </template>
</FigModal>
```

### Header Slot
Custom header content. Overrides title and description props.

```vue
<FigModal v-model="isOpen">
  <template #header>
    <div class="flex items-center gap-2">
      <FigIcon name="info" />
      <h3>Custom Header</h3>
    </div>
  </template>
</FigModal>
```

### Footer Slot
Footer content with close function provided.

```vue
<FigModal v-model="isOpen">
  <template #footer="{ close }">
    <div class="flex justify-end gap-3">
      <FigButton variant="ghost" @click="close">Cancel</FigButton>
      <FigButton @click="handleSave">Save</FigButton>
    </div>
  </template>
</FigModal>
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when modal visibility changes |
| `update:open` | `boolean` | Alternative event for v-model:open |
| `close` | - | Emitted when modal is closed |

## Examples

### Confirmation Dialog

```vue
<template>
  <FigModal
    v-model:open="showConfirm"
    title="Confirm Action"
    description="Are you sure you want to proceed? This action cannot be undone."
  >
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <FigButton variant="ghost" @click="close">
          Cancel
        </FigButton>
        <FigButton color="error" @click="handleConfirm">
          Delete
        </FigButton>
      </div>
    </template>
  </FigModal>
</template>
```

### Form Modal

```vue
<template>
  <FigModal v-model="showForm" title="Add User" size="lg">
    <template #body>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <FigFormField label="Name" required>
          <FigInput v-model="form.name" />
        </FigFormField>
        
        <FigFormField label="Email" required>
          <FigInput v-model="form.email" type="email" />
        </FigFormField>
      </form>
    </template>
    
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <FigButton variant="ghost" @click="close">
          Cancel
        </FigButton>
        <FigButton :loading="isSubmitting" @click="handleSubmit">
          Add User
        </FigButton>
      </div>
    </template>
  </FigModal>
</template>
```

### Large Content Modal

```vue
<FigModal
  v-model="showDetails"
  title="Product Details"
  size="2xl"
  :padding="false"
>
  <div class="p-6">
    <!-- Header content -->
  </div>
  
  <div class="border-y border-primary-200 p-6">
    <!-- Scrollable content -->
  </div>
  
  <div class="p-6">
    <!-- Footer content -->
  </div>
</FigModal>
```

## Accessibility

- **Focus Management**: Focus is trapped within the modal and restored to the trigger element on close
- **Keyboard Navigation**: Tab cycles through focusable elements, Escape closes the modal
- **Screen Reader Support**: Proper ARIA attributes including `role="dialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby`
- **Scroll Lock**: Body scroll is disabled when modal is open

## Migration from UModal

If migrating from UModal:

1. Replace `<UModal>` with `<FigModal>`
2. Update imports: `import { FigModal } from '@figgy/ui'`
3. The API is largely compatible:
   - `v-model:open` works the same
   - `title` and `description` props work the same
   - `#body` and `#footer` slots work the same
   - The `close` function is provided to the footer slot

```vue
<!-- Before -->
<UModal v-model:open="isOpen" title="Title">
  <template #body>Content</template>
  <template #footer="{ close }">
    <UButton @click="close">Close</UButton>
  </template>
</UModal>

<!-- After -->
<FigModal v-model:open="isOpen" title="Title">
  <template #body>Content</template>
  <template #footer="{ close }">
    <FigButton @click="close">Close</FigButton>
  </template>
</FigModal>
```

## Best Practices

1. **Meaningful Titles**: Always provide a clear, descriptive title
2. **Focus Management**: Ensure the first interactive element receives focus
3. **Loading States**: Use loading props on action buttons during async operations
4. **Error Handling**: Display errors within the modal rather than closing it
5. **Size Selection**: Choose appropriate sizes - avoid `full` unless necessary
6. **Responsive Design**: Test modal content on mobile devices