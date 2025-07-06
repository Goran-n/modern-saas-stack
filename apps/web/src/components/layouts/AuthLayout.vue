<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo/Brand -->
      <div class="text-center">
        <slot name="logo">
          <h1 class="text-4xl font-bold text-primary-600">
            Kibly
          </h1>
        </slot>
        <h2
          v-if="title"
          class="mt-6 text-3xl font-extrabold text-neutral-900"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="mt-2 text-sm text-neutral-600"
        >
          {{ subtitle }}
          <slot name="subtitle-action" />
        </p>
      </div>

      <!-- Main content -->
      <div class="mt-8">
        <slot />
      </div>

      <!-- Footer -->
      <div
        v-if="$slots.footer"
        class="mt-6"
      >
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface AuthLayoutProps {
  title?: string
  subtitle?: string
}

withDefaults(defineProps<AuthLayoutProps>(), {})
</script>