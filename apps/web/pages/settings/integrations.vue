<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Page Header -->
      <div class="mb-6">
        <UButton 
          icon="i-heroicons-arrow-left" 
          variant="ghost" 
          to="/settings"
          class="mb-4"
        >
          Back to Settings
        </UButton>
        <h1 class="text-3xl font-bold text-gray-900">Integrations</h1>
        <p class="mt-2 text-gray-600">
          Connect external services and manage API access
        </p>
      </div>

      <!-- Coming Soon Card -->
      <UCard>
        <div class="text-center py-12">
          <UIcon name="i-heroicons-puzzle-piece" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">Coming Soon</h3>
          <p class="text-gray-600">
            Integration settings will be available soon.
          </p>
        </div>
      </UCard>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { FigContainer } from '@figgy/ui'

// Page metadata
definePageMeta({
  middleware: ['auth']
});
</script>