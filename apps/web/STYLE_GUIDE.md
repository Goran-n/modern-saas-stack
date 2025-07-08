# Kibly Nuxt UI Pro Style Guide

## Overview
This guide documents the proper usage of Nuxt UI Pro components and styling patterns to ensure a consistent, beautiful interface.

## Key Principles

### 1. Trust the Framework
- Let Nuxt UI Pro handle most styling decisions
- Avoid excessive customisation through `ui` props
- Use semantic color tokens instead of hardcoded values

### 2. Color System
- **Primary Color**: `sky` (modern, clean blue)
- **Gray Scale**: `neutral` 
- Always use UI Pro's color naming: `primary`, `gray`, `green`, `red`, `orange`, `yellow`
- Avoid legacy naming like `success`, `error`, `warning`, `info`

### 3. Component Usage

#### Dashboard Components
```vue
<!-- ✅ Correct: Let UI Pro handle styling -->
<UDashboardLayout>
  <UDashboardPanel>
    <UDashboardSidebar>
      <UDashboardSidebarLinks :links="links" />
    </UDashboardSidebar>
  </UDashboardPanel>
</UDashboardLayout>

<!-- ❌ Incorrect: Overriding with custom classes -->
<UDashboardPanel class="border-r border-gray-200/70">
```

#### Cards and Containers
```vue
<!-- ✅ Correct: Use UCard for consistent styling -->
<UCard class="hover:shadow-md transition-shadow">
  <div>Content</div>
</UCard>

<!-- ❌ Incorrect: Custom styled divs -->
<div class="rounded-2xl bg-white dark:bg-gray-900 shadow-sm ring-1">
```

#### Buttons
```vue
<!-- ✅ Correct: Use semantic variants -->
<UButton color="primary" variant="solid">Submit</UButton>
<UButton color="gray" variant="ghost">Cancel</UButton>

<!-- ❌ Incorrect: Custom color classes -->
<UButton class="bg-indigo-600 hover:bg-indigo-700">
```

### 4. Dark Mode
- UI Pro automatically handles dark mode transitions
- Never use manual dark mode classes like `dark:bg-gray-900`
- Trust the component's built-in dark mode support

### 5. Spacing and Layout
- Use Tailwind's spacing utilities consistently
- Prefer UI Pro's built-in padding/margin props when available
- Keep layouts simple and let components handle their internal spacing

### 6. Configuration

#### app.config.ts
Keep configuration minimal:
```typescript
export default defineAppConfig({
  ui: {
    primary: 'sky',
    gray: 'neutral',
    // Only override what's absolutely necessary
    button: {
      default: {
        loadingIcon: 'i-heroicons-arrow-path-20-solid'
      }
    }
  }
})
```

#### tailwind.config.ts
Extend only when needed:
```typescript
export default {
  theme: {
    extend: {
      // Only add truly custom values
      fontFamily: {
        sans: ['-apple-system', ...defaultTheme.fontFamily.sans]
      }
    }
  }
}
```

### 7. Common Patterns

#### Page Headers
```vue
<div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
  <div class="px-4 sm:px-6 lg:px-8 py-6">
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
      Page Title
    </h1>
  </div>
</div>
```

#### Form Layouts
```vue
<UForm :schema="schema" :state="state" @submit="onSubmit">
  <UFormGroup name="email">
    <UInput v-model="state.email" placeholder="Email" />
  </UFormGroup>
  
  <UButton type="submit" block>
    Submit
  </UButton>
</UForm>
```

#### Stats Cards
```vue
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <UCard v-for="stat in stats" :key="stat.id">
    <!-- Card content -->
  </UCard>
</div>
```

## Migration Checklist

When updating existing components:
1. Remove custom `ui` prop overrides
2. Replace hardcoded colors with semantic tokens
3. Replace custom containers with UCard
4. Remove manual dark mode classes
5. Simplify button variants to use UI Pro's system
6. Update toast notifications to use correct color names

## Resources
- [Nuxt UI Pro Documentation](https://ui.nuxt.com/pro)
- [Nuxt UI Components](https://ui.nuxt.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)