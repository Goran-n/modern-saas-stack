<template>
  <UContainer class="py-6">
    <div class="max-w-4xl mx-auto">
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
        <h1 class="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p class="mt-2 text-gray-600">
          Manage your subscription and payment methods
        </p>
      </div>

      <!-- Coming Soon Card -->
      <UCard>
        <div class="text-center py-12">
          <UIcon name="i-heroicons-credit-card" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">Coming Soon</h3>
          <p class="text-gray-600">
            Billing and subscription management will be available soon.
          </p>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  middleware: ['auth']
});
</script>